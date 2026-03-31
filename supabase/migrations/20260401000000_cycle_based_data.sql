-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor
-- Adds appraisal_cycle_id to all activity tables so data
-- is isolated per semester cycle.
-- ============================================================

-- 1. Add cycle_id column to all activity tables (nullable so old data isn't broken)
ALTER TABLE public.research_activities
  ADD COLUMN IF NOT EXISTS appraisal_cycle_id UUID REFERENCES public.appraisal_cycles(id) ON DELETE CASCADE;

ALTER TABLE public.teaching_learning_activities
  ADD COLUMN IF NOT EXISTS appraisal_cycle_id UUID REFERENCES public.appraisal_cycles(id) ON DELETE CASCADE;

ALTER TABLE public.networking_contributions
  ADD COLUMN IF NOT EXISTS appraisal_cycle_id UUID REFERENCES public.appraisal_cycles(id) ON DELETE CASCADE;

ALTER TABLE public.performance_scores
  ADD COLUMN IF NOT EXISTS appraisal_cycle_id UUID REFERENCES public.appraisal_cycles(id) ON DELETE CASCADE;

-- 2. Index for fast filtering by cycle
CREATE INDEX IF NOT EXISTS idx_research_activities_cycle_id ON public.research_activities(appraisal_cycle_id);
CREATE INDEX IF NOT EXISTS idx_teaching_activities_cycle_id ON public.teaching_learning_activities(appraisal_cycle_id);
CREATE INDEX IF NOT EXISTS idx_networking_contributions_cycle_id ON public.networking_contributions(appraisal_cycle_id);
CREATE INDEX IF NOT EXISTS idx_performance_scores_cycle_id ON public.performance_scores(appraisal_cycle_id);

-- 3. Function that deletes all activity data for a given cycle
--    (Called from frontend when admin deletes a cycle)
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

  DELETE FROM public.research_activities       WHERE appraisal_cycle_id = _cycle_id;
  DELETE FROM public.teaching_learning_activities WHERE appraisal_cycle_id = _cycle_id;
  DELETE FROM public.networking_contributions  WHERE appraisal_cycle_id = _cycle_id;
  DELETE FROM public.performance_scores        WHERE appraisal_cycle_id = _cycle_id;
  DELETE FROM public.appraisal_cycles          WHERE id = _cycle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_cycle_data(UUID) TO authenticated;
