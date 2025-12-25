import React, { useState } from 'react';
import { SubmitReviewData } from '../../types';
import { submitReview } from '../../lib/api';

interface MobileWriteReviewSheetProps {
    productId: string;
    productName?: string;
    userId?: string;
    orderId?: string;
    onClose: () => void;
    onSubmitted: () => void;
}

const MobileWriteReviewSheet: React.FC<MobileWriteReviewSheetProps> = ({
    productId,
    productName,
    userId,
    orderId,
    onClose,
    onSubmitted
}) => {
    // Core ratings
    const [rating, setRating] = useState(0);
    const [fitRating, setFitRating] = useState(0);
    const [valueRating, setValueRating] = useState(0);
    const [qualityRating, setQualityRating] = useState(0);

    // Text content
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // Tags
    const [pros, setPros] = useState<string[]>([]);
    const [cons, setCons] = useState<string[]>([]);
    const [prosInput, setProsInput] = useState('');
    const [consInput, setConsInput] = useState('');

    // Toggles
    const [recommended, setRecommended] = useState<boolean | undefined>(undefined);
    const [wouldBuyAgain, setWouldBuyAgain] = useState<boolean>(false);

    // Media
    const [photos, setPhotos] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    const handleAddPro = () => {
        if (prosInput.trim()) {
            setPros([...pros, prosInput.trim()]);
            setProsInput('');
        }
    };

    const handleAddCon = () => {
        if (consInput.trim()) {
            setCons([...cons, consInput.trim()]);
            setConsInput('');
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

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
                order_id: orderId,
                rating,
                fit_rating: fitRating || undefined,
                value_rating: valueRating || undefined,
                quality_rating: qualityRating || undefined,
                content,
                title,
                recommended,
                would_buy_again: wouldBuyAgain,
                pros,
                cons,
                photos
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

    const renderStars = (current: number, set: (n: number) => void, size = '3xl', color = 'text-yellow-400') => (
        <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    onClick={() => set(star)}
                    className="p-1 transition-transform active:scale-90"
                >
                    <span className={`material-icons text-${size} ${star <= current ? color : 'text-gray-300'
                        }`}>
                        star
                    </span>
                </button>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex flex-col">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Sheet */}
            <div className="mt-auto bg-gray-50 rounded-t-[2.5rem] relative z-10 max-h-[95vh] overflow-y-auto w-full shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-gray-50 z-20">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 border-b border-gray-100 bg-gray-50 sticky top-4 z-20">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Write Review</h2>
                            {productName && (
                                <p className="text-xs font-medium text-gray-500 mt-1 line-clamp-1 max-w-[250px]">{productName}</p>
                            )}
                        </div>
                        <button onClick={onClose} className="p-2 bg-gray-200 rounded-full text-gray-500 hover:bg-gray-300">
                            <span className="material-icons text-lg">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 pb-32">
                    {/* Overall Star Rating */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm text-center">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 block">Overall Rating</label>
                        <div className="flex justify-center">
                            {renderStars(rating, setRating, '5xl')}
                        </div>
                        <p className="text-sm font-medium text-gray-400 mt-2">
                            {rating === 0 ? 'Tap to rate' : rating === 5 ? 'Excellent!' : rating === 4 ? 'Detailed' : rating === 3 ? 'Average' : 'Poor'}
                        </p>
                    </div>

                    {/* Detailed Ratings */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
                        <h3 className="text-sm font-bold text-gray-900">Detailed Feedback</h3>

                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-gray-500">Fit</label>
                            {renderStars(fitRating, setFitRating, 'xl', 'text-orange-400')}
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-gray-500">Value</label>
                            {renderStars(valueRating, setValueRating, 'xl', 'text-orange-400')}
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-gray-500">Quality</label>
                            {renderStars(qualityRating, setQualityRating, 'xl', 'text-orange-400')}
                        </div>
                    </div>

                    {/* Review Content */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Review Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="E.g. Best purchase ever!"
                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm font-bold placeholder-gray-300 focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Your Experience</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What did you like or dislike? How was the fit?"
                                rows={4}
                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm font-medium placeholder-gray-300 focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                            <p className="text-[10px] text-right text-gray-400 mt-1">{content.length} / 500 characters</p>
                        </div>
                    </div>

                    {/* Media Upload */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 block">Add Photos</label>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                            <label className="flex-shrink-0 w-20 h-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 active:bg-gray-100 cursor-pointer">
                                <span className="material-icons text-xl mb-1">add_a_photo</span>
                                <span className="text-[9px] font-bold uppercase">Add</span>
                                <input type="file" className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} />
                            </label>
                            {photos.map((photo, i) => (
                                <div key={i} className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-xl relative overflow-hidden group">
                                    <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removePhoto(i)}
                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                                    >
                                        <span className="material-icons text-xs">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tags (Pros/Cons) */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
                        {/* Pros */}
                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-green-600 mb-2 block flex items-center gap-2">
                                <span className="material-icons text-sm">thumb_up</span> Pros
                            </label>
                            <div className="flex gap-2 mb-3 flex-wrap">
                                {pros.map((p, i) => (
                                    <span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                        {p} <button onClick={() => setPros(pros.filter((_, idx) => idx !== i))} className="hover:text-green-900">×</button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={prosInput}
                                    onChange={(e) => setProsInput(e.target.value)}
                                    placeholder="Add a pro..."
                                    className="flex-1 px-4 py-2 bg-gray-50 border-0 rounded-xl text-xs font-bold"
                                />
                                <button onClick={handleAddPro} className="bg-green-500 text-white px-4 rounded-xl font-bold text-xs">Add</button>
                            </div>
                        </div>

                        {/* Cons */}
                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-red-600 mb-2 block flex items-center gap-2">
                                <span className="material-icons text-sm">thumb_down</span> Cons
                            </label>
                            <div className="flex gap-2 mb-3 flex-wrap">
                                {cons.map((c, i) => (
                                    <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                        {c} <button onClick={() => setCons(cons.filter((_, idx) => idx !== i))} className="hover:text-red-900">×</button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={consInput}
                                    onChange={(e) => setConsInput(e.target.value)}
                                    placeholder="Add a con..."
                                    className="flex-1 px-4 py-2 bg-gray-50 border-0 rounded-xl text-xs font-bold"
                                />
                                <button onClick={handleAddCon} className="bg-red-500 text-white px-4 rounded-xl font-bold text-xs">Add</button>
                            </div>
                        </div>
                    </div>

                    {/* Final Toggles */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">Would you recommend this?</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setRecommended(true)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${recommended === true ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setRecommended(false)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${recommended === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                                >
                                    No
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                            <span className="text-sm font-bold text-gray-700">Would buy again?</span>
                            <button
                                onClick={() => setWouldBuyAgain(!wouldBuyAgain)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${wouldBuyAgain ? 'bg-orange-500' : 'bg-gray-200'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${wouldBuyAgain ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 safe-area-bottom rounded-t-3xl z-30">
                    <button
                        onClick={handleSubmit}
                        disabled={uploading || rating === 0}
                        className={`w-full py-4 rounded-2xl font-black text-white text-sm uppercase tracking-wide transition-all ${uploading || rating === 0
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-gradient-to-r from-orange-500 to-red-600 shadow-xl shadow-orange-500/30'
                            }`}
                    >
                        {uploading ? 'Publishing Review...' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileWriteReviewSheet;
