import React, { useMemo, useRef, useState, useEffect } from 'react';
import { trackGuestOrder, GuestOrderDetails } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { supabase } from '@/lib/supabase';

interface TrackOrderSheetProps {
    onClose: () => void;
    initialOrderId?: string;
    initialEmail?: string;
}

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const normalizeOrderStatus = (raw?: string | null): OrderStatus => {
    const s = (raw || '').toLowerCase().trim();

    if (!s) return 'pending';
    if (s === 'completed' || s.includes('deliver')) return 'delivered';
    if (s.includes('ship') || s.includes('picked') || s.includes('transit') || s.includes('out_for_delivery')) return 'shipped';
    if (s.includes('process') || s.includes('confirm') || s.includes('paid')) return 'processing';
    if (s.includes('cancel') || s.includes('refund')) return 'cancelled';
    return 'pending';
};

const STATUS_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
    { status: 'pending', label: 'Order Placed', icon: 'receipt_long' },
    { status: 'processing', label: 'Processing', icon: 'inventory_2' },
    { status: 'shipped', label: 'Shipped', icon: 'local_shipping' },
    { status: 'delivered', label: 'Delivered', icon: 'check_circle' }
];

export const TrackOrderSheet: React.FC<TrackOrderSheetProps> = ({
    onClose,
    initialOrderId = '',
    initialEmail = ''
}) => {
    const [orderId, setOrderId] = useState(initialOrderId);
    const [email, setEmail] = useState(initialEmail);
    const [orderDetails, setOrderDetails] = useState<GuestOrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const didAutoTrack = useRef(false);

    const handleTrackOrder = async () => {
        if (!orderId.trim() || !email.trim()) {
            setError('Please enter both Order ID and Email');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await trackGuestOrder(orderId.trim(), email.trim());

            if (result) {
                setOrderDetails(result);
            } else {
                setError('No order found. Check your details.');
            }
        } catch (err) {
            setError('Something went wrong. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-track when opened from an existing order (web parity behavior)
    useEffect(() => {
        if (didAutoTrack.current) return;
        if (!initialOrderId || !initialEmail) return;
        if (orderDetails) return;

        didAutoTrack.current = true;
        // Ensure local state matches props
        setOrderId(initialOrderId);
        setEmail(initialEmail);
        // Trigger lookup
        void handleTrackOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialOrderId, initialEmail]);

    // Real-time status subscription
    useEffect(() => {
        if (!orderDetails?.order_id) return;

        const channel = supabase
            .channel(`order-tracking-mobile-${orderDetails.order_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderDetails.order_id}`
                },
                (payload) => {
                    console.log('Mobile Order status updated real-time:', payload.new.status);
                    setOrderDetails(prev => prev ? { ...prev, status: payload.new.status } : null);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderDetails?.order_id]);

    const getStatusIndex = (status: string): number => {
        const normalized = normalizeOrderStatus(status);
        const index = STATUS_STEPS.findIndex(s => s.status === normalized);
        return index >= 0 ? index : 0;
    };

    const currentStatusIndex = orderDetails ? getStatusIndex(orderDetails.status) : -1;

    const journeyEvents = useMemo(() => {
        if (!orderDetails) return [] as any[];

        const raw = Array.isArray(orderDetails.tracking_events) ? orderDetails.tracking_events : [];
        const normalized = raw
            .filter(Boolean)
            .map((e: any) => ({
                id: e.id,
                created_at: e.created_at,
                event_description: e.event_description || e.event_type || 'Update',
                location_name: e.location_name || e.location || null,
            }))
            .filter((e: any) => !!e.created_at);

        if (normalized.length > 0) {
            return normalized.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }

        // Fallback: synthesize a simple journey like web if tracking table is blocked/empty
        const createdAt = orderDetails.created_at || new Date().toISOString();
        const synthetic: any[] = [
            {
                id: 'synthetic-placed',
                created_at: createdAt,
                event_description: 'Order placed successfully',
                location_name: null
            },
            {
                id: 'synthetic-confirmed',
                created_at: createdAt,
                event_description: 'Order confirmed and processing',
                location_name: null
            }
        ];

        const status = (orderDetails.status || '').toLowerCase();
        if (['shipped', 'delivered', 'completed'].includes(status)) {
            synthetic.push({
                id: 'synthetic-shipped',
                created_at: createdAt,
                event_description: 'Order has been shipped',
                location_name: null
            });
        }
        if (['delivered', 'completed'].includes(status)) {
            synthetic.push({
                id: 'synthetic-delivered',
                created_at: createdAt,
                event_description: 'Order delivered successfully',
                location_name: null
            });
        }

        return synthetic;
    }, [orderDetails]);

    return (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-black text-black dark:text-white">Track Order</h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <span className="material-icons-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                    {!orderDetails ? (
                        <>
                            {/* Search Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Order ID</label>
                                    <input
                                        type="text"
                                        value={orderId}
                                        onChange={(e) => setOrderId(e.target.value)}
                                        placeholder="From your confirmation email"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-sm border-0 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Used during checkout"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-sm border-0 dark:text-white"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
                                    <span className="material-icons text-sm">error</span>
                                    <span className="text-xs font-medium">{error}</span>
                                </div>
                            )}

                            {/* Info Cards */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex gap-3">
                                <span className="material-icons text-blue-500 text-sm">lightbulb</span>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    Find your Order ID in the confirmation email we sent after checkout.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Order Found - Status Header */}
                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-5 rounded-3xl text-white">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="material-icons text-lg">check_circle</span>
                                    <span className="text-sm font-black">Order Found!</span>
                                </div>
                                <p className="text-[11px] text-green-100">
                                    #{orderDetails.order_number?.substring(0, 8).toUpperCase() || orderDetails.order_id.substring(0, 8).toUpperCase()}
                                </p>
                            </div>

                            {/* Progress Steps */}
                            <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-3xl">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Status</h3>
                                <div className="flex items-center justify-between relative">
                                    <div className="absolute top-3 left-4 right-4 h-0.5 bg-gray-200 dark:bg-gray-700" />
                                    <div
                                        className="absolute top-3 left-4 h-0.5 bg-green-500 transition-all"
                                        style={{ width: `calc(${(currentStatusIndex / (STATUS_STEPS.length - 1)) * 100}% - 2rem)` }}
                                    />

                                    {STATUS_STEPS.map((step, index) => {
                                        const isCompleted = index <= currentStatusIndex;
                                        return (
                                            <div key={step.status} className="flex flex-col items-center relative z-10">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                                    }`}>
                                                    <span className="material-icons text-[10px]">{step.icon}</span>
                                                </div>
                                                <span className={`text-[9px] font-bold mt-1 ${isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Order Journey (web parity) */}
                            {journeyEvents.length > 0 && (
                                <div className="bg-gray-50/50 dark:bg-gray-900/30 p-5 rounded-3xl border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Order Journey</h3>
                                    <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
                                        {journeyEvents.map((event: any, idx: number) => {
                                            const isCurrent = idx === journeyEvents.length - 1;
                                            return (
                                                <div key={event.id || idx} className="relative">
                                                    <div className={`absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${isCurrent ? 'bg-orange-500 scale-125' : 'bg-gray-300 dark:bg-gray-600'
                                                        }`} />
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className={`text-xs font-bold ${isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                                {event.event_description}
                                                            </p>
                                                            <span className="text-[9px] font-black text-gray-300 dark:text-gray-500 uppercase">
                                                                {event.created_at ? new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 font-medium">
                                                            {event.created_at ? new Date(event.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''}
                                                            {event.location_name ? ` • ${event.location_name}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Local Parcel Transport Fee Highlight */}
                            {(orderDetails.fulfillment_type === 'local_parcel' || orderDetails.logistics_meta?.provider === 'local_parcel') && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-3xl border border-orange-100 dark:border-orange-800/50">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white">
                                            <span className="material-icons">payments</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-orange-900 dark:text-orange-100">Transport Fee</p>
                                            <p className="text-[10px] text-orange-700 dark:text-orange-300 font-medium">To be paid on collection</p>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-black/40 rounded-2xl p-4 text-center">
                                        <p className="text-2xl font-black text-orange-600">
                                            {orderDetails.logistics_meta?.confirmed_transport_fee
                                                ? `KSh ${orderDetails.logistics_meta.confirmed_transport_fee.toLocaleString()}`
                                                : 'TBD'}
                                        </p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                            Amount payable to carrier
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Order Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl">
                                    <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">Total</p>
                                    <p className="text-lg font-black text-black dark:text-white">
                                        {formatPrice(orderDetails.total, orderDetails.currency)}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl">
                                    <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">Date</p>
                                    <p className="text-sm font-bold text-black dark:text-white">
                                        {new Date(orderDetails.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* Items */}
                            {orderDetails.items?.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Items</h3>
                                    <div className="space-y-2">
                                        {orderDetails.items.map((item, index) => (
                                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                                {item.image ? (
                                                    <img src={item.image} alt="" className="w-10 h-10 rounded-xl object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                        <span className="material-icons text-gray-400 text-sm">inventory_2</span>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold line-clamp-1 dark:text-white">{item.title}</p>
                                                    <p className="text-[10px] text-gray-500">Qty: {item.quantity}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Track Another */}
                            <button
                                onClick={() => setOrderDetails(null)}
                                className="w-full text-center text-xs font-bold text-primary py-2"
                            >
                                Track Another Order
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!orderDetails && (
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={handleTrackOrder}
                            disabled={isLoading}
                            className="w-full bg-primary py-4 rounded-full font-black text-white shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <span className="material-icons text-sm animate-spin">autorenew</span>
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons text-sm">search</span>
                                    Track Order
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrackOrderSheet;
