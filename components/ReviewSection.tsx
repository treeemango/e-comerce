import React, { useState, useEffect } from 'react';
import { Review, ReviewFilters, ProductReviewSummary } from '@/types';
import { fetchProductReviews, fetchProductReviewSummary, voteOnReview } from '@/lib/api';
import { ReviewCard } from './ReviewCard';
import { WriteReviewModal } from './WriteReviewModal';

interface ReviewSectionProps {
    productId: string;
    userId?: string;
    hasPurchased?: boolean; // Only allow reviews if user has purchased
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ productId, userId, hasPurchased = false }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [summary, setSummary] = useState<ProductReviewSummary | null>(null);
    const [filters, setFilters] = useState<ReviewFilters>({});
    const [page, setPage] = useState(1);
    const [totalReviews, setTotalReviews] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showWriteReview, setShowWriteReview] = useState(false);

    useEffect(() => {
        loadReviews();
        loadSummary();
    }, [productId, filters, page]);

    const loadReviews = async () => {
        setLoading(true);
        const { reviews: fetchedReviews, total } = await fetchProductReviews(productId, filters, page);
        setReviews(fetchedReviews);
        setTotalReviews(total);
        setLoading(false);
    };

    const loadSummary = async () => {
        const fetchedSummary = await fetchProductReviewSummary(productId);
        setSummary(fetchedSummary);
    };

    const handleVote = async (reviewId: string, voteType: 'helpful' | 'unhelpful') => {
        if (!userId) {
            alert('Please log in to vote on reviews');
            return;
        }
        const success = await voteOnReview(reviewId, userId, voteType);
        if (success) {
            loadReviews();
        }
    };

    const handleWriteReviewClick = () => {
        if (!userId) {
            alert('Please log in to write a review');
            return;
        }
        if (!hasPurchased) {
            alert('You can only review products you have purchased');
            return;
        }
        setShowWriteReview(true);
    };

    const handleReviewSubmitted = () => {
        setShowWriteReview(false);
        loadReviews();
        loadSummary();
    };

    const renderRatingBar = (starCount: number) => {
        if (!summary) return null;
        const count = summary.rating_distribution[starCount.toString() as '1' | '2' | '3' | '4' | '5'];
        const percentage = summary.total_reviews > 0 ? (count / summary.total_reviews) * 100 : 0;

        return (
            <div className="flex items-center gap-2">
                <button
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-orange-500 transition-colors min-w-[3rem]"
                    onClick={() => setFilters({ ...filters, rating: starCount })}
                >
                    {starCount} <span className="text-slate-900 dark:text-slate-100">★</span>
                </button>
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[2rem] text-right">{count}</span>
            </div>
        );
    };

    const totalPages = Math.ceil(totalReviews / 10);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Reviews</h2>
                {hasPurchased && userId && (
                    <button
                        onClick={handleWriteReviewClick}
                        className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all hover:scale-105"
                    >
                        Write a Review
                    </button>
                )}
            </div>

            {/* Review Summary */}
            {summary && summary.total_reviews > 0 ? (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 mb-6 border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Overall Rating */}
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="text-6xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                                {summary.average_rating.toFixed(1)}
                            </div>
                            <div className="flex items-center gap-1 my-2">
                                <span className="material-icons text-4xl text-slate-900 dark:text-slate-100">star</span>
                                <span className="text-3xl font-bold text-slate-900 dark:text-white">{summary.average_rating.toFixed(1)}</span>
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                Based on {summary.total_reviews} review{summary.total_reviews !== 1 ? 's' : ''}
                            </div>
                            {summary.verified_reviews_count > 0 && (
                                <div className="mt-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full flex items-center gap-1">
                                    <span className="material-icons text-sm">verified</span>
                                    {summary.verified_reviews_count} Verified Purchase{summary.verified_reviews_count !== 1 ? 's' : ''}
                                </div>
                            )}
                        </div>

                        {/* Rating Distribution */}
                        <div className="space-y-2">
                            {[5, 4, 3, 2, 1].map((starCount) => (
                                <div key={starCount}>
                                    {renderRatingBar(starCount)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Additional Stats */}
                    {(summary.recommended_percentage > 0 || summary.would_buy_again_percentage > 0) && (
                        <div className="flex gap-4 justify-center mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                            {summary.recommended_percentage > 0 && (
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {Math.round(summary.recommended_percentage)}%
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">Would Recommend</div>
                                </div>
                            )}
                            {summary.would_buy_again_percentage > 0 && (
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {Math.round(summary.would_buy_again_percentage)}%
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">Would Buy Again</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-12 text-center mb-6">
                    <div className="text-5xl mb-4">📝</div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No reviews yet</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">Be the first to review this product!</p>
                    {hasPurchased && userId && (
                        <button
                            onClick={handleWriteReviewClick}
                            className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all hover:scale-105 inline-block"
                        >
                            Write the First Review
                        </button>
                    )}
                </div>
            )}

            {/* Filter Controls */}
            {summary && summary.total_reviews > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <button
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!filters.rating && !filters.verified_only && !filters.with_photos
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                            }`}
                        onClick={() => setFilters({})}
                    >
                        All Reviews
                    </button>
                    <button
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${filters.verified_only
                            ? 'bg-green-500 text-white shadow-lg'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                            }`}
                        onClick={() => setFilters({ ...filters, verified_only: !filters.verified_only })}
                    >
                        <span className="material-icons text-sm">verified</span>
                        Verified Only
                    </button>
                    <button
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${filters.with_photos
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                            }`}
                        onClick={() => setFilters({ ...filters, with_photos: !filters.with_photos })}
                    >
                        <span className="material-icons text-sm">photo_camera</span>
                        With Photos
                    </button>

                    <select
                        value={filters.sort_by || 'recent'}
                        onChange={(e) => setFilters({ ...filters, sort_by: e.target.value as any })}
                        className="ml-auto px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                        <option value="recent">Most Recent</option>
                        <option value="helpful">Most Helpful</option>
                        <option value="rating_high">Highest Rating</option>
                        <option value="rating_low">Lowest Rating</option>
                    </select>
                </div>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-orange-500"></div>
                        <p className="mt-4 text-slate-600 dark:text-slate-400">Loading reviews...</p>
                    </div>
                ) : reviews.length > 0 ? (
                    reviews.map((review) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            onVote={handleVote}
                        />
                    ))
                ) : null}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                        className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Write Review Modal */}
            {showWriteReview && (
                <WriteReviewModal
                    productId={productId}
                    userId={userId}
                    onClose={() => setShowWriteReview(false)}
                    onSubmitted={handleReviewSubmitted}
                />
            )}
        </div>
    );
};
