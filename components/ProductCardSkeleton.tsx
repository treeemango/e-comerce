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
                    className="rounded-lg overflow-hidden shadow-sm hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3)] hover:scale-[1.02] transition-all duration-300 ring-1 ring-slate-200/80 dark:ring-slate-800/70 bg-white dark:bg-slate-800 pb-2 flex flex-col h-full animate-pulse"
                >
                    <div className="relative overflow-hidden bg-gray-50 dark:bg-gray-700 aspect-square">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700" />
                        <div className="absolute top-2 left-2 h-6 w-14 rounded-full bg-slate-200/80 dark:bg-slate-600/80" />
                        <div className="absolute top-2 right-2 h-7 w-16 rounded-md bg-slate-200/90 dark:bg-slate-600/90" />
                        <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                            <div className="h-6 flex-1 rounded-md bg-white/70 dark:bg-slate-800/80 ring-1 ring-slate-200/70 dark:ring-slate-700/70" />
                            <div className="h-6 flex-1 rounded-md bg-white/70 dark:bg-slate-800/80 ring-1 ring-slate-200/70 dark:ring-slate-700/70" />
                        </div>
                    </div>

                    <div className="p-3 flex-1 flex flex-col gap-3">
                        <div className="space-y-2">
                            <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-full" />
                            <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-4/5" />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                                <div className="h-5 w-20 rounded bg-gradient-to-r from-orange-200 to-red-200 dark:from-orange-900/30 dark:to-red-900/30" />
                                <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-700" />
                            </div>
                            <div className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700" />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="h-6 w-28 rounded-lg bg-gradient-to-r from-slate-100 via-white to-slate-100 shadow-sm ring-1 ring-slate-200/80 dark:from-slate-800/60 dark:via-slate-900/60 dark:to-slate-800/60 dark:ring-slate-700/70" />
                            <div className="h-6 w-24 rounded-lg bg-gradient-to-r from-sky-500/12 via-sky-400/10 to-sky-500/12 shadow-sm ring-1 ring-sky-300/60 dark:from-sky-900/30 dark:via-sky-800/30 dark:to-sky-900/30 dark:ring-sky-700/50" />
                            <div className="h-6 w-20 rounded-lg bg-gradient-to-r from-emerald-500/12 via-emerald-400/10 to-emerald-500/12 shadow-sm ring-1 ring-emerald-300/60 dark:from-emerald-900/30 dark:via-emerald-800/30 dark:to-emerald-900/30 dark:ring-emerald-700/50" />
                        </div>

                        <div className="mt-auto space-y-2">
                            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                            <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
};

export default ProductCardSkeleton;
