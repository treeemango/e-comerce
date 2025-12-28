import React, { useEffect, useState, useMemo } from 'react';
import { fetchAdminDashboardStats, hasResourcePermission, fetchPlatformRevenue, fetchVerificationQueue, approvePayoutRequest } from '@/lib/api';
import type { AdminDashboardStats, AdminPermissions, PlatformRevenueAnalytics, VerificationQueueItem, PayoutRequest } from '@/types';
import { supabase } from '@/lib/supabase';
import AdminKPIsWidget from './AdminKPIsWidget';
import { useCurrencyConverter, formatPrice, getCurrencySymbol } from '@/lib/currency';

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: string;
    color: 'blue' | 'emerald' | 'orange' | 'red' | 'indigo';
    trend?: {
        value: string;
        isPositive: boolean;
    };
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, trend }) => {
    const colorSchemes = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/10',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/10',
        orange: 'bg-orange-50 text-orange-600 border-orange-100 shadow-orange-500/10',
        red: 'bg-red-50 text-red-600 border-red-100 shadow-red-500/10',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-500/10',
    };

    return (
        <div className={`bg-white rounded-3xl p-6 border-2 transition-all duration-300 hover:shadow-xl group active:scale-[0.98] ${colorSchemes[color]}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{title}</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{value}</h3>
                    {trend && (
                        <div className="flex items-center mt-3 gap-1.5">
                            <span className={`material-icons text-sm font-bold ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trend.isPositive ? 'trending_up' : 'trending_down'}
                            </span>
                            <span className={`text-xs font-black ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trend.value}
                            </span>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">vs last month</span>
                        </div>
                    )}
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform ${colorSchemes[color]} bg-white border-none`}>
                    <span className="material-icons text-2xl">{icon}</span>
                </div>
            </div>
        </div>
    );
};

interface DashboardOverviewProps {
    permissions?: AdminPermissions;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ permissions }) => {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [revenueData, setRevenueData] = useState<PlatformRevenueAnalytics[]>([]);
    const [verificationQueue, setVerificationQueue] = useState<VerificationQueueItem[]>([]);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAllAdminData = async () => {
        try {
            setLoading(true);
            const [statsData, revData, queueData] = await Promise.all([
                fetchAdminDashboardStats(),
                fetchPlatformRevenue(),
                fetchVerificationQueue()
            ]);

            const { data: payouts } = await supabase.from('payout_requests').select('*').eq('status', 'pending');

            setStats(statsData);
            setRevenueData(revData);
            setVerificationQueue(queueData);
            setPayoutRequests(payouts || []);
            setError(null);
        } catch (err) {
            console.error('Error loading admin stats:', err);
            setError('Failed to load dashboard statistics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllAdminData();

        const adminSubscription = supabase
            .channel('admin_control_tower')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payout_requests' }, () => {
                supabase.from('payout_requests').select('*').eq('status', 'pending').then(({ data }) => setPayoutRequests(data || []));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(adminSubscription);
        };
    }, []);

    const handleApprovePayout = async (id: string) => {
        if (!window.confirm('Approve this payout request?')) return;
        const success = await approvePayoutRequest(id, 'Approved via Admin Panel');
        if (success) {
            setPayoutRequests(prev => prev.filter(p => p.id !== id));
            alert('Payout approved successfully');
        } else {
            alert('Failed to approve payout');
        }
    };

    const canApproveProducts = hasResourcePermission(permissions?.permissions, 'products', 'approve');
    const canVerifySellers = hasResourcePermission(permissions?.permissions, 'sellers', 'verify');
    const canManageUsers = hasResourcePermission(permissions?.permissions, 'users', 'read');

    // Currency conversion for all monetary values
    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];

        // Total revenue
        if (stats?.total_revenue) {
            vals.push({ id: 'gmv-revenue', amount: stats.total_revenue, currency: 'USD' });
        }

        // Revenue chart data
        revenueData.forEach((item, idx) => {
            vals.push({ id: `rev-${idx}-total`, amount: item.total_revenue || 0, currency: 'USD' });
            vals.push({ id: `rev-${idx}-commission`, amount: item.platform_commission || 0, currency: 'USD' });
        });

        // Payout requests
        payoutRequests.forEach((req, idx) => {
            vals.push({ id: `payout-${idx}`, amount: req.amount, currency: 'USD' });
        });

        return vals;
    }, [stats, revenueData, payoutRequests]);

    const { convertedValues, preferredCurrency } = useCurrencyConverter(priceValues);

    const getConvertedPrice = (id: string, fallback: number) => {
        return convertedValues[id]?.converted ?? formatPrice(fallback, preferredCurrency);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent shadow-xl"></div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Initializing Control Tower...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white border-2 border-red-100 rounded-3xl p-12 text-center shadow-2xl shadow-red-500/10 max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-icons text-red-500 text-4xl">report_problem</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">System Error</h2>
                <p className="text-slate-500 font-bold mb-8">{error}</p>
                <button
                    onClick={loadAllAdminData}
                    className="bg-indigo-600 hover:bg-slate-900 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3 mx-auto"
                >
                    <span className="material-icons">refresh</span>
                    Retry Initialization
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Platform Health KPIs */}
            <AdminKPIsWidget />

            {/* Primary Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatsCard
                    title="Platform Users"
                    value={stats?.total_users || 0}
                    icon="group"
                    color="indigo"
                    trend={{ value: '+12.4%', isPositive: true }}
                />
                <StatsCard
                    title="Verified Stores"
                    value={stats?.total_sellers || 0}
                    icon="storefront"
                    color="emerald"
                    trend={{ value: '+8.1%', isPositive: true }}
                />
                <StatsCard
                    title="Network Drivers"
                    value={stats?.total_drivers || 0}
                    icon="local_shipping"
                    color="blue"
                    trend={{ value: '+5.7%', isPositive: true }}
                />
                <StatsCard
                    title="GMV Revenue"
                    value={getConvertedPrice('gmv-revenue', stats?.total_revenue || 0)}
                    icon="payments"
                    color="orange"
                    trend={{ value: '+24.5%', isPositive: true }}
                />
                <StatsCard
                    title="Total Orders"
                    value={stats?.total_orders || 0}
                    icon="shopping_basket"
                    color="indigo"
                    trend={{ value: '+15.2%', isPositive: true }}
                />
            </div>

            {/* Verification Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-500/30 flex items-center justify-between">
                    <div>
                        <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-2">Catalog Status</p>
                        <h4 className="text-3xl font-black tracking-tighter">{stats?.pending_product_approvals || 0}</h4>
                        <p className="text-indigo-100 text-xs font-bold mt-1 uppercase tracking-tight">Pending Product Reviews</p>
                    </div>
                    <span className="material-icons text-5xl opacity-40">inventory_2</span>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-8 text-white shadow-2xl shadow-orange-500/30 flex items-center justify-between">
                    <div>
                        <p className="text-orange-100 text-[10px] font-black uppercase tracking-widest mb-2">Merchant Verification</p>
                        <h4 className="text-3xl font-black tracking-tighter">{stats?.pending_seller_verifications || 0}</h4>
                        <p className="text-orange-100 text-xs font-bold mt-1 uppercase tracking-tight">Pending Store Applications</p>
                    </div>
                    <span className="material-icons text-5xl opacity-40">verified_user</span>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-3xl p-8 text-white shadow-2xl shadow-emerald-500/30 flex items-center justify-between">
                    <div>
                        <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-2">Fleet Verification</p>
                        <h4 className="text-3xl font-black tracking-tighter">{stats?.pending_driver_verifications || 0}</h4>
                        <p className="text-emerald-100 text-xs font-bold mt-1 uppercase tracking-tight">Pending Driver Nodes</p>
                    </div>
                    <span className="material-icons text-5xl opacity-40">local_shipping</span>
                </div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-slate-500/30 flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">System Health</p>
                        <h4 className="text-3xl font-black tracking-tighter">{stats?.active_disputes || 0}</h4>
                        <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-tight">Active Customer Disputes</p>
                    </div>
                    <span className="material-icons text-5xl opacity-40">warning</span>
                </div>
            </div>

            {/* Charts & Queues Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* REVENUE CHART */}
                <div className="bg-white rounded-[2rem] p-10 border-2 border-slate-50 shadow-xl shadow-slate-200/50">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Financial Performance</h2>
                            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Platform Commission vs Volume</p>
                        </div>
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                            <button className="px-5 py-2.5 bg-white shadow-lg text-indigo-600 text-[10px] font-black rounded-xl uppercase tracking-widest">30 Days</button>
                            <button className="px-5 py-2.5 text-slate-500 text-[10px] font-black rounded-xl uppercase tracking-widest hover:text-slate-700 transition-colors">90 Days</button>
                        </div>
                    </div>

                    <div className="h-72 flex items-end justify-between gap-3 px-2 pb-8">
                        {revenueData.length === 0 ? (
                            <div className="w-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                <span className="material-icons text-5xl">bar_chart</span>
                                <p className="text-xs font-black uppercase tracking-widest">Awaiting Transaction Data</p>
                            </div>
                        ) : revenueData.map((item, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center group relative h-full">
                                <div className="absolute -top-12 scale-0 group-hover:scale-100 transition-all duration-300 bg-slate-900 text-white text-[10px] font-black px-3 py-2 rounded-xl shadow-2xl z-20 whitespace-nowrap">
                                    Commission: {getConvertedPrice(`rev-${idx}-commission`, item.platform_commission || 0)}
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                </div>
                                <div className="w-full h-full flex flex-col justify-end gap-1 px-1">
                                    <div
                                        className="w-full bg-indigo-100 rounded-t-lg group-hover:bg-indigo-200 transition-all duration-300 shadow-sm"
                                        style={{ height: `${((item.total_revenue || 0) / Math.max(...revenueData.map(r => r.total_revenue || 1))) * 100}%` }}
                                    ></div>
                                    <div
                                        className="w-full bg-indigo-600 rounded-t-lg group-hover:bg-indigo-500 transition-all duration-300 shadow-lg"
                                        style={{ height: `${((item.platform_commission || 0) / Math.max(...revenueData.map(r => r.total_revenue || 1))) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 mt-4 uppercase tracking-tighter whitespace-nowrap">
                                    {new Date(item.transaction_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PAYOUT QUEUE */}
                <div className="bg-white rounded-[2rem] p-10 border-2 border-slate-50 shadow-xl shadow-slate-200/50 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payout Management</h2>
                            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Pending Merchant Withdrawals</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <span className="material-icons text-indigo-600 text-2xl animate-pulse">account_balance_wallet</span>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {payoutRequests.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                <span className="material-icons text-5xl text-slate-200 mb-4 font-bold">task_alt</span>
                                <h3 className="text-lg font-black text-slate-400 tracking-tight">Queue Clear</h3>
                                <p className="text-slate-300 text-xs font-bold mt-1">No pending payouts found.</p>
                            </div>
                        ) : payoutRequests.map(req => (
                            <div key={req.id} className="bg-white rounded-2xl p-5 border border-slate-100 flex items-center justify-between group hover:border-indigo-200 hover:shadow-lg transition-all active:scale-[0.99]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                        <span className="material-icons text-slate-400 group-hover:text-indigo-600">{req.payment_method === 'bank_transfer' ? 'account_balance' : 'smartphone'}</span>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-slate-800 tracking-tighter">{getConvertedPrice(`payout-${payoutRequests.indexOf(req)}`, req.amount)}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{req.payment_method.replace('_', ' ')}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                            <span className="text-[10px] text-slate-400 font-bold">ID: {req.seller_id.substring(0, 8)}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleApprovePayout(req.id)}
                                    className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                                >
                                    APPROVE
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FULL WIDTH VERIFICATION TABLE */}
            <div className="bg-white rounded-[2rem] p-10 border-2 border-slate-50 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verification Flow</h2>
                        <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">New Seller & Driver Applications</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Live Applications</span>
                        </div>
                        <button className="bg-slate-50 hover:bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase">View Archive</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-slate-50">
                                <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4">Merchant/Entity</th>
                                <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4">Type</th>
                                <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4">Submission Date</th>
                                <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right px-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {verificationQueue.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <span className="material-icons text-slate-200 text-6xl">verified</span>
                                            <p className="text-slate-400 font-bold italic">Queue clear. No pending applications.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : verificationQueue.map(item => (
                                <tr key={item.id} className="group hover:bg-slate-50/50 transition-all cursor-pointer">
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border ${item.type === 'vendor' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                {item.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800 tracking-tight leading-none mb-1">{item.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {item.id.substring(0, 8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm border ${item.type === 'vendor' ? 'bg-orange-500 text-white border-orange-400' : 'bg-indigo-600 text-white border-indigo-500'}`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-tighter">
                                            <span className="material-icons text-sm opacity-50">calendar_today</span>
                                            {new Date(item.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                        <button className="bg-white text-indigo-600 font-black px-6 py-2.5 rounded-xl text-[10px] tracking-widest border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95 shadow-lg shadow-indigo-100/50 uppercase">Review File</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
