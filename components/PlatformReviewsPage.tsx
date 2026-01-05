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
    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-lg">
                    {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        name.charAt(0)
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{name}</span>
                        {isVerified && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 rounded-full">
                                <span className="material-icons text-[14px] text-blue-500">verified</span>
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Verified</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className={`material-icons text-[16px] ${i < rating ? 'text-orange-400' : 'text-gray-200 dark:text-gray-700'}`}>
                                star
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{date}</span>
        </div>
        <div className="relative">
            <span className="material-icons absolute -left-4 -top-2 text-primary/10 text-4xl select-none">format_quote</span>
            <p className="text-gray-600 dark:text-zinc-400 leading-relaxed text-base font-medium pl-2">"{content}"</p>
        </div>
    </div>
);

interface PlatformReviewsPageProps {
    reviews?: Review[];
    onBack?: () => void;
}

export const PlatformReviewsPage: React.FC<PlatformReviewsPageProps> = ({ reviews: backendReviews, onBack }) => {
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

    const displayReviews = allReviews.map(rev => ({
        name: rev.user_name || 'Verified Buyer',
        rating: rev.platform_rating || rev.rating,
        date: rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recent',
        content: rev.platform_feedback || rev.content,
        avatar: rev.user_avatar,
        isVerified: true
    })).slice(0, 40);

    return (
        <div className="min-h-screen bg-[#F8F9FB] dark:bg-black py-16 px-4">
            <div className="max-w-7xl mx-auto space-y-16">
                {/* Hero Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-200 dark:border-zinc-800 pb-12">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Platform Authenticity</span>
                        </div>
                        <h1 className="text-6xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                            Community Voice & <br /> <span className="text-primary underline decoration-primary/20">Trust Index</span>
                        </h1>
                        <p className="text-xl text-gray-500 dark:text-zinc-500 font-medium max-w-2xl">
                            Real experiences from verified buyers across our Pan-African network. Transparency is our core value.
                        </p>
                    </div>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-premium border border-gray-100 dark:border-zinc-800 font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                        >
                            <span className="material-icons">arrow_back</span>
                            Back to Shopping
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Stats Dashboard */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-gradient-to-br from-zinc-900 to-black rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                        <span className="material-icons text-primary">auto_awesome</span>
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Global Rating</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-8xl font-black tracking-tighter">{averageRating !== null ? averageRating.toFixed(1) : '—'}</div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex text-orange-400">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className="material-icons">star</span>
                                            ))}
                                        </div>
                                        <span className="text-xs font-bold opacity-60">OUT OF 5.0</span>
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-zinc-400">
                                    Consistently rated as the most reliable logistics and commerce platform in the region.
                                </p>
                            </div>
                            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/20 rounded-full blur-[120px] group-hover:bg-primary/30 transition-all duration-700" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 text-center">
                                <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">{totalReviews.toLocaleString()}</div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Verified Reviews</p>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 text-center">
                                <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">99%</div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Happy Shoppers</p>
                            </div>
                        </div>

                        {/* Visual breakdown */}
                        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-gray-100 dark:border-zinc-800 space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Rating Distribution</h3>
                            {[5, 4, 3, 2, 1].map((star) => (
                                <div key={star} className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black">
                                        <span className="text-gray-900 dark:text-white uppercase tracking-widest">{star} Stars</span>
                                        <span className="text-gray-400">{getStarPercent(star)}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-400 to-primary rounded-full transition-all duration-1000"
                                            style={{ width: `${getStarPercent(star)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Testimonials Feed */}
                    <div className="lg:col-span-8">
                        <div className="flex items-center justify-between mb-8 px-4">
                            <div className="flex items-center gap-3">
                                <span className="material-icons text-primary">sort</span>
                                <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Recent Feedback</span>
                            </div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                Showing latest {displayReviews.length} reviews
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                            {displayReviews.map((rev, idx) => (
                                <ReviewItem
                                    key={idx}
                                    {...rev}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Secure Trust Footer */}
                <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-12 border border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                            <span className="material-icons text-4xl">security</span>
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">100% Escrow Protection</h4>
                            <p className="text-sm text-gray-500 font-medium">Your money is only released when you confirm delivery.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full md:w-auto px-12 py-5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        Start Shopping Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlatformReviewsPage;
