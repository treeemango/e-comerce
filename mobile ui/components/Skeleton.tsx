import React from 'react';

/**
 * Unified Skeleton Loader components for mobile UI consistency.
 * Uses premium styling with shimmer animation and dark mode support.
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
        className={`bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse ${className}`}
        style={{ width, height }}
    />
);

// Text line skeleton
const Text: React.FC<SkeletonProps & { lines?: number }> = ({ className = '', lines = 1 }) => (
    <div className={`space-y-2.5 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <div
                key={i}
                className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
                style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
            />
        ))}
    </div>
);

// Circle/Avatar skeleton
const Circle: React.FC<SkeletonProps & { size?: number }> = ({ className = '', size = 40 }) => (
    <div
        className={`rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
    />
);

// Premium Product card skeleton
const ProductCard: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`bg-white dark:bg-gray-900 rounded-3xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 ${className}`}>
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse mb-3" />
        <div className="space-y-2.5">
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-full" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-2/3" />
            <div className="flex items-center justify-between mt-3">
                <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-1/3" />
                <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            </div>
        </div>
    </div>
);

// Order card skeleton
const OrderCard: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 ${className}`}>
        <div className="flex justify-between items-start mb-4">
            <div className="space-y-2">
                <div className="h-2.5 w-14 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                <div className="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
            <div className="h-7 w-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        </div>
        <div className="flex gap-3 mb-4">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-1/2" />
            </div>
        </div>
        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
    </div>
);

// List item skeleton
const ListItem: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 ${className}`}>
        <Circle size={52} />
        <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-3/4" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-1/2" />
        </div>
    </div>
);

// Stats card skeleton
const StatsCard: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 ${className}`}>
        <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mb-3" />
        <div className="h-7 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
    </div>
);

// Chart skeleton
const Chart: React.FC<SkeletonProps & { height?: number }> = ({ className = '', height = 200 }) => (
    <div className={`bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 ${className}`}>
        <div className="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mb-5" />
        <div
            className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl animate-pulse flex items-end justify-around px-4 pt-4"
            style={{ height }}
        >
            {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
                <div key={i} className="w-7 bg-gray-100 dark:bg-gray-700 rounded-t-lg" style={{ height: `${h}%` }} />
            ))}
        </div>
    </div>
);

// Category chip skeleton
const CategoryChip: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`h-11 w-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse ${className}`} />
);

// Grid of product cards
const ProductGrid: React.FC<SkeletonProps & { count?: number }> = ({ className = '', count = 4 }) => (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <ProductCard key={i} />
        ))}
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
    Chart,
    CategoryChip,
    ProductGrid
};

export default Skeleton;

