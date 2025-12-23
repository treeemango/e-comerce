import React, { useState } from 'react';
import { SellerOrder } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { fulfillOrder } from '../../lib/api';

interface SellerOrderDetailsSheetProps {
    order: SellerOrder;
    onClose: () => void;
    onOrderUpdated?: () => void;
}

export const SellerOrderDetailsSheet: React.FC<SellerOrderDetailsSheetProps> = ({
    order,
    onClose,
    onOrderUpdated
}) => {
    const [showTrackingInput, setShowTrackingInput] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isShipping, setIsShipping] = useState(false);

    const getStatusColor = (status?: string) => {
        const s = status?.toLowerCase();
        switch (s) {
            case 'pending': return 'bg-amber-500';
            case 'paid':
            case 'unshipped': return 'bg-blue-500';
            case 'shipped': return 'bg-emerald-500';
            case 'delivered': return 'bg-green-600';
            case 'canceled':
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const handleShipOrder = async () => {
        setIsShipping(true);
        try {
            const success = await fulfillOrder(order.id, trackingNumber || undefined);
            if (success) {
                onOrderUpdated?.();
                onClose();
            } else {
                alert('Failed to ship order. Please try again.');
            }
        } catch (error) {
            console.error('Error shipping order:', error);
            alert('An error occurred while shipping the order.');
        } finally {
            setIsShipping(false);
        }
    };

    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const orderTime = new Date(order.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const canShip = order.status?.toLowerCase() === 'pending' ||
        order.status?.toLowerCase() === 'paid' ||
        order.status?.toLowerCase() === 'unshipped';

    const currency = order.items?.[0]?.currency || 'USD';

    return (
        <div className="fixed inset-0 z-[100] flex flex-col">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="relative mt-auto bg-white rounded-t-[2rem] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Order</span>
                                <span className={cn(
                                    "px-2 py-0.5 text-[10px] font-black uppercase rounded-full text-white",
                                    getStatusColor(order.status)
                                )}>
                                    {order.status || 'Pending'}
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900">
                                {order.order_number ? `#${order.order_number.toUpperCase()}` : `#${order.id.substring(0, 8).toUpperCase()}`}
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                {orderDate} at {orderTime}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-gray-400 hover:text-gray-600"
                        >
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {/* Customer Section */}
                    <div className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-icons text-gray-400 text-lg">person</span>
                            <h3 className="text-sm font-bold text-gray-900">Customer</h3>
                        </div>
                        <div className="space-y-2 pl-7">
                            <p className="text-sm font-bold text-gray-900">{order.customer_name || 'Guest Customer'}</p>
                            {order.customer_email && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="material-icons text-sm text-gray-400">email</span>
                                    <span>{order.customer_email}</span>
                                </div>
                            )}
                            <div className="flex items-start gap-2 text-xs text-gray-500">
                                <span className="material-icons text-sm text-gray-400">location_on</span>
                                <span>{order.shipping_address || 'Shipping address on file'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-icons text-gray-400 text-lg">inventory_2</span>
                            <h3 className="text-sm font-bold text-gray-900">Items ({order.items?.length || 0})</h3>
                        </div>
                        <div className="space-y-3">
                            {order.items?.map((item, idx) => (
                                <div key={idx} className="flex gap-3 bg-white border border-gray-100 rounded-xl p-3">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.product_title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <span className="material-icons">image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 line-clamp-2">{item.product_title}</p>
                                        {item.variant_sku && (
                                            <p className="text-xs text-gray-500 mt-0.5">SKU: {item.variant_sku}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                                            <span className="text-sm font-black text-gray-900">
                                                {formatCurrency(item.price || 0, item.currency || 'USD')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-xl shadow-slate-200">
                        <div className="space-y-2 mb-4 border-b border-slate-700/50 pb-4">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Subtotal</span>
                                <span>{formatCurrency((order.total_amount || 0) - (order.tax_amount || 0) - (order.delivery_fee || 0), currency)}</span>
                            </div>
                            {order.tax_amount ? (
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Tax ({((order.tax_rate || 0) * 100).toFixed(0)}%)</span>
                                    <span>{formatCurrency(order.tax_amount, currency)}</span>
                                </div>
                            ) : null}
                            {order.delivery_fee ? (
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Delivery Fee</span>
                                    <span>{formatCurrency(order.delivery_fee, currency)}</span>
                                </div>
                            ) : null}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-300">Total Amount</span>
                            <span className="text-2xl font-black">
                                {formatCurrency(order.total_amount || 0, currency)}
                            </span>
                        </div>
                    </div>

                    {/* Tracking Input */}
                    {showTrackingInput && canShip && (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 animate-in fade-in duration-200">
                            <label className="block text-sm font-bold text-blue-900 mb-2">
                                Enter Tracking Number
                            </label>
                            <input
                                type="text"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="e.g., 1Z999AA10123456784"
                                className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-blue-600 mt-2">
                                Optional: Leave blank if not available yet
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white pb-safe space-y-3">
                    {canShip && (
                        <>
                            {!showTrackingInput ? (
                                <button
                                    onClick={() => setShowTrackingInput(true)}
                                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-icons text-lg">local_shipping</span>
                                    Ship This Order
                                </button>
                            ) : (
                                <button
                                    onClick={handleShipOrder}
                                    disabled={isShipping}
                                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isShipping ? (
                                        <>
                                            <span className="material-icons animate-spin text-lg">sync</span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons text-lg">check_circle</span>
                                            Confirm Shipment
                                        </>
                                    )}
                                </button>
                            )}
                        </>
                    )}

                    {order.status?.toLowerCase() === 'shipped' && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                            <span className="material-icons text-emerald-500 text-2xl mb-1">done_all</span>
                            <p className="text-sm font-bold text-emerald-700">Order has been shipped</p>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full py-3 text-gray-500 font-bold text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
