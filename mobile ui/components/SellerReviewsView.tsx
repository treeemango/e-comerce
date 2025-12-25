
import React, { useState, useEffect } from 'react';
import { fetchSellerReviews, submitReviewResponse } from '../../lib/api';
import { Review } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface SellerReviewsViewProps {
    sellerId: string;
}

export const SellerReviewsView: React.FC<SellerReviewsViewProps> = ({ sellerId }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [responseTime, setResponseTime] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchSellerReviews(sellerId);
            setReviews(data);
        } catch (error) {
            console.error('Failed to load reviews', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [sellerId]);

    const handleSubmitResponse = async (reviewId: string) => {
        const text = responseTime[reviewId];
        if (!text) return;

        setSubmitting(prev => ({ ...prev, [reviewId]: true }));
        try {
            const success = await submitReviewResponse(reviewId, sellerId, text);
            if (success) {
                setResponseTime(prev => ({ ...prev, [reviewId]: '' }));
                await loadData();
            }
        } finally {
            setSubmitting(prev => ({ ...prev, [reviewId]: false }));
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                No reviews yet for your products.
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-full pb-20">
            <div className="p-5">
                <h2 className="text-xl font-black text-slate-800 mb-6">Product Reviews</h2>

                <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <div className="flex gap-3 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-50">
                                    {review.product_image ? (
                                        <img src={review.product_image} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-icons text-gray-300">image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-900 truncate">{review.product_title}</div>
                                    <div className="flex items-center gap-1 mt-1">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={`material-icons text-[10px] ${i < review.rating ? 'text-orange-400' : 'text-gray-200'}`}>star</span>
                                        ))}
                                        <span className="text-[10px] text-gray-400 ml-1">{new Date(review.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className={`text-[10px] h-fit px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight ${review.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                                    }`}>
                                    {review.status}
                                </div>
                            </div>

                            <div className="mb-4">
                                {review.title && <div className="text-sm font-bold text-gray-900 mb-1 leading-tight">"{review.title}"</div>}
                                <p className="text-sm text-gray-600 leading-relaxed">{review.content}</p>
                            </div>

                            {/* Photos */}
                            {review.photos && review.photos.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                                    {review.photos.map(photo => (
                                        <div key={photo.id} className="w-20 aspect-square rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                            <img src={photo.photo_url} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pros/Cons */}
                            {(review.pros?.length || review.cons?.length) && (
                                <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
                                    {review.pros && review.pros.length > 0 && (
                                        <div className="flex gap-2">
                                            <span className="material-icons text-green-500 text-sm">add_circle</span>
                                            <p className="text-xs text-gray-600 italic truncate">{review.pros.join(', ')}</p>
                                        </div>
                                    )}
                                    {review.cons && review.cons.length > 0 && (
                                        <div className="flex gap-2">
                                            <span className="material-icons text-red-500 text-sm">remove_circle</span>
                                            <p className="text-xs text-gray-600 italic truncate">{review.cons.join(', ')}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Existing Responses */}
                            {review.responses && review.responses.length > 0 && (
                                <div className="space-y-3 mb-4">
                                    {review.responses.map(resp => (
                                        <div key={resp.id} className="bg-blue-50/50 border-l-2 border-blue-400 pl-3 py-1 rounded-r-lg">
                                            <div className="text-[10px] font-black text-blue-900 mb-0.5 uppercase tracking-wide">Your Response</div>
                                            <p className="text-xs text-blue-800 leading-normal">{resp.response_text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Form */}
                            <div className="mt-4 pt-4 border-t border-gray-50">
                                <textarea
                                    value={responseTime[review.id] || ''}
                                    onChange={(e) => setResponseTime(prev => ({ ...prev, [review.id]: e.target.value }))}
                                    placeholder="Type your response here..."
                                    className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-orange-500 rounded-xl p-3 text-sm min-h-[80px] transition-all outline-none"
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={() => handleSubmitResponse(review.id)}
                                        disabled={!responseTime[review.id] || submitting[review.id]}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${!responseTime[review.id] || submitting[review.id]
                                                ? 'bg-gray-100 text-gray-400'
                                                : 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                                            }`}
                                    >
                                        {submitting[review.id] ? 'Posting...' : 'Post Response'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
