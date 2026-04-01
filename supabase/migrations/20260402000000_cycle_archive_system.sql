-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor
-- This replaces the previous 20260401000000 migration approach.
-- It provides a proper "archive + fresh start" on new cycle creation.
-- ============================================================

-- 1. Ensure appraisal_cycle_id exists on all 3 activity tables
ALTER TABLE public.teaching_learning_activities
  ADD COLUMN IF NOT EXISTS appraisal_cycle_id UUID REFERENCES public.appraisal_cycles(id) ON DELETE SET NULL;

ALTER TABLE public.research_activities
  ADD COLUMN IF NOT EXISTS appraisal_cycle_id UUID REFERENCES public.appraisal_cycles(id) ON DELETE SET NULL;

ALTER TABLE public.networking_contributions
  ADD COLUMN IF NOT EXISTS appraisal_cycle_id UUID REFERENCES public.appraisal_cycles(id) ON DELETE SET NULL;

ALTER TABLE public.performance_scores
  ADD COLUMN IF NOT EXISTS appraisal_cycle_id UUID REFERENCES public.appraisal_cycles(id) ON DELETE SET NULL;

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teaching_cycle_id    ON public.teaching_learning_activities(appraisal_cycle_id);
CREATE INDEX IF NOT EXISTS idx_research_cycle_id    ON public.research_activities(appraisal_cycle_id);
CREATE INDEX IF NOT EXISTS idx_networking_cycle_id  ON public.networking_contributions(appraisal_cycle_id);
CREATE INDEX IF NOT EXISTS idx_perf_scores_cycle_id ON public.performance_scores(appraisal_cycle_id);

-- 3. UNIQUE constraint on performance_scores per user per cycle
--    (needed because we now have one row per user per cycle)
--    First drop the old single-user unique constraint if it exists
ALTER TABLE public.performance_scores DROP CONSTRAINT IF EXISTS performance_scores_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS perf_scores_user_cycle_unique
  ON public.performance_scores (user_id, appraisal_cycle_id)
  WHERE appraisal_cycle_id IS NOT NULL;

-- 4. Main function: archive current data to old cycle, then create new cycle
--    Called from frontend when admin clicks "Launch New Phase"
CREATE OR REPLACE FUNCTION public.archive_and_create_cycle(
  _academic_year TEXT,
  _semester TEXT,
  _is_open BOOLEAN DEFAULT true
)
RETURNS UUID  -- returns the new cycle's id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_cycle_id UUID;
  _new_cycle_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage cycles';
  END IF;

  -- Find the currently open cycle (if any)
  SELECT id INTO _old_cycle_id
  FROM public.appraisal_cycles
  WHERE is_open = true
  LIMIT 1;

  -- If there is an open cycle, archive all current (untagged or current-tagged) data to it
  IF _old_cycle_id IS NOT NULL THEN
    -- Close the old cycle
    UPDATE public.appraisal_cycles SET is_open = false WHERE id = _old_cycle_id;

    -- Tag all activity data that has no cycle id (legacy) or belongs to the current open cycle
    UPDATE public.teaching_learning_activities
      SET appraisal_cycle_id = _old_cycle_id
      WHERE appraisal_cycle_id IS NULL OR appraisal_cycle_id = _old_cycle_id;

    UPDATE public.research_activities
      SET appraisal_cycle_id = _old_cycle_id
      WHERE appraisal_cycle_id IS NULL OR appraisal_cycle_id = _old_cycle_id;

    UPDATE public.networking_contributions
      SET appraisal_cycle_id = _old_cycle_id
      WHERE appraisal_cycle_id IS NULL OR appraisal_cycle_id = _old_cycle_id;

    -- Archive the performance_scores too (tag them to the old cycle)
    UPDATE public.performance_scores
      SET appraisal_cycle_id = _old_cycle_id
      WHERE appraisal_cycle_id IS NULL OR appraisal_cycle_id = _old_cycle_id;
  END IF;

  -- Create the new cycle
  INSERT INTO public.appraisal_cycles (academic_year, semester, is_open)
  VALUES (_academic_year, _semester, _is_open)
  RETURNING id INTO _new_cycle_id;

  -- Reset all faculty scores to 0 for the new cycle (insert fresh rows)
  INSERT INTO public.performance_scores (
    user_id, overall_score, teaching_score, research_score,
    contribution_score, category, calculated_at, appraisal_cycle_id
  )
  SELECT
    p.user_id, 0, 0, 0, 0, 'Needs Improvement', now(), _new_cycle_id
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role != 'admin'
  )
  ON CONFLICT DO NOTHING;

  RETURN _new_cycle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_and_create_cycle(TEXT, TEXT, BOOLEAN) TO authenticated;

-- 5. Function to delete a cycle and ALL its data
CREATE OR REPLACE FUNCTION public.delete_cycle_data(_cycle_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete cycle data';
  END IF;

  -- Delete all activity data for this cycle
  DELETE FROM public.teaching_learning_activities WHERE appraisal_cycle_id = _cycle_id;
  DELETE FROM public.research_activities           WHERE appraisal_cycle_id = _cycle_id;
  DELETE FROM public.networking_contributions      WHERE appraisal_cycle_id = _cycle_id;
  DELETE FROM public.performance_scores            WHERE appraisal_cycle_id = _cycle_id;

  -- Delete the cycle itself
  DELETE FROM public.appraisal_cycles WHERE id = _cycle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_cycle_data(UUID) TO authenticated;

-- 6. Update the scoring function to respect cycle filtering
--    The trigger-based calculate_performance_score now must only look at
--    rows belonging to the CURRENT OPEN cycle (or null for legacy).
CREATE OR REPLACE FUNCTION public.calculate_performance_score(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _open_cycle_id UUID;
  v_teaching_raw        NUMERIC := 0;
  v_teaching            NUMERIC := 0;
  v_journals            NUMERIC := 0;
  v_conferences         NUMERIC := 0;
  v_book_chapters       NUMERIC := 0;
  v_books               NUMERIC := 0;
  v_consultancy         NUMERIC := 0;
  v_funded_project      NUMERIC := 0;
  v_patents             NUMERIC := 0;
  v_guidance            NUMERIC := 0;
  v_research_raw        NUMERIC := 0;
  v_research            NUMERIC := 0;
  v_prof_membership     NUMERIC := 0;
  v_fdp_attended        NUMERIC := 0;
  v_organized_event     NUMERIC := 0;
  v_institution_contrib NUMERIC := 0;
  v_contribution_raw    NUMERIC := 0;
  v_contribution        NUMERIC := 0;
  v_total               NUMERIC := 0;
  v_category            TEXT    := 'Needs Improvement';
BEGIN
  -- Get the currently open cycle
  SELECT id INTO _open_cycle_id FROM public.appraisal_cycles WHERE is_open = true LIMIT 1;

  -- CATEGORY I: Teaching & Learning (Max 50)
  SELECT COALESCE(SUM(
    COALESCE(subject_pass_score, 0) + COALESCE(student_feedback_score, 0) +
    COALESCE(instruction_material_score, 0) + COALESCE(pedagogy_score, 0) +
    COALESCE(learners_action_score, 0) + COALESCE(visits_lectures_score, 0)
  ), 0) INTO v_teaching_raw
  FROM public.teaching_learning_activities
  WHERE user_id = _user_id
    AND (appraisal_cycle_id = _open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  v_teaching := LEAST(v_teaching_raw, 50);

  -- CATEGORY II: Research (Max 100)
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_journals      FROM public.research_activities WHERE user_id=_user_id AND activity_category='Journal'      AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_conferences   FROM public.research_activities WHERE user_id=_user_id AND activity_category='Conference'   AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_book_chapters FROM public.research_activities WHERE user_id=_user_id AND activity_category='Book Chapter'  AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_books         FROM public.research_activities WHERE user_id=_user_id AND activity_category='Book'          AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_consultancy   FROM public.networking_contributions WHERE user_id=_user_id AND contribution_category='Consultancy'       AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_funded_project FROM public.networking_contributions WHERE user_id=_user_id AND contribution_category='Funded Project'   AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_patents        FROM public.research_activities WHERE user_id=_user_id AND activity_category='Patent'        AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_guidance       FROM public.research_activities WHERE user_id=_user_id AND activity_category='Guidance'      AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));

  v_research_raw := LEAST(v_journals,25)+LEAST(v_conferences,10)+LEAST(v_book_chapters,10)+LEAST(v_books,5)+LEAST(v_consultancy,10)+LEAST(v_funded_project,25)+LEAST(v_patents,5)+LEAST(v_guidance,10);
  v_research := LEAST(v_research_raw, 100);

  -- CATEGORY III: Networking (Max 100)
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_prof_membership     FROM public.networking_contributions WHERE user_id=_user_id AND contribution_category='Professional Society'  AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_fdp_attended        FROM public.networking_contributions WHERE user_id=_user_id AND contribution_category='FDP Attended'          AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_organized_event     FROM public.networking_contributions WHERE user_id=_user_id AND contribution_category='Organized Event'        AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_institution_contrib FROM public.networking_contributions WHERE user_id=_user_id AND contribution_category='Institution Contribution' AND (appraisal_cycle_id=_open_cycle_id OR (_open_cycle_id IS NULL AND appraisal_cycle_id IS NULL));

  v_contribution_raw := LEAST(v_prof_membership,20)+LEAST(v_fdp_attended,25)+LEAST(v_organized_event,25)+LEAST(v_institution_contrib,30);
  v_contribution := LEAST(v_contribution_raw, 100);

  v_total := v_teaching + v_research + v_contribution;
  IF    v_total >= 200 THEN v_category := 'Excellent';
  ELSIF v_total >= 175 THEN v_category := 'Very Good';
  ELSIF v_total >= 125 THEN v_category := 'Good';
  ELSE                       v_category := 'Needs Improvement';
  END IF;

  -- Upsert into performance_scores for the current open cycle
  IF _open_cycle_id IS NOT NULL THEN
    INSERT INTO public.performance_scores (
      user_id, overall_score, teaching_score, research_score,
      contribution_score, category, calculated_at, appraisal_cycle_id
    )
    VALUES (
      _user_id, v_total, v_teaching, v_research, v_contribution,
      v_category, now(), _open_cycle_id
    )
    ON CONFLICT (user_id, appraisal_cycle_id)
    WHERE appraisal_cycle_id IS NOT NULL
    DO UPDATE SET
      overall_score      = EXCLUDED.overall_score,
      teaching_score     = EXCLUDED.teaching_score,
      research_score     = EXCLUDED.research_score,
      contribution_score = EXCLUDED.contribution_score,
      category           = EXCLUDED.category,
      calculated_at      = now();
  ELSE
    -- Legacy mode (no cycles): update by user_id only
    INSERT INTO public.performance_scores (
      user_id, overall_score, teaching_score, research_score,
      contribution_score, category, calculated_at
    )
    VALUES (
      _user_id, v_total, v_teaching, v_research, v_contribution,
      v_category, now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      overall_score      = EXCLUDED.overall_score,
      teaching_score     = EXCLUDED.teaching_score,
      research_score     = EXCLUDED.research_score,
      contribution_score = EXCLUDED.contribution_score,
      category           = EXCLUDED.category,
      calculated_at      = now();
  END IF;
END;
$$;
