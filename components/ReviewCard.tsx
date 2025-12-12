import React, { useState } from 'react';
import { Review } from '@/types';

interface ReviewCardProps {
    review: Review;
    onVote: (reviewId: string, voteType: 'helpful' | 'unhelpful') => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onVote }) => {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const handleVote = (voteType: 'helpful' | 'unhelpful') => {
        if (!hasVoted) {
            onVote(review.id, voteType);
            setHasVoted(true);
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex text-yellow-400">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="material-icons text-base">
                        {star <= rating ? 'star' : 'star_border'}
                    </span>
                ))}
            </div>
        );
    };

    const helpfulPercentage = review.total_votes > 0
        ? Math.round((review.helpful_votes / review.total_votes) * 100)
        : 0;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                    {/* User Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {(review.user_name || 'U')[0].toUpperCase()}
                    </div>

                    {/* User Info */}
                    <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                            {review.user_name || 'Anonymous'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {review.is_verified_purchase && (
                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                    <span className="material-icons text-xs">verified</span>
                                    Verified Purchase
                                </span>
                            )}
                            {review.is_featured && (
                                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                    <span className="material-icons text-xs">star</span>
                                    Featured
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rating & Date */}
                <div className="text-right">
                    {renderStars(review.rating)}
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {formatDate(review.created_at)}
                    </div>
                </div>
            </div>

            {/* Title */}
            {review.title && (
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {review.title}
                </h3>
            )}

            {/* Content */}
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                {review.content}
            </p>

            {/* Additional Ratings */}
            {(review.fit_rating || review.value_rating || review.quality_rating) && (
                <div className="flex flex-wrap gap-4 mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    {review.fit_rating && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Fit:</span>
                            {renderStars(review.fit_rating)}
                        </div>
                    )}
                    {review.value_rating && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Value:</span>
                            {renderStars(review.value_rating)}
                        </div>
                    )}
                    {review.quality_rating && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Quality:</span>
                            {renderStars(review.quality_rating)}
                        </div>
                    )}
                </div>
            )}

            {/* Pros and Cons */}
            {(review.pros?.length || review.cons?.length) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {review.pros && review.pros.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-2 flex items-center gap-1">
                                <span className="material-icons text-sm">thumb_up</span>
                                Pros
                            </h4>
                            <ul className="space-y-1">
                                {review.pros.map((pro, index) => (
                                    <li key={index} className="text-xs text-green-700 dark:text-green-300 flex items-start gap-1">
                                        <span className="text-green-500 mt-0.5">•</span>
                                        <span>{pro}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {review.cons && review.cons.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2 flex items-center gap-1">
                                <span className="material-icons text-sm">thumb_down</span>
                                Cons
                            </h4>
                            <ul className="space-y-1">
                                {review.cons.map((con, index) => (
                                    <li key={index} className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1">
                                        <span className="text-red-500 mt-0.5">•</span>
                                        <span>{con}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Recommendations */}
            {(review.recommended !== undefined || review.would_buy_again !== undefined) && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {review.recommended !== undefined && (
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${review.recommended
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}>
                            {review.recommended ? '✓ I recommend this' : '✗ I don\'t recommend this'}
                        </span>
                    )}
                    {review.would_buy_again !== undefined && (
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${review.would_buy_again
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}>
                            {review.would_buy_again ? '✓ Would buy again' : '✗ Wouldn\'t buy again'}
                        </span>
                    )}
                </div>
            )}

            {/* Review Photos */}
            {review.photos && review.photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {review.photos.map((photo) => (
                        <div
                            key={photo.id}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-slate-200 dark:border-slate-700"
                            onClick={() => setSelectedPhoto(photo.photo_url)}
                        >
                            <img
                                src={photo.photo_url}
                                alt={photo.caption || 'Review photo'}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Vendor Responses */}
            {review.responses && review.responses.length > 0 && (
                <div className="space-y-3 mb-4">
                    {review.responses.map((response) => (
                        <div key={response.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons text-blue-600 dark:text-blue-400 text-sm">
                                    {response.responder_type === 'vendor' ? 'store' : 'support_agent'}
                                </span>
                                <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                                    {response.responder_type === 'vendor' ? 'Seller Response' : 'Admin Response'}
                                </span>
                                {response.is_official && (
                                    <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                                        Official
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">{response.response_text}</p>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(response.created_at)}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions - Helpfulness Voting */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Was this helpful?</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleVote('helpful')}
                            disabled={hasVoted}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${hasVoted
                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400'
                                }`}
                        >
                            <span className="material-icons text-sm">thumb_up</span>
                            Yes ({review.helpful_votes})
                        </button>
                        <button
                            onClick={() => handleVote('unhelpful')}
                            disabled={hasVoted}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${hasVoted
                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400'
                                }`}
                        >
                            <span className="material-icons text-sm">thumb_down</span>
                            No ({review.total_votes - review.helpful_votes})
                        </button>
                    </div>
                </div>
                {review.total_votes > 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {helpfulPercentage}% found this helpful
                    </div>
                )}
            </div>

            {/* Photo Lightbox */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            className="absolute -top-12 right-0 text-white text-4xl hover:text-slate-300"
                            onClick={() => setSelectedPhoto(null)}
                        >
                            ×
                        </button>
                        <img
                            src={selectedPhoto}
                            alt="Review photo"
                            className="max-w-full max-h-[90vh] rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
