import React, { useState } from 'react';
import { submitFeedback } from '@/lib/api';

interface MobileFeedbackSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MobileFeedbackSheet: React.FC<MobileFeedbackSheetProps> = ({
    isOpen,
    onClose
}) => {
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<string>('general');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!message.trim()) return;

        setIsSubmitting(true);
        // Assuming 'mobile' as device info
        const { success } = await submitFeedback(message, category, 'mobile');
        setIsSubmitting(false);

        if (success) {
            setSuccess(true);
            setMessage('');
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full bg-white dark:bg-zinc-900 rounded-t-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">

                {/* Handle Bar */}
                <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Send Feedback</h2>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Help us improve your experience</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                        <span className="material-icons text-sm">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                                <span className="material-icons text-4xl text-green-600 dark:text-green-400">check_circle</span>
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Feedback Sent!</h3>
                                <p className="text-sm text-gray-500 mt-2">Thank you for helping us build specific features.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Categories */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Topic</label>
                                <div className="flex flex-wrap gap-2">
                                    {['general', 'bug', 'feature request', 'other'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setCategory(cat)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${category === cat
                                                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-lg scale-105'
                                                    : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-black dark:hover:border-white'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Message</label>
                                <textarea
                                    className="w-full h-40 p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-black dark:focus:ring-white outline-none resize-none transition-all placeholder:text-gray-400"
                                    placeholder="Tell us what you think..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400 text-right">
                                    {message.length} chars
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !message.trim()}
                                className="w-full py-4 bg-gradient-to-r from-gray-900 to-black dark:from-white dark:to-gray-100 text-white dark:text-black rounded-2xl font-bold text-sm uppercase tracking-wider shadow-xl shadow-black/20 dark:shadow-white/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <span>Submit Feedback</span>
                                        <span className="material-icons text-sm">send</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
