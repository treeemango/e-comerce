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

        // Create unique file path: userId/messageId/filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${messageId}/${fileName}`;

        // Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('message-attachments')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (storageError) throw storageError;

        // Create database record
        const { data: dbData, error: dbError } = await supabase
            .from('message_attachments')
            .insert({
                message_id: messageId,
                file_name: file.name,
                storage_path: storageData.path,
                file_type: file.type,
                file_size: file.size
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return dbData as MessageAttachment;
    } catch (error) {
        console.error('Error uploading attachment:', error);
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
                const { data: urlData } = await supabase.storage
                    .from('message-attachments')
                    .createSignedUrl(attachment.storage_path, 3600); // 1 hour expiry

                return {
                    ...attachment,
                    signedUrl: urlData?.signedUrl || ''
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
        const { error: storageError } = await supabase.storage
            .from('message-attachments')
            .remove([attachment.storage_path]);

        if (storageError) throw storageError;

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
        const { data } = await supabase.storage
            .from('message-attachments')
            .createSignedUrl(storagePath, 3600);

        return data?.signedUrl || '';
    } catch (error) {
        console.error('Error getting attachment URL:', error);
        return '';
    }
};
