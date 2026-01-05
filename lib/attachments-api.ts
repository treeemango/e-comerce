// ============================================================================
// Message Attachments API Functions
// ============================================================================

import { supabase } from './supabase';

export interface MessageAttachment {
    id: string;
    message_id: string;
    file_name: string;
    storage_path: string;
    file_type: string | null;
    file_size: number | null;
    created_at: string;
    signedUrl?: string; // Added when fetching
}

const getAttachmentPathCandidates = (storagePath: string): string[] => {
    const p = (storagePath || '').trim().replace(/^\/+/, '');
    const stripped = p.startsWith('message-attachments/') ? p.slice('message-attachments/'.length) : p;
    const candidates = [p, stripped].filter(Boolean);
    return Array.from(new Set(candidates));
};

const createSignedUrlWithFallback = async (storagePath: string, expiresIn: number): Promise<string> => {
    const candidates = getAttachmentPathCandidates(storagePath);
    for (const candidate of candidates) {
        const { data, error } = await supabase.storage
            .from('message-attachments')
            .createSignedUrl(candidate, expiresIn);
        if (!error && data?.signedUrl) return data.signedUrl;
    }
    return '';
};

const removeWithFallback = async (storagePath: string): Promise<{ ok: boolean; error?: any }> => {
    const candidates = getAttachmentPathCandidates(storagePath);
    for (const candidate of candidates) {
        const { error } = await supabase.storage
            .from('message-attachments')
            .remove([candidate]);
        if (!error) return { ok: true };
    }
    return { ok: false, error: { message: 'Failed to delete attachment from storage', storagePath } };
};

const getExtensionForMime = (mime: string): string => {
    const m = (mime || '').toLowerCase();
    if (m === 'image/webp') return 'webp';
    if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
    if (m === 'image/png') return 'png';
    if (m === 'image/gif') return 'gif';
    if (m === 'image/avif') return 'avif';
    if (m === 'application/pdf') return 'pdf';
    return (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]+/g, '') || 'bin';
};

const stripFileExtension = (name: string): string => {
    if (!name) return 'file';
    return name.replace(/\.[^/.]+$/, '');
};

const compressImageFile = async (file: File): Promise<File> => {
    // Only compress images; ignore SVG and tiny files
    if (!file.type?.startsWith('image/')) return file;
    if (file.type === 'image/svg+xml') return file;
    // Convert AVIF even when small (some buckets/displays don't handle it well)
    if (file.type !== 'image/avif' && file.size <= 120 * 1024) return file;

    // Guard against extremely large images (avoid OOM)
    if (file.size > 25 * 1024 * 1024) return file;

    const TARGET_MAX_BYTES = 500 * 1024; // ~500KB
    const MAX_DIMENSION = 1080;

    const supportsWebp = (() => {
        try {
            const canvas = document.createElement('canvas');
            const data = canvas.toDataURL('image/webp');
            return data.startsWith('data:image/webp');
        } catch {
            return false;
        }
    })();

    const targetMime = supportsWebp ? 'image/webp' : 'image/jpeg';

    try {
        let bitmap: ImageBitmap | null = null;
        try {
            // imageOrientation is supported in modern browsers; cast to avoid TS lib mismatch
            bitmap = await createImageBitmap(file as any, { imageOrientation: 'from-image' } as any);
        } catch {
            bitmap = await createImageBitmap(file);
        }

        const width = bitmap.width;
        const height = bitmap.height;
        if (!width || !height) {
            bitmap.close();
            return file;
        }

        const encode = async (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
            await new Promise(resolve => {
                canvas.toBlob(resolve, targetMime, quality);
            });

        const tryEncodeWithinLimit = async (canvas: HTMLCanvasElement): Promise<Blob | null> => {
            // Start higher quality, then step down until <= target size.
            const qualities = [0.82, 0.75, 0.68, 0.6, 0.52];
            let last: Blob | null = null;
            for (const q of qualities) {
                const b = await encode(canvas, q);
                if (!b) continue;
                last = b;
                if (b.size <= TARGET_MAX_BYTES) return b;
            }
            return last;
        };

        const baseScale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
        const scales = [baseScale, baseScale * 0.85, baseScale * 0.72];

        let bestBlob: Blob | null = null;

        for (const s of scales) {
            const outW = Math.max(1, Math.round(width * s));
            const outH = Math.max(1, Math.round(height * s));
            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            ctx.drawImage(bitmap, 0, 0, outW, outH);

            const blob = await tryEncodeWithinLimit(canvas);
            if (!blob) continue;
            bestBlob = blob;
            if (blob.size <= TARGET_MAX_BYTES) break;
        }

        bitmap.close();

        if (!bestBlob) return file;

        // If compression didn't help, keep original
        if (bestBlob.size >= file.size && file.type !== 'image/avif') return file;

        const base = stripFileExtension(file.name);
        const ext = getExtensionForMime(targetMime);
        return new File([bestBlob], `${base}.${ext}`, {
            type: targetMime,
            lastModified: file.lastModified
        });
    } catch {
        return file;
    }
};

/**
 * Upload a file attachment for a message
 */
export const uploadMessageAttachment = async (
    messageId: string,
    file: File
): Promise<MessageAttachment | null> => {
    try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error('Not authenticated');

        const uploadFile = await compressImageFile(file);

        if (!messageId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)) {
            console.error('[uploadMessageAttachment] Invalid messageId provided:', { messageId, fileName: file.name });
            throw new Error('Invalid messageId for attachment upload');
        }

        // Create unique file path: userId/messageId/filename
        const fileExt = getExtensionForMime(uploadFile.type || file.type || 'application/octet-stream');
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${messageId}/${fileName}`;

        console.log('[uploadMessageAttachment] uploading', {
            bucket: 'message-attachments',
            filePath,
            originalName: file.name,
            mime: uploadFile.type || file.type,
            size: uploadFile.size,
            messageId
        });

        // Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('message-attachments')
            .upload(filePath, uploadFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (storageError) {
            console.error('[uploadMessageAttachment] storage upload failed', {
                filePath,
                messageId,
                error: storageError
            });
            throw storageError;
        }

        // Create database record
        const { data: dbData, error: dbError } = await supabase
            .from('message_attachments')
            .insert({
                message_id: messageId,
                file_name: file.name,
                storage_path: storageData.path,
                file_type: uploadFile.type || file.type,
                file_size: uploadFile.size
            })
            .select()
            .single();

        if (dbError) {
            console.error('[uploadMessageAttachment] DB insert failed', {
                messageId,
                storagePath: storageData?.path,
                error: dbError
            });
            throw dbError;
        }

        return dbData as MessageAttachment;
    } catch (error) {
        console.error('[uploadMessageAttachment] Error uploading attachment', {
            messageId,
            fileName: file?.name,
            fileType: file?.type,
            fileSize: file?.size,
            error
        });
        return null;
    }
};

/**
 * Get all attachments for a message (with signed URLs)
 */
export const getMessageAttachments = async (
    messageId: string
): Promise<MessageAttachment[]> => {
    try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!messageId || !uuidRegex.test(messageId)) return [];

        const { data, error } = await supabase
            .from('message_attachments')
            .select('*')
            .eq('message_id', messageId)
            .order('created_at', { ascending: true });

        

        if (error) throw error;
        if (!data) return [];

        // Generate signed URLs for each attachment
        const attachmentsWithUrls = await Promise.all(
            data.map(async (attachment) => {
                return {
                    ...attachment,
                    signedUrl: await createSignedUrlWithFallback(attachment.storage_path, 3600)
                } as MessageAttachment;
            })
        );

        return attachmentsWithUrls;
    } catch (error) {
        console.error('Error fetching attachments:', error);
        return [];
    }
};

/**
 * Delete an attachment (both storage and database)
 */
export const deleteMessageAttachment = async (
    attachmentId: string
): Promise<boolean> => {
    try {
        // Get attachment details first
        const { data: attachment, error: fetchError } = await supabase
            .from('message_attachments')
            .select('storage_path')
            .eq('id', attachmentId)
            .single();

        if (fetchError || !attachment) throw new Error('Attachment not found');

        // Delete from storage
        const storageResult = await removeWithFallback(attachment.storage_path);
        if (!storageResult.ok) throw storageResult.error;

        // Delete from database
        const { error: dbError } = await supabase
            .from('message_attachments')
            .delete()
            .eq('id', attachmentId);

        if (dbError) throw dbError;

        return true;
    } catch (error) {
        console.error('Error deleting attachment:', error);
        return false;
    }
};

/**
 * Get public URL for an attachment (for display)
 */
export const getAttachmentUrl = async (storagePath: string): Promise<string> => {
    try {
        return await createSignedUrlWithFallback(storagePath, 3600);
    } catch (error) {
        console.error('Error getting attachment URL:', error);
        return '';
    }
};
