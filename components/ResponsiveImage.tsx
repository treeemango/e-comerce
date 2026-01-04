/**
 * ResponsiveImage Component
 * 
 * A performant image component that automatically serves optimized variants
 * based on screen size using srcset and the picture element.
 * 
 * Features:
 * - Automatic srcset generation for responsive images
 * - WebP format with fallback support
 * - Lazy loading with IntersectionObserver
 * - Blur placeholder support
 * - Graceful fallback for images without variants
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    getOptimizedImageUrl,
    generateSrcSet,
    generateSizes,
    IMAGE_VARIANTS,
    type ImageVariantName
} from '@/lib/image-utils';

// ============================================================================
// Types
// ============================================================================

export interface ResponsiveImageProps {
    /** Base image URL (without variant suffix) */
    src: string;
    /** Alt text for accessibility */
    alt: string;
    /** CSS sizes attribute for responsive selection */
    sizes?: string;
    /** Additional CSS classes */
    className?: string;
    /** Image container classes */
    containerClassName?: string;
    /** Skip lazy loading (for above-fold images) */
    priority?: boolean;
    /** Callback when image loads */
    onLoad?: () => void;
    /** Callback on load error */
    onError?: () => void;
    /** Aspect ratio for placeholder */
    aspectRatio?: 'square' | '4:3' | '16:9' | '3:4' | '4:5' | 'auto';
    /** Show blur placeholder while loading */
    showBlurPlaceholder?: boolean;
    /** Custom blur placeholder data URL */
    blurDataUrl?: string;
    /** Default variant to use for src attribute */
    defaultVariant?: ImageVariantName;
    /** Object fit style */
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    /** Object position style */
    objectPosition?: string;
    /** Title attribute */
    title?: string;
    /** Whether variants exist for this image */
    hasVariants?: boolean;
    /** Custom style */
    style?: React.CSSProperties;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a URL points to an image with variants
 * URLs with variant suffixes (_thumb, _grid, etc.) indicate variants exist
 */
function detectHasVariants(url: string): boolean {
    if (!url) return false;
    // If URL already has a variant suffix, variants exist
    const variantPattern = /_(thumb|grid|detail|zoom)\.(webp|jpg|jpeg|png)$/i;
    return variantPattern.test(url);
}

/**
 * Get aspect ratio padding percentage
 */
function getAspectRatioPadding(ratio: ResponsiveImageProps['aspectRatio']): string {
    switch (ratio) {
        case 'square': return '100%';
        case '4:3': return '75%';
        case '16:9': return '56.25%';
        case '3:4': return '133.33%';
        case '4:5': return '125%';
        default: return '100%';
    }
}

/**
 * Generate a simple gray placeholder
 */
function getDefaultPlaceholder(): string {
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect fill="%23e5e7eb" width="1" height="1"/%3E%3C/svg%3E';
}

// ============================================================================
// ResponsiveImage Component
// ============================================================================

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
    src,
    alt,
    sizes,
    className = '',
    containerClassName = '',
    priority = false,
    onLoad,
    onError,
    aspectRatio = 'auto',
    showBlurPlaceholder = false,
    blurDataUrl,
    defaultVariant = 'grid',
    objectFit = 'cover',
    objectPosition = 'center',
    title,
    hasVariants,
    style
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isInView, setIsInView] = useState(priority);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Determine if variants exist
    const variantsExist = useMemo(() => {
        if (typeof hasVariants === 'boolean') return hasVariants;
        return detectHasVariants(src);
    }, [src, hasVariants]);

    // Generate URLs
    const urls = useMemo(() => {
        if (!src) return { main: '', srcSet: '' };

        // If variants exist, generate srcset
        if (variantsExist) {
            return {
                main: getOptimizedImageUrl(src, defaultVariant),
                srcSet: generateSrcSet(src, ['thumb', 'grid', 'detail']),
                thumb: getOptimizedImageUrl(src, 'thumb'),
                grid: getOptimizedImageUrl(src, 'grid'),
                detail: getOptimizedImageUrl(src, 'detail')
            };
        }

        // Fallback to original URL
        return {
            main: src,
            srcSet: ''
        };
    }, [src, defaultVariant, variantsExist]);

    // Default sizes if not provided
    const sizesAttr = useMemo(() => {
        if (sizes) return sizes;
        return generateSizes('product-card');
    }, [sizes]);

    // Placeholder URL
    const placeholderUrl = useMemo(() => {
        if (blurDataUrl) return blurDataUrl;
        if (showBlurPlaceholder) return getDefaultPlaceholder();
        return undefined;
    }, [blurDataUrl, showBlurPlaceholder]);

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (priority || isInView) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '200px', // Start loading before visible
                threshold: 0.01
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [priority, isInView]);

    // Handle load event
    const handleLoad = useCallback(() => {
        setIsLoaded(true);
        onLoad?.();
    }, [onLoad]);

    // Handle error event
    const handleError = useCallback(() => {
        setHasError(true);
        onError?.();
    }, [onError]);

    // Compute container styles
    const containerStyle: React.CSSProperties = {
        position: 'relative',
        overflow: 'hidden',
        ...(aspectRatio !== 'auto' && {
            paddingBottom: getAspectRatioPadding(aspectRatio),
            height: 0
        })
    };

    // Compute image styles
    const imageStyle: React.CSSProperties = {
        objectFit,
        objectPosition,
        ...(aspectRatio !== 'auto' && {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
        }),
        // Fade in transition
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        ...style
    };

    // Placeholder styles
    const placeholderStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        filter: 'blur(20px)',
        transform: 'scale(1.1)', // Prevent blur edge artifacts
        opacity: isLoaded ? 0 : 1,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: 'none'
    };

    // Error fallback
    if (hasError) {
        return (
            <div
                ref={containerRef}
                className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${containerClassName}`}
                style={containerStyle}
            >
                <span className="material-icons text-gray-400 text-4xl">image_not_supported</span>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={containerClassName}
            style={containerStyle}
        >
            {/* Blur placeholder */}
            {placeholderUrl && !isLoaded && (
                <img
                    src={placeholderUrl}
                    alt=""
                    aria-hidden="true"
                    style={placeholderStyle}
                />
            )}

            {/* Main image - only render when in view */}
            {isInView && (
                <picture>
                    {/* WebP source with srcset */}
                    {urls.srcSet && (
                        <source
                            type="image/webp"
                            srcSet={urls.srcSet}
                            sizes={sizesAttr}
                        />
                    )}

                    {/* Fallback img element */}
                    <img
                        ref={imgRef}
                        src={urls.main}
                        alt={alt}
                        title={title}
                        className={className}
                        style={imageStyle}
                        loading={priority ? 'eager' : 'lazy'}
                        decoding="async"
                        onLoad={handleLoad}
                        onError={handleError}
                        {...(urls.srcSet && { sizes: sizesAttr })}
                    />
                </picture>
            )}
        </div>
    );
};

// ============================================================================
// Additional Components
// ============================================================================

/**
 * Simple optimized image without fancy features
 * Use for simple cases where you just want variant URLs
 */
export const OptimizedImg: React.FC<{
    src: string;
    alt: string;
    variant?: ImageVariantName;
    className?: string;
    loading?: 'lazy' | 'eager';
}> = ({ src, alt, variant = 'grid', className, loading = 'lazy' }) => {
    const optimizedUrl = getOptimizedImageUrl(src, variant);

    return (
        <img
            src={optimizedUrl}
            alt={alt}
            className={className}
            loading={loading}
            decoding="async"
        />
    );
};

/**
 * Background image with optimized variant
 */
export const OptimizedBackground: React.FC<{
    src: string;
    variant?: ImageVariantName;
    className?: string;
    children?: React.ReactNode;
}> = ({ src, variant = 'detail', className, children }) => {
    const optimizedUrl = getOptimizedImageUrl(src, variant);

    return (
        <div
            className={className}
            style={{
                backgroundImage: `url('${optimizedUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            {children}
        </div>
    );
};

export default ResponsiveImage;
