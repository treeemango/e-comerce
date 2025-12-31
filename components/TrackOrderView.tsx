import React, { useState, useEffect } from 'react';
import { trackGuestOrder, GuestOrderDetails } from '../lib/api';
import { formatPrice } from '../lib/currency';
import { supabase } from '../lib/supabase';

interface TrackOrderViewProps {
    onBack: () => void;
    initialOrderId?: string;
    initialEmail?: string;
}

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
    { status: 'pending', label: 'Order Placed', icon: 'receipt_long' },
    { status: 'processing', label: 'Processing', icon: 'inventory_2' },
    { status: 'shipped', label: 'Shipped', icon: 'local_shipping' },
    { status: 'delivered', label: 'Delivered', icon: 'check_circle' }
];

const TrackOrderView: React.FC<TrackOrderViewProps> = ({
    onBack,
    initialOrderId = '',
    initialEmail = ''
}) => {
    const [orderId, setOrderId] = useState(initialOrderId);
    const [email, setEmail] = useState(initialEmail);
    const [orderDetails, setOrderDetails] = useState<GuestOrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleTrackOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!orderId.trim() || !email.trim()) {
            setError('Please enter both Order ID and Email');
            return;
        }

        setIsLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const result = await trackGuestOrder(orderId.trim(), email.trim());

            if (result) {
                setOrderDetails(result);
                setError(null);
            } else {
                setOrderDetails(null);
                setError('No order found. Please check your Order ID and email address.');
            }
        } catch (err) {
            console.error('Track order error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Real-time status subscription
    useEffect(() => {
        if (!orderDetails?.order_id) return;

        const channel = supabase
            .channel(`order-tracking-${orderDetails.order_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderDetails.order_id}`
                },
                (payload) => {
                    console.log('Order status updated real-time:', payload.new.status);
                    setOrderDetails(prev => prev ? { ...prev, status: payload.new.status } : null);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderDetails?.order_id]);

    const getStatusIndex = (status: string): number => {
        const normalizedStatus = status?.toLowerCase() || 'pending';
        const index = STATUS_STEPS.findIndex(s => s.status === normalizedStatus);
        return index >= 0 ? index : 0;
    };

    const currentStatusIndex = orderDetails ? getStatusIndex(orderDetails.status) : -1;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-500 hover:text-black dark:hover:text-white mb-4 transition-colors"
                    >
                        <span className="material-icons text-sm">arrow_back</span>
                        <span className="text-sm font-medium">Back</span>
                    </button>
                    <h1 className="text-3xl font-black text-black dark:text-white">Track Your Order</h1>
                    <p className="text-gray-500 mt-2">Enter your order details to see real-time status updates</p>
                </div>

                {/* Search Form */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8 mb-8 border border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleTrackOrder} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                                    Order ID
                                </label>
                                <input
                                    type="text"
                                    value={orderId}
                                    onChange={(e) => setOrderId(e.target.value)}
                                    placeholder="Order ID"
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-medium dark:text-white transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email used during checkout"
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-orange-500 rounded-2xl text-sm font-medium dark:text-white transition-all outline-none"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400">
                                <span className="material-icons text-sm">error</span>
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-full font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                    </form>
                </div>

                {/* Order Results */}
                {orderDetails && (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Status Header */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-icons text-2xl">local_shipping</span>
                                <h2 className="text-xl font-black">Order Found!</h2>
                            </div>
                            <p className="text-green-100 text-sm">
                                Order #{orderDetails.order_number?.substring(0, 8).toUpperCase() || orderDetails.order_id.substring(0, 8).toUpperCase()}
                            </p>
                        </div>

                        {/* Progress Steps */}
                        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Order Status</h3>
                            <div className="flex items-center justify-between relative px-2">
                                <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                <div
                                    className="absolute top-4 left-0 h-1 bg-green-500 rounded-full transition-all duration-700"
                                    style={{ width: `${(currentStatusIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                                />

                                {STATUS_STEPS.map((step, index) => {
                                    const isCompleted = index <= currentStatusIndex;
                                    const isCurrent = index === currentStatusIndex;

                                    return (
                                        <div key={step.status} className="flex flex-col items-center relative z-10">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                                } ${isCurrent ? 'ring-4 ring-green-200 dark:ring-green-800 animate-pulse' : ''}`}>
                                                <span className="material-icons text-sm">{step.icon}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold mt-2 text-center ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                                                }`}>
                                                {step.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Local Parcel Transport Fee Highlight */}
                        {(orderDetails.fulfillment_type === 'local_parcel' || orderDetails.logistics_meta?.provider === 'local_parcel') && (
                            <div className="p-6 md:p-8 bg-orange-50 dark:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900/30">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                                        <span className="material-icons">payments</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-orange-900 dark:text-orange-100">Transport Fee</h3>
                                        <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">Payable to courier upon collection</p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-orange-200 dark:border-orange-800 shadow-sm">
                                    <p className="text-4xl font-black text-orange-600 tracking-tighter">
                                        {orderDetails.logistics_meta?.confirmed_transport_fee
                                            ? `KSh ${orderDetails.logistics_meta.confirmed_transport_fee.toLocaleString()}`
                                            : 'TBD'}
                                    </p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                        Amount confirmed by carrier
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Tracking Timeline */}
                        {orderDetails.tracking_events && orderDetails.tracking_events.length > 0 && (
                            <div className="p-6 md:p-8 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Tracking History</h3>
                                <div className="space-y-6">
                                    {orderDetails.tracking_events.slice().reverse().map((event: any, index: number) => (
                                        <div key={event.id || index} className="flex gap-4 relative">
                                            {/* Line */}
                                            {index !== orderDetails.tracking_events.length - 1 && (
                                                <div className="absolute top-8 left-4 bottom-[-24px] w-0.5 bg-gray-200 dark:bg-gray-700" />
                                            )}
                                            {/* Dot */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${index === 0 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                                <span className="material-icons text-sm">{index === 0 ? 'stars' : 'history'}</span>
                                            </div>
                                            {/* Content */}
                                            <div className="flex-1 pt-1">
                                                <p className={`text-sm font-bold ${index === 0 ? 'text-black dark:text-white' : 'text-gray-500'}`}>{event.event_description}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(event.created_at).toLocaleString('en-US', {
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                    {event.location_name && ` • ${event.location_name}`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Order Details */}
                        <div className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Amount</p>
                                    <p className="text-xl font-black text-black dark:text-white">
                                        {formatPrice(orderDetails.total, orderDetails.currency)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Order Date</p>
                                    <p className="text-sm font-bold text-black dark:text-white">
                                        {new Date(orderDetails.created_at).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Items Ordered */}
                            {orderDetails.items && orderDetails.items.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Items Ordered</p>
                                    <div className="space-y-3">
                                        {orderDetails.items.map((item, index) => (
                                            <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.title}
                                                        className="w-12 h-12 rounded-xl object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                        <span className="material-icons text-gray-400">inventory_2</span>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-black dark:text-white truncate">{item.title}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium">Qty: {item.quantity}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Back Button / Clear */}
                        <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-900 text-center border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => setOrderDetails(null)}
                                className="text-sm font-bold text-primary hover:underline"
                            >
                                Track another order
                            </button>
                        </div>
                    </div>
                )}

                {/* Info Cards */}
                {!orderDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                    <span className="material-icons text-blue-500 text-sm">help</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-black dark:text-white mb-1">Where's my Order ID?</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Check your confirmation email or order receipt for your unique Order ID.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                    <span className="material-icons text-green-500 text-sm">security</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-black dark:text-white mb-1">Secure Tracking</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        We verify your email to ensure only you can view your order details.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrackOrderView;
