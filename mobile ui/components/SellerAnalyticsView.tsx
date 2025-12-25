import React, { useEffect, useState } from 'react';
import { fetchSellerAnalytics } from '../../lib/api';
import { SellerAnalyticsSummary } from '../../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts';
import { formatCurrency } from '../../lib/utils';

interface SellerAnalyticsViewProps {
    sellerId: string;
    onBack?: () => void;
}

export const SellerAnalyticsView: React.FC<SellerAnalyticsViewProps> = ({ sellerId, onBack }) => {
    const [analytics, setAnalytics] = useState<SellerAnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await fetchSellerAnalytics(sellerId);
            setAnalytics(data);
            setLoading(false);
        };
        load();
    }, [sellerId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading analytics...</p>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center py-20 text-gray-500">
                <span className="material-icons text-5xl text-gray-300 mb-3">analytics</span>
                <p className="font-medium">No analytics data available yet.</p>
            </div>
        );
    }

    const revenueData = analytics.dailyRevenue || [];
    const topProducts = analytics.topProducts || [];

    return (
        <div className="bg-gray-50 min-h-full">
            {/* Header */}
            <div className="bg-white px-5 py-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
                {onBack && (
                    <button onClick={onBack} className="p-1">
                        <span className="material-icons text-gray-600">arrow_back</span>
                    </button>
                )}
                <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
            </div>

            <div className="p-5 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
                        <p className="text-xl font-black text-gray-900 mt-1">{formatCurrency(analytics.totalRevenue || 0)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Orders</p>
                        <p className="text-xl font-black text-gray-900 mt-1">{analytics.totalOrders || 0}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Order Value</p>
                        <p className="text-xl font-black text-gray-900 mt-1">{formatCurrency(analytics.avgOrderValue || 0)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conversion Rate</p>
                        <p className="text-xl font-black text-gray-900 mt-1">{(analytics.conversionRate || 0).toFixed(1)}%</p>
                    </div>
                </div>

                {/* Revenue Chart */}
                {revenueData.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">Revenue Trend</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={revenueData}>
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Top Products */}
                {topProducts.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">Top Products</h3>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                                <Tooltip />
                                <Bar dataKey="sales" fill="#10B981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SellerAnalyticsView;
