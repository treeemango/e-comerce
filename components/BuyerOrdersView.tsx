import React, { useEffect, useMemo, useState } from 'react';
import { BuyerOrder, User } from '../types';
import { fetchBuyerOrders } from '../lib/api';
import { getCurrencySymbol } from '@/lib/currency';

interface BuyerOrdersViewProps {
    user?: User | null;
}

const statusLabels: Record<string, string> = {
    all: 'All',
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded'
};

const BuyerOrdersView: React.FC<BuyerOrdersViewProps> = ({ user }) => {
    const [orders, setOrders] = useState<BuyerOrder[]>([]);
    const [status, setStatus] = useState<keyof typeof statusLabels>('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        if (!user?.id) return;
        setLoading(true);
        setError(null);
        const data = await fetchBuyerOrders(user.id);
        setOrders(data);
        setLoading(false);
    };

    useEffect(() => {
        if (user?.id) {
            load();
        } else {
            setOrders([]);
        }
    }, [user?.id]);

    const filtered = useMemo(() => {
        if (status === 'all') return orders;
        return orders.filter(o => o.status?.toLowerCase() === status);
    }, [orders, status]);

    const stats = useMemo(() => ({
        total: orders.length,
        shipped: orders.filter(o => o.status?.toLowerCase() === 'shipped').length,
        delivered: orders.filter(o => o.status?.toLowerCase() === 'delivered').length,
    }), [orders]);

    const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString() : '—';

    const formatPrice = (amount: number, currency?: string) => `${getCurrencySymbol(currency || 'USD')}${amount.toFixed(2)}`;

    const Tag: React.FC<{ text: string; tone?: 'blue' | 'green' | 'amber' | 'gray' | 'red' }> = ({ text, tone = 'gray' }) => {
        const toneMap: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-700 border-blue-200',
            green: 'bg-green-50 text-green-700 border-green-200',
            amber: 'bg-amber-50 text-amber-800 border-amber-200',
            red: 'bg-red-50 text-red-700 border-red-200',
            gray: 'bg-gray-50 text-gray-600 border-gray-200'
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${toneMap[tone] || toneMap.gray}`}>{text}</span>;
    };

    const statusTone = (value: string): 'blue' | 'green' | 'amber' | 'gray' | 'red' => {
        const s = value?.toLowerCase();
        if (s === 'shipped' || s === 'processing') return 'blue';
        if (s === 'delivered') return 'green';
        if (s === 'pending') return 'amber';
        if (s === 'cancelled' || s === 'refunded') return 'red';
        return 'gray';
    };

    const EmptyState = () => (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
            {status === 'all' ? 'No orders yet. Start shopping to see them here.' : 'No orders in this status.'}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-2">
                <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="material-icons text-base text-orange-500">receipt_long</span>
                    Your orders
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Track purchases and deliveries</h2>
                        <p className="text-sm text-gray-600">View order status, totals, and tracking info.</p>
                    </div>
                    {user && (
                        <button
                            className="text-sm text-gray-600 hover:text-orange-600 flex items-center gap-2"
                            onClick={load}
                        >
                            <span className="material-icons text-base">refresh</span>
                            Refresh
                        </button>
                    )}
                </div>
            </div>

            {!user && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
                    Sign in to view your orders and tracking updates.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="text-xs text-gray-500">Total orders</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="text-xs text-gray-500">Shipped</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.shipped}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="text-xs text-gray-500">Delivered</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.delivered}</div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {Object.entries(statusLabels).map(([value, label]) => (
                    <button
                        key={value}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${status === value
                            ? 'bg-black text-white border-black'
                            : 'border-gray-300 text-gray-700 hover:border-orange-400 hover:text-orange-700'}`}
                        onClick={() => setStatus(value as keyof typeof statusLabels)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="space-y-4">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading orders...</div>
                ) : !user ? (
                    <EmptyState />
                ) : filtered.length === 0 ? (
                    <EmptyState />
                ) : (
                    filtered.map(order => (
                        <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500">Order</div>
                                    <div className="text-sm font-semibold text-slate-900">#{order.id.slice(0, 10)}</div>
                                    <div className="text-xs text-gray-500">Placed {formatDate(order.created_at)}</div>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="text-lg font-bold text-slate-900">{formatPrice(order.total_amount, order.currency)}</div>
                                    <Tag text={statusLabels[order.status?.toLowerCase()] || order.status || 'Status'} tone={statusTone(order.status)} />
                                    {order.tracking_code && (
                                        <div className="text-xs text-gray-500">Tracking: {order.tracking_code}</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {order.items.map(item => (
                                    <div key={item.id} className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.product_title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <span className="material-icons text-lg">image</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.product_title}</div>
                                            <div className="text-xs text-gray-500">Qty {item.quantity}{item.variant_sku ? ` · ${item.variant_sku}` : ''}</div>
                                        </div>
                                        <div className="text-sm font-semibold text-slate-900">{formatPrice(item.unit_price * item.quantity, order.currency)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BuyerOrdersView;
