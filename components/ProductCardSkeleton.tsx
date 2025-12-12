import React from 'react';

interface ProductCardSkeletonProps {
    count?: number;
}

const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ count = 8 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow animate-pulse"
                >
                    {/* Image Skeleton with Branded Icon */}
                    <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                        {/* Animated Favicon Icon */}
                        <div className="relative">
                            {/* Pulsing gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg blur-xl opacity-20 animate-pulse"></div>

                            {/* Main Icon */}
                            <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-black text-3xl animate-pulse">J</span>
                            </div>

                            {/* Spinning ring */}
                            <div className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-xl animate-spin" style={{ animationDuration: '2s' }}></div>
                        </div>
                    </div>

                    {/* Content Skeleton */}
                    <div className="p-3 space-y-3">
                        {/* Title Lines */}
                        <div className="space-y-2">
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/5"></div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-2">
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-12"></div>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                            <div className="h-5 bg-gradient-to-r from-orange-200 to-red-200 dark:from-orange-900/30 dark:to-red-900/30 rounded w-20"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                        </div>

                        {/* Badges */}
                        <div className="flex gap-1">
                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-14"></div>
                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-16"></div>
                        </div>

                        {/* Vendor Info */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                        </div>

                        {/* Add to Cart Button */}
                        <div className="h-9 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full"></div>
                    </div>
                </div>
            ))}
        </>
    );
};

export default ProductCardSkeleton;
