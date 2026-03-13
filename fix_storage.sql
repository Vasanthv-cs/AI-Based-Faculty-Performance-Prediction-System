-- ==========================================
-- STORAGE BUCKET FIX
-- ==========================================

-- 1. Create the 'faculty-files' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'faculty-files', 'faculty-files', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'faculty-files'
);

-- 2. Set Up RLS Policies for the bucket
-- Allow public access to read files (if you want them private, set public to false above and adjust these)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'faculty-files');
    
    DROP POLICY IF EXISTS "Authenticated User Upload" ON storage.objects;
    CREATE POLICY "Authenticated User Upload" ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'faculty-files' AND auth.role() = 'authenticated'
    );
    
    DROP POLICY IF EXISTS "User Update Own Files" ON storage.objects;
    CREATE POLICY "User Update Own Files" ON storage.objects FOR UPDATE USING (
        bucket_id = 'faculty-files' AND auth.uid()::text = (storage.foldername(name))[1]
    );

    DROP POLICY IF EXISTS "User Delete Own Files" ON storage.objects;
    CREATE POLICY "User Delete Own Files" ON storage.objects FOR DELETE USING (
        bucket_id = 'faculty-files' AND auth.uid()::text = (storage.foldername(name))[1]
    );
END
$$;
