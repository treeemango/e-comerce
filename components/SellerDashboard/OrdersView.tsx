import React, { useState, useEffect } from 'react';
import { SellerOrder } from '../../types';
import { fetchSellerOrders, fulfillOrder } from '../../lib/api';
import { getCurrencySymbol } from '@/lib/currency';

interface OrdersViewProps {
    sellerId?: string;
}

const OrdersView: React.FC<OrdersViewProps> = ({ sellerId }) => {
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadOrders = async () => {
        if (!sellerId) return;
        setIsLoading(true);
        try {
            const data = await fetchSellerOrders(sellerId);
            setOrders(data as SellerOrder[]);
        } catch (error) {
            console.error('Error loading seller orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, [sellerId]);

    const handleFulfill = async (orderId: string) => {
        const tracking = window.prompt('Enter tracking number (optional):');
        if (tracking === null) return; // Cancelled

        const success = await fulfillOrder(orderId, tracking || undefined);
        if (success) {
            alert('Order marked as shipped!');
            loadOrders(); // Refresh
        } else {
            alert('Failed to fulfill order');
        }
    };

    const statusBadge = (status: string) => {
        const s = status.toLowerCase();
        const base = "px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm border ";
        if (s === 'pending') return <span className={`${base} bg-amber-50 text-amber-600 border-amber-200`}>Pending</span>;
        if (s === 'shipped' || s === 'processing') return <span className={`${base} bg-blue-50 text-blue-600 border-blue-200`}>Shipped</span>;
        if (s === 'delivered') return <span className={`${base} bg-emerald-50 text-emerald-600 border-emerald-200`}>Delivered</span>;
        if (s === 'cancelled') return <span className={`${base} bg-rose-50 text-rose-600 border-rose-200`}>Cancelled</span>;
        return <span className={`${base} bg-slate-50 text-slate-600 border-slate-200`}>{status}</span>;
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Orders Management</h2>
                    <p className="text-slate-500 text-sm font-medium">Track and fulfill your customer purchases.</p>
                </div>
                <button
                    onClick={loadOrders}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <span className="material-icons text-slate-400">refresh</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                </div>
            ) : orders.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-icons text-slate-200 text-4xl">receipt_long</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No active orders</h3>
                    <p className="text-slate-500 text-sm mt-1">When customers buy your products, they will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                            <div className="p-6">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                            <span className="material-icons">shopping_bag</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Order #{order.id.substring(0, 8)}</span>
                                                {statusBadge(order.status)}
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-900">{order.customer_name}</h4>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Total</p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                            {getCurrencySymbol('KES')}{order.total_amount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between group/item">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 font-black text-[10px]">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.product_title}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.variant_sku}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-black text-slate-900">{getCurrencySymbol('KES')}{item.price.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="material-icons text-sm">event</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                        </span>
                                    </div>
                                    {order.status.toLowerCase() === 'pending' && (
                                        <button
                                            onClick={() => handleFulfill(order.id)}
                                            className="px-6 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                                        >
                                            Fulfill Order
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrdersView;
