-- ============================================================
-- CORRECTIVE FIX — Run this in Supabase SQL Editor
-- Fixes scores showing 0 for existing faculty data.
--
-- Root cause: The previous migration made the scoring function
-- only count data WHERE appraisal_cycle_id = current_open_cycle.
-- But all existing data has appraisal_cycle_id = NULL, so it
-- was invisible to the scorer.
--
-- The fix: treat NULL appraisal_cycle_id data as belonging to
-- the current open cycle. When archive_and_create_cycle() runs,
-- it stamps all NULL rows with the old cycle ID (making them
-- archived and invisible to the new fresh cycle).
-- ============================================================

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
  -- Get the currently open cycle (if any)
  SELECT id INTO _open_cycle_id
  FROM public.appraisal_cycles
  WHERE is_open = true
  LIMIT 1;

  -- KEY FIX: NULL cycle_id = legacy/untagged data = belongs to current cycle.
  -- Archived data has a specific old cycle_id → it won't match _open_cycle_id.
  -- This helper macro: data counts if it's tagged to current cycle OR is untagged (NULL).

  -- CATEGORY I: Teaching & Learning (Max 50)
  SELECT COALESCE(SUM(
    COALESCE(subject_pass_score, 0) + COALESCE(student_feedback_score, 0) +
    COALESCE(instruction_material_score, 0) + COALESCE(pedagogy_score, 0) +
    COALESCE(learners_action_score, 0) + COALESCE(visits_lectures_score, 0)
  ), 0) INTO v_teaching_raw
  FROM public.teaching_learning_activities
  WHERE user_id = _user_id
    AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);
  v_teaching := LEAST(v_teaching_raw, 50);

  -- CATEGORY II: Research (Max 100)
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_journals
    FROM public.research_activities
    WHERE user_id=_user_id AND activity_category='Journal'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_conferences
    FROM public.research_activities
    WHERE user_id=_user_id AND activity_category='Conference'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_book_chapters
    FROM public.research_activities
    WHERE user_id=_user_id AND activity_category='Book Chapter'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_books
    FROM public.research_activities
    WHERE user_id=_user_id AND activity_category='Book'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_consultancy
    FROM public.networking_contributions
    WHERE user_id=_user_id AND contribution_category='Consultancy'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_funded_project
    FROM public.networking_contributions
    WHERE user_id=_user_id AND contribution_category='Funded Project'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_patents
    FROM public.research_activities
    WHERE user_id=_user_id AND activity_category='Patent'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_guidance
    FROM public.research_activities
    WHERE user_id=_user_id AND activity_category='Guidance'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  v_research_raw := LEAST(v_journals,25) + LEAST(v_conferences,10) +
                    LEAST(v_book_chapters,10) + LEAST(v_books,5) +
                    LEAST(v_consultancy,10) + LEAST(v_funded_project,25) +
                    LEAST(v_patents,5) + LEAST(v_guidance,10);
  v_research := LEAST(v_research_raw, 100);

  -- CATEGORY III: Networking & Contributions (Max 100)
  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_prof_membership
    FROM public.networking_contributions
    WHERE user_id=_user_id AND contribution_category='Professional Society'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_fdp_attended
    FROM public.networking_contributions
    WHERE user_id=_user_id AND contribution_category='FDP Attended'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_organized_event
    FROM public.networking_contributions
    WHERE user_id=_user_id AND contribution_category='Organized Event'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  SELECT COALESCE(SUM(COALESCE(score_claimed,0)),0) INTO v_institution_contrib
    FROM public.networking_contributions
    WHERE user_id=_user_id AND contribution_category='Institution Contribution'
      AND (appraisal_cycle_id IS NULL OR appraisal_cycle_id = _open_cycle_id);

  v_contribution_raw := LEAST(v_prof_membership,20) + LEAST(v_fdp_attended,25) +
                        LEAST(v_organized_event,25) + LEAST(v_institution_contrib,30);
  v_contribution := LEAST(v_contribution_raw, 100);

  -- Total & Grade
  v_total := v_teaching + v_research + v_contribution;

  IF    v_total >= 200 THEN v_category := 'Excellent';
  ELSIF v_total >= 175 THEN v_category := 'Very Good';
  ELSIF v_total >= 125 THEN v_category := 'Good';
  ELSE                       v_category := 'Needs Improvement';
  END IF;

  -- Upsert score — use user_id only (no cycle constraint) so existing rows get updated
  INSERT INTO public.performance_scores (
    user_id, overall_score,
    teaching_score, research_score, contribution_score,
    category, calculated_at
  )
  VALUES (
    _user_id, v_total,
    v_teaching, v_research, v_contribution,
    v_category, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    overall_score      = EXCLUDED.overall_score,
    teaching_score     = EXCLUDED.teaching_score,
    research_score     = EXCLUDED.research_score,
    contribution_score = EXCLUDED.contribution_score,
    category           = EXCLUDED.category,
    calculated_at      = now();
END;
$$;

-- Recompute scores for ALL existing faculty right now
-- (this will immediately fix the 0-score problem)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id FROM public.performance_scores
    UNION
    SELECT DISTINCT user_id FROM public.teaching_learning_activities
    UNION
    SELECT DISTINCT user_id FROM public.research_activities
    UNION
    SELECT DISTINCT user_id FROM public.networking_contributions
  LOOP
    PERFORM public.calculate_performance_score(r.user_id);
  END LOOP;
END;
$$;
