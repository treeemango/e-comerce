import React, { useEffect, useMemo, useState } from 'react';
import { fetchBuyerOrders, fetchOrderTrackingEvents } from '../lib/api';
import { getCurrencySymbol } from '@/lib/currency';
import { OrderTrackingEvent, BuyerOrder, User } from '../types';

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

const TrackingTimeline: React.FC<{ orderId: string }> = ({ orderId }) => {
    const [events, setEvents] = useState<OrderTrackingEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await fetchOrderTrackingEvents(orderId);
            setEvents(data);
            setLoading(false);
        };
        load();
    }, [orderId]);

    if (loading) return <div className="py-4 text-center text-xs text-gray-400 italic">Loading tracking info...</div>;
    if (events.length === 0) return <div className="py-4 text-center text-xs text-gray-400 italic">No tracking events found yet.</div>;

    return (
        <div className="mt-6 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">Order Journey</h4>
            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {events.map((event, idx) => (
                    <div key={event.id} className="relative">
                        <div className={`absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${idx === events.length - 1 ? 'bg-orange-500 scale-125' : 'bg-slate-300'
                            }`} />
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <p className={`text-xs font-bold ${idx === events.length - 1 ? 'text-slate-900' : 'text-slate-500'}`}>
                                    {event.event_description}
                                </p>
                                <span className="text-[9px] font-black text-slate-300 uppercase">
                                    {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">
                                {new Date(event.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                {event.location && ` • ${event.location}`}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BuyerOrdersView: React.FC<BuyerOrdersViewProps> = ({ user }) => {
    const [orders, setOrders] = useState<BuyerOrder[]>([]);
    const [status, setStatus] = useState<keyof typeof statusLabels>('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    const load = async () => {
        if (!user?.id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchBuyerOrders(user.id);
            setOrders(data);
        } catch (err) {
            console.error('Error loading buyer orders:', err);
            setError('Failed to load orders.');
        } finally {
            setLoading(false);
        }
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

    const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

    const formatPrice = (amount: number, currency?: string) => `${getCurrencySymbol(currency || 'USD')}${amount.toLocaleString()}`;

    const Tag: React.FC<{ text: string; tone?: 'blue' | 'green' | 'amber' | 'gray' | 'red' }> = ({ text, tone = 'gray' }) => {
        const toneMap: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-700 border-blue-200',
            green: 'bg-green-50 text-green-700 border-green-200',
            amber: 'bg-amber-50 text-amber-800 border-amber-200',
            red: 'bg-red-50 text-red-700 border-red-200',
            gray: 'bg-gray-50 text-gray-600 border-gray-200'
        };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${toneMap[tone] || toneMap.gray}`}>{text}</span>;
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
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-icons text-slate-200 text-4xl">shopping_bag</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
                {status === 'all' ? 'Your cart is looking lonely' : 'No matches found'}
            </h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                {status === 'all' ? 'Start shopping to fill your order history with amazing deals.' : 'Try a different filter to find what you are looking for.'}
            </p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Your Orders</h1>
                    <p className="text-slate-500 font-medium">Track deliveries and view purchase history.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                        {['all', 'pending', 'shipped', 'delivered'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatus(s as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${status === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={load}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-orange-500 transition-colors shadow-sm"
                    >
                        <span className="material-icons text-xl">refresh</span>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Purchases</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats.total}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl shadow-sm text-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Delivered</p>
                    <p className="text-3xl font-black text-emerald-900 tracking-tighter">{stats.delivered}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl shadow-sm text-center">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">In Transit</p>
                    <p className="text-3xl font-black text-blue-900 tracking-tighter">{stats.shipped}</p>
                </div>
            </div>

            {error && <div className="p-4 bg-rose-50 text-rose-600 text-sm font-bold rounded-2xl border border-rose-100">{error}</div>}

            <div className="space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-slate-100 border-t-orange-500 rounded-full animate-spin" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading orders...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState />
                ) : (
                    filtered.map(order => (
                        <div key={order.id} className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all overflow-hidden">
                            <div className="p-8">
                                <div className="flex flex-wrap items-start justify-between gap-6 mb-8 pb-8 border-b border-slate-50">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Order #{order.id.slice(0, 8)}</span>
                                            <Tag text={statusLabels[order.status?.toLowerCase()] || order.status || 'Status'} tone={statusTone(order.status)} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">Placed on {formatDate(order.created_at)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order Total</p>
                                        <div className="text-3xl font-black text-slate-900 tracking-tighter">
                                            {getCurrencySymbol(order.currency || 'USD')}
                                            <span className="ml-1">{order.total_amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-center gap-6 group">
                                            <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.product_title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                        <span className="material-icons text-3xl">image</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">{item.product_title}</h4>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                                                    Quantity: {item.quantity} {item.variant_sku && `· ${item.variant_sku}`}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-900">{formatPrice(item.unit_price * item.quantity, order.currency)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {(order.fulfillment_type === 'local_parcel' || order.shipping_method === 'local_parcel') && order.status === 'shipped' && (
                                    <div className="mt-8 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-[2rem] border border-orange-100 overflow-hidden shadow-lg shadow-orange-100/50">
                                        {/* Header */}
                                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                                <span className="material-icons text-white text-xl">directions_bus</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-black text-sm">📦 Parcel Ready for Collection</p>
                                                <p className="text-orange-100 text-xs">Show the OTP code to collect your order</p>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 space-y-4">
                                            {/* OTP Display - Prominent */}
                                            <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-orange-200 text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">
                                                    Collection Code (OTP)
                                                </p>
                                                <div className="flex items-center justify-center gap-2">
                                                    {(order.delivery_otp || '----').split('').map((digit, i) => (
                                                        <span key={i} className="w-14 h-16 bg-gradient-to-b from-orange-500 to-orange-600 text-white rounded-xl flex items-center justify-center text-3xl font-black shadow-lg shadow-orange-500/30">
                                                            {digit}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-orange-600 font-medium mt-3">
                                                    🔐 Keep this code secure. Share only with parcel agent.
                                                </p>
                                            </div>

                                            {/* Parcel Details Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-white rounded-xl p-4 border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="material-icons text-slate-400 text-lg">local_shipping</span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Parcel Service</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {order.parcel_details?.company || order.carrier || 'Standard Parcel'}
                                                    </p>
                                                </div>

                                                <div className="bg-white rounded-xl p-4 border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="material-icons text-slate-400 text-lg">confirmation_number</span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Waybill Number</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900 font-mono">
                                                        {order.parcel_details?.waybill_number || order.tracking_number || 'N/A'}
                                                    </p>
                                                </div>

                                                <div className="bg-white rounded-xl p-4 border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="material-icons text-slate-400 text-lg">location_on</span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Collection Point</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {order.parcel_details?.collection_point || order.shipping_additional_info || 'Contact carrier'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Help Note */}
                                            <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-4 border border-amber-100">
                                                <span className="material-icons text-amber-500 text-lg mt-0.5">info</span>
                                                <div>
                                                    <p className="text-xs font-bold text-amber-900 mb-1">How to collect your parcel</p>
                                                    <p className="text-xs text-amber-700">
                                                        Visit the collection point with your OTP code. The parcel agent will verify your code before handover. Keep this page open or screenshot the code.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {expandedOrder === order.id ? (
                                    <div className="mt-8 pt-8 border-t border-slate-50 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <TrackingTimeline orderId={order.id} />
                                        <button
                                            onClick={() => setExpandedOrder(null)}
                                            className="mt-8 w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            Hide Details
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-8 pt-6 flex items-center justify-between">
                                        {order.status?.toLowerCase() === 'shipped' || order.status?.toLowerCase() === 'delivered' ? (
                                            <button
                                                onClick={() => setExpandedOrder(order.id)}
                                                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 transition-colors"
                                            >
                                                <span className="material-icons text-lg">local_shipping</span>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Track Order</span>
                                            </button>
                                        ) : <div />}
                                        <button
                                            onClick={() => setExpandedOrder(order.id)}
                                            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BuyerOrdersView;
