-- Faculty Appraisal Scoring System
-- Adds detailed scoring fields to performance_scores (non-breaking)
-- and defines calculate_final_appraisal(_user_id uuid) RPC function.

-- Extend performance_scores with detailed appraisal fields if not present.
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

-- Optimize lookups by user_id.
create index if not exists idx_performance_scores_user_id
  on public.performance_scores (user_id);

-- Calculate final appraisal for a given user.
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
  v_final_grade text := 'Poor';
begin
  /*
    Faculty Appraisal Scoring
    - CATEGORY I – Teaching & Learning (Max 50)
      subject_pass_percentage (5)
      student_feedback (5)
      reading_material (10)
      teaching_pedagogy (10)
      slow_advanced_learners (10)
      industrial_visits (10)

    - CATEGORY II – Research (Max 100)
      journal_publications (25)
      conference_proceedings (10)
      book_chapters (10)
      books_published (5)
      consultancy_testing (10)
      funded_projects (25)
      patents (5)
      research_guidance (10)

    - CATEGORY III – Networking (Max 100)
      professional_membership (20)
      faculty_upskilling (25)
      workshops_organized (25)
      institutional_contributions (30)

    Total maximum score: 250
  */

  -- Single row fetch for all detailed fields for the given user.
  select
    coalesce(subject_pass_percentage, 0) +
    coalesce(student_feedback, 0) +
    coalesce(reading_material, 0) +
    coalesce(teaching_pedagogy, 0) +
    coalesce(slow_advanced_learners, 0) +
    coalesce(industrial_visits, 0) as category1_sum,

    coalesce(journal_publications, 0) +
    coalesce(conference_proceedings, 0) +
    coalesce(book_chapters, 0) +
    coalesce(books_published, 0) +
    coalesce(consultancy_testing, 0) +
    coalesce(funded_projects, 0) +
    coalesce(patents, 0) +
    coalesce(research_guidance, 0) as category2_sum,

    coalesce(professional_membership, 0) +
    coalesce(faculty_upskilling, 0) +
    coalesce(workshops_organized, 0) +
    coalesce(institutional_contributions, 0) as category3_sum
  into
    v_category1_total,
    v_category2_total,
    v_category3_total
  from public.performance_scores
  where user_id = _user_id
  limit 1;

  -- If no row exists for this user, treat all totals as zero.
  v_category1_total := coalesce(v_category1_total, 0);
  v_category2_total := coalesce(v_category2_total, 0);
  v_category3_total := coalesce(v_category3_total, 0);

  -- Total score before capping.
  v_total_raw := v_category1_total + v_category2_total + v_category3_total;

  -- Enforce maximum total score of 250.
  v_total_capped := least(v_total_raw, 250);

  -- Calculate percentage based on max 250, rounded to 2 decimals.
  if v_total_capped > 0 then
    v_percentage := round((v_total_capped::numeric / 250::numeric) * 100::numeric, 2);
  else
    v_percentage := 0;
  end if;

  -- Assign final grade based on capped total score.
  if v_total_capped between 200 and 250 then
    v_final_grade := 'Excellent';
  elsif v_total_capped between 175 and 199 then
    v_final_grade := 'Very Good';
  elsif v_total_capped between 125 and 174 then
    v_final_grade := 'Good';
  else
    v_final_grade := 'Poor';
  end if;

  -- Return a single-row result set as required by Supabase RPC.
  return query
  select
    v_category1_total,
    v_category2_total,
    v_category3_total,
    v_total_capped,
    v_percentage,
    v_final_grade;
end;
$$;

