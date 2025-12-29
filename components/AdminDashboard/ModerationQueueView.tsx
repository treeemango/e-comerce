import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface FlaggedReview {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
    title?: string;
    content: string;
    created_at: string;
    status: string;
    moderation_reason?: string;
    product_title?: string;
    user_email?: string;
    fit_rating: number;
    value_rating: number;
    quality_rating: number;
    pros?: string[];
    cons?: string[];
    recommended?: boolean;
    would_buy_again?: boolean;
    platform_rating?: number;
    platform_feedback?: string;
    photos?: { photo_url: string }[];
}

const ModerationQueueView: React.FC = () => {
    const [flaggedReviews, setFlaggedReviews] = useState<FlaggedReview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFlaggedReviews();
    }, []);

    const loadFlaggedReviews = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('enhanced_reviews')
                .select(`
                    id,
                    product_id,
                    user_id,
                    rating,
                    title,
                    content,
                    created_at,
                    status,
                    moderation_reason,
                    fit_rating,
                    value_rating,
                    quality_rating,
                    pros,
                    cons,
                    recommended,
                    would_buy_again,
                    platform_rating,
                    platform_feedback,
                    products!enhanced_reviews_product_id_fkey(title),
                    review_photos(photo_url)
                `)
                .eq('status', 'pending') // Only show pending reviews
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mapped = data?.map((r: any) => ({
                ...r,
                product_title: r.products?.title || 'Unknown Product',
                photos: r.review_photos || []
            })) || [];

            setFlaggedReviews(mapped);
        } catch (err) {
            console.error('Error loading pending reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        // Approve the review
        const { error } = await supabase
            .from('enhanced_reviews')
            .update({ status: 'approved' })
            .eq('id', id);

        if (!error) {
            setFlaggedReviews(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this review permanently?')) return;

        const { error } = await supabase
            .from('enhanced_reviews')
            .delete()
            .eq('id', id);

        if (!error) {
            setFlaggedReviews(prev => prev.filter(r => r.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
                    <p className="text-sm text-gray-500 mt-1">Review and manage flagged content</p>
                </div>
                <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-sm">
                    {flaggedReviews.length} Pending
                </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                        Loading flagged content...
                    </div>
                ) : flaggedReviews.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        <span className="material-icons text-5xl text-green-400 mb-3">verified</span>
                        <p className="font-medium">All clear! No pending reviews.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {flaggedReviews.map(review => (
                            <div key={review.id} className="p-6 hover:bg-gray-50 transition border-l-4 border-transparent hover:border-indigo-500">
                                <div className="flex flex-col gap-4">
                                    {/* Header: Product & Overall Rating */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-black text-gray-900 text-lg">{review.product_title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex text-yellow-400">
                                                    {[...Array(5)].map((_, i) => (
                                                        <span key={i} className="material-icons text-lg">
                                                            {i < review.rating ? 'star' : 'star_border'}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className="text-sm font-bold text-gray-600">{review.rating}.0</span>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                    {formatDistanceToNow(new Date(review.created_at))} ago
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApprove(review.id)}
                                                className="px-4 py-2 bg-green-100 text-green-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-green-200 transition shadow-sm"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleDelete(review.id)}
                                                className="px-4 py-2 bg-red-100 text-red-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-200 transition shadow-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                                        <div>
                                            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Review Title</span>
                                            <h4 className="font-bold text-gray-900">{review.title || 'No Title'}</h4>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Your Experience</span>
                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{review.content}</p>
                                        </div>
                                    </div>

                                    {/* Sub-Ratings Grid -- FIXED: Safely check for rating values */}
                                    {(review.fit_rating > 0 || review.value_rating > 0 || review.quality_rating > 0) && (
                                        <div className="grid grid-cols-3 gap-4 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                            {review.fit_rating > 0 && (
                                                <div className="text-center">
                                                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Fit</span>
                                                    <div className="text-indigo-600 font-bold">{review.fit_rating}/5</div>
                                                </div>
                                            )}
                                            {review.value_rating > 0 && (
                                                <div className="text-center border-l border-gray-100">
                                                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Value</span>
                                                    <div className="text-indigo-600 font-bold">{review.value_rating}/5</div>
                                                </div>
                                            )}
                                            {review.quality_rating > 0 && (
                                                <div className="text-center border-l border-gray-100">
                                                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Quality</span>
                                                    <div className="text-indigo-600 font-bold">{review.quality_rating}/5</div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Photos Carousel */}
                                    {review.photos && review.photos.length > 0 && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Attached Photos ({review.photos.length})</span>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
                                                {review.photos.map((photo, i) => (
                                                    <div key={i} className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-90 transition">
                                                        <img src={photo.photo_url} alt="Review attachment" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pros & Cons */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            {review.pros && review.pros.length > 0 && (
                                                <>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2 block flex items-center gap-1">
                                                        <span className="material-icons text-sm">thumb_up</span> Pros
                                                    </span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {review.pros.map((pro, i) => (
                                                            <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-md border border-green-100">
                                                                {pro}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            {review.cons && review.cons.length > 0 && (
                                                <>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2 block flex items-center gap-1">
                                                        <span className="material-icons text-sm">thumb_down</span> Cons
                                                    </span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {review.cons.map((con, i) => (
                                                            <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-md border border-red-100">
                                                                {con}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Platform Experience Feedback */}
                                    {(review.platform_rating !== undefined || review.platform_feedback) && (
                                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 mt-2">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                                        <span className="material-icons text-white text-sm">stars</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Platform Experience</span>
                                                        <p className="text-sm font-bold text-indigo-900">JuaExpress Feedback</p>
                                                    </div>
                                                </div>
                                                {review.platform_rating !== undefined && (
                                                    <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
                                                        <span className="material-icons text-indigo-600 text-sm">star</span>
                                                        <span className="text-sm font-black text-indigo-600">{review.platform_rating}.0</span>
                                                    </div>
                                                )}
                                            </div>
                                            {review.platform_feedback ? (
                                                <p className="text-sm text-indigo-800 leading-relaxed font-medium italic">
                                                    "{review.platform_feedback}"
                                                </p>
                                            ) : (
                                                <p className="text-xs text-indigo-400 italic">No text feedback provided for platform.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Recommendation & Buy Again */}
                                    <div className="flex gap-4 pt-2 border-t border-gray-100">
                                        <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg ${review.recommended ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            <span className="material-icons text-sm">{review.recommended ? 'check_circle' : 'cancel'}</span>
                                            Recommends Product
                                        </div>
                                        <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg ${review.would_buy_again ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                            <span className="material-icons text-sm">{review.would_buy_again ? 'all_inclusive' : 'cancel'}</span>
                                            Would Buy Again
                                        </div>
                                    </div>

                                    {/* Moderation Reason / Metadata */}
                                    {review.moderation_reason && (
                                        <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-3">
                                            <span className="material-icons text-red-500">warning</span>
                                            <div>
                                                <p className="text-xs font-black text-red-700 uppercase tracking-wide">Auto-Flagged</p>
                                                <p className="text-sm text-red-600">{review.moderation_reason}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModerationQueueView;
