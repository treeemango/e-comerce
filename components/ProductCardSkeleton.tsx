import React from 'react';

interface ProductCardSkeletonProps {
    count?: number;
}

const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ count = 8 }) => {
    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .shimmer-wrapper {
                    position: relative;
                    overflow: hidden;
                }
                .shimmer-wrapper::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    transform: translateX(-100%);
                    background-image: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0,
                        rgba(255, 255, 255, 0.2) 20%,
                        rgba(255, 255, 255, 0.5) 60%,
                        rgba(255, 255, 255, 0)
                    );
                    animation: shimmer 2s infinite;
                }
                .dark .shimmer-wrapper::after {
                    background-image: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0,
                        rgba(255, 255, 255, 0.05) 20%,
                        rgba(255, 255, 255, 0.1) 60%,
                        rgba(255, 255, 255, 0)
                    );
                }
            `}} />
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-800/70 bg-white dark:bg-slate-900 pb-3 flex flex-col h-full"
                >
                    {/* Image Placeholder */}
                    <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-square shimmer-wrapper">
                        <div className="absolute top-2 left-2 h-5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="absolute top-2 right-2 h-6 w-14 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    </div>

                    <div className="p-4 flex-1 flex flex-col gap-3">
                        {/* Title lines */}
                        <div className="space-y-2">
                            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 w-full shimmer-wrapper" />
                            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 w-3/4 shimmer-wrapper" />
                        </div>

                        {/* Price & Rating */}
                        <div className="flex items-center justify-between mt-1">
                            <div className="space-y-1">
                                <div className="h-5 w-24 rounded-lg bg-orange-100/50 dark:bg-orange-900/20 shimmer-wrapper" />
                                <div className="h-3 w-16 rounded-full bg-slate-100 dark:bg-slate-800 shimmer-wrapper" />
                            </div>
                            <div className="h-9 w-9 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shimmer-wrapper" />
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                            <div className="h-5 w-20 rounded-md bg-slate-50 dark:bg-slate-800/50 ring-1 ring-slate-100 dark:ring-slate-700 shimmer-wrapper" />
                            <div className="h-5 w-16 rounded-md bg-sky-50 dark:bg-sky-900/20 ring-1 ring-sky-100 dark:ring-sky-800 shimmer-wrapper" />
                            <div className="h-5 w-14 rounded-md bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-100 dark:ring-emerald-800 shimmer-wrapper" />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
};

export default ProductCardSkeleton;
