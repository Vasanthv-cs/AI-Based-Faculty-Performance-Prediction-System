-- Add new profile fields for DOB and experience
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS years_of_experience integer;