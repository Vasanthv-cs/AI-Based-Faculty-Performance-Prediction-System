-- Insert common engineering departments
INSERT INTO public.departments (name, code) VALUES
  ('Computer Science and Engineering', 'CSE'),
  ('Electronics and Communication Engineering', 'ECE'),
  ('Electrical and Electronics Engineering', 'EEE'),
  ('Mechanical Engineering', 'ME'),
  ('Civil Engineering', 'CE'),
  ('Information Technology', 'IT'),
  ('Artificial Intelligence and Machine Learning', 'AIML'),
  ('Data Science', 'DS'),
  ('Chemical Engineering', 'CHE'),
  ('Biotechnology', 'BT')
ON CONFLICT DO NOTHING;

-- Create function to calculate performance score for a user
CREATE OR REPLACE FUNCTION public.calculate_performance_score(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fdp_count int;
  visit_count int;
  course_count int;
  paper_count int;
  cert_count int;
  fdp_pts numeric;
  visit_pts numeric;
  course_pts numeric;
  research_pts numeric;
  cert_pts numeric;
  total_score numeric;
  score_category text;
BEGIN
  -- Count activities
  SELECT COUNT(*) INTO fdp_count FROM fdp_programs WHERE user_id = _user_id;
  SELECT COUNT(*) INTO visit_count FROM industrial_visits WHERE user_id = _user_id;
  SELECT COUNT(*) INTO course_count FROM courses_handled WHERE user_id = _user_id;
  SELECT COUNT(*) INTO paper_count FROM research_papers WHERE user_id = _user_id;
  SELECT COUNT(*) INTO cert_count FROM certifications WHERE user_id = _user_id;

  -- Calculate scores (max 20 points each, total 100)
  fdp_pts := LEAST(fdp_count * 4, 20);
  visit_pts := LEAST(visit_count * 4, 20);
  course_pts := LEAST(course_count * 2, 20);
  research_pts := LEAST(paper_count * 5, 20);
  cert_pts := LEAST(cert_count * 4, 20);

  total_score := fdp_pts + visit_pts + course_pts + research_pts + cert_pts;

  -- Determine category
  IF total_score >= 80 THEN
    score_category := 'Excellent';
  ELSIF total_score >= 60 THEN
    score_category := 'Good';
  ELSIF total_score >= 40 THEN
    score_category := 'Average';
  ELSE
    score_category := 'Needs Improvement';
  END IF;

  -- Upsert performance score
  INSERT INTO performance_scores (user_id, overall_score, fdp_score, visit_score, course_score, research_score, certification_score, category, calculated_at)
  VALUES (_user_id, total_score, fdp_pts, visit_pts, course_pts, research_pts, cert_pts, score_category, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    fdp_score = EXCLUDED.fdp_score,
    visit_score = EXCLUDED.visit_score,
    course_score = EXCLUDED.course_score,
    research_score = EXCLUDED.research_score,
    certification_score = EXCLUDED.certification_score,
    category = EXCLUDED.category,
    calculated_at = now();
END;
$$;

-- Add unique constraint on user_id for performance_scores if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'performance_scores_user_id_key'
  ) THEN
    ALTER TABLE public.performance_scores ADD CONSTRAINT performance_scores_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.trigger_recalculate_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_performance_score(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM calculate_performance_score(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers on all activity tables
DROP TRIGGER IF EXISTS recalc_score_fdp ON fdp_programs;
CREATE TRIGGER recalc_score_fdp
AFTER INSERT OR UPDATE OR DELETE ON fdp_programs
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_score();

DROP TRIGGER IF EXISTS recalc_score_visits ON industrial_visits;
CREATE TRIGGER recalc_score_visits
AFTER INSERT OR UPDATE OR DELETE ON industrial_visits
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_score();

DROP TRIGGER IF EXISTS recalc_score_courses ON courses_handled;
CREATE TRIGGER recalc_score_courses
AFTER INSERT OR UPDATE OR DELETE ON courses_handled
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_score();

DROP TRIGGER IF EXISTS recalc_score_papers ON research_papers;
CREATE TRIGGER recalc_score_papers
AFTER INSERT OR UPDATE OR DELETE ON research_papers
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_score();

DROP TRIGGER IF EXISTS recalc_score_certs ON certifications;
CREATE TRIGGER recalc_score_certs
AFTER INSERT OR UPDATE OR DELETE ON certifications
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_score();