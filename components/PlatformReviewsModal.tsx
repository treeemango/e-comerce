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
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-inner">
                    {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        name.charAt(0)
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900 dark:text-white">{name}</span>
                        {isVerified && (
                            <span className="material-icons text-[18px] text-blue-500">verified</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className={`material-icons text-[14px] ${i < rating ? 'text-orange-400' : 'text-gray-200 dark:text-gray-700'}`}>
                                star
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{date}</span>
        </div>
        <p className="text-gray-600 dark:text-zinc-400 leading-relaxed text-sm italic">"{content}"</p>
    </div>
);

interface PlatformReviewsModalProps {
    isOpen: boolean;
    onClose: () => void;
    reviews?: Review[];
}

export const PlatformReviewsModal: React.FC<PlatformReviewsModalProps> = ({ isOpen, onClose, reviews: backendReviews }) => {
    if (!isOpen) return null;

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

    const displayReviews = (backendReviews || []).map(rev => ({
        name: rev.user_name || 'Verified Buyer',
        rating: rev.platform_rating || rev.rating,
        date: rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recent',
        content: rev.platform_feedback || rev.content,
        avatar: rev.user_avatar,
        isVerified: true
    })).slice(0, 20);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-[#F8F9FB] dark:bg-zinc-950 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                            <span className="material-icons text-2xl">verified_user</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Platform Trust & Voices</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Real-time Feedback from our community</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <span className="material-icons text-xl">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Stats Sidebar */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-icons text-white/80 text-sm">auto_awesome</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Our Pride</span>
                                    </div>
                                    <div className="text-6xl font-black tracking-tight mb-2">
                                        {averageRating !== null ? averageRating.toFixed(1) : '—'}
                                        <span className="text-2xl opacity-60">/5</span>
                                    </div>
                                    <p className="text-sm font-medium text-blue-100">The most trusted destination for Pan-African commerce.</p>
                                </div>
                                <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
                                <span className="material-icons text-[140px] absolute -right-6 -bottom-6 text-white/5 rotate-12">verified</span>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden relative">
                                <div className="text-3xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">{totalReviews.toLocaleString()}</div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verified Reviews</p>
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-icons text-4xl">reviews</span>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden relative">
                                <div className="text-3xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">99.9%</div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secure Escrow Rate</p>
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-icons text-4xl">security</span>
                                </div>
                            </div>

                            {/* Rating breakdown */}
                            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-gray-100 dark:border-zinc-800 space-y-3">
                                {[5, 4, 3, 2, 1].map((star) => (
                                    <div key={star} className="flex items-center gap-3">
                                        <span className="text-[11px] font-black text-gray-400 w-2">{star}</span>
                                        <div className="flex-1 h-1.5 bg-gray-50 dark:bg-zinc-800 rounded-full overflow-hidden">
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

                        {/* Reviews List */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Latest Voices</h3>
                                <div className="flex items-center gap-2 text-primary">
                                    <span className="material-icons text-sm">stars</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Community Vetted</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {displayReviews.map((rev, idx) => (
                                    <ReviewItem
                                        key={idx}
                                        {...rev}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="px-8 py-6 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 flex justify-center">
                    <button
                        onClick={onClose}
                        className="bg-zinc-900 dark:bg-white text-white dark:text-black px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                    >
                        <span>Experience the Trust</span>
                        <span className="material-icons text-xl">shopping_cart</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlatformReviewsModal;
