import React, { useEffect, useMemo, useState } from 'react';
import { Review, User } from '@/types';
import { fetchUserReviews } from '@/lib/api';

interface BuyerReviewsViewProps {
    user?: User | null;
}

const statusTone: Record<string, string> = {
    approved: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    flagged: 'bg-blue-50 text-blue-700 border-blue-200'
};

const BuyerReviewsView: React.FC<BuyerReviewsViewProps> = ({ user }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [status, setStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
    const [loading, setLoading] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        setLoading(true);
        const data = await fetchUserReviews(user.id);
        setReviews(data);
        setLoading(false);
    };

    useEffect(() => {
        if (user?.id) {
            load();
        } else {
            setReviews([]);
        }
    }, [user?.id]);

    const filtered = useMemo(() => {
        if (status === 'all') return reviews;
        return reviews.filter(r => r.status === status);
    }, [reviews, status]);

    const stats = useMemo(() => ({
        total: reviews.length,
        approved: reviews.filter(r => r.status === 'approved').length,
        pending: reviews.filter(r => r.status === 'pending').length,
    }), [reviews]);

    const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString() : '—';

    const renderReviewCard = (review: Review) => {
        const badgeClass = statusTone[review.status] || 'bg-gray-50 text-gray-700 border-gray-200';

        return (
            <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {review.product_image ? (
                                <img src={review.product_image} alt={review.product_title || 'Product'} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <span className="material-icons text-lg">image</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-900 line-clamp-2">{review.product_title || 'Product'}</div>
                            <div className="text-xs text-gray-500">Rated {review.rating}★ · {formatDate(review.created_at)}</div>
                        </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                        {review.status}
                    </span>
                </div>

                {review.title && <div className="text-sm font-semibold text-slate-900">{review.title}</div>}
                <div className="text-sm text-gray-700 leading-relaxed line-clamp-3">{review.content}</div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="material-icons text-sm">thumb_up</span>{review.helpful_votes} helpful</span>
                    <span className="flex items-center gap-1"><span className="material-icons text-sm">forum</span>{review.total_votes} votes</span>
                    {review.is_verified_purchase && (
                        <span className="flex items-center gap-1 text-green-600"><span className="material-icons text-sm">verified</span>Verified purchase</span>
                    )}
                </div>
            </div>
        );
    };

    const EmptyState = () => (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
            {status === 'all' ? 'You have not posted any reviews yet.' : 'No reviews in this status.'}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-2">
                <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="material-icons text-base text-orange-500">rate_review</span>
                    Your reviews
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Track and manage your reviews</h2>
                        <p className="text-sm text-gray-600">See statuses, helpful votes, and product context.</p>
                    </div>
                    {user && (
                        <button
                            className="text-sm text-gray-600 hover:text-orange-600 flex items-center gap-2"
                            onClick={load}
                        >
                            <span className="material-icons text-base">refresh</span>
                            Refresh
                        </button>
                    )}
                </div>
            </div>

            {!user && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">Sign in to view your reviews.</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="text-xs text-gray-500">Total reviews</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="text-xs text-gray-500">Approved</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.approved}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="text-xs text-gray-500">Pending</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.pending}</div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {['all', 'approved', 'pending', 'rejected'].map(s => (
                    <button
                        key={s}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${status === s
                            ? 'bg-black text-white border-black'
                            : 'border-gray-300 text-gray-700 hover:border-orange-400 hover:text-orange-700'}`}
                        onClick={() => setStatus(s as any)}
                    >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading reviews...</div>
                ) : !user ? (
                    <EmptyState />
                ) : filtered.length === 0 ? (
                    <EmptyState />
                ) : (
                    filtered.map(renderReviewCard)
                )}
            </div>
        </div>
    );
};

export default BuyerReviewsView;
