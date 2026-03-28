-- =============================================================================
-- Run this entire script once in Supabase Dashboard → SQL Editor → New query.
-- Paste all, then click "Run". No manual steps needed.
-- =============================================================================

-- Part 1: Add 18 appraisal columns + index + calculate_final_appraisal function
-- -----------------------------------------------------------------------------
alter table public.performance_scores
  add column if not exists subject_pass_percentage int,
  add column if not exists student_feedback int,
  add column if not exists reading_material int,
  add column if not exists teaching_pedagogy int,
  add column if not exists slow_advanced_learners int,
  add column if not exists industrial_visits int,
  add column if not exists journal_publications int,
  add column if not exists conference_proceedings int,
  add column if not exists book_chapters int,
  add column if not exists books_published int,
  add column if not exists consultancy_testing int,
  add column if not exists funded_projects int,
  add column if not exists patents int,
  add column if not exists research_guidance int,
  add column if not exists professional_membership int,
  add column if not exists faculty_upskilling int,
  add column if not exists workshops_organized int,
  add column if not exists institutional_contributions int;

create index if not exists idx_performance_scores_user_id
  on public.performance_scores (user_id);

create or replace function public.calculate_final_appraisal(_user_id uuid)
returns table (
  category1_total int,
  category2_total int,
  category3_total int,
  total_score int,
  percentage numeric,
  final_grade text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_category1_total int := 0;
  v_category2_total int := 0;
  v_category3_total int := 0;
  v_total_raw int := 0;
  v_total_capped int := 0;
  v_percentage numeric := 0;
  v_final_grade text := 'Needs Improvement';
begin
  select
    coalesce(subject_pass_percentage, 0) + coalesce(student_feedback, 0) + coalesce(reading_material, 0) + coalesce(teaching_pedagogy, 0) + coalesce(slow_advanced_learners, 0) + coalesce(industrial_visits, 0),
    coalesce(journal_publications, 0) + coalesce(conference_proceedings, 0) + coalesce(book_chapters, 0) + coalesce(books_published, 0) + coalesce(consultancy_testing, 0) + coalesce(funded_projects, 0) + coalesce(patents, 0) + coalesce(research_guidance, 0),
    coalesce(professional_membership, 0) + coalesce(faculty_upskilling, 0) + coalesce(workshops_organized, 0) + coalesce(institutional_contributions, 0)
  into v_category1_total, v_category2_total, v_category3_total
  from public.performance_scores where user_id = _user_id limit 1;

  v_category1_total := coalesce(v_category1_total, 0);
  v_category2_total := coalesce(v_category2_total, 0);
  v_category3_total := coalesce(v_category3_total, 0);
  v_total_raw := v_category1_total + v_category2_total + v_category3_total;
  v_total_capped := least(v_total_raw, 250);
  v_percentage := case when v_total_capped > 0 then round((v_total_capped::numeric / 250::numeric) * 100::numeric, 2) else 0 end;
  v_final_grade := case when v_total_capped between 200 and 250 then 'Excellent' when v_total_capped between 175 and 199 then 'Very Good' when v_total_capped between 125 and 174 then 'Good' else 'Needs Improvement' end;

  return query select v_category1_total, v_category2_total, v_category3_total, v_total_capped, v_percentage, v_final_grade;
end;
$$;

-- Part 2: Update calculate_performance_score to populate the 18 appraisal fields
-- -----------------------------------------------------------------------------
create or replace function public.calculate_performance_score(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
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
  fdp_ratio numeric;
  visit_ratio numeric;
  course_ratio numeric;
  research_ratio numeric;
  cert_ratio numeric;
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
  select count(*) into fdp_count from public.fdp_programs where user_id = _user_id;
  select count(*) into visit_count from public.industrial_visits where user_id = _user_id;
  select count(*) into course_count from public.courses_handled where user_id = _user_id;
  select count(*) into paper_count from public.research_papers where user_id = _user_id;
  select count(*) into cert_count from public.certifications where user_id = _user_id;

  fdp_pts := least(fdp_count * 4, 20);
  visit_pts := least(visit_count * 4, 20);
  course_pts := least(course_count * 2, 20);
  research_pts := least(paper_count * 5, 20);
  cert_pts := least(cert_count * 4, 20);
  total_score := coalesce(fdp_pts, 0) + coalesce(visit_pts, 0) + coalesce(course_pts, 0) + coalesce(research_pts, 0) + coalesce(cert_pts, 0);

  if total_score >= 80 then score_category := 'Excellent';
  elsif total_score >= 60 then score_category := 'Good';
  elsif total_score >= 40 then score_category := 'Average';
  else score_category := 'Needs Improvement';
  end if;

  fdp_ratio := least(1, greatest(0, coalesce(fdp_pts, 0) / 20.0));
  visit_ratio := least(1, greatest(0, coalesce(visit_pts, 0) / 20.0));
  course_ratio := least(1, greatest(0, coalesce(course_pts, 0) / 20.0));
  research_ratio := least(1, greatest(0, coalesce(research_pts, 0) / 20.0));
  cert_ratio := least(1, greatest(0, coalesce(cert_pts, 0) / 20.0));

  v_subject_pass_percentage := round(5 * course_ratio);
  v_student_feedback := round(5 * course_ratio);
  v_reading_material := round(10 * course_ratio);
  v_teaching_pedagogy := round(10 * course_ratio);
  v_slow_advanced_learners := round(10 * course_ratio);
  v_industrial_visits := round(10 * visit_ratio);
  v_journal_publications := round(25 * research_ratio);
  v_conference_proceedings := round(10 * research_ratio);
  v_book_chapters := round(10 * research_ratio);
  v_books_published := round(5 * research_ratio);
  v_consultancy_testing := round(10 * research_ratio);
  v_funded_projects := round(25 * research_ratio);
  v_patents := round(5 * research_ratio);
  v_research_guidance := round(10 * research_ratio);
  v_professional_membership := round(20 * cert_ratio);
  v_faculty_upskilling := round(25 * fdp_ratio);
  v_workshops_organized := round(25 * fdp_ratio);
  v_institutional_contributions := round(30 * fdp_ratio);

  insert into public.performance_scores (
    user_id, overall_score, fdp_score, visit_score, course_score, research_score, certification_score, category, calculated_at,
    subject_pass_percentage, student_feedback, reading_material, teaching_pedagogy, slow_advanced_learners, industrial_visits,
    journal_publications, conference_proceedings, book_chapters, books_published, consultancy_testing, funded_projects, patents, research_guidance,
    professional_membership, faculty_upskilling, workshops_organized, institutional_contributions
  )
  values (
    _user_id, total_score, fdp_pts, visit_pts, course_pts, research_pts, cert_pts, score_category, now(),
    v_subject_pass_percentage, v_student_feedback, v_reading_material, v_teaching_pedagogy, v_slow_advanced_learners, v_industrial_visits,
    v_journal_publications, v_conference_proceedings, v_book_chapters, v_books_published, v_consultancy_testing, v_funded_projects, v_patents, v_research_guidance,
    v_professional_membership, v_faculty_upskilling, v_workshops_organized, v_institutional_contributions
  )
  on conflict (user_id)
  do update set
    overall_score = excluded.overall_score, fdp_score = excluded.fdp_score, visit_score = excluded.visit_score, course_score = excluded.course_score, research_score = excluded.research_score, certification_score = excluded.certification_score, category = excluded.category, calculated_at = now(),
    subject_pass_percentage = excluded.subject_pass_percentage, student_feedback = excluded.student_feedback, reading_material = excluded.reading_material, teaching_pedagogy = excluded.teaching_pedagogy, slow_advanced_learners = excluded.slow_advanced_learners, industrial_visits = excluded.industrial_visits,
    journal_publications = excluded.journal_publications, conference_proceedings = excluded.conference_proceedings, book_chapters = excluded.book_chapters, books_published = excluded.books_published, consultancy_testing = excluded.consultancy_testing, funded_projects = excluded.funded_projects, patents = excluded.patents, research_guidance = excluded.research_guidance,
    professional_membership = excluded.professional_membership, faculty_upskilling = excluded.faculty_upskilling, workshops_organized = excluded.workshops_organized, institutional_contributions = excluded.institutional_contributions;
end;
$$;

-- Recompute scores for all users who have performance_scores or activity data
do $$
declare
  r record;
begin
  for r in select distinct user_id from public.performance_scores
  union
  select distinct user_id from public.fdp_programs
  union
  select distinct user_id from public.industrial_visits
  union
  select distinct user_id from public.courses_handled
  union
  select distinct user_id from public.research_papers
  union
  select distinct user_id from public.certifications
  loop
    perform public.calculate_performance_score(r.user_id);
  end loop;
end;
$$;
