-- ============================================================================
-- Supabase Storage Setup for Message Attachments
-- ============================================================================
-- Run this in your Supabase SQL Editor to create the storage bucket

-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'message-attachments',
    'message-attachments',
    false, -- Private bucket (authenticated users only)
    10485760, -- 10MB limit
    ARRAY[
        'image/png',
        'image/jpeg', 
        'image/jpg',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip'
    ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'message-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view any attachments (they'll be filtered by message access in the app)
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

-- Allow users to delete their own uploads only
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'message-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
