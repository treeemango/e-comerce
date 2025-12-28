import React, { useState, useEffect } from 'react';
import { fetchFeedback, updateFeedbackStatus } from '@/lib/api';

const FeedbackSupportView: React.FC = () => {
    const [feedback, setFeedback] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'resolved'>('all');

    useEffect(() => {
        loadFeedback();
    }, []);

    const loadFeedback = async () => {
        setLoading(true);
        const data = await fetchFeedback();
        setFeedback(data);
        setLoading(false);
    };

    const handleStatusUpdate = async (id: string, newStatus: 'new' | 'read' | 'resolved') => {
        const { success } = await updateFeedbackStatus(id, newStatus);
        if (success) {
            setFeedback(prev => prev.map(item =>
                item.id === id ? { ...item, status: newStatus } : item
            ));
        }
    };

    const filteredFeedback = feedback.filter(item => {
        if (filter === 'all') return true;
        return item.status === filter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'read': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
            case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Feedback & Support</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage user reports and feature requests</p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800">
                    {(['all', 'new', 'read', 'resolved'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${filter === tab
                                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400 animate-pulse">
                    <span className="material-icons text-4xl mb-4">refresh</span>
                    <p>Loading feedback...</p>
                </div>
            ) : filteredFeedback.length > 0 ? (
                <div className="grid gap-4">
                    {filteredFeedback.map(item => (
                        <div key={item.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${getStatusColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            {item.category}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            • {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs text-gray-400 hidden sm:inline-block">
                                            • {item.device_info}
                                        </span>
                                    </div>
                                    <p className="text-gray-900 dark:text-white font-medium leading-relaxed">
                                        {item.message}
                                    </p>
                                    {item.page_url && (
                                        <div className="mt-3 text-xs text-gray-400 font-mono bg-gray-50 dark:bg-black/30 px-2 py-1 rounded inline-block">
                                            Location: {item.page_url}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.status === 'new' && (
                                        <button
                                            onClick={() => handleStatusUpdate(item.id, 'read')}
                                            className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                                            title="Mark as Read"
                                        >
                                            <span className="material-icons text-lg">mark_chat_read</span>
                                        </button>
                                    )}
                                    {item.status !== 'resolved' && (
                                        <button
                                            onClick={() => handleStatusUpdate(item.id, 'resolved')}
                                            className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white transition-colors"
                                            title="Mark as Resolved"
                                        >
                                            <span className="material-icons text-lg">check</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons text-gray-300 text-3xl">inbox</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No feedback found</h3>
                    <p className="text-gray-500 text-sm mt-1">There are no feedback entries with this status.</p>
                </div>
            )}
        </div>
    );
};

export default FeedbackSupportView;
