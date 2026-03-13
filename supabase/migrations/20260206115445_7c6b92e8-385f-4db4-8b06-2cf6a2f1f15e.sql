
-- Create industry_projects table
CREATE TABLE public.industry_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  funding_amount NUMERIC,
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create book_publications table
CREATE TABLE public.book_publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  authors TEXT[] DEFAULT '{}',
  publisher TEXT NOT NULL,
  publication_year INTEGER NOT NULL,
  isbn TEXT,
  book_type TEXT NOT NULL DEFAULT 'textbook',
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conference_publications table
CREATE TABLE public.conference_publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  conference_name TEXT NOT NULL,
  location TEXT NOT NULL,
  presentation_date DATE NOT NULL,
  paper_type TEXT NOT NULL DEFAULT 'paper',
  authors TEXT[] DEFAULT '{}',
  doi TEXT,
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.industry_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conference_publications ENABLE ROW LEVEL SECURITY;

-- RLS policies for industry_projects
CREATE POLICY "Users can manage own industry projects" ON public.industry_projects FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can view all industry projects" ON public.industry_projects FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HODs can view department industry projects" ON public.industry_projects FOR SELECT USING (has_role(auth.uid(), 'hod'::app_role) AND user_id IN (SELECT user_id FROM profiles WHERE department_id = get_user_department(auth.uid())));

-- RLS policies for book_publications
CREATE POLICY "Users can manage own book publications" ON public.book_publications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can view all book publications" ON public.book_publications FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HODs can view department book publications" ON public.book_publications FOR SELECT USING (has_role(auth.uid(), 'hod'::app_role) AND user_id IN (SELECT user_id FROM profiles WHERE department_id = get_user_department(auth.uid())));

-- RLS policies for conference_publications
CREATE POLICY "Users can manage own conference publications" ON public.conference_publications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can view all conference publications" ON public.conference_publications FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HODs can view department conference publications" ON public.conference_publications FOR SELECT USING (has_role(auth.uid(), 'hod'::app_role) AND user_id IN (SELECT user_id FROM profiles WHERE department_id = get_user_department(auth.uid())));

-- Create triggers for updated_at
CREATE TRIGGER update_industry_projects_updated_at BEFORE UPDATE ON public.industry_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_book_publications_updated_at BEFORE UPDATE ON public.book_publications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conference_publications_updated_at BEFORE UPDATE ON public.conference_publications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
