
import { supabase } from './supabase';
import {
    processImageForUpload,
    validateImageFile,
    getOptimizedImageUrl,
    generateSrcSet,
    generateSizes,
    IMAGE_VARIANTS,
    type ImageVariantName,
    type ProcessedImage
} from './image-utils';

// ============================================================================
// Types
// ============================================================================

export interface UploadResult {
    url: string;
    storage_path: string;
    media_type: 'image' | 'video';
    // Optimized variant URLs
    url_thumb?: string;
    url_grid?: string;
    url_detail?: string;
    url_zoom?: string;
    // Processing metadata
    originalSize?: number;
    compressedSize?: number;
    compressionRatio?: number;
}

export interface UploadOptions {
    /** Skip client-side compression (for already-optimized images) */
    skipCompression?: boolean;
    /** Skip server-side variant generation */
    skipVariants?: boolean;
    /** Target variant for initial compression */
    targetVariant?: ImageVariantName;
    /** Custom bucket name */
    bucket?: string;
}

// ============================================================================
// MediaService Class
// ============================================================================

export class MediaService {
    private static instance: MediaService;
    private bucketName = 'products';
    private edgeFunctionUrl: string | null = null;

    private constructor() {
        // Initialize edge function URL from environment
        const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
        if (supabaseUrl) {
            this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/process-image`;
        }
    }

    public static getInstance(): MediaService {
        if (!MediaService.instance) {
            MediaService.instance = new MediaService();
        }
        return MediaService.instance;
    }

    /**
     * Upload a file with optional compression and variant generation
     */
    public async uploadFile(
        file: File,
        sellerId: string,
        options: UploadOptions = {}
    ): Promise<UploadResult> {
        const {
            skipCompression = false,
            skipVariants = false,
            targetVariant = 'detail',
            bucket = this.bucketName
        } = options;

        try {
            // Generate unique storage path
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);

            // Determine if this is an image that should be compressed
            const isImage = file.type.startsWith('image/') && !file.type.includes('gif');
            const isVideo = file.type.startsWith('video/');

            let uploadBlob: Blob = file;
            let processedInfo: ProcessedImage | null = null;
            let fileExt = file.name.split('.').pop() || 'jpg';
            let contentType = file.type;

            // Compress images before upload
            if (isImage && !skipCompression) {
                // Validate image
                const validation = validateImageFile(file);
                if (!validation.valid) {
                    throw new Error(validation.error);
                }

                try {
                    // Process image (compress + convert to WebP if supported)
                    processedInfo = await processImageForUpload(file, targetVariant);
                    uploadBlob = processedInfo.blob;
                    fileExt = processedInfo.format;
                    contentType = `image/${processedInfo.format}`;

                    console.log(`📸 Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(processedInfo.size / 1024).toFixed(1)}KB (${processedInfo.compressionRatio}% reduction)`);
                } catch (compressionError) {
                    console.warn('Client-side compression failed, uploading original:', compressionError);
                    // Fall back to original file
                }
            }

            // Build storage path
            const storagePath = `${sellerId}/${timestamp}-${randomString}.${fileExt}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(storagePath, uploadBlob, {
                    contentType,
                    cacheControl: '31536000', // 1 year cache for immutable content
                    upsert: false
                });

            if (error) {
                console.error('Error uploading file:', error);
                throw error;
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(storagePath);

            const baseUrl = publicUrlData.publicUrl;

            // Build result
            const result: UploadResult = {
                url: baseUrl,
                storage_path: storagePath,
                media_type: isVideo ? 'video' : 'image',
                originalSize: file.size,
                compressedSize: processedInfo?.size,
                compressionRatio: processedInfo?.compressionRatio
            };

            // Generate variant URLs (optimistic - they'll exist after processing)
            if (isImage && !skipVariants) {
                result.url_thumb = getOptimizedImageUrl(baseUrl, 'thumb');
                result.url_grid = getOptimizedImageUrl(baseUrl, 'grid');
                result.url_detail = getOptimizedImageUrl(baseUrl, 'detail');
                result.url_zoom = getOptimizedImageUrl(baseUrl, 'zoom');

                // Trigger server-side variant generation asynchronously
                this.triggerVariantGeneration(storagePath, sellerId, bucket).catch(err => {
                    console.warn('Variant generation failed (non-blocking):', err);
                });
            }

            return result;

        } catch (error) {
            console.error('Media upload failed:', error);
            throw error;
        }
    }

    /**
     * Upload multiple files
     */
    public async uploadFiles(
        files: File[],
        sellerId: string,
        options: UploadOptions = {}
    ): Promise<UploadResult[]> {
        const uploadPromises = files.map(file => this.uploadFile(file, sellerId, options));
        return Promise.all(uploadPromises);
    }

    /**
     * Trigger server-side variant generation via Edge Function
     */
    private async triggerVariantGeneration(
        storagePath: string,
        sellerId: string,
        bucket: string = this.bucketName
    ): Promise<void> {
        if (!this.edgeFunctionUrl) {
            console.warn('Edge function URL not configured, skipping variant generation');
            return;
        }

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;

            const response = await fetch(this.edgeFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
                },
                body: JSON.stringify({
                    storagePath,
                    sellerId,
                    bucket,
                    generateVariants: ['thumb', 'grid', 'detail', 'zoom']
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Variant generation API error:', error);
            } else {
                const result = await response.json();
                console.log(`✅ Generated ${result.stats?.variantsGenerated || 0} variants`);
            }
        } catch (error) {
            console.error('Failed to trigger variant generation:', error);
        }
    }

    /**
     * Get optimized URL for a specific variant
     */
    public getVariantUrl(baseUrl: string, variant: ImageVariantName): string {
        return getOptimizedImageUrl(baseUrl, variant);
    }

    /**
     * Generate srcset string for responsive images
     */
    public getSrcSet(baseUrl: string): string {
        return generateSrcSet(baseUrl);
    }

    /**
     * Generate sizes attribute for common layouts
     */
    public getSizes(layout: 'product-card' | 'product-grid' | 'product-detail' | 'thumbnail' | 'hero'): string {
        return generateSizes(layout);
    }
}

// ============================================================================
// Convenience Exports
// ============================================================================

// Re-export utilities for direct use
export {
    getOptimizedImageUrl,
    generateSrcSet,
    generateSizes,
    IMAGE_VARIANTS
};
