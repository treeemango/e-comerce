import React, { useState, useMemo } from 'react';
import { SellerOrder } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

interface SellerOrdersViewProps {
    orders: SellerOrder[];
    onOrderClick?: (orderId: string) => void;
    loading?: boolean;
}

export const SellerOrdersView: React.FC<SellerOrdersViewProps> = ({
    orders,
    onOrderClick,
    loading
}) => {
    // aligning with ManageOrdersView.tsx statuses: unshipped (paid), pending, canceled, shipped
    const [activeTab, setActiveTab] = useState<'all' | 'unshipped' | 'pending' | 'shipped' | 'canceled'>('unshipped');

    const filteredOrders = useMemo(() => {
        let result = orders;

        if (activeTab !== 'all') {
            result = result.filter(o => {
                let status = o.status?.toLowerCase();
                if (activeTab === 'unshipped' && status === 'paid') return true;
                return status === activeTab;
            });
        }

        return result;
    }, [orders, activeTab]);

    const getStatusStyles = (status?: string) => {
        const s = status?.toLowerCase();
        switch (s) {
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'paid':
            case 'unshipped': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'shipped': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'canceled':
            case 'cancelled': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    return (
        <div className="pb-24 bg-gray-50/50 min-h-screen">
            <div className="bg-white sticky top-0 z-10 px-5 pt-4 pb-2 border-b border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-gray-900">Orders</h2>
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-xl">
                            <span className="material-icons-outlined text-gray-600 text-lg">search</span>
                        </div>
                        <div className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-xl">
                            <span className="material-icons-outlined text-gray-600 text-lg">filter_list</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 overflow-x-auto no-scrollbar pb-1">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'unshipped', label: 'Unshipped' },
                        { id: 'pending', label: 'Pending' },
                        { id: 'shipped', label: 'Shipped' },
                        { id: 'canceled', label: 'Canceled' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`whitespace-nowrap pb-2 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-5 py-4 space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-4 rounded-2xl animate-pulse h-40" />
                        ))}
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
                            <span className="material-icons-outlined text-4xl">shopping_bag</span>
                        </div>
                        <div>
                            <div className="font-bold text-gray-900">No {activeTab} orders</div>
                            <div className="text-sm text-gray-500">Orders appearing here will need your attention.</div>
                        </div>
                    </div>
                ) : (
                    filteredOrders.map((order, idx) => (
                        <div key={`${order.id}-${idx}`} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm active:scale-[0.98] transition-all" onClick={() => onOrderClick?.(order.id)}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Order ID</div>
                                    <div className="text-sm font-black text-gray-900">#{order.id.split('-')[0].toUpperCase()}</div>
                                </div>
                                <span className={cn("text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border", getStatusStyles(order.status))}>
                                    {order.status || 'Pending'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-4">
                                {order.items?.map((item, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-12 h-12 bg-gray-50 rounded-lg flex-shrink-0 border flex items-center justify-center">
                                            <span className="material-icons text-gray-300 text-sm">image</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-gray-900 line-clamp-1">{item.product_title}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity} • {formatCurrency(item.price || 0, 'GBP')}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Customer</div>
                                    <div className="text-xs font-bold text-gray-900">{order.customer_name || 'Guest User'}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Total Amount</div>
                                    <div className="text-sm font-black text-orange-600">{formatCurrency(order.total_amount || 0, 'GBP')}</div>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button className="flex-1 bg-orange-500 text-white text-xs font-black py-3 rounded-xl shadow-lg shadow-orange-500/20 active:bg-orange-600 transition-all">
                                    {(order.status?.toLowerCase() === 'paid' || order.status?.toLowerCase() === 'unshipped') ? 'SHIP ORDER' : 'VIEW DETAILS'}
                                </button>
                                <button className="w-12 flex items-center justify-center border border-gray-100 rounded-xl bg-gray-50 text-gray-400 active:bg-gray-100 transition-all">
                                    <span className="material-icons-outlined text-lg">more_horiz</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


