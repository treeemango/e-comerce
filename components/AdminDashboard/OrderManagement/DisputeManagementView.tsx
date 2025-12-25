import React, { useEffect, useState } from 'react';
import { fetchActiveDisputes, resolveDisputeAdmin } from '@/lib/api';
import type { OrderIssue } from '@/types';

const DisputeManagementView: React.FC = () => {
    const [disputes, setDisputes] = useState<OrderIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState('');

    const loadDisputes = async () => {
        setLoading(true);
        const data = await fetchActiveDisputes();
        setDisputes(data);
        setLoading(false);
    };

    useEffect(() => {
        loadDisputes();
    }, []);

    const handleResolve = async (issueId: string, resolution: 'release' | 'refund') => {
        if (!adminNotes.trim()) {
            alert('Please provide admin notes for the resolution.');
            return;
        }

        setResolvingId(issueId);
        try {
            const res = await resolveDisputeAdmin(issueId, resolution, adminNotes);
            if (res.success) {
                alert(`Dispute resolved: ${resolution}`);
                setAdminNotes('');
                loadDisputes();
            } else {
                alert(res.message || 'Failed to resolve dispute.');
            }
        } catch (err) {
            console.error('Error resolving dispute:', err);
            alert('An error occurred.');
        } finally {
            setResolvingId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivery Disputes</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Manage and resolve late delivery claims</p>
                </div>
                <button
                    onClick={loadDisputes}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"
                >
                    <span className="material-icons text-xl">refresh</span>
                </button>
            </div>

            {loading ? (
                <div className="bg-white rounded-[2rem] border-2 border-slate-50 shadow-xl p-20 text-center flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent shadow-xl"></div>
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Fetching active disputes...</p>
                </div>
            ) : disputes.length === 0 ? (
                <div className="bg-white rounded-[2rem] border-2 border-slate-50 shadow-xl p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-icons text-slate-200 text-4xl">gavel</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-400 tracking-tight text-center">No active disputes</h3>
                    <p className="text-slate-300 text-sm mt-1 max-w-xs mx-auto">Everything is running smoothly! All handled parcels are confirmed.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {disputes.map((dispute) => (
                        <div key={dispute.id} className="bg-white rounded-[2rem] border-2 border-slate-50 shadow-xl overflow-hidden group hover:border-indigo-100 transition-all">
                            <div className="p-8">
                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* Left: Dispute Info */}
                                    <div className="flex-1 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    {dispute.status}
                                                </span>
                                                <span className="text-slate-400 text-xs font-bold font-mono">#{dispute.id.substring(0, 8)}</span>
                                            </div>
                                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{formatDate(dispute.created_at)}</span>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order Affected</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-indigo-600 text-lg tracking-tighter">#{dispute.order_number}</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="text-sm font-bold text-slate-900">{dispute.customer_name}</span>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Buyer's Claim</h3>
                                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                    <p className="text-sm text-slate-700 leading-relaxed italic font-medium">"{dispute.description}"</p>
                                                </div>
                                            </div>

                                            {dispute.shipped_at && (
                                                <div>
                                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Shipping Info</h3>
                                                    <p className="text-xs text-slate-500 font-bold">
                                                        Shipped on: <span className="text-slate-900">{formatDate(dispute.shipped_at)}</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Middle: Seller Proof */}
                                    <div className="w-full lg:w-80 space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seller's Evidence</h3>
                                        {dispute.shipment_proof_url ? (
                                            <div className="space-y-3">
                                                <div className="relative aspect-square bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden group/image">
                                                    <img
                                                        src={dispute.shipment_proof_url}
                                                        alt="Shipment Proof"
                                                        className="w-full h-full object-cover transition-transform group-hover/image:scale-105"
                                                    />
                                                    <a
                                                        href={dispute.shipment_proof_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center text-white"
                                                    >
                                                        <span className="material-icons">zoom_in</span>
                                                    </a>
                                                </div>
                                                <p className="text-[10px] text-slate-400 text-center font-bold uppercase">Click to enlarge proof</p>
                                            </div>
                                        ) : (
                                            <div className="aspect-square bg-rose-50 rounded-2xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center p-6 text-center">
                                                <span className="material-icons text-rose-300 text-4xl mb-3">no_photography</span>
                                                <p className="text-xs text-rose-700 font-black uppercase tracking-widest leading-tight">No Proof Provided</p>
                                                <p className="text-[10px] text-rose-600/60 font-medium mt-1">Seller hasn't uploaded a receipt yet.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Resolution Control */}
                                    <div className="w-full lg:w-96 bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Adjudication</h3>

                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Admin Notes</label>
                                                    <textarea
                                                        value={adminNotes}
                                                        onChange={(e) => setAdminNotes(e.target.value)}
                                                        placeholder="Record your findings and reasoning here..."
                                                        className="w-full bg-slate-800 border-none rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none text-slate-300"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => handleResolve(dispute.id, 'refund')}
                                                disabled={resolvingId !== null}
                                                className="flex-1 px-4 py-4 bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-600/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                {resolvingId === dispute.id ? 'Wait...' : 'Refund Buyer'}
                                            </button>
                                            <button
                                                onClick={() => handleResolve(dispute.id, 'release')}
                                                disabled={resolvingId !== null}
                                                className="flex-1 px-4 py-4 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-600/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                {resolvingId === dispute.id ? 'Wait...' : 'Release Funds'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DisputeManagementView;
