/**
 * Image Optimization Utilities
 * 
 * Client-side image processing for compression, resizing, and format conversion.
 * Uses Canvas API for browser-based processing before upload.
 */

// ============================================================================
// Types
// ============================================================================

export type ImageVariantName = 'thumb' | 'grid' | 'detail' | 'zoom' | 'original';

export interface ImageVariant {
    name: ImageVariantName;
    maxWidth: number;
    quality: number;
    suffix: string;
}

export interface ProcessedImage {
    blob: Blob;
    width: number;
    height: number;
    format: 'webp' | 'jpeg';
    size: number;
    originalSize: number;
    compressionRatio: number;
}

export interface ImageDimensions {
    width: number;
    height: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Predefined image variants for different use cases.
 * Each variant is optimized for specific display contexts.
 */
export const IMAGE_VARIANTS: Record<ImageVariantName, ImageVariant> = {
    thumb: {
        name: 'thumb',
        maxWidth: 300,
        quality: 0.75,
        suffix: '_thumb'
    },
    grid: {
        name: 'grid',
        maxWidth: 600,
        quality: 0.78,
        suffix: '_grid'
    },
    detail: {
        name: 'detail',
        maxWidth: 1200,
        quality: 0.80,
        suffix: '_detail'
    },
    zoom: {
        name: 'zoom',
        maxWidth: 1600,
        quality: 0.85,
        suffix: '_zoom'
    },
    original: {
        name: 'original',
        maxWidth: 4096,
        quality: 0.90,
        suffix: ''
    }
};

/**
 * Maximum file size for upload (5MB after compression)
 */
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
];

// ============================================================================
// Compression Options
// ============================================================================

export interface CompressImageOptions {
    /** Maximum file size in bytes (default: 500KB) */
    maxBytes?: number;
    /** Maximum dimension in pixels (default: 1200) */
    maxDimension?: number;
    /** Skip compression for files smaller than this (default: 100KB) */
    skipThreshold?: number;
}

/**
 * Compress an image file for upload (general purpose).
 * 
 * This is designed for seller documents, review photos, and other non-product uploads.
 * For product images, use MediaService.uploadFile which uses processImageForUpload.
 * 
 * @param file - The original image file
 * @param options - Compression options
 * @returns Compressed file (or original if compression not applicable)
 */
export async function compressImageForUpload(
    file: File,
    options: CompressImageOptions = {}
): Promise<File> {
    const {
        maxBytes = 500 * 1024,      // 500KB target
        maxDimension = 1200,         // Max width/height
        skipThreshold = 100 * 1024   // Skip files < 100KB
    } = options;

    // Only compress images; skip non-images
    if (!file.type?.startsWith('image/')) return file;

    // Skip SVGs (already small, vector format)
    if (file.type === 'image/svg+xml') return file;

    // Skip GIFs (preserve animation)
    if (file.type === 'image/gif') return file;

    // Skip already-small files (unless AVIF which may have compatibility issues)
    if (file.type !== 'image/avif' && file.size <= skipThreshold) return file;

    // Guard against extremely large images (avoid OOM in browser)
    if (file.size > 25 * 1024 * 1024) {
        console.warn('⚠️ Image too large for client-side compression, uploading original');
        return file;
    }

    // Check WebP support
    const supportsWebp = (() => {
        try {
            const canvas = document.createElement('canvas');
            return canvas.toDataURL('image/webp').startsWith('data:image/webp');
        } catch {
            return false;
        }
    })();

    const targetMime = supportsWebp ? 'image/webp' : 'image/jpeg';
    const targetExt = supportsWebp ? 'webp' : 'jpg';

    try {
        // Load image with correct orientation
        let bitmap: ImageBitmap | null = null;
        try {
            bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
        } catch {
            bitmap = await createImageBitmap(file);
        }

        const { width, height } = bitmap;
        if (!width || !height) {
            bitmap.close();
            return file;
        }

        // Helper to encode canvas to blob
        const encode = async (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
            await new Promise(resolve => canvas.toBlob(resolve, targetMime, quality));

        // Try multiple quality levels until we're under target size
        const tryEncodeWithinLimit = async (canvas: HTMLCanvasElement): Promise<Blob | null> => {
            const qualities = [0.82, 0.75, 0.68, 0.6, 0.52];
            let best: Blob | null = null;
            for (const q of qualities) {
                const blob = await encode(canvas, q);
                if (!blob) continue;
                best = blob;
                if (blob.size <= maxBytes) return blob;
            }
            return best;
        };

        // Calculate scale to fit within maxDimension
        const baseScale = Math.min(1, maxDimension / Math.max(width, height));
        const scales = [baseScale, baseScale * 0.85, baseScale * 0.72];

        let bestBlob: Blob | null = null;

        for (const scale of scales) {
            const outW = Math.max(1, Math.round(width * scale));
            const outH = Math.max(1, Math.round(height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;

            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bitmap, 0, 0, outW, outH);

            const blob = await tryEncodeWithinLimit(canvas);
            if (!blob) continue;
            bestBlob = blob;
            if (blob.size <= maxBytes) break;
        }

        bitmap.close();

        if (!bestBlob) return file;

        // If compression didn't help, keep original (unless AVIF compatibility issue)
        if (bestBlob.size >= file.size && file.type !== 'image/avif') return file;

        // Create new File with compressed content
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const compressedFile = new File([bestBlob], `${baseName}.${targetExt}`, {
            type: targetMime,
            lastModified: file.lastModified
        });

        // Log compression stats
        const reduction = Math.round((1 - compressedFile.size / file.size) * 100);
        console.log(`📸 Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB (${reduction}% reduction)`);

        return compressedFile;
    } catch (error) {
        console.warn('Client-side compression failed, using original:', error);
        return file;
    }
}

// ============================================================================
// Browser Feature Detection
// ============================================================================

/**
 * Check if the browser supports WebP encoding
 */
export function supportsWebP(): boolean {
    if (typeof document === 'undefined') return false;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

/**
 * Check if the browser supports OffscreenCanvas for better performance
 */
export function supportsOffscreenCanvas(): boolean {
    return typeof OffscreenCanvas !== 'undefined';
}

// ============================================================================
// Core Processing Functions
// ============================================================================

/**
 * Load an image file into an HTMLImageElement
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Calculate dimensions for resizing while maintaining aspect ratio
 */
export function calculateResizeDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight?: number
): ImageDimensions {
    let width = originalWidth;
    let height = originalHeight;

    // Scale down to maxWidth
    if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
    }

    // Scale down to maxHeight if provided
    if (maxHeight && height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = Math.round(width * ratio);
    }

    return { width, height };
}

/**
 * Process an image file for upload
 * 
 * @param file - The original image file
 * @param variant - The target variant configuration
 * @returns Processed image blob with metadata
 */
export async function processImageForUpload(
    file: File,
    variant: ImageVariant | ImageVariantName = 'detail'
): Promise<ProcessedImage> {
    // Get variant config
    const variantConfig = typeof variant === 'string' ? IMAGE_VARIANTS[variant] : variant;

    // Validate input
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        throw new Error(`Unsupported image type: ${file.type}. Supported: ${SUPPORTED_IMAGE_TYPES.join(', ')}`);
    }

    // Load image
    const img = await loadImage(file);

    // Calculate target dimensions
    const { width, height } = calculateResizeDimensions(
        img.naturalWidth,
        img.naturalHeight,
        variantConfig.maxWidth
    );

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image
    ctx.drawImage(img, 0, 0, width, height);

    // Determine output format
    const useWebP = supportsWebP();
    const mimeType = useWebP ? 'image/webp' : 'image/jpeg';
    const format = useWebP ? 'webp' : 'jpeg';

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create image blob'));
                }
            },
            mimeType,
            variantConfig.quality
        );
    });

    return {
        blob,
        width,
        height,
        format,
        size: blob.size,
        originalSize: file.size,
        compressionRatio: Math.round((1 - blob.size / file.size) * 100)
    };
}

/**
 * Process an image into multiple variants
 * 
 * @param file - The original image file
 * @param variants - Array of variant names to generate
 * @returns Map of variant name to processed image
 */
export async function processImageVariants(
    file: File,
    variants: ImageVariantName[] = ['thumb', 'grid', 'detail']
): Promise<Map<ImageVariantName, ProcessedImage>> {
    const results = new Map<ImageVariantName, ProcessedImage>();

    // Process variants in parallel
    const promises = variants.map(async (variantName) => {
        const processed = await processImageForUpload(file, variantName);
        results.set(variantName, processed);
    });

    await Promise.all(promises);

    return results;
}

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Get the optimized image URL for a specific variant
 * 
 * @param baseUrl - The base image URL (original or without variant suffix)
 * @param variant - The desired variant
 * @returns URL for the optimized variant
 * 
 * @example
 * getOptimizedImageUrl('https://storage.example.com/products/abc123.webp', 'thumb')
 * // Returns: 'https://storage.example.com/products/abc123_thumb.webp'
 */
export function getOptimizedImageUrl(
    baseUrl: string,
    variant: ImageVariantName = 'grid'
): string {
    if (!baseUrl) return baseUrl;

    // Don't attempt optimized variants for blob URLs or GIFs
    if (baseUrl.startsWith('blob:') || baseUrl.startsWith('data:') || /\.gif(?:[?#]|$)/i.test(baseUrl)) {
        return baseUrl;
    }

    // Preserve query/hash while manipulating the filename
    const [urlWithoutHash, hash = ''] = baseUrl.split('#');
    const [urlWithoutQuery, query = ''] = urlWithoutHash.split('?');

    // If URL already has a variant suffix, replace it
    const variantPattern = /_(thumb|grid|detail|zoom)\.(webp|jpg|jpeg|png|avif)$/i;
    const cleanUrl = urlWithoutQuery.replace(variantPattern, '.$2');

    // Get variant config
    const variantConfig = IMAGE_VARIANTS[variant];

    // Don't add suffix for original
    if (variant === 'original' || !variantConfig.suffix) {
        const rebuilt = cleanUrl + (query ? `?${query}` : '') + (hash ? `#${hash}` : '');
        return rebuilt;
    }

    // Variants are always stored as .webp (see supabase/functions/process-image)
    const extensionMatch = cleanUrl.match(/\.(webp|jpg|jpeg|png|avif)$/i);
    const basePath = extensionMatch ? cleanUrl.slice(0, -extensionMatch[0].length) : cleanUrl;
    const rebuilt = `${basePath}${variantConfig.suffix}.${extensionMatch?.[1] === 'avif' ? 'avif' : 'webp'}` + (query ? `?${query}` : '') + (hash ? `#${hash}` : '');
    // For now we still default to webp output from the processor, but if we have an avif input we might want to keep it?
    // Actually the processor below converts to webp/jpeg. So the URL builder should probably stick to webp if that's what we generate.
    // Let's just update the regex to match existing avif files if any.
    return `${basePath}${variantConfig.suffix}.webp` + (query ? `?${query}` : '') + (hash ? `#${hash}` : '');
}

/**
 * Generate srcset string for responsive images
 * 
 * @param baseUrl - The base image URL
 * @param variants - Array of variants to include in srcset
 * @returns srcset attribute string
 * 
 * @example
 * generateSrcSet('https://storage.example.com/products/abc123.webp', ['thumb', 'grid', 'detail'])
 * // Returns: 'https://.../abc123_thumb.webp 300w, https://.../abc123_grid.webp 600w, https://.../abc123_detail.webp 1200w'
 */
export function generateSrcSet(
    baseUrl: string,
    variants: ImageVariantName[] = ['thumb', 'grid', 'detail']
): string {
    if (!baseUrl) return '';

    return variants
        .map((variant) => {
            const url = getOptimizedImageUrl(baseUrl, variant);
            const width = IMAGE_VARIANTS[variant].maxWidth;
            return `${url} ${width}w`;
        })
        .join(', ');
}

/**
 * Generate sizes attribute for common layout patterns
 */
export function generateSizes(
    layout: 'product-card' | 'product-grid' | 'product-detail' | 'thumbnail' | 'hero'
): string {
    switch (layout) {
        case 'thumbnail':
            return '80px';
        case 'product-card':
            return '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px';
        case 'product-grid':
            return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
        case 'product-detail':
            return '(max-width: 768px) 100vw, 50vw';
        case 'hero':
            return '100vw';
        default:
            return '100vw';
    }
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate an image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Unsupported image type: ${file.type}. Please use JPEG, PNG, WebP, or AVIF.`
        };
    }

    // Check file size (10MB max for original)
    const maxOriginalSize = 10 * 1024 * 1024;
    if (file.size > maxOriginalSize) {
        return {
            valid: false,
            error: `Image file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`
        };
    }

    return { valid: true };
}

/**
 * Get approximate dimensions from file size (heuristic)
 */
export function estimateImageDimensions(file: File): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for dimension estimation'));
        };

        img.src = url;
    });
}

// ============================================================================
// Blurhash Placeholder (Optional - requires blurhash library)
// ============================================================================

/**
 * Generate a very small base64 placeholder for progressive loading
 * This is a lightweight alternative to blurhash that doesn't require external libraries
 */
export async function generatePlaceholderDataUrl(
    file: File,
    size: number = 10
): Promise<string> {
    const img = await loadImage(file);

    // Create tiny canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = Math.round(size * (img.naturalHeight / img.naturalWidth));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Return as low-quality JPEG data URL
    return canvas.toDataURL('image/jpeg', 0.1);
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Log image processing statistics (for development)
 */
export function logProcessingStats(
    originalFile: File,
    processed: ProcessedImage
): void {
    console.log(`📸 Image Processing Stats:
    Original: ${(originalFile.size / 1024).toFixed(1)}KB
    Processed: ${(processed.size / 1024).toFixed(1)}KB
    Dimensions: ${processed.width} x ${processed.height}
    Format: ${processed.format}
    Compression: ${processed.compressionRatio}% reduction`);
}
