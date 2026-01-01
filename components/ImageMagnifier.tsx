import React, { useState, MouseEvent, useMemo } from 'react';
import { getOptimizedImageUrl } from '@/lib/image-utils';

interface ImageMagnifierProps {
    src: string;
    alt?: string;
    width?: string | number;
    height?: string | number;
    className?: string;
    zoomLevel?: number;
    /** Whether optimized variants exist for this image */
    hasVariants?: boolean;
}

const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
    src,
    alt = '',
    className = '',
    zoomLevel = 2.5,
    hasVariants = true
}) => {
    const [zoom, setZoom] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [zoomImageLoaded, setZoomImageLoaded] = useState(false);

    // Generate optimized URLs
    const urls = useMemo(() => {
        if (!hasVariants) {
            return { display: src, zoom: src };
        }
        return {
            display: getOptimizedImageUrl(src, 'detail'),
            zoom: getOptimizedImageUrl(src, 'zoom')
        };
    }, [src, hasVariants]);

    const handleMouseEnter = () => {
        setZoom(true);
    };

    const handleMouseLeave = () => {
        setZoom(false);
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();

        // Calculate percentage position
        // x = 0% (left) to 100% (right)
        const x = ((e.pageX - left - window.scrollX) / width) * 100;
        const y = ((e.pageY - top - window.scrollY) / height) * 100;

        setPosition({ x, y });
    };

    return (
        <div
            className={`relative overflow-hidden cursor-crosshair ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
        >
            {/* Preload zoom image */}
            {hasVariants && (
                <link
                    rel="preload"
                    as="image"
                    href={urls.zoom}
                    onLoad={() => setZoomImageLoaded(true)}
                />
            )}

            {/* Display image (detail quality for faster initial load) */}
            <img
                src={urls.display}
                alt={alt}
                className={`w-full h-full object-contain transition-opacity duration-200 ${zoom ? 'opacity-0' : 'opacity-100'}`}
                style={{ pointerEvents: 'none' }}
                loading="lazy"
                decoding="async"
            />

            {/* Zoom overlay (zoom quality for crisp magnification) */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-200"
                style={{
                    opacity: zoom ? 1 : 0,
                    backgroundImage: `url('${urls.zoom}')`,
                    backgroundPosition: `${position.x}% ${position.y}%`,
                    backgroundSize: `${zoomLevel * 100}%`,
                    backgroundRepeat: 'no-repeat',
                }}
            />
        </div>
    );
};

export default ImageMagnifier;
