import React, { useState } from 'react';
import { SellerOrder } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { fulfillOrder, fulfillParcelOrder, verifyParcelOTP, markOrderReady, submitShipmentProof } from '../../../lib/api';
import { MediaService } from '../../../lib/media';
import BuyerReceipt from './BuyerReceipt';
import { logistics } from '../../../lib/logistics-service';
import { CarrierProvider, Address, Parcel } from '../../../lib/logistics-types';

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
    const [shippingType, setShippingType] = useState<'courier' | 'parcel' | 'logistics'>(() => {
        // If buyer chose local_parcel, default to parcel shipping type
        if (order.logistics_meta?.provider === 'local_parcel') return 'parcel';
        // If buyer chose another logistics provider, default to logistics
        if (order.logistics_meta) return 'logistics';
        // Otherwise default to courier
        return 'courier';
    });
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isShipping, setIsShipping] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const [isMarkingReady, setIsMarkingReady] = useState(false);

    // Parcel-specific fields
    const [parcelService, setParcelService] = useState('');
    const [waybillNumber, setWaybillNumber] = useState('');
    const [collectionPoint, setCollectionPoint] = useState('');
    const [transportFee, setTransportFee] = useState('');
    const [paymentDetails, setPaymentDetails] = useState(''); // M-Pesa, Till, etc.
    const [isVerifying, setIsVerifying] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [showOTPInput, setShowOTPInput] = useState(false);

    // Shipment Evidence
    const [shipmentProofUrl, setShipmentProofUrl] = useState(order.shipment_proof_url || '');
    const [isSubmittingProof, setIsSubmittingProof] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

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
                const feeNum = parseFloat(transportFee);
                if (!transportFee || isNaN(feeNum) || feeNum <= 0) {
                    alert('Please enter a valid transport fee amount (e.g. 500).');
                    setIsShipping(false);
                    return;
                }
                const result = await fulfillParcelOrder(order.id, parcelService, waybillNumber, collectionPoint, feeNum, paymentDetails);
                if (result.success) {
                    alert(`✅ Order shipped! Mutual Protection Enabled.\n\nThe buyer will receive a secret 4-digit code in their app for secure collection.`);
                    onOrderUpdated?.();
                    onClose();
                } else {
                    alert(`Failed to ship parcel: ${result.message}`);
                }
            } else if (shippingType === 'logistics') {
                if (!order.logistics_meta) return;
                setIsBooking(true);
                try {
                    // Reconstruct destination from order (simplified for demo)
                    const destination: Address = {
                        name: order.customer_name || 'Customer',
                        phone: order.customer_email || '0000000000', // Mock phone if missing
                        street_address: order.shipping_address || 'Address',
                        city: 'Nairobi', // Default for Kenya if not parsed
                        country_code: 'KE'
                    };

                    const parcels: Parcel[] = [{
                        weight: order.items?.reduce((sum, i) => sum + (i.quantity * 0.5), 0) || 1,
                        length: 20, width: 15, height: 10
                    }];

                    const result = await logistics.getAdapter(order.logistics_meta.provider as CarrierProvider).createShipment({
                        order_id: order.id,
                        service_code: order.logistics_meta.service_id,
                        carrier_id: order.logistics_meta.rate_id,
                        origin: { name: 'Seller Warehouse', phone: '123', street_address: 'Main St', city: 'Nairobi', country_code: 'KE' },
                        destination,
                        parcels
                    });

                    const success = await fulfillOrder(order.id, result.tracking_number);
                    if (success) {
                        alert(`✅ Shipment booked with ${result.carrier_name}!\nTracking: ${result.tracking_number}`);
                        onOrderUpdated?.();
                        onClose();
                    }
                } catch (err) {
                    console.error('Booking error:', err);
                    alert('Logistics booking failed. Please use courier/parcel mode.');
                } finally {
                    setIsBooking(false);
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Get sellerId from the order items or user context if available
            // In this modal we have the order, we can assume the current user is the seller
            // MediaService.getInstance().uploadFile needs a sellerId for the path
            const sellerId = order.items?.[0]?.seller_id || 'unknown_seller'; // Fallback
            const result = await MediaService.getInstance().uploadFile(file, sellerId);
            setShipmentProofUrl(result.url);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload image.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmitProof = async () => {
        if (!shipmentProofUrl.trim()) return;
        setIsSubmittingProof(true);
        try {
            const res = await submitShipmentProof(order.id, shipmentProofUrl);
            if (res.success) {
                alert('Shipment proof submitted successfully.');
                onOrderUpdated?.();
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

    const handleMarkReady = async () => {
        setIsMarkingReady(true);
        try {
            const success = await markOrderReady(order.id);
            if (success) {
                onOrderUpdated?.();
                onClose();
            } else {
                alert('Failed to mark order as ready. Please try again.');
            }
        } catch (error) {
            console.error('Error marking order as ready:', error);
            alert('An error occurred.');
        } finally {
            setIsMarkingReady(false);
        }
    };

    const canShip = order.status?.toLowerCase() === 'pending' ||
        order.status?.toLowerCase() === 'paid' ||
        order.status?.toLowerCase() === 'unshipped' ||
        order.status?.toLowerCase() === 'ready_for_pickup';

    const canMarkReady = order.status?.toLowerCase() === 'paid' ||
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

                    {/* Buyer's Selection Highlight */}
                    {order.logistics_meta && (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 animate-in fade-in duration-500">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                    <span className="material-icons">local_shipping</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-black text-orange-900 uppercase tracking-wider">Buyer's Selected Method</h3>
                                    <p className="font-bold text-gray-900 mt-1">
                                        {order.logistics_meta.provider === 'local_parcel'
                                            ? 'Local Parcel (Station to Station)'
                                            : `${order.logistics_meta.provider.toUpperCase()} - ${order.logistics_meta.service_id}`}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        {order.logistics_meta.provider === 'local_parcel'
                                            ? 'Fee to be communicated to buyer. Buyer will pay on collection.'
                                            : `Shipping Fee: ${formatCurrency(order.logistics_meta.cost || 0, currency)} paid by buyer.`}
                                    </p>
                                </div>
                                {order.logistics_meta.provider === 'local_parcel' && (
                                    <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                        Manual Handling
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Shipping Options */}
                    {showTrackingInput && canShip && (
                        <div className="space-y-4">
                            {/* Shipping Type Selection - Only show buyer's chosen method */}
                            <div className="flex flex-wrap gap-3">
                                {/* Determine buyer's choice */}
                                {(() => {
                                    const buyerChoseLocalParcel = order.logistics_meta?.provider === 'local_parcel';
                                    const buyerChoseLogistics = order.logistics_meta && order.logistics_meta.provider !== 'local_parcel';
                                    const noPreference = !order.logistics_meta;

                                    return (
                                        <>
                                            {/* Automated Logistics Booking (Sendy, etc.) - only if buyer chose this */}
                                            {buyerChoseLogistics && (
                                                <button
                                                    onClick={() => setShippingType('logistics')}
                                                    className={`flex-1 min-w-[200px] p-4 rounded-xl border-2 transition-all ${shippingType === 'logistics' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-icons text-orange-500">hail</span>
                                                        <div className="text-left">
                                                            <p className="font-bold text-gray-900">Automated Booking</p>
                                                            <p className="text-xs text-gray-500 capitalize">{order.logistics_meta?.provider} - {order.logistics_meta?.service_id}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            )}

                                            {/* Courier Delivery - only if no preference OR buyer chose logistics */}
                                            {(noPreference || buyerChoseLogistics) && (
                                                <button
                                                    onClick={() => setShippingType('courier')}
                                                    className={`flex-1 min-w-[200px] p-4 rounded-xl border-2 transition-all ${shippingType === 'courier' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-icons text-orange-500">local_shipping</span>
                                                        <div className="text-left">
                                                            <p className="font-bold text-gray-900">Courier Delivery</p>
                                                            <p className="text-xs text-gray-500">DHL, FedEx, etc.</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            )}

                                            {/* Local Parcel - ONLY if buyer explicitly chose it */}
                                            {buyerChoseLocalParcel && (
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
                                            )}

                                            {/* Legacy orders with no preference - show Local Parcel too */}
                                            {noPreference && (
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
                                            )}
                                        </>
                                    );
                                })()}
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
                                            placeholder="e.g., Downtown Office, Bus Stage"
                                            className="w-full px-4 py-3 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-orange-900 mb-1">
                                            Transport Fee (KSh)
                                        </label>
                                        <input
                                            type="number"
                                            value={transportFee}
                                            onChange={(e) => setTransportFee(e.target.value)}
                                            placeholder="e.g., 500"
                                            className="w-full px-4 py-3 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                        <p className="text-[10px] text-orange-700 mt-1 italic">
                                            Transport fee to be paid by buyer upon collection.
                                        </p>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-2">
                                        <label className="block text-sm font-bold text-emerald-900 mb-1">
                                            <span className="material-icons text-emerald-600 text-sm align-middle mr-1">payments</span>
                                            Payment Details (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={paymentDetails}
                                            onChange={(e) => setPaymentDetails(e.target.value)}
                                            placeholder="e.g., M-Pesa: 0712345678 or Till: 123456"
                                            className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <p className="text-[10px] text-emerald-700 mt-1 italic">
                                            Provide M-Pesa, Till number, or bank details for transport fee payment.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Logistics Details */}
                            {shippingType === 'logistics' && order.logistics_meta && (
                                <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 space-y-3 animate-in fade-in">
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                            <span className="material-icons text-sm">info</span>
                                        </div>
                                        <h4 className="font-bold text-orange-900 text-sm">Booking Details</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                                        <span className="text-orange-700/60 font-medium">Provider:</span>
                                        <span className="text-orange-900 font-bold capitalize">{order.logistics_meta.provider}</span>
                                        <span className="text-orange-700/60 font-medium">Service:</span>
                                        <span className="text-orange-900 font-bold">{order.logistics_meta.service_id}</span>
                                        <span className="text-orange-700/60 font-medium">Quote:</span>
                                        <span className="text-orange-900 font-bold">{formatCurrency(order.logistics_meta.cost, currency)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-orange-200/50">
                                        <p className="text-[10px] text-orange-700 italic">
                                            Confirming will automatically book the pickup and notify the buyer.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Collection Verification (OTP) & Shipment Evidence */}
                    {order.status?.toLowerCase() === 'shipped' && (
                        <div className="space-y-6">
                            {/* Verification Card (Blue/Emerald depending on parcel) */}
                            {(order.fulfillment_type === 'local_parcel' || showOTPInput) ? (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <span className="material-icons">verified_user</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-emerald-900">Verify Collection</h3>
                                            <p className="text-xs text-emerald-600 font-medium">Mutual Protection Enabled</p>
                                        </div>
                                    </div>

                                    <p className="text-sm text-emerald-700 leading-relaxed">
                                        Ask the buyer for their <strong>4-digit collection code</strong> to confirm handover and release funds.
                                    </p>

                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            maxLength={4}
                                            value={otpInput}
                                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Enter Code"
                                            className="flex-1 px-4 py-4 bg-white border-2 border-emerald-200 rounded-xl text-center font-black text-2xl tracking-[0.5em] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                                        />
                                        <button
                                            onClick={handleVerifyOTP}
                                            disabled={isVerifying || otpInput.length !== 4}
                                            className="px-8 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center min-w-[120px]"
                                        >
                                            {isVerifying ? <span className="material-icons animate-spin">sync</span> : 'Verify'}
                                        </button>
                                    </div>
                                    {showOTPInput && order.fulfillment_type !== 'local_parcel' && (
                                        <button
                                            onClick={() => setShowOTPInput(false)}
                                            className="text-xs text-emerald-600 font-bold uppercase tracking-wider hover:underline"
                                        >
                                            Cancel Manual Verification
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                            <span className="material-icons">hourglass_empty</span>
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-blue-900 leading-none">Waiting for Confirmation</h3>
                                            <p className="text-xs text-blue-700 leading-relaxed font-medium mt-1">
                                                The buyer can confirm receipt from their app. You can also manually verify their collection code (OTP).
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowOTPInput(true)}
                                        className="w-full bg-white border border-blue-200 text-blue-600 py-3 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-icons text-sm">vpn_key</span>
                                        Enter Collection Code
                                    </button>
                                </div>
                            )}

                            {/* Shipment Evidence Card (Pink) */}
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                                        <span className="material-icons">policy</span>
                                    </div>
                                    <h3 className="font-bold text-rose-900">Shipment Evidence</h3>
                                </div>

                                <p className="text-xs text-rose-700 leading-relaxed font-medium">
                                    Upload a photo of your shipping receipt or waybill. This protects you if the buyer raises a dispute.
                                </p>

                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={shipmentProofUrl}
                                            onChange={(e) => setShipmentProofUrl(e.target.value)}
                                            placeholder="Paste Image URL or Upload"
                                            className="flex-1 px-4 py-3 bg-white border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                                        />
                                        <input
                                            type="file"
                                            id="shipment-proof-upload"
                                            className="hidden"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleFileUpload}
                                        />
                                        <label
                                            htmlFor="shipment-proof-upload"
                                            className="px-4 bg-white border border-rose-200 text-rose-600 rounded-xl flex items-center justify-center cursor-pointer hover:bg-rose-50 transition-colors"
                                        >
                                            {isUploading ? (
                                                <span className="material-icons animate-spin">sync</span>
                                            ) : (
                                                <span className="material-icons">photo_camera</span>
                                            )}
                                        </label>
                                    </div>

                                    {order.shipment_proof_url && (
                                        <div className="p-2 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100 flex items-center gap-1">
                                            <span className="material-icons text-xs">check_circle</span>
                                            Proof already submitted
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSubmitProof}
                                        disabled={isSubmittingProof || !shipmentProofUrl.trim()}
                                        className="w-full bg-rose-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 disabled:opacity-50 transition-all shadow-lg shadow-rose-600/20"
                                    >
                                        {isSubmittingProof ? 'Sending...' : 'Submit Evidence'}
                                    </button>
                                </div>
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
                            {canMarkReady && !showTrackingInput && (
                                <button
                                    onClick={handleMarkReady}
                                    disabled={isMarkingReady}
                                    className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
                                >
                                    {isMarkingReady ? (
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

