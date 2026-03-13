-- Add result_percentage and student_feedback columns to courses_handled table
ALTER TABLE public.courses_handled 
ADD COLUMN result_percentage numeric CHECK (result_percentage >= 0 AND result_percentage <= 100),
ADD COLUMN student_feedback text;