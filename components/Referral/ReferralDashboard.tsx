import React, { useEffect, useState } from 'react';
import { fetchReferralStats, ReferralStats } from '@/lib/api';

export const ReferralDashboard: React.FC = () => {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const loadStats = async () => {
            const data = await fetchReferralStats();
            setStats(data);
            setLoading(false);
        };
        loadStats();
    }, []);

    const handleShare = async () => {
        if (!stats?.referral_code) return;

        const shareData = {
            title: 'Join JuaExpress!',
            text: `Use my code ${stats.referral_code} to get a discount on JuaExpress!`,
            url: `https://juaexpress.com/signup?ref=${stats.referral_code}`
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            handleCopy();
        }
    };

    const handleCopy = () => {
        if (!stats?.referral_code) return;
        const link = `https://juaexpress.com/signup?ref=${stats.referral_code}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4 p-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Invite Friends & Earn</h2>
                        <p className="text-orange-100 mb-6 max-w-md">
                            Share your unique code with friends. They get a discount, and you earn cash rewards for every purchase they make!
                        </p>
                    </div>
                    <span className="material-icons text-7xl text-white/20">card_giftcard</span>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between border border-white/20">
                    <div className="font-mono text-xl tracking-wider font-bold">
                        {stats?.referral_code || '---'}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            title="Copy Link"
                        >
                            <span className="material-icons text-white">content_copy</span>
                        </button>
                        <button
                            onClick={handleShare}
                            className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors flex items-center gap-2"
                        >
                            <span className="material-icons text-sm">share</span>
                            Share
                        </button>
                    </div>
                </div>
                {copied && <p className="text-sm mt-2 text-green-200">Link copied to clipboard!</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-gray-400">
                        <span className="material-icons">group</span>
                        <span className="text-sm font-medium">Friends Referred</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats?.total_referrals || 0}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-gray-400">
                        <span className="material-icons">monetization_on</span>
                        <span className="text-sm font-medium">Total Earned</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                        ${stats?.total_earned?.toFixed(2) || '0.00'}
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works</h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-disc list-inside">
                    <li>Share your unique link with friends</li>
                    <li>They sign up and get a 10% discount coupon</li>
                    <li>You earn $10 credit when they complete their first order</li>
                </ul>
            </div>
        </div>
    );
};
