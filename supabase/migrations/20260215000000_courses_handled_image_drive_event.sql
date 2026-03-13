-- Add image proof, Drive link, and event image columns to courses_handled
ALTER TABLE public.courses_handled
ADD COLUMN IF NOT EXISTS image_proof_url text,
ADD COLUMN IF NOT EXISTS drive_link text,
ADD COLUMN IF NOT EXISTS event_image_url text;
