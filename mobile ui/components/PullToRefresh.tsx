import React, { useState, useRef, useCallback } from 'react';

interface PullToRefreshProps {
    children: React.ReactNode;
    onRefresh: () => Promise<void>;
    disabled?: boolean;
}

/**
 * A reusable Pull-to-Refresh wrapper component for mobile views.
 * Wrap your scrollable content with this component to enable pull-to-refresh.
 */
const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh, disabled = false }) => {
    const [pulling, setPulling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const isPulling = useRef(false);

    const threshold = 80; // Distance to trigger refresh

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || refreshing) return;

        const container = containerRef.current;
        if (!container) return;

        // Only enable pull-to-refresh when at the top of scroll
        if (container.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            isPulling.current = true;
        }
    }, [disabled, refreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling.current || disabled || refreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Resistance effect: the further you pull, the slower it moves
            const distance = Math.min(diff * 0.5, threshold * 1.5);
            setPullDistance(distance);
            setPulling(true);
        }
    }, [disabled, refreshing, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling.current || disabled) return;

        isPulling.current = false;

        if (pullDistance >= threshold && !refreshing) {
            setRefreshing(true);
            setPullDistance(threshold * 0.6);

            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
                setPullDistance(0);
                setPulling(false);
            }
        } else {
            setPullDistance(0);
            setPulling(false);
        }
    }, [pullDistance, threshold, refreshing, onRefresh, disabled]);

    return (
        <div
            ref={containerRef}
            className="h-full overflow-y-auto"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className="flex justify-center items-center overflow-hidden transition-all duration-200"
                style={{ height: pulling || refreshing ? pullDistance : 0 }}
            >
                <div className={`flex items-center gap-2 ${refreshing ? 'animate-pulse' : ''}`}>
                    <div
                        className={`w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full ${refreshing ? 'animate-spin' : ''
                            }`}
                        style={{
                            transform: refreshing ? 'scale(1)' : `rotate(${pullDistance * 3}deg)`,
                            opacity: Math.min(pullDistance / threshold, 1)
                        }}
                    />
                    {refreshing && (
                        <span className="text-xs text-blue-500 font-medium">Refreshing...</span>
                    )}
                </div>
            </div>

            {children}
        </div>
    );
};

export default PullToRefresh;
