import React, { useState } from 'react';
import { SellerOrder } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { fulfillOrder, fulfillParcelOrder, verifyParcelOTP } from '../../../lib/api';
import BuyerReceipt from './BuyerReceipt';

interface OrderDetailsModalProps {
    order: SellerOrder;
    onClose: () => void;
    onOrderUpdated?: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
    order,
    onClose,
    onOrderUpdated
}) => {
    const [showTrackingInput, setShowTrackingInput] = useState(false);
    const [shippingType, setShippingType] = useState<'courier' | 'parcel'>('courier');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isShipping, setIsShipping] = useState(false);
    const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);

    // Parcel-specific fields
    const [parcelService, setParcelService] = useState('');
    const [waybillNumber, setWaybillNumber] = useState('');
    const [collectionPoint, setCollectionPoint] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [otpInput, setOtpInput] = useState('');

    const getStatusStyles = (status?: string) => {
        const s = status?.toLowerCase();
        switch (s) {
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'paid':
            case 'unshipped': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'shipped': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
            case 'canceled':
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const handleShipOrder = async () => {
        setIsShipping(true);
        try {
            if (shippingType === 'parcel') {
                if (!parcelService || !waybillNumber) {
                    alert('Please enter parcel service and waybill number');
                    setIsShipping(false);
                    return;
                }
                const result = await fulfillParcelOrder(order.id, parcelService, waybillNumber, collectionPoint);
                if (result.success) {
                    setGeneratedOTP(result.otp || null);
                    // Show OTP confirmation before closing
                    if (result.otp) {
                        alert(`Order shipped! Collection OTP: ${result.otp}\n\nThe buyer will see this code when they view their order.`);
                    }
                    onOrderUpdated?.();
                    onClose();
                } else {
                    alert(`Failed to ship parcel: ${result.message}`);
                }
            } else {
                const success = await fulfillOrder(order.id, trackingNumber || undefined);
                if (success) {
                    onOrderUpdated?.();
                    onClose();
                } else {
                    alert('Failed to ship order. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error shipping order:', error);
            alert('An error occurred while shipping the order.');
        } finally {
            setIsShipping(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otpInput || otpInput.length !== 4) return;

        setIsVerifying(true);
        try {
            const result = await verifyParcelOTP(order.id, otpInput);
            if (result.success) {
                alert('Collection verified successfully! Funds have been released to escrow.');
                onOrderUpdated?.();
                onClose();
            } else {
                alert(result.message || 'Verification failed. Please check the code.');
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            alert('An error occurred during verification.');
        } finally {
            setIsVerifying(false);
        }
    };

    const canShip = order.status?.toLowerCase() === 'pending' ||
        order.status?.toLowerCase() === 'paid' ||
        order.status?.toLowerCase() === 'unshipped';

    const currency = order.items?.[0]?.currency || 'USD';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-gray-900">
                                {order.order_number ? `Order #${order.order_number}` : `Order #${order.id.substring(0, 8).toUpperCase()}`}
                            </h2>
                            <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg border ${getStatusStyles(order.status)}`}>
                                {order.status || 'Pending'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Customer Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-icons text-gray-400">person</span>
                            <h3 className="font-bold text-gray-900">Customer Information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Name</span>
                                <p className="font-medium text-gray-900">{order.customer_name || 'Guest Customer'}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Email</span>
                                <p className="font-medium text-gray-900">{order.customer_email || 'No email provided'}</p>
                            </div>
                            <div className="col-span-2">
                                <span className="text-gray-500">Shipping Address</span>
                                <p className="font-medium text-gray-900">{order.shipping_address || 'Address on file'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-icons text-gray-400">inventory_2</span>
                            <h3 className="font-bold text-gray-900">Order Items ({order.items?.length || 0})</h3>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Product</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Qty</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items?.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.product_title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <span className="material-icons text-sm">image</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{item.product_title}</p>
                                                        {item.variant_sku && (
                                                            <p className="text-xs text-gray-500">SKU: {item.variant_sku}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center text-sm text-gray-900">{item.quantity}</td>
                                            <td className="px-4 py-4 text-right font-bold text-gray-900">
                                                {formatCurrency(item.price || 0, item.currency || 'USD')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-gray-200">
                                    <tr>
                                        <td className="px-4 py-2 text-sm text-gray-500" colSpan={2}>Subtotal</td>
                                        <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                                            {formatCurrency((order.total_amount || 0) - (order.tax_amount || 0) - (order.delivery_fee || 0), currency)}
                                        </td>
                                    </tr>
                                    {order.tax_amount ? (
                                        <tr>
                                            <td className="px-4 py-1 text-sm text-gray-500" colSpan={2}>Tax ({((order.tax_rate || 0) * 100).toFixed(0)}%)</td>
                                            <td className="px-4 py-1 text-right text-sm font-medium text-gray-900">
                                                {formatCurrency(order.tax_amount, currency)}
                                            </td>
                                        </tr>
                                    ) : null}
                                    {order.delivery_fee ? (
                                        <tr>
                                            <td className="px-4 py-1 text-sm text-gray-500" colSpan={2}>Delivery Fee</td>
                                            <td className="px-4 py-1 text-right text-sm font-medium text-gray-900">
                                                {formatCurrency(order.delivery_fee, currency)}
                                            </td>
                                        </tr>
                                    ) : null}
                                    <tr className="border-t border-gray-200 bg-white">
                                        <td className="px-4 py-4 font-bold text-gray-900" colSpan={2}>Order Total</td>
                                        <td className="px-4 py-4 text-right text-lg font-black text-gray-900">
                                            {formatCurrency(order.total_amount || 0, currency)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Shipping Options */}
                    {showTrackingInput && canShip && (
                        <div className="space-y-4">
                            {/* Shipping Type Selection */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShippingType('courier')}
                                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${shippingType === 'courier' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons text-orange-500">local_shipping</span>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900">Courier Delivery</p>
                                            <p className="text-xs text-gray-500">DHL, FedEx, etc.</p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setShippingType('parcel')}
                                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${shippingType === 'parcel' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons text-orange-500">directions_bus</span>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900">Local Parcel</p>
                                            <p className="text-xs text-gray-500">Bus/Shuttle with OTP</p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Courier Input */}
                            {shippingType === 'courier' && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <label className="block text-sm font-bold text-blue-900 mb-2">
                                        Enter Tracking Number (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                        placeholder="e.g., 1Z999AA10123456784"
                                        className="w-full px-4 py-3 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            {/* Parcel Inputs */}
                            {shippingType === 'parcel' && (
                                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-4">
                                    <p className="text-xs text-orange-700 font-medium mb-2">
                                        📦 A 4-digit OTP will be generated for secure collection
                                    </p>
                                    <div>
                                        <label className="block text-sm font-bold text-orange-900 mb-1">
                                            Parcel Service *
                                        </label>
                                        <input
                                            type="text"
                                            value={parcelService}
                                            onChange={(e) => setParcelService(e.target.value)}
                                            placeholder="e.g., Modern Coast, Easy Coach"
                                            className="w-full px-4 py-3 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-orange-900 mb-1">
                                            Waybill Number *
                                        </label>
                                        <input
                                            type="text"
                                            value={waybillNumber}
                                            onChange={(e) => setWaybillNumber(e.target.value)}
                                            placeholder="e.g., MC-2024-12345"
                                            className="w-full px-4 py-3 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-orange-900 mb-1">
                                            Collection Point (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={collectionPoint}
                                            onChange={(e) => setCollectionPoint(e.target.value)}
                                            placeholder="e.g., Nairobi CBD Office, Mombasa Stage"
                                            className="w-full px-4 py-3 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Collection Verification (OTP) - Show when order is shipped via parcel */}
                    {order.status?.toLowerCase() === 'shipped' && order.fulfillment_type === 'local_parcel' && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <span className="material-icons text-emerald-600">verified_user</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-emerald-900">Verify Collection</h3>
                                    <p className="text-xs text-emerald-600 font-medium">Mutual Protection Enabled</p>
                                </div>
                            </div>

                            <p className="text-sm text-emerald-700 leading-relaxed">
                                Ask the buyer for their <strong>4-digit collection code</strong> to confirm handover.
                                Successful verification releases funds to your account balance.
                            </p>

                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Enter Code"
                                    className="flex-1 px-4 py-4 bg-white border-2 border-emerald-200 rounded-xl text-center font-black text-2xl tracking-[0.5em] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-medium placeholder:text-sm"
                                />
                                <button
                                    onClick={handleVerifyOTP}
                                    disabled={isVerifying || otpInput.length !== 4}
                                    className="px-8 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center min-w-[120px]"
                                >
                                    {isVerifying ? (
                                        <span className="material-icons animate-spin">sync</span>
                                    ) : (
                                        'Verify'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Close
                    </button>

                    {canShip && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                                title="Print receipt for delivery"
                            >
                                <span className="material-icons text-lg">print</span>
                                Print Receipt
                            </button>
                            {!showTrackingInput ? (
                                <button
                                    onClick={() => setShowTrackingInput(true)}
                                    className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2"
                                >
                                    <span className="material-icons text-lg">local_shipping</span>
                                    Ship Order
                                </button>
                            ) : (
                                <button
                                    onClick={handleShipOrder}
                                    disabled={isShipping}
                                    className="px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
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
                        </div>
                    )}

                    {order.status?.toLowerCase() === 'shipped' && (
                        <div className="flex items-center gap-2 text-emerald-600">
                            <span className="material-icons">done_all</span>
                            <span className="font-medium">Order shipped</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Print-only Receipt Component */}
            <BuyerReceipt order={order} />
        </div>
    );
};

export default OrderDetailsModal;

