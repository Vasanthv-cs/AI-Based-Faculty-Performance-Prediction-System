-- Update calculate_performance_score to also populate detailed
-- 250-point faculty appraisal fields on performance_scores.
-- This keeps the existing 0–100 scoring logic based on activity
-- counts, and derives the 18 detailed fields in a moderate,
-- proportional way from those component scores.

create or replace function public.calculate_performance_score(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Existing aggregate components (0–20 each, total 100)
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

  -- Normalized component percentages (0–1)
  fdp_ratio numeric;
  visit_ratio numeric;
  course_ratio numeric;
  research_ratio numeric;
  cert_ratio numeric;

  -- Detailed appraisal fields (integers, capped by their max)
  v_subject_pass_percentage int;
  v_student_feedback int;
  v_reading_material int;
  v_teaching_pedagogy int;
  v_slow_advanced_learners int;
  v_industrial_visits int;

  v_journal_publications int;
  v_conference_proceedings int;
  v_book_chapters int;
  v_books_published int;
  v_consultancy_testing int;
  v_funded_projects int;
  v_patents int;
  v_research_guidance int;

  v_professional_membership int;
  v_faculty_upskilling int;
  v_workshops_organized int;
  v_institutional_contributions int;
begin
  -- Count activities
  select count(*) into fdp_count from public.fdp_programs where user_id = _user_id;
  select count(*) into visit_count from public.industrial_visits where user_id = _user_id;
  select count(*) into course_count from public.courses_handled where user_id = _user_id;
  select count(*) into paper_count from public.research_papers where user_id = _user_id;
  select count(*) into cert_count from public.certifications where user_id = _user_id;

  -- Existing 0–100 scoring (unchanged)
  fdp_pts := least(fdp_count * 4, 20);       -- max 20
  visit_pts := least(visit_count * 4, 20);   -- max 20
  course_pts := least(course_count * 2, 20); -- max 20
  research_pts := least(paper_count * 5, 20);-- max 20
  cert_pts := least(cert_count * 4, 20);     -- max 20

  total_score := coalesce(fdp_pts, 0)
               + coalesce(visit_pts, 0)
               + coalesce(course_pts, 0)
               + coalesce(research_pts, 0)
               + coalesce(cert_pts, 0);

  -- Determine legacy category (for existing dashboards)
  if total_score >= 80 then
    score_category := 'Excellent';
  elsif total_score >= 60 then
    score_category := 'Good';
  elsif total_score >= 40 then
    score_category := 'Average';
  else
    score_category := 'Needs Improvement';
  end if;

  -- Normalize component scores to 0–1 ratios
  fdp_ratio := least(1, greatest(0, coalesce(fdp_pts, 0) / 20.0));
  visit_ratio := least(1, greatest(0, coalesce(visit_pts, 0) / 20.0));
  course_ratio := least(1, greatest(0, coalesce(course_pts, 0) / 20.0));
  research_ratio := least(1, greatest(0, coalesce(research_pts, 0) / 20.0));
  cert_ratio := least(1, greatest(0, coalesce(cert_pts, 0) / 20.0));

  /*
    Map existing component scores into the detailed 250-point
    appraisal structure in a moderate, proportional way:

    CATEGORY I – Teaching & Learning (Max 50)
      - Driven mainly by course performance and industrial visits.
    CATEGORY II – Research (Max 100)
      - Driven by research points from papers.
    CATEGORY III – Networking (Max 100)
      - Driven by FDP programs and certifications.
  */

  -- CATEGORY I – Teaching & Learning (Max 50)
  v_subject_pass_percentage   := round(5  * course_ratio);
  v_student_feedback          := round(5  * course_ratio);
  v_reading_material          := round(10 * course_ratio);
  v_teaching_pedagogy         := round(10 * course_ratio);
  v_slow_advanced_learners    := round(10 * course_ratio);
  v_industrial_visits         := round(10 * visit_ratio);

  -- CATEGORY II – Research (Max 100)
  v_journal_publications      := round(25 * research_ratio);
  v_conference_proceedings    := round(10 * research_ratio);
  v_book_chapters             := round(10 * research_ratio);
  v_books_published           := round(5  * research_ratio);
  v_consultancy_testing       := round(10 * research_ratio);
  v_funded_projects           := round(25 * research_ratio);
  v_patents                   := round(5  * research_ratio);
  v_research_guidance         := round(10 * research_ratio);

  -- CATEGORY III – Networking (Max 100)
  v_professional_membership   := round(20 * cert_ratio);
  v_faculty_upskilling        := round(25 * fdp_ratio);
  v_workshops_organized       := round(25 * fdp_ratio);
  v_institutional_contributions := round(30 * fdp_ratio);

  -- Upsert performance score plus detailed appraisal fields
  insert into public.performance_scores (
    user_id,
    overall_score,
    fdp_score,
    visit_score,
    course_score,
    research_score,
    certification_score,
    category,
    calculated_at,
    subject_pass_percentage,
    student_feedback,
    reading_material,
    teaching_pedagogy,
    slow_advanced_learners,
    industrial_visits,
    journal_publications,
    conference_proceedings,
    book_chapters,
    books_published,
    consultancy_testing,
    funded_projects,
    patents,
    research_guidance,
    professional_membership,
    faculty_upskilling,
    workshops_organized,
    institutional_contributions
  )
  values (
    _user_id,
    total_score,
    fdp_pts,
    visit_pts,
    course_pts,
    research_pts,
    cert_pts,
    score_category,
    now(),
    v_subject_pass_percentage,
    v_student_feedback,
    v_reading_material,
    v_teaching_pedagogy,
    v_slow_advanced_learners,
    v_industrial_visits,
    v_journal_publications,
    v_conference_proceedings,
    v_book_chapters,
    v_books_published,
    v_consultancy_testing,
    v_funded_projects,
    v_patents,
    v_research_guidance,
    v_professional_membership,
    v_faculty_upskilling,
    v_workshops_organized,
    v_institutional_contributions
  )
  on conflict (user_id)
  do update set
    overall_score              = excluded.overall_score,
    fdp_score                  = excluded.fdp_score,
    visit_score                = excluded.visit_score,
    course_score               = excluded.course_score,
    research_score             = excluded.research_score,
    certification_score        = excluded.certification_score,
    category                   = excluded.category,
    calculated_at              = now(),
    subject_pass_percentage    = excluded.subject_pass_percentage,
    student_feedback           = excluded.student_feedback,
    reading_material           = excluded.reading_material,
    teaching_pedagogy          = excluded.teaching_pedagogy,
    slow_advanced_learners     = excluded.slow_advanced_learners,
    industrial_visits          = excluded.industrial_visits,
    journal_publications       = excluded.journal_publications,
    conference_proceedings     = excluded.conference_proceedings,
    book_chapters              = excluded.book_chapters,
    books_published            = excluded.books_published,
    consultancy_testing        = excluded.consultancy_testing,
    funded_projects            = excluded.funded_projects,
    patents                    = excluded.patents,
    research_guidance          = excluded.research_guidance,
    professional_membership    = excluded.professional_membership,
    faculty_upskilling         = excluded.faculty_upskilling,
    workshops_organized        = excluded.workshops_organized,
    institutional_contributions = excluded.institutional_contributions;
end;
$$;

