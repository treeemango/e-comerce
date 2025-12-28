import React, { useEffect, useState, useMemo } from 'react';
import { fetchSellerInventory, fetchSellerStats, fetchSellerAnalytics } from '../../lib/api';
import { SellerInventoryItem, SellerStats, SellerAnalyticsSummary } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useCurrencyConverter, formatPrice, getCurrencySymbol } from '@/lib/currency';

interface DashboardOverviewProps {
    sellerId?: string;
}



const DashboardOverview: React.FC<DashboardOverviewProps> = ({ sellerId }) => {
    const [stats, setStats] = useState<SellerStats | null>(null);
    const [analytics, setAnalytics] = useState<SellerAnalyticsSummary | null>(null);
    const [recentInventory, setRecentInventory] = useState<SellerInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (sellerId) {
                const [statsData, inventoryData, analyticsData] = await Promise.all([
                    fetchSellerStats(sellerId),
                    fetchSellerInventory(sellerId),
                    fetchSellerAnalytics(sellerId, 30)
                ]);

                setStats(statsData);
                setRecentInventory(inventoryData);
                setAnalytics(analyticsData);
            }
            setIsLoading(false);
        };
        loadData();
    }, [sellerId]);

    // Currency conversion for all monetary values
    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];

        // Total sales from analytics
        if (analytics?.summary.total_sales) {
            vals.push({ id: 'total-sales', amount: analytics.summary.total_sales, currency: 'USD' });
        }

        // Daily sales trend
        analytics?.daily_trend.forEach((day, idx) => {
            vals.push({ id: `day-${idx}-sales`, amount: day.total_sales, currency: 'USD' });
        });

        // Inventory prices
        recentInventory.forEach((item, idx) => {
            vals.push({ id: `inventory-${idx}`, amount: item.current_price, currency: 'GBP' });
        });

        return vals;
    }, [analytics, recentInventory]);

    const { convertedValues, preferredCurrency } = useCurrencyConverter(priceValues);

    const getConvertedPrice = (id: string, fallback: number, originalCurrency: string) => {
        return convertedValues[id]?.converted ?? formatPrice(fallback, originalCurrency);
    };

    const getConvertedAmount = (id: string, fallback: number) => {
        return convertedValues[id]?.convertedAmount ?? fallback;
    };

    const metrics = [
        {
            label: 'Total Sales',
            value: getConvertedPrice('total-sales', analytics?.summary.total_sales || 0, 'USD'),
            data: analytics?.daily_trend.map((d, idx) => ({ value: getConvertedAmount(`day-${idx}-sales`, d.total_sales) })) || [],
            color: '#10B981', // Emerald 500
            icon: 'payments'
        },
        {
            label: 'Total Orders',
            value: (analytics?.summary.total_orders || 0).toString(),
            data: analytics?.daily_trend.map(d => ({ value: d.total_orders })) || [],
            color: '#3B82F6', // Blue 500
            icon: 'shopping_bag'
        },
        {
            label: 'Visitors',
            value: (analytics?.summary.total_visitors || 0).toLocaleString(),
            data: analytics?.daily_trend.map(d => ({ value: d.visitors })) || [],
            color: '#8B5CF6', // Violet 500
            icon: 'visibility'
        },
        {
            label: 'Conversion Rate',
            value: `${(analytics?.summary.avg_conversion_rate || 0).toFixed(1)}%`,
            data: analytics?.daily_trend.map(d => ({ value: d.conversion_rate })) || [],
            color: '#F59E0B', // Amber 500
            icon: 'trending_up'
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Analytics Sparkline Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative group">
                        <div className="p-6 relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</h3>
                                </div>
                                <div className={`p-2 rounded-lg text-white`} style={{ backgroundColor: metric.color }}>
                                    <span className="material-icons text-sm">{metric.icon}</span>
                                </div>
                            </div>
                        </div>
                        {/* Sparkline Background */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metric.data}>
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={metric.color}
                                        fill={metric.color}
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Sales Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Sales Performance (30 Days)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.daily_trend || []}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                    tickFormatter={(val) => new Date(val).getDate().toString()}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                    tickFormatter={(val) => `${getCurrencySymbol(preferredCurrency)}${(val / 1000).toFixed(1)}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [formatPrice(Number(value), preferredCurrency), 'Sales']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total_sales"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Traffic Sources */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Traffic Sources</h3>
                    <div className="space-y-6">
                        {analytics?.traffic_sources.map((source, i) => {
                            const max = Math.max(...(analytics?.traffic_sources.map(s => s.total_visits) || [1]));
                            const percent = (source.total_visits / max) * 100;
                            return (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">{source.source}</span>
                                        <span className="text-sm text-gray-500">{source.total_visits.toLocaleString()} visits</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Inventory Table (Existing) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Recent Inventory</h3>
                    <button className="text-sm text-orange-600 font-medium hover:text-orange-700">View All</button>
                </div>

                {recentInventory.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No products found. Start listing items!</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3">Product Name</th>
                                    <th className="px-6 py-3">Price</th>
                                    <th className="px-6 py-3">Stock</th>
                                    <th className="px-6 py-3">Sales</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentInventory.slice(0, 5).map((item) => (
                                    <tr key={item.variant_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-900">{item.product_title}</td>
                                        <td className="px-6 py-3">{getConvertedPrice(`inventory-${recentInventory.indexOf(item)}`, item.current_price, 'GBP')}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.current_stock < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {item.current_stock}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">{item.total_sales_to_date}</td>
                                        <td className="px-6 py-3 text-gray-500">Active</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardOverview;
