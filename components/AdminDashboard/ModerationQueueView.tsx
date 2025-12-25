import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface FlaggedReview {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
    comment: string;
    created_at: string;
    flagged_reason?: string;
    product_title?: string;
    user_email?: string;
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
                .from('reviews')
                .select(`
                    id,
                    product_id,
                    user_id,
                    rating,
                    comment,
                    created_at,
                    flagged_reason,
                    products(title),
                    profiles(email)
                `)
                .eq('flagged', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mapped = data?.map((r: any) => ({
                ...r,
                product_title: r.products?.title || 'Unknown Product',
                user_email: r.profiles?.email || 'Unknown User'
            })) || [];

            setFlaggedReviews(mapped);
        } catch (err) {
            console.error('Error loading flagged reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        // Unflag the review
        const { error } = await supabase
            .from('reviews')
            .update({ flagged: false, flagged_reason: null })
            .eq('id', id);

        if (!error) {
            setFlaggedReviews(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this review permanently?')) return;

        const { error } = await supabase
            .from('reviews')
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
                        <p className="font-medium">All clear! No flagged content.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {flaggedReviews.map(review => (
                            <div key={review.id} className="p-5 hover:bg-gray-50 transition">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-900">{review.product_title}</span>
                                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                                                {review.rating}★
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2 line-clamp-2">{review.comment}</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                            <span>By: {review.user_email}</span>
                                            <span>•</span>
                                            <span>{formatDistanceToNow(new Date(review.created_at))} ago</span>
                                        </div>
                                        {review.flagged_reason && (
                                            <p className="mt-2 text-xs text-red-500 bg-red-50 px-2 py-1 rounded inline-block">
                                                Reason: {review.flagged_reason}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleApprove(review.id)}
                                            className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleDelete(review.id)}
                                            className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition"
                                        >
                                            Delete
                                        </button>
                                    </div>
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
