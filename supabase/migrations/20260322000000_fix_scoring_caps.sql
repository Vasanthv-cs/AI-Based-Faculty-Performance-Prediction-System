-- =============================================================================
-- Faculty Appraisal Scoring — Hard Caps per Category (250 pts total)
-- Paste this in Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- ── Step 1: Ensure summary columns exist ─────────────────────────────────────
ALTER TABLE public.performance_scores
  ADD COLUMN IF NOT EXISTS teaching_score     DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS research_score     DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contribution_score DECIMAL(5,2) DEFAULT 0;

-- ── Step 2: Trigger helper (fires after any activity row change) ──────────────
CREATE OR REPLACE FUNCTION public.trigger_recalculate_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.calculate_performance_score(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.calculate_performance_score(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

-- ── Step 3: Recreate the main scoring function ────────────────────────────────
DROP FUNCTION IF EXISTS public.calculate_performance_score(uuid);

CREATE FUNCTION public.calculate_performance_score(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- ── CATEGORY I: Teaching & Learning (Max 50 total) ─────────────────────────
  -- Each sub-score is already computed per-row in teaching_learning_activities.
  -- Sub-caps (enforced at data-entry time via scoring rules):
  --   subject_pass_score         → max 5  per record
  --   student_feedback_score     → max 5  per record
  --   instruction_material_score → max 10 per record
  --   pedagogy_score             → max 10 per record
  --   learners_action_score      → max 10 per record
  --   visits_lectures_score      → max 10 per record
  v_teaching_raw        NUMERIC := 0;
  v_teaching            NUMERIC := 0;

  -- ── CATEGORY II: Research Activities (Max 100 total) ──────────────────────
  -- Per image table items 7-14 (all research-type work):
  --   7.  Journal Publications     → max 25 (research_activities)
  --   8.  Conferences Proceedings  → max 10 (research_activities)
  --   9.  Book Chapters            → max 10 (research_activities)
  --   10. Books Published          → max  5 (research_activities)
  --   11. Consultancy & Testing    → max 10 (networking_contributions)
  --   12. Funded Projects          → max 25 (networking_contributions)
  --   13. Patents                  → max  5 (research_activities)
  --   14. Research Guidance        → max 10 (research_activities)
  v_journals            NUMERIC := 0;   -- max 25
  v_conferences         NUMERIC := 0;   -- max 10
  v_book_chapters       NUMERIC := 0;   -- max 10
  v_books               NUMERIC := 0;   -- max 5
  v_consultancy         NUMERIC := 0;   -- max 10  ← image item 11
  v_funded_project      NUMERIC := 0;   -- max 25  ← image item 12
  v_patents             NUMERIC := 0;   -- max 5
  v_guidance            NUMERIC := 0;   -- max 10
  v_research_raw        NUMERIC := 0;
  v_research            NUMERIC := 0;   -- max 100

  -- ── CATEGORY III: Networking & Contributions (Max 100 total) ───────────────
  -- Per image table items 15-18 (only 4 types now):
  --   15. Membership in Prof. Society → max 20
  --   16. FDP Attended                → max 25
  --   17. Organized Events/Workshops  → max 25
  --   18. Contributions to Institution→ max 30
  v_prof_membership     NUMERIC := 0;   -- max 20
  v_fdp_attended        NUMERIC := 0;   -- max 25
  v_organized_event     NUMERIC := 0;   -- max 25
  v_institution_contrib NUMERIC := 0;   -- max 30
  v_contribution_raw    NUMERIC := 0;
  v_contribution        NUMERIC := 0;   -- max 100

  -- Final
  v_total               NUMERIC := 0;
  v_category            TEXT    := 'Needs Improvement';
BEGIN

  -- ══════════════════════════════════════════════════════════════════════════
  -- CATEGORY I: Teaching & Learning (Max 50)
  -- ══════════════════════════════════════════════════════════════════════════
  SELECT COALESCE(SUM(
    -- Each column is already scored per-row. We sum all rows and cap at 50.
    COALESCE(subject_pass_score,         0) +
    COALESCE(student_feedback_score,     0) +
    COALESCE(instruction_material_score, 0) +
    COALESCE(pedagogy_score,             0) +
    COALESCE(learners_action_score,      0) +
    COALESCE(visits_lectures_score,      0)
  ), 0)
  INTO v_teaching_raw
  FROM public.teaching_learning_activities
  WHERE user_id = _user_id;

  v_teaching := LEAST(v_teaching_raw, 50);

  -- ══════════════════════════════════════════════════════════════════════════
  -- CATEGORY II: Research Activities — Image items 7-14 (Max 100)
  -- ══════════════════════════════════════════════════════════════════════════

  -- 7. Journal Publications → max 25
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_journals
  FROM public.research_activities
  WHERE user_id = _user_id AND activity_category = 'Journal';

  -- 8. Conference Proceedings → max 10
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_conferences
  FROM public.research_activities
  WHERE user_id = _user_id AND activity_category = 'Conference';

  -- 9. Book Chapters → max 10
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_book_chapters
  FROM public.research_activities
  WHERE user_id = _user_id AND activity_category = 'Book Chapter';

  -- 10. Books Published → max 5
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_books
  FROM public.research_activities
  WHERE user_id = _user_id AND activity_category = 'Book';

  -- 11. Consultancy & Testing → max 10 (stored in networking_contributions)
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_consultancy
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'Consultancy';

  -- 12. Funded Projects → max 25 (stored in networking_contributions)
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_funded_project
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'Funded Project';

  -- 13. Patents → max 5
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_patents
  FROM public.research_activities
  WHERE user_id = _user_id AND activity_category = 'Patent';

  -- 14. Research Guidance → max 10
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_guidance
  FROM public.research_activities
  WHERE user_id = _user_id AND activity_category = 'Guidance';

  -- Apply per-type caps (items 7-14), then overall cap of 100
  v_research_raw :=
    LEAST(v_journals,       25) +
    LEAST(v_conferences,    10) +
    LEAST(v_book_chapters,  10) +
    LEAST(v_books,           5) +
    LEAST(v_consultancy,    10) +
    LEAST(v_funded_project, 25) +
    LEAST(v_patents,         5) +
    LEAST(v_guidance,       10);

  v_research := LEAST(v_research_raw, 100);

  -- ══════════════════════════════════════════════════════════════════════════
  -- CATEGORY III: Networking & Contributions — Image items 15-18 (Max 100)
  -- (Consultancy & Funded Projects moved to Category II above)
  -- ══════════════════════════════════════════════════════════════════════════

  -- 15. Membership in Professional Society → max 20
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_prof_membership
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'Professional Society';

  -- 16. Faculty Up-skilling / FDP Attended → max 25
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_fdp_attended
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'FDP Attended';

  -- 17. Workshop / Training / Conference Organized → max 25
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_organized_event
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'Organized Event';

  -- 18. Contributions to the Institution → max 30
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_institution_contrib
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'Institution Contribution';

  -- Apply per-type caps (items 15-18), then overall cap of 100
  v_contribution_raw :=
    LEAST(v_prof_membership,     20) +
    LEAST(v_fdp_attended,        25) +
    LEAST(v_organized_event,     25) +
    LEAST(v_institution_contrib, 30);

  v_contribution := LEAST(v_contribution_raw, 100);

  -- ══════════════════════════════════════════════════════════════════════════
  -- TOTAL & GRADE (max 250)
  -- ══════════════════════════════════════════════════════════════════════════
  v_total := v_teaching + v_research + v_contribution;

  IF    v_total >= 200 THEN v_category := 'Excellent';
  ELSIF v_total >= 175 THEN v_category := 'Very Good';
  ELSIF v_total >= 125 THEN v_category := 'Good';
  ELSE                       v_category := 'Needs Improvement';
  END IF;

  -- Upsert into performance_scores
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

-- ── Step 4: Triggers on all three activity tables ─────────────────────────────
DROP TRIGGER IF EXISTS recalc_score_teaching ON public.teaching_learning_activities;
CREATE TRIGGER recalc_score_teaching
  AFTER INSERT OR UPDATE OR DELETE ON public.teaching_learning_activities
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_score();

DROP TRIGGER IF EXISTS recalc_score_research ON public.research_activities;
CREATE TRIGGER recalc_score_research
  AFTER INSERT OR UPDATE OR DELETE ON public.research_activities
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_score();

DROP TRIGGER IF EXISTS recalc_score_networking ON public.networking_contributions;
CREATE TRIGGER recalc_score_networking
  AFTER INSERT OR UPDATE OR DELETE ON public.networking_contributions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_score();

-- ── Step 5: Recompute scores for ALL existing users ───────────────────────────
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
