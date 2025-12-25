import React, { useEffect, useState } from 'react';
import { fetchSellerAnalytics } from '../../../lib/api';
import { SellerAnalyticsSummary } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getCurrentUser } from '../../../lib/auth';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const SellerPerformanceView: React.FC = () => {
    const [analytics, setAnalytics] = useState<SellerAnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState(30);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const user = await getCurrentUser();
            if (user) {
                const data = await fetchSellerAnalytics(user.id, dateRange);
                setAnalytics(data);
            }
            setIsLoading(false);
        };
        load();
    }, [dateRange]); // Reload when dateRange changes

    if (isLoading) return (
        <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Performance Metrics</h1>
                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(Number(e.target.value))}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 3 Months</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Order Defect Rate</h3>
                        <span className="material-icons text-green-500">check_circle</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">0.0%</div>
                    <p className="text-xs text-gray-500 mt-1">Target: under 1%</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Late Shipment Rate</h3>
                        <span className="material-icons text-green-500">check_circle</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">0.0%</div>
                    <p className="text-xs text-gray-500 mt-1">Target: under 4%</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
                        <span className="material-icons text-blue-500">trending_up</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {analytics?.summary.avg_conversion_rate?.toFixed(1) || 0.0}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Industry Avg: 2.5%</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic Sources Chart */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-96">
                    <h3 className="font-bold text-gray-900 mb-4">Traffic Sources</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={analytics?.traffic_sources}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="total_visits"
                                nameKey="source"
                            >
                                {analytics?.traffic_sources.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [value, 'Visits']} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Regional Sales Chart */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-96">
                    <h3 className="font-bold text-gray-900 mb-4">Top Regions by Sales</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={analytics?.regional_sales}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="region" width={80} />
                            <Tooltip formatter={(value) => [`KES ${Number(value).toLocaleString()}`, 'Sales']} />
                            <Bar dataKey="total_sales" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Customer Feedback</h3>
                <div className="text-center py-10 text-gray-500">
                    <span className="material-icons text-4xl mb-2 text-gray-300">star_outline</span>
                    <p>No new feedback received in the last 30 days.</p>
                </div>
            </div>
        </div>
    );
};

export default SellerPerformanceView;
