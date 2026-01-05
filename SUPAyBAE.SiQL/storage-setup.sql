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
        'image/avif',
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

-- Allow authenticated users to upload files to their own folder,
-- but only for messages they have access to (participant/support/admin)
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
        bucket_id = 'message-attachments'
    AND (
        -- Canonical layout: <uid>/<message_id>/<file>
        auth.uid()::text = (storage.foldername(name))[1]
        -- Legacy layout (some clients): message-attachments/<uid>/<message_id>/<file>
        OR (
            (storage.foldername(name))[1] = 'message-attachments'
            AND auth.uid()::text = (storage.foldername(name))[2]
        )
        -- Legacy layout (older clients): temp-*/<uid>/<message_id>/<file>
        OR (
            (storage.foldername(name))[1] LIKE 'temp-%'
            AND auth.uid()::text = (storage.foldername(name))[2]
        )
    )
        AND EXISTS (
                SELECT 1
                FROM public.messages m
        WHERE m.id::text = (
            CASE
                WHEN (storage.foldername(name))[1] = 'message-attachments' THEN (storage.foldername(name))[3]
                WHEN (storage.foldername(name))[1] LIKE 'temp-%' THEN (storage.foldername(name))[3]
                ELSE (storage.foldername(name))[2]
            END
        )
                    AND (
                        m.sender_id = auth.uid()
                        OR m.receiver_id = auth.uid()
                        OR public.is_admin_user(auth.uid())
                        OR EXISTS (
                                SELECT 1
                                FROM public.conversation_support_participants csp
                                WHERE csp.conversation_id = m.conversation_id
                                    AND csp.admin_id = auth.uid()
                        )
                    )
        )
);

-- Only allow users to read objects that are referenced by an attachment row
-- they are allowed to access (participant/support/admin)
DROP POLICY IF EXISTS "Users can view message attachments" ON storage.objects;
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
        bucket_id = 'message-attachments'
        AND EXISTS (
                SELECT 1
                FROM public.message_attachments ma
                JOIN public.messages m ON m.id = ma.message_id
        WHERE (
            ma.storage_path = name
            OR ma.storage_path = 'message-attachments/' || name
            OR name = replace(ma.storage_path, 'message-attachments/', '')
            )
                    AND (
                        m.sender_id = auth.uid()
                        OR m.receiver_id = auth.uid()
                        OR public.is_admin_user(auth.uid())
                        OR EXISTS (
                                SELECT 1
                                FROM public.conversation_support_participants csp
                                WHERE csp.conversation_id = m.conversation_id
                                    AND csp.admin_id = auth.uid()
                        )
                    )
        )
);

-- Allow delete only for own folder AND only for messages they can access
DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
        bucket_id = 'message-attachments'
    AND (
        -- Canonical layout: <uid>/<message_id>/<file>
        auth.uid()::text = (storage.foldername(name))[1]
        -- Legacy layout (some clients): message-attachments/<uid>/<message_id>/<file>
        OR (
            (storage.foldername(name))[1] = 'message-attachments'
            AND auth.uid()::text = (storage.foldername(name))[2]
        )
        -- Legacy layout (older clients): temp-*/<uid>/<message_id>/<file>
        OR (
            (storage.foldername(name))[1] LIKE 'temp-%'
            AND auth.uid()::text = (storage.foldername(name))[2]
        )
    )
        AND EXISTS (
                SELECT 1
                FROM public.messages m
        WHERE m.id::text = (
            CASE
                WHEN (storage.foldername(name))[1] = 'message-attachments' THEN (storage.foldername(name))[3]
                WHEN (storage.foldername(name))[1] LIKE 'temp-%' THEN (storage.foldername(name))[3]
                ELSE (storage.foldername(name))[2]
            END
        )
                    AND (
                        m.sender_id = auth.uid()
                        OR m.receiver_id = auth.uid()
                        OR public.is_admin_user(auth.uid())
                        OR EXISTS (
                                SELECT 1
                                FROM public.conversation_support_participants csp
                                WHERE csp.conversation_id = m.conversation_id
                                    AND csp.admin_id = auth.uid()
                        )
                    )
        )
);

-- 3. Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
