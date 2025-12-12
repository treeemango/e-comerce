import React, { useState } from 'react';
import { SubmitReviewData } from '@/types';
import { submitReview } from '@/lib/api';

interface WriteReviewModalProps {
    productId: string;
    userId?: string;
    onClose: () => void;
    onSubmitted: () => void;
}

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
    productId,
    userId,
    onClose,
    onSubmitted
}) => {
    const [formData, setFormData] = useState<Partial<SubmitReviewData>>({
        product_id: productId,
        user_id: userId || '',
        rating: 0,
        content: '',
        title: '',
        pros: [],
        cons: [],
        recommended: undefined,
        would_buy_again: undefined,
        fit_rating: undefined,
        value_rating: undefined,
        quality_rating: undefined,
        photos: []
    });

    const [prosInput, setProsInput] = useState('');
    const [consInput, setConsInput] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleRatingClick = (rating: number, type: 'overall' | 'fit' | 'value' | 'quality') => {
        if (type === 'overall') {
            setFormData({ ...formData, rating });
        } else {
            setFormData({ ...formData, [`${type}_rating`]: rating });
        }
    };

    const handleAddPro = () => {
        if (prosInput.trim()) {
            setFormData({
                ...formData,
                pros: [...(formData.pros || []), prosInput.trim()]
            });
            setProsInput('');
        }
    };

    const handleAddCon = () => {
        if (consInput.trim()) {
            setFormData({
                ...formData,
                cons: [...(formData.cons || []), consInput.trim()]
            });
            setConsInput('');
        }
    };

    const handleRemovePro = (index: number) => {
        const newPros = [...(formData.pros || [])];
        newPros.splice(index, 1);
        setFormData({ ...formData, pros: newPros });
    };

    const handleRemoveCon = (index: number) => {
        const newCons = [...(formData.cons || [])];
        newCons.splice(index, 1);
        setFormData({ ...formData, cons: newCons });
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setFormData({ ...formData, photos: files });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId) {
            alert('Please log in to submit a review');
            return;
        }

        if (!formData.rating || formData.rating < 1) {
            alert('Please select a rating');
            return;
        }

        if (!formData.content || formData.content.trim().length < 10) {
            alert('Please write a review with at least 10 characters');
            return;
        }

        setUploading(true);

        try {
            const reviewId = await submitReview(formData as SubmitReviewData);
            if (reviewId) {
                alert('Review submitted successfully! It will be visible after moderation.');
                onSubmitted();
            } else {
                alert('Failed to submit review. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('An error occurred while submitting your review.');
        } finally {
            setUploading(false);
        }
    };

    const renderStarRating = (currentRating: number, type: 'overall' | 'fit' | 'value' | 'quality', label: string) => {
        return (
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                    {label} {type === 'overall' && <span className="text-red-500">*</span>}
                </label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingClick(star, type)}
                            className={`text-3xl transition-all hover:scale-110 ${star <= currentRating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'
                                }`}
                        >
                            <span className="material-icons text-inherit">
                                {star <= currentRating ? 'star' : 'star_border'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold">Write a Review</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-slate-200 transition-colors"
                    >
                        <span className="material-icons text-3xl">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Overall Rating */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6">
                        {renderStarRating(formData.rating || 0, 'overall', 'Overall Rating')}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Review Title
                        </label>
                        <input
                            type="text"
                            placeholder="Summarize your experience"
                            value={formData.title || ''}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-orange-500 dark:focus:border-orange-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Review Content */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Your Review <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            placeholder="Share your thoughts about this product..."
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-orange-500 dark:focus:border-orange-500 focus:outline-none transition-colors resize-none"
                            rows={6}
                            required
                        />
                    </div>

                    {/* Additional Ratings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Additional Ratings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {renderStarRating(formData.fit_rating || 0, 'fit', 'Fit')}
                            {renderStarRating(formData.value_rating || 0, 'value', 'Value')}
                            {renderStarRating(formData.quality_rating || 0, 'quality', 'Quality')}
                        </div>
                    </div>

                    {/* Pros */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Pros (What did you like?)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add a pro..."
                                value={prosInput}
                                onChange={(e) => setProsInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPro())}
                                className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-orange-500 dark:focus:border-orange-500 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleAddPro}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        {formData.pros && formData.pros.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {formData.pros.map((pro, index) => (
                                    <div key={index} className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                                        <span className="text-sm text-green-800 dark:text-green-300">{pro}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePro(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <span className="material-icons text-sm">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cons */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Cons (What could be improved?)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add a con..."
                                value={consInput}
                                onChange={(e) => setConsInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCon())}
                                className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-orange-500 dark:focus:border-orange-500 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleAddCon}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        {formData.cons && formData.cons.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {formData.cons.map((con, index) => (
                                    <div key={index} className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                                        <span className="text-sm text-red-800 dark:text-red-300">{con}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCon(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <span className="material-icons text-sm">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.recommended || false}
                                onChange={(e) => setFormData({ ...formData, recommended: e.target.checked })}
                                className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-orange-500 focus:ring-2 focus:ring-orange-500"
                            />
                            <span className="text-sm font-medium text-slate-900 dark:text-white">I recommend this product</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.would_buy_again || false}
                                onChange={(e) => setFormData({ ...formData, would_buy_again: e.target.checked })}
                                className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-orange-500 focus:ring-2 focus:ring-orange-500"
                            />
                            <span className="text-sm font-medium text-slate-900 dark:text-white">I would buy this again</span>
                        </label>
                    </div>

                    {/* Photo Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Add Photos
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoUpload}
                            className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-900/30 dark:file:text-orange-400 dark:hover:file:bg-orange-900/50"
                        />
                        {formData.photos && formData.photos.length > 0 && (
                            <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                                ✓ {formData.photos.length} photo(s) selected
                            </div>
                        )}
                    </div>

                    {/* Submit Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {uploading ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
