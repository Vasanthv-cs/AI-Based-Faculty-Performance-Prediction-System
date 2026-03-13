-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view faculty files" ON storage.objects;

-- Create a new policy that allows public access for the public bucket
CREATE POLICY "Public access to faculty files"
ON storage.objects FOR SELECT
USING (bucket_id = 'faculty-files');