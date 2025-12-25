import React, { useEffect, useMemo, useState } from 'react';
import { fetchBuyerOrders, fetchOrderTrackingEvents, confirmOrderReceiptBuyer, getOrderQRCodeURL, raiseDeliveryDispute } from '../lib/api';
import { getCurrencySymbol } from '@/lib/currency';
import { OrderTrackingEvent, BuyerOrder, User } from '../types';
import { WriteReviewModal } from './WriteReviewModal';

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

const TrackingTimeline: React.FC<{ order: BuyerOrder }> = ({ order }) => {
    const [events, setEvents] = useState<OrderTrackingEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await fetchOrderTrackingEvents(order.id);

            // If no events found, generate synthetic journey based on current status
            if (data.length === 0) {
                const synthetic: OrderTrackingEvent[] = [];

                // Step 1: Always Placed
                synthetic.push({
                    id: 'synthetic-placed',
                    order_id: order.id,
                    event_type: 'order_placed',
                    event_description: 'Order placed successfully',
                    created_at: order.created_at
                });

                // Step 2: Confirmed (if not pending)
                if (['processing', 'shipped', 'delivered'].includes(order.status.toLowerCase())) {
                    synthetic.push({
                        id: 'synthetic-confirmed',
                        order_id: order.id,
                        event_type: 'order_confirmed',
                        event_description: 'Order confirmed and processing',
                        created_at: order.created_at // Using created_at as base
                    });
                }

                // Step 3: Shipped (if shipped or delivered)
                if (['shipped', 'delivered'].includes(order.status.toLowerCase())) {
                    synthetic.push({
                        id: 'synthetic-shipped',
                        order_id: order.id,
                        event_type: 'picked_up',
                        event_description: 'Order has been shipped',
                        created_at: order.updated_at || order.created_at
                    });
                }

                // Step 4: Delivered (if delivered)
                if (order.status.toLowerCase() === 'delivered') {
                    synthetic.push({
                        id: 'synthetic-delivered',
                        order_id: order.id,
                        event_type: 'delivered',
                        event_description: 'Order delivered successfully',
                        created_at: order.updated_at || order.created_at
                    });
                }

                setEvents(synthetic);
            } else {
                setEvents(data);
            }

            setLoading(false);
        };
        load();
    }, [order.id, order.created_at, order.status, order.updated_at]);

    if (loading) return <div className="py-4 text-center text-xs text-gray-400 italic">Loading tracking info...</div>;

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
    const [reviewingProductId, setReviewingProductId] = useState<string | null>(null);
    const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
    const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
    const [showQRCodeOrderId, setShowQRCodeOrderId] = useState<string | null>(null);
    const [disputingOrderId, setDisputingOrderId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

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

    const handleRaiseDispute = async () => {
        if (!disputingOrderId || !disputeReason.trim()) return;

        setIsSubmittingDispute(true);
        try {
            const res = await raiseDeliveryDispute(disputingOrderId, disputeReason);
            if (res.success) {
                alert('Dispute raised successfully. Admin will review the case.');
                setDisputingOrderId(null);
                setDisputeReason('');
                load();
            } else {
                alert(res.message || 'Failed to raise dispute.');
            }
        } catch (err) {
            console.error('Error raising dispute:', err);
            alert('An error occurred.');
        } finally {
            setIsSubmittingDispute(false);
        }
    };

    const handleConfirmReceipt = async (orderId: string) => {
        setConfirmingOrderId(orderId);
        try {
            const res = await confirmOrderReceiptBuyer(orderId);
            if (res.success) {
                alert('Delivery confirmed! You can now review your items.');
                load();
            } else {
                alert(res.message || 'Failed to confirm receipt.');
            }
        } catch (err) {
            console.error('Error confirming receipt:', err);
            alert('An error occurred.');
        } finally {
            setConfirmingOrderId(null);
        }
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
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <p className="text-sm font-black text-slate-900">{formatPrice(item.unit_price * item.quantity, order.currency)}</p>
                                                {order.status?.toLowerCase() === 'delivered' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setReviewingProductId(item.product_id);
                                                            setReviewingOrderId(order.id);
                                                        }}
                                                        className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors"
                                                    >
                                                        Rate & Review
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Confirm Delivery button for standard shipped orders (non-local parcel) */}
                                {order.status === 'shipped' && !(order.fulfillment_type === 'local_parcel' || order.shipping_method === 'local_parcel') && (
                                    <div className="mt-8 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-[2rem] border border-emerald-200 overflow-hidden shadow-lg shadow-emerald-100/50 p-8">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                                <span className="material-icons text-white text-2xl">local_shipping</span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-emerald-800">Order Shipped</h3>
                                                <p className="text-sm text-emerald-600">Confirm when you receive your package</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleConfirmReceipt(order.id)}
                                            disabled={confirmingOrderId === order.id}
                                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all disabled:opacity-50"
                                        >
                                            {confirmingOrderId === order.id ? 'Confirming...' : '✓ I Have Received My Order'}
                                        </button>
                                    </div>
                                )}

                                {/* OTP and Delivery Confirmation Section */}
                                {(order.fulfillment_type === 'local_parcel' || order.shipping_method === 'local_parcel') && order.status === 'shipped' && (
                                    <div className="mt-8 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-[2rem] border border-orange-100 overflow-hidden shadow-lg shadow-orange-100/50">
                                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                                <span className="material-icons text-white text-xl">directions_bus</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-black text-sm">📦 Parcel Ready for Collection</p>
                                                <p className="text-orange-100 text-xs">Show the OTP code to collect your order</p>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-4">
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

                                                {showQRCodeOrderId === order.id ? (
                                                    <div className="mt-6 flex flex-col items-center animate-in zoom-in-95 duration-300">
                                                        <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xl mb-4">
                                                            <img
                                                                src={getOrderQRCodeURL(order.delivery_otp) || ''}
                                                                alt="Collection QR Code"
                                                                className="w-48 h-48"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => setShowQRCodeOrderId(null)}
                                                            className="text-orange-600 font-bold text-xs uppercase tracking-widest hover:underline"
                                                        >
                                                            Hide QR Code
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                                                        <button
                                                            onClick={() => setShowQRCodeOrderId(order.id)}
                                                            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-orange-500 text-orange-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-50 transition-all shadow-sm"
                                                        >
                                                            <span className="material-icons">qr_code_2</span>
                                                            Show QR Code
                                                        </button>
                                                        <button
                                                            onClick={() => handleConfirmReceipt(order.id)}
                                                            disabled={confirmingOrderId === order.id}
                                                            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/30 disabled:opacity-50"
                                                        >
                                                            <span className="material-icons">check_circle</span>
                                                            {confirmingOrderId === order.id ? 'Confirming...' : 'I Have Received My Parcel'}
                                                        </button>

                                                        {order.status === 'shipped' && order.shipped_at && new Date(order.shipped_at).getTime() < (Date.now() - 5 * 24 * 60 * 60 * 1000) && (
                                                            <button
                                                                onClick={() => setDisputingOrderId(order.id)}
                                                                className="flex items-center gap-2 px-6 py-3 bg-rose-50 border-2 border-rose-200 text-rose-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all shadow-sm"
                                                            >
                                                                <span className="material-icons">report_problem</span>
                                                                Dispute
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <p className="text-xs text-orange-600 font-medium mt-3">
                                                    🔐 Keep this code secure. Share only with parcel agent.
                                                </p>
                                            </div>

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
                                        </div>
                                    </div>
                                )}

                                {/* Standard Actions (Track & View Details) */}
                                <div className="mt-8 pt-6 flex items-center justify-between border-t border-slate-50">
                                    {order.status?.toLowerCase() === 'shipped' || order.status?.toLowerCase() === 'delivered' ? (
                                        <button
                                            onClick={() => setExpandedOrder(order.id)}
                                            className="flex items-center gap-2 text-orange-600 hover:text-orange-700 transition-colors"
                                        >
                                            <span className="material-icons text-lg">local_shipping</span>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Track Order</span>
                                        </button>
                                    ) : <div />}

                                    <div className="flex items-center gap-3">
                                        {/* Dispute button for non-local parcel shipped orders */}
                                        {order.status === 'shipped' && !(order.fulfillment_type === 'local_parcel' || order.shipping_method === 'local_parcel') && order.shipped_at && new Date(order.shipped_at).getTime() < (Date.now() - 5 * 24 * 60 * 60 * 1000) && (
                                            <button
                                                onClick={() => setDisputingOrderId(order.id)}
                                                className="px-4 py-2.5 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all"
                                            >
                                                Dispute Delivery
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setExpandedOrder(order.id === expandedOrder ? null : order.id)}
                                            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                        >
                                            {expandedOrder === order.id ? 'Close Details' : 'View Details'}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Content (Tracking Timeline) */}
                                {expandedOrder === order.id && (
                                    <div className="mt-8 pt-8 border-t border-slate-50 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <TrackingTimeline order={order} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {/* Dispute Modal */}
                {disputingOrderId && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-rose-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Report Delivery Issue</h3>
                                    <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Order Dispute</p>
                                </div>
                                <button onClick={() => setDisputingOrderId(null)} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white transition-colors text-slate-400">
                                    <span className="material-icons">close</span>
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 flex gap-3">
                                    <span className="material-icons text-rose-500">info</span>
                                    <p className="text-xs text-rose-700 leading-relaxed font-medium">
                                        You are reporting that you have not received your parcel after 5 days of shipping. An admin will investigate, and the seller will be asked to provide proof of shipment.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Describe the issue</label>
                                    <textarea
                                        value={disputeReason}
                                        onChange={(e) => setDisputeReason(e.target.value)}
                                        placeholder="e.g. The carrier says delivered but I don't have it, or haven't heard from seller..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all min-h-[150px] resize-none"
                                    />
                                </div>
                            </div>
                            <div className="px-8 py-6 bg-slate-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setDisputingOrderId(null)}
                                    className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRaiseDispute}
                                    disabled={isSubmittingDispute || !disputeReason.trim()}
                                    className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50"
                                >
                                    {isSubmittingDispute ? 'Submitting...' : 'Submit Dispute'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {reviewingProductId && (
                    <WriteReviewModal
                        productId={reviewingProductId}
                        userId={user?.id}
                        orderId={reviewingOrderId || undefined}
                        onClose={() => {
                            setReviewingProductId(null);
                            setReviewingOrderId(null);
                        }}
                        onSubmitted={() => {
                            setReviewingProductId(null);
                            setReviewingOrderId(null);
                            load();
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default BuyerOrdersView;
