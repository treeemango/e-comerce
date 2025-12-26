import React, { useEffect, useState } from 'react';
import { fetchDriverEarnings, fetchDriverPayouts } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface WebDriverEarningsViewProps {
    partnerId: string;
}

export const WebDriverEarningsView: React.FC<WebDriverEarningsViewProps> = ({ partnerId }) => {
    const [loading, setLoading] = useState(true);
    const [earnings, setEarnings] = useState({
        today: 0,
        week: 0,
        month: 0,
        total: 0
    });
    const [recentPayouts, setRecentPayouts] = useState<any[]>([]); // Placeholder for payouts

    useEffect(() => {
        // Simulation of fetching earnings stats. 
        // In a real app, we would have a 'fetchDriverEarnings' API that aggregates this on the backend.
        // For now, we will just fetch active/completed jobs and sum them up locally or use a mock.

        const loadStats = async () => {
            setLoading(true);
            try {
                // Resolve real partner ID
                const { data: profile } = await supabase
                    .from('delivery_partners')
                    .select('id')
                    .eq('user_id', partnerId)
                    .single();

                if (!profile) {
                    setLoading(false);
                    return;
                }

                // Fetch real data in parallel using REAL ID
                const [earningsData, payoutsData] = await Promise.all([
                    fetchDriverEarnings(profile.id),
                    fetchDriverPayouts(profile.id)
                ]);

                setEarnings(earningsData);
                setRecentPayouts(payoutsData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, [partnerId]);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-8 rounded-3xl border-2 border-slate-50 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Earnings & Payouts</h1>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Revenue Overview</p>
                </div>
                <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Available for Withdrawal</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(earnings.week)}</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6">
                <StatCard label="Today's Earnings" value={earnings.today} icon="today" color="bg-orange-50 text-orange-600" />
                <StatCard label="This Week" value={earnings.week} icon="date_range" color="bg-blue-50 text-blue-600" />
                <StatCard label="This Month" value={earnings.month} icon="calendar_month" color="bg-purple-50 text-purple-600" />
                <StatCard label="Total Lifetime" value={earnings.total} icon="account_balance" color="bg-slate-50 text-slate-600" />
            </div>

            {/* Chart / List Split */}
            <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-xl">
                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                        <span className="material-icons text-slate-300">bar_chart</span>
                        Revenue Analytics
                    </h3>
                    <div className="h-64 flex items-end justify-between gap-4 px-4 pb-2 border-b border-slate-100">
                        {/* Fake bars for visual */}
                        {[40, 65, 34, 89, 56, 78, 45].map((h, i) => (
                            <div key={i} className="w-full bg-slate-50 rounded-t-xl relative group hover:bg-indigo-50 transition-all">
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-xl w-full transition-all group-hover:bg-indigo-600"
                                    style={{ height: `${h}%` }}
                                ></div>
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition">
                                    {h}%
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-xl">
                    <h3 className="text-lg font-black text-slate-900 mb-6">Recent Payouts</h3>
                    <div className="space-y-4">
                        {recentPayouts.length === 0 ? (
                            <p className="text-slate-500 text-sm">No recent payouts found.</p>
                        ) : (
                            recentPayouts.map((p) => (
                                <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-emerald-500">
                                            <span className="material-icons text-sm">check</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900">{formatCurrency(p.amount)}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(p.payment_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${p.status === 'processed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>{p.status}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <button className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition">
                        View All History
                    </button>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: number; icon: string; color: string }> = ({ label, value, icon, color }) => (
    <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-lg group hover:shadow-xl transition-all">
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
            <span className="material-icons">{icon}</span>
        </div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(value)}</h2>
    </div>
);
