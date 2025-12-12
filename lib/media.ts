
import { supabase } from './supabase';

export interface UploadResult {
    url: string;
    storage_path: string;
    media_type: 'image' | 'video';
}

export class MediaService {
    private static instance: MediaService;
    private bucketName = 'products'; // Ensure this bucket exists

    private constructor() { }

    public static getInstance(): MediaService {
        if (!MediaService.instance) {
            MediaService.instance = new MediaService();
        }
        return MediaService.instance;
    }

    public async uploadFile(file: File, sellerId: string): Promise<UploadResult> {
        try {
            // Generate a unique path
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);
            const fileExt = file.name.split('.').pop();
            const storagePath = `${sellerId}/${timestamp}-${randomString}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Error uploading file:', error);
                throw error;
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from(this.bucketName)
                .getPublicUrl(storagePath);

            return {
                url: publicUrlData.publicUrl,
                storage_path: storagePath,
                media_type: file.type.startsWith('video') ? 'video' : 'image'
            };
        } catch (error) {
            console.error('Media upload failed:', error);
            throw error;
        }
    }

    public async uploadFiles(files: File[], sellerId: string): Promise<UploadResult[]> {
        const uploadPromises = files.map(file => this.uploadFile(file, sellerId));
        return Promise.all(uploadPromises);
    }
}
