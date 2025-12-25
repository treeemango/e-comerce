import React, { useEffect, useState } from 'react';
import { fetchPlatformKPIs, PlatformKPIs } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const AdminKPIsWidget: React.FC = () => {
    const [kpis, setKpis] = useState<PlatformKPIs | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await fetchPlatformKPIs();
            setKpis(data);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-slate-100 rounded-2xl h-28"></div>
                ))}
            </div>
        );
    }

    if (!kpis) return null;

    const kpiCards = [
        { label: 'Total GMV', value: formatCurrency(kpis.gmv_total), icon: 'paid', color: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
        { label: 'GMV Today', value: formatCurrency(kpis.gmv_today), icon: 'today', color: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
        { label: 'Total Orders', value: kpis.total_orders.toLocaleString(), icon: 'shopping_bag', color: 'bg-gradient-to-br from-purple-500 to-violet-600' },
        { label: 'Orders Today', value: kpis.orders_today.toLocaleString(), icon: 'receipt_long', color: 'bg-gradient-to-br from-pink-500 to-rose-600' },
        { label: 'Active Sellers', value: kpis.active_sellers.toLocaleString(), icon: 'storefront', color: 'bg-gradient-to-br from-orange-500 to-amber-600' },
        { label: 'Pending Payouts', value: `${kpis.pending_payouts_count} (${formatCurrency(kpis.pending_payouts_value)})`, icon: 'account_balance', color: 'bg-gradient-to-br from-red-500 to-rose-600' },
        { label: 'Pending Verifications', value: kpis.pending_verifications.toLocaleString(), icon: 'verified_user', color: 'bg-gradient-to-br from-cyan-500 to-sky-600' },
        { label: 'Flagged Reviews', value: kpis.flagged_reviews_count.toLocaleString(), icon: 'flag', color: 'bg-gradient-to-br from-yellow-500 to-orange-600' },
    ];

    return (
        <div className="mb-8">
            <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                <span className="material-icons text-indigo-500">insights</span>
                Platform Health
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpiCards.map((card, idx) => (
                    <div
                        key={idx}
                        className={`${card.color} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 cursor-default`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{card.label}</p>
                                <p className="text-2xl font-black mt-1 tracking-tight">{card.value}</p>
                            </div>
                            <span className="material-icons text-white/30 text-3xl">{card.icon}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminKPIsWidget;
