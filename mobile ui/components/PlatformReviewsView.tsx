import React from 'react';
import { Review } from '@/types';

interface ReviewItemProps {
    name: string;
    rating: number;
    date: string;
    content: string;
    avatar?: string;
    isVerified?: boolean;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ name, rating, date, content, avatar, isVerified = true }) => (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800 animate-premium-pop">
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-inner">
                    {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        name.charAt(0)
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-gray-900 dark:text-white">{name}</span>
                        {isVerified && (
                            <span className="material-icons text-[14px] text-blue-500">verified</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className={`material-icons text-[10px] ${i < rating ? 'text-orange-400' : 'text-gray-200 dark:text-gray-700'}`}>
                                star
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{date}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed font-medium">"{content}"</p>
    </div>
);

interface PlatformReviewsViewProps {
    onBack: () => void;
    reviews?: Review[];
}

export const PlatformReviewsView: React.FC<PlatformReviewsViewProps> = ({ onBack, reviews: backendReviews }) => {
    const allReviews = backendReviews || [];
    const ratingValues = allReviews
        .map((r) => Number(r.platform_rating ?? r.rating))
        .filter((n) => Number.isFinite(n) && n > 0);
    const averageRating = ratingValues.length
        ? Math.round((ratingValues.reduce((acc, n) => acc + n, 0) / ratingValues.length) * 10) / 10
        : null;
    const totalReviews = allReviews.length;
    const distributionBase = ratingValues.length;
    const distribution = ratingValues.reduce((acc, value) => {
        const star = Math.min(5, Math.max(1, Math.round(value)));
        acc[star] = (acc[star] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);
    const getStarPercent = (star: number) => {
        if (!distributionBase) return 0;
        return Math.round(((distribution[star] || 0) / distributionBase) * 100);
    };

    const displayReviews = allReviews;

    return (
        <div className="fixed inset-0 z-50 bg-[#F8F9FB] dark:bg-black/95 flex flex-col h-full overflow-hidden safe-top">
            {/* Premium Header */}
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
                <div className="max-w-6xl mx-auto w-full px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-900 dark:text-white active:scale-90 transition-transform"
                        >
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Platform Trust</h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Real-time Feedback</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-icons">verified_user</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth no-scrollbar">
                <div className="max-w-6xl mx-auto w-full space-y-8">
                    {/* Bento Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2 bg-gradient-to-br from-primary to-orange-600 rounded-[32px] p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-icons text-white/80">auto_awesome</span>
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">Our Pride</span>
                                </div>
                                <div className="text-5xl font-black tracking-tight mb-2">{averageRating !== null ? `${averageRating.toFixed(1)}/5` : '—/5'}</div>
                                <p className="text-sm font-medium text-white/80 max-w-[200px]">Most trusted Pan-African shopping destination.</p>
                            </div>
                            {/* Background Decorations */}
                            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                            <span className="material-icons text-[120px] absolute -right-6 -bottom-6 text-white/5 rotate-12">verified</span>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-center text-center">
                            <div className="text-2xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">{totalReviews.toLocaleString()}</div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verified Reviews</p>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-center text-center">
                            <div className="text-2xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">99%</div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secure Escrow</p>
                        </div>
                    </div>

                    {/* Rating Distribution */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-1">Rating Breakdown</h3>
                        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-3">
                            {[5, 4, 3, 2, 1].map((star) => (
                                <div key={star} className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-gray-500 w-2">{star}</span>
                                    <div className="flex-1 h-2 bg-gray-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-400 to-primary rounded-full"
                                            style={{ width: `${getStarPercent(star)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 w-8 text-right">
                                        {getStarPercent(star)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Testimonials List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Latest Voices</h3>
                            <div className="flex items-center gap-1 text-primary">
                                <span className="material-icons text-sm">stars</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider">Top Rated</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-20">
                            {displayReviews.map((rev, idx) => (
                                <ReviewItem
                                    key={rev.id || idx}
                                    name={rev.user_name || 'Verified Buyer'}
                                    rating={rev.platform_rating || rev.rating}
                                    date={rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recent'}
                                    content={rev.platform_feedback || rev.content}
                                    avatar={rev.user_avatar}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modern Floating Action Bar */}
            <div className="absolute bottom-6 left-6 right-6 flex justify-center pointer-events-none">
                <button
                    onClick={onBack}
                    className="pointer-events-auto bg-zinc-900 dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3"
                >
                    <span>Continue Shopping</span>
                    <span className="material-icons text-sm">shopping_bag</span>
                </button>
            </div>
        </div>
    );
};
