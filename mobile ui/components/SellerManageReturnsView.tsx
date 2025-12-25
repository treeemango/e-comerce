import React, { useState, useEffect } from 'react';
import { fetchReturnRequests, authorizeReturnRequest, processRefund } from '../../lib/api';
import { formatCurrency, cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface SellerManageReturnsViewProps {
    sellerId: string;
    onBack?: () => void;
}

interface ReturnRequest {
    id: string;
    returnId: string;
    orderId: string; // The UUID
    orderNumber: string; // The display ID
    date: string;
    amount: number;
    productName: string;
    thumbnail: string;
    reason: string;
    quantity: number;
    comment: string;
    status: 'pending' | 'authorized' | 'completed' | 'cancelled';
}

export const SellerManageReturnsView: React.FC<SellerManageReturnsViewProps> = ({ sellerId, onBack }) => {
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'completed'>('pending');

    const loadData = async () => {
        setIsLoading(true);
        if (sellerId) {
            const data = await fetchReturnRequests(sellerId);
            const mappedReturns: ReturnRequest[] = data.map((item: any) => ({
                id: item.id,
                returnId: item.id.substring(0, 8).toUpperCase(),
                orderId: item.orders?.id, // True UUID
                orderNumber: item.orders?.order_number || item.orders?.id.substring(0, 8).toUpperCase(),
                date: new Date(item.created_at).toLocaleDateString(),
                amount: item.refund_amount || item.orders?.total_price || 0,
                productName: item.products?.title || 'Product',
                thumbnail: item.products?.featured_image_url || '',
                reason: item.reason,
                quantity: item.quantity || 1,
                comment: item.buyer_comment || 'No comments',
                status: item.status,
            }));
            setReturns(mappedReturns);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();

        const subscription = supabase
            .channel('mobile_returns')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'return_requests' }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [sellerId]);

    const handleAuthorize = async (id: string) => {
        if (!confirm('Authorize this return request?')) return;
        const success = await authorizeReturnRequest(id);
        if (success) alert('Return authorized.');
        else alert('Failed to authorize return.');
    };

    const handleRefund = async (orderId: string, defaultAmount: number) => {
        const amountStr = prompt('Enter refund amount:', defaultAmount.toString());
        if (!amountStr) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            alert('Invalid amount');
            return;
        }

        const success = await processRefund(orderId, amount);
        if (success) {
            alert('Refund processed successfully');
            loadData();
        } else {
            alert('Failed to process refund');
        }
    };

    const filteredReturns = returns.filter(r => {
        if (filter === 'pending') return r.status === 'pending' || r.status === 'authorized';
        return r.status === 'completed' || r.status === 'cancelled' || r.status === 'refunded';
    });

    return (
        <div className="bg-gray-50 min-h-full pb-20">
            {/* Header */}
            <div className="bg-white px-5 pt-12 pb-4 shadow-sm relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    {onBack && (
                        <button onClick={onBack} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="material-icons text-gray-600">arrow_back</span>
                        </button>
                    )}
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Manage Returns</h1>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setFilter('pending')}
                        className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition", filter === 'pending' ? "bg-white shadow-sm text-orange-600" : "text-gray-500")}
                    >
                        Pending ({returns.filter(r => r.status === 'pending' || r.status === 'authorized').length})
                    </button>
                    <button
                        onClick={() => setFilter('completed')}
                        className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition", filter === 'completed' ? "bg-white shadow-sm text-slate-800" : "text-gray-500")}
                    >
                        History
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="p-4 space-y-4">
                {isLoading ? (
                    <div className="text-center py-10 text-gray-400 font-medium">Loading requests...</div>
                ) : filteredReturns.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="material-icons text-gray-300 text-3xl">assignment_turned_in</span>
                        </div>
                        <p className="text-gray-400 font-medium">No returns found.</p>
                    </div>
                ) : (
                    filteredReturns.map(item => (
                        <ReturnCard
                            key={item.id}
                            item={item}
                            onAuthorize={() => handleAuthorize(item.id)}
                            onRefund={() => handleRefund(item.orderId, item.amount)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

const ReturnCard: React.FC<{ item: ReturnRequest; onAuthorize: () => void; onRefund: () => void }> = ({ item, onAuthorize, onRefund }) => {
    // Helper to get styling
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-orange-100 text-orange-700';
            case 'authorized': return 'bg-blue-100 text-blue-700';
            case 'completed': return 'bg-green-100 text-green-700';
            case 'refunded': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.thumbnail ? <img src={item.thumbnail} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{item.productName}</h3>
                        <p className="text-xs text-slate-500">Order #{item.orderNumber}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity} • {formatCurrency(item.amount)}</p>
                    </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusColor(item.status)}`}>
                    {item.status}
                </span>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Reason: {item.reason}</p>
                <p className="text-sm text-gray-700 italic">"{item.comment}"</p>
            </div>

            {/* Actions */}
            {(item.status === 'pending' || item.status === 'authorized') && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                    {item.status === 'pending' && (
                        <button
                            onClick={onAuthorize}
                            className="py-2.5 bg-orange-500 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition"
                        >
                            AUTHORIZE
                        </button>
                    )}
                    <button
                        onClick={onRefund}
                        className="py-2.5 bg-white border border-gray-200 text-slate-700 text-xs font-black rounded-xl active:bg-gray-50 transition"
                    >
                        REFUND
                    </button>
                </div>
            )}
        </div>
    );
};
