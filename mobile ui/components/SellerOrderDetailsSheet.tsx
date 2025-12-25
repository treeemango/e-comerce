import React, { useState } from 'react';
import { SellerOrder } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { fulfillOrder, fulfillParcelOrder, verifyParcelOTP, markOrderReady, submitShipmentProof } from '../../lib/api';
import BuyerReceipt from '../../components/SellerDashboard/OrderManager/BuyerReceipt';

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
    const [fulfillmentMethod, setFulfillmentMethod] = useState<'courier' | 'parcel'>('courier');

    // Courier Fields
    const [trackingNumber, setTrackingNumber] = useState('');

    // Parcel Fields
    const [parcelService, setParcelService] = useState('');
    const [waybillNo, setWaybillNo] = useState('');
    const [collectionPoint, setCollectionPoint] = useState('');

    // OTP Field for Verification
    const [otpCode, setOtpCode] = useState('');
    const [showOTPInput, setShowOTPInput] = useState(false);

    const [shipmentProofUrl, setShipmentProofUrl] = useState('');
    const [isSubmittingProof, setIsSubmittingProof] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);

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
        setIsProcessing(true);
        try {
            if (fulfillmentMethod === 'courier') {
                const success = await fulfillOrder(order.id, trackingNumber || undefined);
                if (success) {
                    onOrderUpdated?.();
                    onClose();
                } else {
                    alert('Failed to ship order. Please try again.');
                }
            } else {
                if (!parcelService || !waybillNo) {
                    alert('Please provide Parcel Service and Waybill Number');
                    setIsProcessing(false);
                    return;
                }
                console.log('Calling fulfillParcelOrder with:', { orderId: order.id, parcelService, waybillNo, collectionPoint });
                const result = await fulfillParcelOrder(order.id, parcelService, waybillNo, collectionPoint);
                console.log('fulfillParcelOrder result:', result);
                if (result.success) {
                    alert(`✅ Parcel shipped! Collection OTP: ${result.otp}\n\nBuyer will see this code in their app.`);
                    onOrderUpdated?.();
                    onClose();
                } else {
                    alert(`❌ Failed: ${result.message || 'Unknown error'}`);
                }
            }
        } catch (error) {
            console.error('Error shipping order:', error);
            alert('An error occurred while shipping the order.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otpCode || otpCode.length !== 4) {
            alert('Please enter a valid 4-digit code');
            return;
        }
        setIsProcessing(true);
        try {
            const result = await verifyParcelOTP(order.id, otpCode);
            if (result.success) {
                onOrderUpdated?.();
                onClose();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            alert('Failed to verify code.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMarkReady = async () => {
        setIsProcessing(true);
        try {
            const success = await markOrderReady(order.id);
            if (success) {
                onOrderUpdated?.();
                onClose();
            } else {
                alert('Failed to mark order as ready.');
            }
        } catch (error) {
            console.error('Error marking ready:', error);
            alert('An error occurred.');
        } finally {
            setIsProcessing(false);
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
        order.status?.toLowerCase() === 'unshipped' ||
        order.status?.toLowerCase() === 'ready_for_pickup';

    const handleSubmitProof = async () => {
        if (!shipmentProofUrl.trim()) return;
        setIsSubmittingProof(true);
        try {
            const res = await submitShipmentProof(order.id, shipmentProofUrl);
            if (res.success) {
                alert('Shipment proof submitted successfully.');
                onOrderUpdated?.();
                onClose();
            } else {
                alert(res.message || 'Failed to submit proof.');
            }
        } catch (err) {
            console.error('Error submitting proof:', err);
            alert('An error occurred.');
        } finally {
            setIsSubmittingProof(false);
        }
    };

    const canMarkReady = order.status?.toLowerCase() === 'paid' ||
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

                    {/* Fulfillment Selection */}
                    {canShip && showTrackingInput && (
                        <div className="space-y-4 animate-in slide-in-from-top duration-300">
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setFulfillmentMethod('courier')}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                        fulfillmentMethod === 'courier' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                                    )}
                                >
                                    Official Courier
                                </button>
                                <button
                                    onClick={() => setFulfillmentMethod('parcel')}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                        fulfillmentMethod === 'parcel' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                                    )}
                                >
                                    Local Parcel
                                </button>
                            </div>

                            {fulfillmentMethod === 'courier' ? (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                                    <label className="block text-sm font-bold text-blue-900 mb-2">
                                        Tracking Number
                                    </label>
                                    <input
                                        type="text"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                        placeholder="e.g., 1Z999AA101234..."
                                        className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-[10px] text-blue-600 mt-2 font-medium italic">
                                        * Leave blank if not available yet
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-orange-900 mb-1">
                                            Parcel Service / Shuttle Name
                                        </label>
                                        <input
                                            type="text"
                                            value={parcelService}
                                            onChange={(e) => setParcelService(e.target.value)}
                                            placeholder="e.g., EasyCoach, North Rift"
                                            className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-orange-900 mb-1">
                                            Waybill Number
                                        </label>
                                        <input
                                            type="text"
                                            value={waybillNo}
                                            onChange={(e) => setWaybillNo(e.target.value)}
                                            placeholder="Enter waybill ID"
                                            className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-orange-900 mb-1">
                                            Collection Office (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={collectionPoint}
                                            onChange={(e) => setCollectionPoint(e.target.value)}
                                            placeholder="e.g., Nairobi Office, Meru Stage"
                                            className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* OTP Verification for Parcel Orders */}
                    {order.status?.toLowerCase() === 'shipped' && showOTPInput && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 animate-in zoom-in duration-300">
                            <h3 className="text-sm font-black text-emerald-900 mb-3 flex items-center gap-2">
                                <span className="material-icons text-lg">verified_user</span>
                                Verify Collection
                            </h3>
                            <p className="text-xs text-emerald-700 mb-4 font-medium">
                                Ask the buyer for their 4-digit collection code to finalize this delivery.
                            </p>
                            <input
                                type="text"
                                maxLength={4}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="####"
                                className="w-full text-center text-2xl tracking-[1em] font-black py-4 bg-white border-2 border-emerald-200 rounded-2xl focus:outline-none focus:border-emerald-500 text-emerald-900"
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white pb-safe space-y-3">
                    {canShip && (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.print()}
                                className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-black text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-icons text-lg">print</span>
                                Print Receipt
                            </button>
                            {canMarkReady && !showTrackingInput && (
                                <button
                                    onClick={handleMarkReady}
                                    disabled={isProcessing}
                                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <span className="material-icons animate-spin text-lg">sync</span>
                                    ) : (
                                        <span className="material-icons text-lg">inventory</span>
                                    )}
                                    Mark as Ready
                                </button>
                            )}
                            {!showTrackingInput ? (
                                <button
                                    onClick={() => setShowTrackingInput(true)}
                                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-icons text-lg">local_shipping</span>
                                    Ship This Order
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowTrackingInput(false)}
                                        className="px-4 bg-gray-100 text-gray-400 rounded-2xl active:scale-[0.95] transition-all"
                                    >
                                        <span className="material-icons">close</span>
                                    </button>
                                    <button
                                        onClick={handleShipOrder}
                                        disabled={isProcessing}
                                        className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <span className="material-icons animate-spin text-lg">sync</span>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-icons text-lg">check_circle</span>
                                                Confirm {fulfillmentMethod === 'courier' ? 'Shipment' : 'Parcel Pickup'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {order.status?.toLowerCase() === 'shipped' && (
                        <>
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 animate-in fade-in duration-500">
                                <h3 className="text-sm font-black text-rose-900 mb-2 flex items-center gap-2">
                                    <span className="material-icons text-lg">policy</span>
                                    Shipment Evidence
                                </h3>
                                <p className="text-[10px] text-rose-700 mb-4 leading-relaxed">
                                    Upload a photo of your shipping receipt or waybill. This protects you if the buyer raises a dispute.
                                </p>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={shipmentProofUrl}
                                        onChange={(e) => setShipmentProofUrl(e.target.value)}
                                        placeholder="Paste Image URL / Proof Link"
                                        className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                    <button
                                        onClick={handleSubmitProof}
                                        disabled={isSubmittingProof || !shipmentProofUrl.trim()}
                                        className="w-full bg-rose-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 disabled:opacity-50"
                                    >
                                        {isSubmittingProof ? 'Uploading...' : 'Submit Evidence'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                                    <span className="material-icons text-blue-500 text-lg">hourglass_empty</span>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-blue-900">Waiting for Confirmation</p>
                                        <p className="text-[10px] text-blue-700 leading-relaxed">
                                            The buyer can now confirm receipt directly from their app. You can also manually verify their collection code (OTP) if you are at the handover point.
                                        </p>
                                    </div>
                                </div>
                                {!showOTPInput ? (
                                    <button
                                        onClick={() => setShowOTPInput(true)}
                                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-icons text-lg">task_alt</span>
                                        Complete Delivery (OTP)
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowOTPInput(false)}
                                            className="px-4 bg-gray-100 text-gray-400 rounded-2xl active:scale-[0.95] transition-all"
                                        >
                                            <span className="material-icons">close</span>
                                        </button>
                                        <button
                                            onClick={handleVerifyOTP}
                                            disabled={isProcessing}
                                            className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <span className="material-icons animate-spin text-lg">sync</span>
                                                    Verifying...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-icons text-lg">verified</span>
                                                    Verify & Complete
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}


                    <button
                        onClick={onClose}
                        className="w-full py-3 text-gray-500 font-bold text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Print-only Receipt Component */}
            <BuyerReceipt order={order} />
        </div>
    );
};
