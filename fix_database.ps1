$projectId = "ygtlbwjerlhkxcgzezwr"
$token = "sbp_506f190da9811a63c926fff784c2cc36c6fb9214"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

$results = @()

function Run-SQL($sql, $label) {
    $body = @{ query = $sql } | ConvertTo-Json -Depth 10
    try {
        $r = Invoke-RestMethod -Method POST `
            -Uri "https://api.supabase.com/v1/projects/$projectId/database/query" `
            -Headers $headers `
            -Body $body
        $results += "$label : OK"
        return "OK"
    } catch {
        $err = $_.ErrorDetails.Message
        $results += "$label : ERROR -> $err"
        return "ERROR: $err"
    }
}

$log = @()

$log += "STEP 1: " + (Run-SQL "INSERT INTO public.profiles (user_id, email, full_name) SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email) FROM auth.users ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);" "Sync profiles")

$log += "STEP 2: " + (Run-SQL "INSERT INTO public.user_roles (user_id, role) SELECT id, 'faculty'::app_role FROM auth.users ON CONFLICT (user_id, role) DO NOTHING;" "Sync user_roles")

$log += "STEP 3: " + (Run-SQL "INSERT INTO storage.buckets (id, name, public) VALUES ('faculty-files', 'faculty-files', true) ON CONFLICT (id) DO UPDATE SET public = true;" "Storage bucket")

$log += "STEP 4: " + (Run-SQL "DROP POLICY IF EXISTS ""Faculty Files Access"" ON storage.objects; DROP POLICY IF EXISTS ""Faculty Files Full Access"" ON storage.objects; DROP POLICY IF EXISTS ""Users can upload own files"" ON storage.objects; DROP POLICY IF EXISTS ""Users can update own files"" ON storage.objects; DROP POLICY IF EXISTS ""Users can delete own files"" ON storage.objects; DROP POLICY IF EXISTS ""Anyone can view faculty files"" ON storage.objects; DROP POLICY IF EXISTS ""Public access to faculty files"" ON storage.objects; CREATE POLICY ""Faculty Files Full Access"" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'faculty-files') WITH CHECK (bucket_id = 'faculty-files');" "Storage RLS")

$log += "STEP 5: " + (Run-SQL "DROP POLICY IF EXISTS ""Admins can view all profiles"" ON public.profiles; CREATE POLICY ""Admins can view all profiles"" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);" "Profiles RLS")

$log += "STEP 6: " + (Run-SQL "DROP POLICY IF EXISTS ""Admins can view all roles"" ON public.user_roles; DROP POLICY IF EXISTS ""Admins can view all user roles"" ON public.user_roles; CREATE POLICY ""Admins can view all user roles"" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());" "UserRoles RLS")

$log += "STEP 7: " + (Run-SQL "CREATE TABLE IF NOT EXISTS public.appraisal_cycles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), academic_year TEXT NOT NULL, semester TEXT NOT NULL, is_open BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL); ALTER TABLE public.appraisal_cycles ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ""Anyone can view appraisal cycles"" ON public.appraisal_cycles; CREATE POLICY ""Anyone can view appraisal cycles"" ON public.appraisal_cycles FOR SELECT TO authenticated USING (true); DROP POLICY IF EXISTS ""Admins can manage appraisal cycles"" ON public.appraisal_cycles; CREATE POLICY ""Admins can manage appraisal cycles"" ON public.appraisal_cycles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));" "appraisal_cycles")

$log += "STEP 8: " + (Run-SQL "CREATE TABLE IF NOT EXISTS public.announcements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, message TEXT NOT NULL, is_active BOOLEAN DEFAULT true, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL); ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ""Anyone can read announcements"" ON public.announcements; CREATE POLICY ""Anyone can read announcements"" ON public.announcements FOR SELECT TO authenticated USING (true); DROP POLICY IF EXISTS ""Admins can manage announcements"" ON public.announcements; CREATE POLICY ""Admins can manage announcements"" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));" "announcements")

$log += "STEP 9: " + (Run-SQL "CREATE TABLE IF NOT EXISTS public.teaching_learning_activities (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, academic_year TEXT NOT NULL, semester TEXT NOT NULL, subject_pass_percentage NUMERIC DEFAULT 0, subject_pass_score NUMERIC DEFAULT 0, student_feedback_percentage NUMERIC DEFAULT 0, student_feedback_score NUMERIC DEFAULT 0, instruction_material_level TEXT DEFAULT 'Good', instruction_material_score NUMERIC DEFAULT 0, pedagogy_level TEXT DEFAULT 'Good', pedagogy_score NUMERIC DEFAULT 0, learners_action_level TEXT DEFAULT 'Good', learners_action_score NUMERIC DEFAULT 0, visits_lectures_level TEXT DEFAULT 'Good', visits_lectures_score NUMERIC DEFAULT 0, proof_url TEXT, role TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL); ALTER TABLE public.teaching_learning_activities ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ""Users manage own teaching activities"" ON public.teaching_learning_activities; CREATE POLICY ""Users manage own teaching activities"" ON public.teaching_learning_activities FOR ALL TO authenticated USING (user_id = auth.uid()); DROP POLICY IF EXISTS ""Admins view all teaching activities"" ON public.teaching_learning_activities; CREATE POLICY ""Admins view all teaching activities"" ON public.teaching_learning_activities FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));" "teaching_learning_activities")

$log += "STEP 10: " + (Run-SQL "CREATE TABLE IF NOT EXISTS public.memberships_fdp (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, organization TEXT NOT NULL, year TEXT, duration TEXT, role TEXT, score_claimed NUMERIC DEFAULT 0, proof_url TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL); ALTER TABLE public.memberships_fdp ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ""Users manage own memberships"" ON public.memberships_fdp; CREATE POLICY ""Users manage own memberships"" ON public.memberships_fdp FOR ALL TO authenticated USING (user_id = auth.uid()); DROP POLICY IF EXISTS ""Admins view all memberships"" ON public.memberships_fdp; CREATE POLICY ""Admins view all memberships"" ON public.memberships_fdp FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));" "memberships_fdp")

$log += "STEP 11: " + (Run-SQL "CREATE TABLE IF NOT EXISTS public.research_activities (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, title TEXT NOT NULL, academic_year TEXT, activity_category TEXT, activity_level TEXT DEFAULT 'Good', role TEXT, score_claimed NUMERIC DEFAULT 0, proof_url TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL); ALTER TABLE public.research_activities ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ""Users manage own research"" ON public.research_activities; CREATE POLICY ""Users manage own research"" ON public.research_activities FOR ALL TO authenticated USING (user_id = auth.uid()); DROP POLICY IF EXISTS ""Admins view all research"" ON public.research_activities; CREATE POLICY ""Admins view all research"" ON public.research_activities FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));" "research_activities")

$log += "STEP 12: " + (Run-SQL "CREATE TABLE IF NOT EXISTS public.events_contributions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, organizer TEXT, date TEXT, role TEXT, level TEXT, score_claimed NUMERIC DEFAULT 0, proof_url TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL); ALTER TABLE public.events_contributions ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ""Users manage own events"" ON public.events_contributions; CREATE POLICY ""Users manage own events"" ON public.events_contributions FOR ALL TO authenticated USING (user_id = auth.uid()); DROP POLICY IF EXISTS ""Admins view all events"" ON public.events_contributions; CREATE POLICY ""Admins view all events"" ON public.events_contributions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));" "events_contributions")

$log += "STEP 13: " + (Run-SQL "CREATE TABLE IF NOT EXISTS public.patents_guidance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, detail TEXT, year TEXT, status_field TEXT, score_claimed NUMERIC DEFAULT 0, proof_url TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL); ALTER TABLE public.patents_guidance ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ""Users manage own patents"" ON public.patents_guidance; CREATE POLICY ""Users manage own patents"" ON public.patents_guidance FOR ALL TO authenticated USING (user_id = auth.uid()); DROP POLICY IF EXISTS ""Admins view all patents"" ON public.patents_guidance; CREATE POLICY ""Admins view all patents"" ON public.patents_guidance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));" "patents_guidance")

$log += "STEP 14: " + (Run-SQL "CREATE TABLE IF NOT EXISTS public.projects_consultancy (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, agency TEXT, amount NUMERIC, year TEXT, duration TEXT, score_claimed NUMERIC DEFAULT 0, proof_url TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL); ALTER TABLE public.projects_consultancy ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ""Users manage own projects"" ON public.projects_consultancy; CREATE POLICY ""Users manage own projects"" ON public.projects_consultancy FOR ALL TO authenticated USING (user_id = auth.uid()); DROP POLICY IF EXISTS ""Admins view all projects"" ON public.projects_consultancy; CREATE POLICY ""Admins view all projects"" ON public.projects_consultancy FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));" "projects_consultancy")

$log += "STEP 15: " + (Run-SQL "CREATE TABLE IF NOT EXISTS public.networking_contributions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, organization TEXT, year TEXT, role TEXT, score_claimed NUMERIC DEFAULT 0, proof_url TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL); ALTER TABLE public.networking_contributions ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ""Users manage own networking"" ON public.networking_contributions; CREATE POLICY ""Users manage own networking"" ON public.networking_contributions FOR ALL TO authenticated USING (user_id = auth.uid()); DROP POLICY IF EXISTS ""Admins view all networking"" ON public.networking_contributions; CREATE POLICY ""Admins view all networking"" ON public.networking_contributions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));" "networking_contributions")

$log | Out-File -FilePath "fix_database_results.txt" -Encoding utf8
$log
