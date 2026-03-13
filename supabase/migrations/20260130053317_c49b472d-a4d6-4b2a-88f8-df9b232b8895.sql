-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'hod', 'faculty');

-- Create user_roles table (per security requirements - roles stored separately)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Create departments table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id),
    designation TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create FDP programs table
CREATE TABLE public.fdp_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    organization TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    duration_days INTEGER,
    certificate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create industrial visits table
CREATE TABLE public.industrial_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    industry_name TEXT NOT NULL,
    location TEXT NOT NULL,
    visit_date DATE NOT NULL,
    students_count INTEGER,
    description TEXT,
    proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create courses handled table
CREATE TABLE public.courses_handled (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_name TEXT NOT NULL,
    course_code TEXT,
    semester TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    students_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create research papers table
CREATE TABLE public.research_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    journal TEXT NOT NULL,
    publication_year INTEGER NOT NULL,
    authors TEXT[],
    doi TEXT,
    citations INTEGER DEFAULT 0,
    proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create certifications table
CREATE TABLE public.certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    credential_id TEXT,
    certificate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create performance scores table
CREATE TABLE public.performance_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    fdp_score DECIMAL(5,2) DEFAULT 0,
    visit_score DECIMAL(5,2) DEFAULT 0,
    course_score DECIMAL(5,2) DEFAULT 0,
    research_score DECIMAL(5,2) DEFAULT 0,
    certification_score DECIMAL(5,2) DEFAULT 0,
    category TEXT DEFAULT 'Needs Improvement',
    trend TEXT DEFAULT 'stable',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create AI insights table
CREATE TABLE public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence INTEGER DEFAULT 85,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdp_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industrial_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses_handled ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for departments
CREATE POLICY "Anyone authenticated can view departments" ON public.departments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments" ON public.departments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can view department profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hod') AND 
    department_id = public.get_user_department(auth.uid())
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activity tables (fdp_programs, etc.)
-- FDP Programs
CREATE POLICY "Users can manage own fdp" ON public.fdp_programs
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all fdp" ON public.fdp_programs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can view department fdp" ON public.fdp_programs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hod') AND 
    user_id IN (SELECT user_id FROM public.profiles WHERE department_id = public.get_user_department(auth.uid()))
  );

-- Industrial Visits
CREATE POLICY "Users can manage own visits" ON public.industrial_visits
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all visits" ON public.industrial_visits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can view department visits" ON public.industrial_visits
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hod') AND 
    user_id IN (SELECT user_id FROM public.profiles WHERE department_id = public.get_user_department(auth.uid()))
  );

-- Courses Handled
CREATE POLICY "Users can manage own courses" ON public.courses_handled
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all courses" ON public.courses_handled
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can view department courses" ON public.courses_handled
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hod') AND 
    user_id IN (SELECT user_id FROM public.profiles WHERE department_id = public.get_user_department(auth.uid()))
  );

-- Research Papers
CREATE POLICY "Users can manage own papers" ON public.research_papers
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all papers" ON public.research_papers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can view department papers" ON public.research_papers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hod') AND 
    user_id IN (SELECT user_id FROM public.profiles WHERE department_id = public.get_user_department(auth.uid()))
  );

-- Certifications
CREATE POLICY "Users can manage own certifications" ON public.certifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all certifications" ON public.certifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can view department certifications" ON public.certifications
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hod') AND 
    user_id IN (SELECT user_id FROM public.profiles WHERE department_id = public.get_user_department(auth.uid()))
  );

-- Performance Scores
CREATE POLICY "Users can view own scores" ON public.performance_scores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all scores" ON public.performance_scores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can view department scores" ON public.performance_scores
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hod') AND 
    user_id IN (SELECT user_id FROM public.profiles WHERE department_id = public.get_user_department(auth.uid()))
  );

-- AI Insights
CREATE POLICY "Users can view own insights" ON public.ai_insights
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all insights" ON public.ai_insights
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can view department insights" ON public.ai_insights
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hod') AND 
    user_id IN (SELECT user_id FROM public.profiles WHERE department_id = public.get_user_department(auth.uid()))
  );

-- Create storage bucket for faculty files
INSERT INTO storage.buckets (id, name, public) VALUES ('faculty-files', 'faculty-files', true);

-- Storage policies
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'faculty-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'faculty-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'faculty-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view faculty files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'faculty-files');

-- Insert default departments
INSERT INTO public.departments (name, code) VALUES 
  ('Computer Science', 'CS'),
  ('Electronics & Communication', 'ECE'),
  ('Mechanical Engineering', 'ME'),
  ('Civil Engineering', 'CE'),
  ('Electrical Engineering', 'EE');

-- Function to handle new user signup - creates profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Default role is faculty
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'faculty');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fdp_programs_updated_at BEFORE UPDATE ON public.fdp_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_industrial_visits_updated_at BEFORE UPDATE ON public.industrial_visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_handled_updated_at BEFORE UPDATE ON public.courses_handled FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_research_papers_updated_at BEFORE UPDATE ON public.research_papers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON public.certifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();