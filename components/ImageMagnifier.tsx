import React, { useState, MouseEvent } from 'react';

interface ImageMagnifierProps {
    src: string;
    alt?: string;
    width?: string | number;
    height?: string | number;
    className?: string;
    zoomLevel?: number;
}

const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
    src,
    alt = '',
    className = '',
    zoomLevel = 2.5
}) => {
    const [zoom, setZoom] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });

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
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-contain transition-opacity duration-200 ${zoom ? 'opacity-0' : 'opacity-100'}`}
                style={{ pointerEvents: 'none' }} // Ensure mouse events go to parent
            />

            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-200"
                style={{
                    opacity: zoom ? 1 : 0,
                    backgroundImage: `url('${src}')`,
                    backgroundPosition: `${position.x}% ${position.y}%`,
                    backgroundSize: `${zoomLevel * 100}%`,
                    backgroundRepeat: 'no-repeat',
                }}
            />
        </div>
    );
};

export default ImageMagnifier;
