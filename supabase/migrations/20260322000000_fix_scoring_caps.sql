-- =============================================================================
-- Fix Scoring Caps — Safe version
-- Paste this in Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- ── Step 1: Add summary score columns if not already present ─────────────────
ALTER TABLE public.performance_scores
  ADD COLUMN IF NOT EXISTS teaching_score     DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS research_score     DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contribution_score DECIMAL(5,2) DEFAULT 0;

-- ── Step 2: Recreate the trigger helper (safe: OR REPLACE) ───────────────────
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

-- ── Step 3: Drop existing calculate_performance_score and recreate ────────────
DROP FUNCTION IF EXISTS public.calculate_performance_score(uuid);

CREATE FUNCTION public.calculate_performance_score(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Category I: Teaching & Learning (Max 50)
  v_teaching_raw        NUMERIC := 0;
  v_teaching            NUMERIC := 0;

  -- Category II: Research Activities (Max 100)
  v_research_raw        NUMERIC := 0;
  v_research            NUMERIC := 0;

  -- Category III: Networking & Contributions (Max 100, with sub-caps)
  v_prof_membership     NUMERIC := 0;  -- max 20
  v_fdp_attended        NUMERIC := 0;  -- max 25
  v_organized_event     NUMERIC := 0;  -- max 25
  v_consultancy         NUMERIC := 0;  -- max 15
  v_funded_project      NUMERIC := 0;  -- max 25
  v_institution_contrib NUMERIC := 0;  -- max 30
  v_contribution_raw    NUMERIC := 0;
  v_contribution        NUMERIC := 0;

  -- Final
  v_total               NUMERIC := 0;
  v_category            TEXT    := 'Poor';
BEGIN

  -- ── CATEGORY I: Teaching & Learning (Max 50) ─────────────────────────────
  SELECT COALESCE(SUM(
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

  -- ── CATEGORY II: Research Activities (Max 100) ───────────────────────────
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_research_raw
  FROM public.research_activities
  WHERE user_id = _user_id;

  v_research := LEAST(v_research_raw, 100);

  -- ── CATEGORY III: Networking & Contributions (Max 100) ───────────────────
  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_prof_membership
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'Professional Society';

  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_fdp_attended
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'FDP Attended';

  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_organized_event
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'Organized Event';

  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_consultancy
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'Consultancy';

  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_funded_project
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'Funded Project';

  SELECT COALESCE(SUM(COALESCE(score_claimed, 0)), 0)
  INTO v_institution_contrib
  FROM public.networking_contributions
  WHERE user_id = _user_id AND contribution_category = 'Institution Contribution';

  -- Sub-caps then category cap
  v_contribution_raw :=
    LEAST(v_prof_membership,     20) +
    LEAST(v_fdp_attended,        25) +
    LEAST(v_organized_event,     25) +
    LEAST(v_consultancy,         15) +
    LEAST(v_funded_project,      25) +
    LEAST(v_institution_contrib, 30);

  v_contribution := LEAST(v_contribution_raw, 100);

  -- ── TOTAL & GRADE ─────────────────────────────────────────────────────────
  v_total := v_teaching + v_research + v_contribution;

  IF    v_total >= 200 THEN v_category := 'Excellent';
  ELSIF v_total >= 175 THEN v_category := 'Very Good';
  ELSIF v_total >= 125 THEN v_category := 'Good';
  ELSE                       v_category := 'Poor';
  END IF;

  -- ── UPSERT ───────────────────────────────────────────────────────────────
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

-- ── Step 4: Add triggers on the new UI activity tables ────────────────────────

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

-- ── Step 5: Recompute scores for all existing users ───────────────────────────
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
