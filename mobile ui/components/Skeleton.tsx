import React from 'react';

/**
 * Unified Skeleton Loader components for mobile UI consistency.
 * Usage: <Skeleton.Card />, <Skeleton.Text />, <Skeleton.Circle />, etc.
 */

interface SkeletonProps {
    className?: string;
}

// Base skeleton with shimmer animation
const Base: React.FC<SkeletonProps & { width?: string; height?: string }> = ({
    className = '',
    width = '100%',
    height = '1rem'
}) => (
    <div
        className={`bg-gray-200 rounded animate-pulse ${className}`}
        style={{ width, height }}
    />
);

// Text line skeleton
const Text: React.FC<SkeletonProps & { lines?: number }> = ({ className = '', lines = 1 }) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <div
                key={i}
                className="h-3 bg-gray-200 rounded animate-pulse"
                style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
            />
        ))}
    </div>
);

// Circle/Avatar skeleton
const Circle: React.FC<SkeletonProps & { size?: number }> = ({ className = '', size = 40 }) => (
    <div
        className={`rounded-full bg-gray-200 animate-pulse flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
    />
);

// Product card skeleton
const ProductCard: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`bg-white rounded-2xl p-3 shadow-sm border border-gray-100 ${className}`}>
        <div className="aspect-square bg-gray-200 rounded-xl animate-pulse mb-3" />
        <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3 mt-2" />
        </div>
    </div>
);

// Order card skeleton
const OrderCard: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
                <div className="h-2 w-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            </div>
        </div>
        <div className="h-10 bg-gray-200 rounded-xl animate-pulse" />
    </div>
);

// List item skeleton
const ListItem: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`flex items-center gap-4 p-4 bg-white rounded-xl ${className}`}>
        <Circle size={48} />
        <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
    </div>
);

// Stats card skeleton
const StatsCard: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${className}`}>
        <div className="h-2 w-16 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
    </div>
);

// Chart skeleton
const Chart: React.FC<SkeletonProps & { height?: number }> = ({ className = '', height = 200 }) => (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${className}`}>
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-4" />
        <div
            className="bg-gray-100 rounded-lg animate-pulse flex items-end justify-around px-4"
            style={{ height }}
        >
            {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
                <div key={i} className="w-6 bg-gray-200 rounded-t" style={{ height: `${h}%` }} />
            ))}
        </div>
    </div>
);

// Export as namespace
export const Skeleton = {
    Base,
    Text,
    Circle,
    ProductCard,
    OrderCard,
    ListItem,
    StatsCard,
    Chart
};

export default Skeleton;
