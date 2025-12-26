-- FIX: Create missing storage bucket for review photos
-- This resolves the "Bucket not found" error during review photo upload.

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS is standard for Supabase Storage, usually enabled on storage.objects.
-- We add specific policies for this bucket.

-- Allow public access to view photos
DROP POLICY IF EXISTS "Public Access review-photos" ON storage.objects;
CREATE POLICY "Public Access review-photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'review-photos' );

-- Allow authenticated users to upload photos
DROP POLICY IF EXISTS "Authenticated Upload review-photos" ON storage.objects;
CREATE POLICY "Authenticated Upload review-photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'review-photos' 
    AND auth.role() = 'authenticated'
);

-- Allow users to update/delete their own photos
DROP POLICY IF EXISTS "Users can update own review-photos" ON storage.objects;
CREATE POLICY "Users can update own review-photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'review-photos' 
    AND auth.uid() = owner
);

DROP POLICY IF EXISTS "Users can delete own review-photos" ON storage.objects;
CREATE POLICY "Users can delete own review-photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'review-photos' 
    AND auth.uid() = owner
);
