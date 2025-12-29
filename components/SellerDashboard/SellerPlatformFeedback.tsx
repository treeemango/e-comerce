import React, { useState } from 'react';
import { SubmitReviewData } from '@/types';
import { submitReview } from '@/lib/api';

interface SellerPlatformFeedbackProps {
    sellerId: string;
}

const SellerPlatformFeedback: React.FC<SellerPlatformFeedbackProps> = ({ sellerId }) => {
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            alert('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        try {
            // Use a special "PLATFORM" product ID if needed, 
            // or just use a dummy UUID if the DB requires one.
            // For now, we'll use a reserved ID for platform feedback.
            const data: SubmitReviewData = {
                product_id: '00000000-0000-0000-0000-000000000000', // Reserved for Platform Feedback
                user_id: sellerId,
                rating: 5, // Product rating is irrelevant here, but must be valid
                content: 'Seller Platform Feedback',
                platform_rating: rating,
                platform_feedback: feedback.trim() || undefined,
            };

            const success = await submitReview(data);
            if (success) {
                setSubmitted(true);
            } else {
                alert('Failed to submit feedback. Please try again.');
            }
        } catch (err) {
            console.error('Error submitting seller feedback:', err);
            alert('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
                <span className="material-icons text-blue-500 text-4xl mb-2">check_circle</span>
                <h3 className="text-lg font-bold text-gray-900">Thank you!</h3>
                <p className="text-sm text-gray-600 mt-1">Your feedback helps us make JuaExpress better for all sellers.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <span className="material-icons">rate_review</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Share Your Experience</h3>
                    <p className="text-sm text-gray-500">How is JuaExpress working for your business?</p>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Platform Rating</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`text-3xl transition-all ${star <= rating ? 'text-yellow-400 scale-110' : 'text-gray-200 hover:text-gray-300'}`}
                            >
                                <span className="material-icons">star</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Feedback (Optional)</label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="What do you like? What can we improve?"
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || rating === 0}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                </button>
            </div>
        </div>
    );
};

export default SellerPlatformFeedback;
