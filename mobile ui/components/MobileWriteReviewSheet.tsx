import React, { useState } from 'react';
import { SubmitReviewData } from '../../types';
import { submitReview } from '../../lib/api';

interface MobileWriteReviewSheetProps {
    productId: string;
    productName?: string;
    userId?: string;
    onClose: () => void;
    onSubmitted: () => void;
}

const MobileWriteReviewSheet: React.FC<MobileWriteReviewSheetProps> = ({
    productId,
    productName,
    userId,
    onClose,
    onSubmitted
}) => {
    const [rating, setRating] = useState(0);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [recommended, setRecommended] = useState<boolean | undefined>(undefined);
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async () => {
        if (!userId) {
            alert('Please log in to submit a review');
            return;
        }

        if (rating < 1) {
            alert('Please select a rating');
            return;
        }

        if (content.trim().length < 10) {
            alert('Please write a review with at least 10 characters');
            return;
        }

        setUploading(true);

        try {
            const reviewData: SubmitReviewData = {
                product_id: productId,
                user_id: userId,
                rating,
                content,
                title,
                recommended,
                pros: [],
                cons: [],
                photos: []
            };

            const reviewId = await submitReview(reviewData);
            if (reviewId) {
                alert('Review submitted successfully!');
                onSubmitted();
            } else {
                alert('Failed to submit review.');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('An error occurred.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Sheet */}
            <div className="mt-auto bg-white rounded-t-3xl relative z-10 max-h-[90vh] overflow-y-auto animate-slide-up">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pb-4 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">Write a Review</h2>
                        <button onClick={onClose} className="p-2 -mr-2 text-gray-400">
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                    {productName && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{productName}</p>
                    )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-6">
                    {/* Star Rating */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 block">Overall Rating</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className="p-1 transition-transform active:scale-90"
                                >
                                    <span className={`material-icons text-4xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'
                                        }`}>
                                        star
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 block">Title (optional)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Summarize your experience"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Review Content */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 block">Your Review</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Share your experience with this product..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">{content.length}/500 characters</p>
                    </div>

                    {/* Recommendation */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 mb-3 block">Would you recommend this?</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setRecommended(true)}
                                className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition-all ${recommended === true
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-200 text-gray-600'
                                    }`}
                            >
                                <span className="material-icons text-lg align-middle mr-1">thumb_up</span>
                                Yes
                            </button>
                            <button
                                onClick={() => setRecommended(false)}
                                className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition-all ${recommended === false
                                        ? 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-gray-200 text-gray-600'
                                    }`}
                            >
                                <span className="material-icons text-lg align-middle mr-1">thumb_down</span>
                                No
                            </button>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="p-5 border-t border-gray-100 safe-area-bottom">
                    <button
                        onClick={handleSubmit}
                        disabled={uploading || rating === 0}
                        className={`w-full py-4 rounded-xl font-bold text-white transition-all ${uploading || rating === 0
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                            }`}
                    >
                        {uploading ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileWriteReviewSheet;
