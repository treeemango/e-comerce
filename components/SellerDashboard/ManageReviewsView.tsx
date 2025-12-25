
import React, { useState, useEffect } from 'react';
import { fetchSellerReviews, submitReviewResponse } from '../../lib/api';
import { Review } from '../../types';
import { useNotifications } from '../NotificationContext';

interface ManageReviewsViewProps {
    sellerId?: string;
}

const ManageReviewsView: React.FC<ManageReviewsViewProps> = ({ sellerId }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [responseTime, setResponseTime] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
    const { showNotification } = useNotifications();

    const loadData = async () => {
        if (sellerId) {
            setIsLoading(true);
            const data = await fetchSellerReviews(sellerId);
            setReviews(data);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [sellerId]);

    const handleResponseChange = (reviewId: string, text: string) => {
        setResponseTime(prev => ({ ...prev, [reviewId]: text }));
    };

    const handleSubmitResponse = async (reviewId: string) => {
        const text = responseTime[reviewId];
        if (!text || !sellerId) return;

        setIsSubmitting(prev => ({ ...prev, [reviewId]: true }));
        const success = await submitReviewResponse(reviewId, sellerId, text);

        if (success) {
            showNotification('Response submitted successfully', 'success');
            setResponseTime(prev => ({ ...prev, [reviewId]: '' }));
            await loadData(); // Refresh reviews
        } else {
            showNotification('Failed to submit response', 'error');
        }
        setIsSubmitting(prev => ({ ...prev, [reviewId]: false }));
    };

    if (!sellerId) return <div className="p-8 text-center text-gray-500">Please log in to view reviews.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Manage Reviews</h1>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
            ) : reviews.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500 border border-gray-100">
                    No reviews yet for your products.
                </div>
            ) : (
                <div className="grid gap-6">
                    {reviews.map((review) => (
                        <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex gap-4">
                                        {review.product_image && (
                                            <img src={review.product_image} alt={review.product_title} className="w-16 h-16 object-cover rounded-md border border-gray-100" />
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-1">{review.product_title}</h3>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="flex text-orange-400">
                                                    {[...Array(5)].map((_, i) => (
                                                        <span key={i} className={`material-icons text-sm ${i < review.rating ? 'text-orange-400' : 'text-gray-200'}`}>star</span>
                                                    ))}
                                                </div>
                                                <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                                                {review.is_verified_purchase && (
                                                    <span className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                                        <span className="material-icons text-[12px]">verified</span> Verified Purchase
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-xs px-2 py-1 rounded capitalize font-medium ${review.status === 'approved' ? 'bg-green-50 text-green-700' :
                                        review.status === 'pending' ? 'bg-orange-50 text-orange-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {review.status}
                                    </div>
                                </div>

                                <div className="pl-0 sm:pl-20">
                                    {review.title && <h4 className="font-bold text-gray-900 mb-1 italic">"{review.title}"</h4>}
                                    <p className="text-gray-700 text-sm leading-relaxed mb-4">{review.content}</p>

                                    {/* Pros & Cons */}
                                    {(review.pros?.length || review.cons?.length) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-gray-50 p-3 rounded-md">
                                            {review.pros && review.pros.length > 0 && (
                                                <div>
                                                    <span className="text-[10px] uppercase tracking-wider text-green-600 font-bold mb-1 block">Pros</span>
                                                    <ul className="text-xs text-gray-600 list-disc list-inside">
                                                        {review.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {review.cons && review.cons.length > 0 && (
                                                <div>
                                                    <span className="text-[10px] uppercase tracking-wider text-red-600 font-bold mb-1 block">Cons</span>
                                                    <ul className="text-xs text-gray-600 list-disc list-inside">
                                                        {review.cons.map((con, i) => <li key={i}>{con}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Existing Responses */}
                                    {review.responses && review.responses.length > 0 && (
                                        <div className="space-y-4 mb-4">
                                            {review.responses.map((resp) => (
                                                <div key={resp.id} className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-sm text-blue-900">Official Seller Response</span>
                                                        <span className="text-[10px] text-blue-600">{new Date(resp.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-blue-800">{resp.response_text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Response Input */}
                                    <div className="mt-4 border-t border-gray-100 pt-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Write a Response</label>
                                        <div className="flex gap-2">
                                            <textarea
                                                value={responseTime[review.id] || ''}
                                                onChange={(e) => handleResponseChange(review.id, e.target.value)}
                                                placeholder="Thank the customer or address their feedback..."
                                                className="flex-1 min-h-[80px] p-3 text-sm border border-gray-300 rounded focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div className="mt-2 flex justify-end">
                                            <button
                                                onClick={() => handleSubmitResponse(review.id)}
                                                disabled={!responseTime[review.id] || isSubmitting[review.id]}
                                                className={`px-4 py-2 rounded text-sm font-bold transition-all ${!responseTime[review.id] || isSubmitting[review.id]
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
                                                    }`}
                                            >
                                                {isSubmitting[review.id] ? 'Submitting...' : 'Post Response'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageReviewsView;
