import { useEffect, useRef } from 'react';

interface SwipeGestureOptions {
    onSwipeRight?: () => void;
    onSwipeLeft?: () => void;
    threshold?: number;
    minEdgeOffset?: number; // Only trigger right swipe if starting within this distance from left edge
}

export const useSwipeGesture = ({
    onSwipeRight,
    onSwipeLeft,
    threshold = 60,
    minEdgeOffset = 50
}: SwipeGestureOptions) => {
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const touchEndY = useRef<number | null>(null);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.targetTouches[0].clientX;
            touchStartY.current = e.targetTouches[0].clientY;
            touchEndX.current = e.targetTouches[0].clientX;
            touchEndY.current = e.targetTouches[0].clientY;
        };

        const handleTouchMove = (e: TouchEvent) => {
            touchEndX.current = e.targetTouches[0].clientX;
            touchEndY.current = e.targetTouches[0].clientY;
        };

        const handleTouchEnd = () => {
            if (!touchStartX.current || !touchEndX.current || !touchStartY.current || !touchEndY.current) return;

            const deltaX = touchEndX.current - touchStartX.current;
            const deltaY = touchEndY.current - touchStartY.current;

            // Ensure it's primarily a horizontal swipe
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > threshold) {
                    if (deltaX > 0) {
                        // Right swipe (started from left)
                        // If minEdgeOffset is provided, only trigger if it started near the left edge
                        if (onSwipeRight && (minEdgeOffset === undefined || touchStartX.current <= minEdgeOffset)) {
                            onSwipeRight();
                        }
                    } else {
                        // Left swipe (started from right)
                        if (onSwipeLeft) {
                            onSwipeLeft();
                        }
                    }
                }
            }

            // Reset values
            touchStartX.current = null;
            touchStartY.current = null;
            touchEndX.current = null;
            touchEndY.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onSwipeRight, onSwipeLeft, threshold, minEdgeOffset]);
};
