import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fullyApprovePayout } from '@/lib/api';
import type { PayoutRequest } from '@/types';

const PayoutApprovalsView: React.FC = () => {
    const [requests, setRequests] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

    const loadRequests = async () => {
        setLoading(true);
        try {
            let query = supabase.from('payout_requests').select('*');

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query.order('requested_at', { ascending: false });
            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Error loading payout requests:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, [filter]);

    const handleApprove = async (id: string, amount: number) => {
        if (!window.confirm(`Are you sure you want to approve this payout for £${amount.toLocaleString()}?`)) return;

        const adminNotes = prompt('Admin notes (optional):', 'Approved via Finance Panel');
        const success = await fullyApprovePayout(id, adminNotes || undefined);

        if (success) {
            alert('Payout approved successfully');
            loadRequests();
        } else {
            alert('Failed to approve payout');
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Reason for rejection:');
        if (!reason) return;

        const { error } = await supabase
            .from('payout_requests')
            .update({ status: 'rejected', admin_notes: reason, processed_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            alert('Failed to reject payout');
        } else {
            alert('Payout rejected');
            loadRequests();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payout Approvals</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Manage merchant withdrawal requests</p>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                    {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border-2 border-slate-50 shadow-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Merchant Info</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading requests...</td></tr>
                        ) : requests.length === 0 ? (
                            <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold italic">No payout requests found for this filter.</td></tr>
                        ) : requests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                            <span className="material-icons text-indigo-600 text-sm">store</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900">ID: {req.seller_id.substring(0, 8)}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Status: {req.status}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <span className="text-lg font-black text-slate-900 tracking-tighter">£{req.amount.toLocaleString()}</span>
                                </td>
                                <td className="px-6 py-6 font-bold text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <span className="material-icons text-sm opacity-40">{req.payment_method === 'bank_transfer' ? 'account_balance' : 'smartphone'}</span>
                                        <p className="text-[10px] uppercase tracking-widest font-black">{req.payment_method.replace('_', ' ')}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="text-slate-500 font-bold text-xs uppercase tracking-tighter">
                                        {new Date(req.requested_at).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-6 text-right">
                                    {req.status === 'pending' ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleReject(req.id)}
                                                className="px-4 py-2 border-2 border-red-50 text-red-600 hover:bg-red-50 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase"
                                            >
                                                REJECT
                                            </button>
                                            <button
                                                onClick={() => handleApprove(req.id, req.amount)}
                                                className="px-6 py-2 bg-slate-900 text-white hover:bg-emerald-600 rounded-xl text-[10px] font-black tracking-widest transition-all shadow-lg active:scale-95 uppercase"
                                            >
                                                APPROVE
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-lg ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                            {req.status}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PayoutApprovalsView;
