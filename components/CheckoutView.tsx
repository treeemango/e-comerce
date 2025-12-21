import React, { useMemo, useState, useEffect } from 'react';
import { CouponApplicationResult, Product } from '../types';
import { applyCoupon, checkout, fetchUserCoupons, fetchCartDeliveryFee, syncCart } from '../lib/api';
import { getCurrencySymbol } from '@/lib/currency';
import { applyPromotionsToCart, PromotionsResult } from '@/lib/promotions';

interface CheckoutViewProps {
    cartItems: Product[];
    totalAmount: number;
    onCheckoutComplete: () => void;
    userId?: string;
}

const CheckoutView: React.FC<CheckoutViewProps> = ({ cartItems, totalAmount, onCheckoutComplete, userId }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        postcode: '',
        addressLine1: '',
        townCity: '',
        county: '',
        country: 'United Kingdom',
    });

    const [paymentMethod, setPaymentMethod] = useState<'Card' | 'M-Pesa' | 'PayPal' | 'Apple Pay' | 'Google Pay'>('Card');
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [isExpress, setIsExpress] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(0);

    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<CouponApplicationResult['coupon'] | null>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [promoResult, setPromoResult] = useState<PromotionsResult | null>(null);
    const [hasAttemptedAutoApply, setHasAttemptedAutoApply] = useState(false);

    const groupedItems = useMemo(() => {
        return cartItems.reduce((acc, item) => {
            const key = item.id.toString();
            if (!acc[key]) {
                acc[key] = { ...item, quantity: 0 } as Product & { quantity: number };
            }
            acc[key].quantity += 1;
            return acc;
        }, {} as Record<string, Product & { quantity: number }>);
    }, [cartItems]);

    const items = useMemo(() => Object.values(groupedItems) as (Product & { quantity: number })[], [groupedItems]);

    const subtotal = useMemo(() => {
        if (items.length === 0) return totalAmount;
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [items, totalAmount]);

    useEffect(() => {
        const calculatePromos = async () => {
            const result = await applyPromotionsToCart(items.map(i => ({ product: i, quantity: i.quantity })));
            setPromoResult(result);
        };
        calculatePromos();
    }, [items]);

    useEffect(() => {
        const getDeliveryFee = async () => {
            if (userId) {
                const fee = await fetchCartDeliveryFee(userId, isExpress);
                setDeliveryFee(fee);
            }
        };
        getDeliveryFee();
    }, [userId, isExpress, cartItems]);

    // ✨ Auto-apply best coupon
    useEffect(() => {
        const autoApplyBestCoupon = async () => {
            if (!userId || items.length === 0 || hasAttemptedAutoApply || appliedCoupon) return;

            try {
                const userCoupons = await fetchUserCoupons(userId);
                const activeUnused = userCoupons.filter(uc => !uc.used_at && uc.coupon.status === 'Ongoing');

                if (activeUnused.length === 0) {
                    setHasAttemptedAutoApply(true);
                    return;
                }

                // Find the best coupon
                let bestCoupon = null;
                let maxDiscount = 0;

                for (const uc of activeUnused) {
                    let calcDiscount = 0;
                    if (uc.coupon.discount_amount) {
                        calcDiscount = uc.coupon.discount_amount;
                    } else if (uc.coupon.discount_percentage) {
                        calcDiscount = (subtotal * uc.coupon.discount_percentage) / 100;
                    }

                    if (calcDiscount > maxDiscount) {
                        maxDiscount = calcDiscount;
                        bestCoupon = uc.coupon;
                    }
                }

                if (bestCoupon) {
                    setCouponCode(bestCoupon.code);
                    await handleApplyCoupon(bestCoupon.code);
                }
            } catch (err) {
                console.error('Error auto-applying coupon:', err);
            } finally {
                setHasAttemptedAutoApply(true);
            }
        };

        if (subtotal > 0) {
            autoApplyBestCoupon();
        }
    }, [userId, items, subtotal, hasAttemptedAutoApply, appliedCoupon]);

    const currencySymbol = getCurrencySymbol(items[0]?.currency || cartItems[0]?.currency || 'USD');

    const bulkSavings = promoResult ? promoResult.totalSavings : 0;
    const finalTotal = Math.max(0, subtotal + deliveryFee - discountAmount - bulkSavings);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyCoupon = async (codeToApply?: string) => {
        const code = (codeToApply || couponCode).trim();
        if (!code) return;

        setIsApplyingCoupon(true);
        setCouponMessage(null);

        try {
            const productIds = cartItems.map(p => p.id.toString());
            const result = await applyCoupon(code, productIds, userId);

            if (result.success && result.coupon) {
                let calcDiscount = 0;
                if (result.coupon.type === 'fixed') {
                    calcDiscount = result.coupon.discount_amount || 0;
                } else if (result.coupon.type === 'percentage') {
                    calcDiscount = (subtotal * (result.coupon.discount_percentage || 0)) / 100;
                }

                calcDiscount = Math.min(calcDiscount, subtotal);

                setAppliedCoupon(result.coupon);
                setDiscountAmount(calcDiscount);
                setCouponMessage({ type: 'success', text: `Coupon applied: ${result.coupon.code}` });
            } else {
                setAppliedCoupon(null);
                setDiscountAmount(0);
                setCouponMessage({ type: 'error', text: result.message || 'Coupon not valid for your cart' });
            }
        } catch (err) {
            console.error(err);
            setCouponMessage({ type: 'error', text: 'Failed to apply coupon' });
        } finally {
            setIsApplyingCoupon(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setError(null);

        if (!userId) {
            setError('Please sign in before placing your order.');
            setIsProcessing(false);
            return;
        }

        // Basic validation
        if (paymentMethod === 'M-Pesa' && !mpesaPhone) {
            setError('Please enter your M-Pesa phone number.');
            setIsProcessing(false);
            return;
        }

        try {
            // Sync cart items to database before checkout
            const syncSuccess = await syncCart(userId, cartItems);
            if (!syncSuccess) {
                setError('Failed to synchronize cart. Please try again.');
                setIsProcessing(false);
                return;
            }

            const orderId = await checkout(
                userId,
                paymentMethod,
                {
                    ...formData,
                    phoneNumber: paymentMethod === 'M-Pesa' ? mpesaPhone : formData.phoneNumber,
                },
                {
                    couponCode: appliedCoupon?.code || null,
                    expressDelivery: isExpress,
                }
            );

            if (orderId) {
                onCheckoutComplete();
            } else {
                setError('Failed to process order. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Shipping Address */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Shipping Address</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country / Region</label>
                                <select
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                >
                                    <option value="United Kingdom">United Kingdom</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        required
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        required
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone number <span className="text-red-500">*</span></label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    required
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                />
                                <p className="text-xs text-orange-500 mt-1">The phone number should have 10 digits and not contain other characters.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postcode <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="postcode"
                                    required
                                    value={formData.postcode}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flat, house number, building, street, etc. <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="addressLine1"
                                    required
                                    value={formData.addressLine1}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Town / City <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="townCity"
                                    required
                                    value={formData.townCity}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">County <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="county"
                                    required
                                    value={formData.county}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-full shadow-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? 'Processing...' : 'Place Order'}
                                </button>
                            </div>

                            {error && (
                                <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                                    {error}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Delivery Options */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Delivery Speed</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${!isExpress ? 'border-primary bg-orange-50 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <input type="radio" checked={!isExpress} onChange={() => setIsExpress(false)} className="text-primary focus:ring-primary" />
                                    <span className="font-bold text-gray-900 dark:text-white">Standard Delivery</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Arrives in 3-5 business days</p>
                                <p className="text-sm font-bold text-green-600 mt-2">FREE</p>
                            </label>
                            <label className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${isExpress ? 'border-primary bg-orange-50 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <input type="radio" checked={isExpress} onChange={() => setIsExpress(true)} className="text-primary focus:ring-primary" />
                                    <span className="font-bold text-gray-900 dark:text-white">Express Delivery</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Arrives in 1-2 business days</p>
                                <p className="text-sm font-bold text-primary mt-2">{currencySymbol}6.99</p>
                            </label>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Payment methods</h2>
                        <div className="space-y-3">
                            {/* Card */}
                            <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'Card' ? 'border-primary bg-orange-50 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                <input type="radio" checked={paymentMethod === 'Card'} onChange={() => setPaymentMethod('Card')} className="text-primary focus:ring-primary" />
                                <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                                    <span className="material-icons text-gray-600 dark:text-gray-300">credit_card</span>
                                </div>
                                <div className="flex-1">
                                    <span className="font-bold text-gray-900 dark:text-white">Credit / Debit Card</span>
                                    <div className="flex gap-2 mt-1">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4" />
                                    </div>
                                </div>
                            </label>

                            {/* M-Pesa */}
                            <label className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'M-Pesa' ? 'border-primary bg-orange-50 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                <div className="flex items-center gap-4 mb-3">
                                    <input type="radio" checked={paymentMethod === 'M-Pesa'} onChange={() => setPaymentMethod('M-Pesa')} className="text-primary focus:ring-primary" />
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <span className="material-icons text-green-600">phone_android</span>
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-bold text-gray-900 dark:text-white">M-Pesa / Mobile Money</span>
                                    </div>
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-Pesa_logo.png" alt="M-Pesa" className="h-6" />
                                </div>
                                {paymentMethod === 'M-Pesa' && (
                                    <div className="ml-8 mt-2 space-y-2">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">M-Pesa Phone Number</label>
                                        <input
                                            type="tel"
                                            placeholder="2547XXXXXXXX"
                                            value={mpesaPhone}
                                            onChange={(e) => setMpesaPhone(e.target.value)}
                                            className="w-full max-w-xs border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 dark:bg-gray-800 dark:text-white focus:ring-primary focus:border-primary"
                                        />
                                        <p className="text-[10px] text-gray-400">Enter the phone number you want to pay with.</p>
                                    </div>
                                )}
                            </label>

                            {/* PayPal */}
                            <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'PayPal' ? 'border-primary bg-orange-50 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                <input type="radio" checked={paymentMethod === 'PayPal'} onChange={() => setPaymentMethod('PayPal')} className="text-primary focus:ring-primary" />
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <span className="material-icons text-blue-600">account_balance</span>
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white">PayPal</span>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 ml-auto" />
                            </label>

                            {/* Apple/Google Pay */}
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'Apple Pay' ? 'border-primary bg-orange-50 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                    <input type="radio" checked={paymentMethod === 'Apple Pay'} onChange={() => setPaymentMethod('Apple Pay')} className="text-primary focus:ring-primary" />
                                    <span className="material-icons text-black dark:text-white">apple</span>
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">Apple Pay</span>
                                </label>
                                <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'Google Pay' ? 'border-primary bg-orange-50 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                    <input type="radio" checked={paymentMethod === 'Google Pay'} onChange={() => setPaymentMethod('Google Pay')} className="text-primary focus:ring-primary" />
                                    <span className="material-icons text-blue-500">google</span>
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">Google Pay</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sticky top-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Order Summary</h2>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Item(s) total</span>
                                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Subtotal</span>
                                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Shipping</span>
                                <span className={deliveryFee === 0 ? 'text-green-600 font-bold' : 'text-gray-900 dark:text-white font-bold'}>
                                    {deliveryFee === 0 ? 'FREE' : `${currencySymbol}${deliveryFee.toFixed(2)}`}
                                </span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-rose-700 dark:text-rose-400 font-medium">
                                    <span>{appliedCoupon?.name || 'Coupon Discount'}</span>
                                    <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {bulkSavings > 0 && (
                                <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                                    <span>Promotion Savings</span>
                                    <span>-{currencySymbol}{bulkSavings.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-lg text-gray-900 dark:text-white">Order Total</span>
                                <span className="font-bold text-xl text-orange-600">{currencySymbol}{finalTotal.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-right">VAT included</p>
                        </div>

                        <div className="mt-4">
                            {couponMessage && couponMessage.type === 'error' && (
                                <p className="text-xs text-red-600">
                                    {couponMessage.text}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isProcessing}
                            className="w-full bg-black text-white py-3 rounded-full font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-md"
                        >
                            Proceed to checkout
                            <span className="material-icons text-sm">arrow_forward</span>
                        </button>

                        <div className="mt-6 space-y-3">
                            <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="material-icons text-green-500 text-sm">security</span>
                                <p>JuaExpress protects your card information</p>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="material-icons text-green-500 text-sm">check_circle</span>
                                <p>JuaExpress follows the Payment Card Industry Data Security Standard (PCI DSS)</p>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="material-icons text-green-500 text-sm">check_circle</span>
                                <p>All data is safeguarded</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CheckoutView;
