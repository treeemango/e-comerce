import React, { useState } from 'react';
import { Product } from '../types';
import { getCurrencySymbol, useCurrencyConverter, formatPrice } from '@/lib/currency';
import { useMemo } from 'react';
import { applyCoupon, fetchUserCoupons } from '@/lib/api';
import { applyPromotionsToCart, PromotionsResult } from '@/lib/promotions';

interface CartViewProps {
    cartItems: Product[];
    onRemoveFromCart: (productId: number | string, variantId?: string) => void;
    onUpdateQuantity: (productId: number | string, delta: number, variantId?: string) => void;
    onCheckoutClick: () => void;
    onHomeClick: () => void;
    userId?: string;
}

const CartView: React.FC<CartViewProps> = ({ cartItems, onRemoveFromCart, onUpdateQuantity, onCheckoutClick, onHomeClick, userId }) => {
    const [discount, setDiscount] = useState(0);
    const [isApplying, setIsApplying] = useState(false);
    const [promoResult, setPromoResult] = useState<PromotionsResult | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [hasAttemptedAutoApply, setHasAttemptedAutoApply] = useState(false);

    // Group items to track quantities
    const groupedItems = cartItems.reduce((acc, item) => {
        const key = `${item.id}:${item.variant_id || 'default'}`;
        if (!acc[key]) {
            acc[key] = { ...item, quantity: 0 };
        }
        acc[key].quantity += 1;
        return acc;
    }, {} as Record<string, Product & { quantity: number }>);

    const items = Object.values(groupedItems) as (Product & { quantity: number })[];

    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];
        items.forEach(item => {
            const key = `${item.id}:${item.variant_id || 'default'}`;
            vals.push({ id: `item-${key}`, amount: item.price, currency: item.currency || 'USD' });
        });

        // Convert shipping and free shipping threshold too
        vals.push({ id: 'shipping-rate', amount: 12, currency: 'USD' });
        vals.push({ id: 'free-shipping-threshold', amount: 120, currency: 'USD' });

        return vals;
    }, [items]);

    const { convertedValues, preferredCurrency } = useCurrencyConverter(priceValues);

    const getConvertedAmount = (id: string, fallback: number) => {
        return convertedValues[id]?.convertedAmount ?? fallback;
    };

    const getConvertedPrice = (id: string, fallback: number, currency: string) => {
        return convertedValues[id]?.converted ?? formatPrice(fallback, currency);
    };

    const subtotal = items.reduce((sum, item) => {
        const key = `${item.id}:${item.variant_id || 'default'}`;
        const price = getConvertedAmount(`item-${key}`, item.price);
        return sum + (price * item.quantity);
    }, 0);

    const shippingThreshold = getConvertedAmount('free-shipping-threshold', 120);
    const shippingRate = getConvertedAmount('shipping-rate', 12);

    const shipping = subtotal > shippingThreshold ? 0 : shippingRate;
    const initialTotal = Math.max(0, subtotal + shipping - discount);

    // For promoResult, we need to convert the calculated totals per item
    const convertedPromoItems = useMemo(() => {
        if (!promoResult) return [];
        return promoResult.items.map(res => {
            const key = `${res.product.id}:${res.product.variant_id || 'default'}`;
            const conv = convertedValues[`item-${key}`];
            const rate = conv?.rate ?? 1;

            return {
                ...res,
                convertedTotal: res.total * rate,
                convertedDiscountedPrice: res.discountedPrice * rate
            };
        });
    }, [promoResult, convertedValues]);

    const finalSubtotal = subtotal;
    const finalPromoTotal = promoResult ? convertedPromoItems.reduce((sum, i) => sum + i.convertedTotal, 0) : initialTotal;

    const finalTotal = promoResult ? Math.max(0, finalPromoTotal + shipping - discount) : initialTotal;
    const bulkSavings = promoResult ? Math.max(0, subtotal - finalPromoTotal) : 0;
    const totalSavings = bulkSavings + discount;
    const uniqueCount = items.length;

    React.useEffect(() => {
        const calculatePromos = async () => {
            const result = await applyPromotionsToCart(items.map(i => ({ product: i, quantity: i.quantity })));
            setPromoResult(result);
        };
        calculatePromos();
    }, [cartItems]);

    // ✨ Auto-apply best coupon
    React.useEffect(() => {
        const autoApplyBestCoupon = async () => {
            if (!userId || items.length === 0 || hasAttemptedAutoApply || appliedCoupon) return;

            try {
                const userCoupons = await fetchUserCoupons(userId);
                const activeUnused = userCoupons.filter(uc => !uc.used_at && uc.coupon.status === 'Ongoing');

                if (activeUnused.length === 0) {
                    setHasAttemptedAutoApply(true);
                    return;
                }

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
                    handleApplyCouponByCode(bestCoupon.code);
                }
            } catch (err) {
                console.error('Error auto-applying coupon in Cart:', err);
            } finally {
                setHasAttemptedAutoApply(true);
            }
        };

        if (subtotal > 0) {
            autoApplyBestCoupon();
        }
    }, [userId, items, subtotal, hasAttemptedAutoApply, appliedCoupon]);

    const handleApplyCouponByCode = async (code: string) => {
        setIsApplying(true);
        try {
            const productIds = cartItems.map(p => p.id.toString());
            const result = await applyCoupon(code, productIds, userId);

            if (result.success && result.coupon) {
                let disc = 0;
                if (result.coupon.type === 'fixed') {
                    disc = result.coupon.discount_amount || 0;
                } else if (result.coupon.type === 'percentage') {
                    disc = (subtotal * (result.coupon.discount_percentage || 0)) / 100;
                }
                setDiscount(disc);
                setAppliedCoupon(result.coupon);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsApplying(false);
        }
    };


    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 bg-gradient-to-b from-gray-50 to-white">
                <span className="material-icons text-6xl text-gray-300">shopping_cart</span>
                <h2 className="text-2xl font-bold text-gray-800">Your cart is empty</h2>
                <p className="text-gray-500">Add items to unlock deals and fast delivery.</p>
                <button
                    onClick={onHomeClick}
                    className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-opacity-90 transition-colors shadow-sm"
                >
                    Continue shopping
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] bg-gradient-to-b from-gray-50 via-white to-white">
            <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-wide text-gray-500">Cart</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Review your bag</h1>
                        <p className="text-gray-500 text-sm mt-1">{cartItems.length} item{cartItems.length === 1 ? '' : 's'} · {uniqueCount} product{uniqueCount === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onHomeClick}
                            className="text-sm font-semibold text-gray-700 hover:text-primary transition-colors flex items-center gap-1"
                        >
                            <span className="material-icons text-base">arrow_back</span>
                            Continue shopping
                        </button>
                        <button
                            onClick={onCheckoutClick}
                            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:bg-gray-800 transition-colors"
                        >
                            Checkout
                            <span className="material-icons text-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
                    {/* Items */}
                    <div className="space-y-3">
                        {items.map(item => {
                            const maxStock = item.stock ?? Infinity;
                            const remaining = maxStock === Infinity ? null : Math.max((maxStock as number) - item.quantity, 0);
                            const maxed = maxStock !== Infinity && item.quantity >= (maxStock as number);
                            const barDenominator = item.stock && item.stock > 0 ? item.stock : 1;
                            const barPct = maxStock === Infinity ? 100 : Math.max((remaining ?? 0) / barDenominator * 100, 0);

                            return (
                                <div key={`${item.id}:${item.variant_id || 'default'}`} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex gap-4 hover:shadow-md transition-shadow">
                                    <div className="w-24 h-24 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                                        <img src={item.image} alt={item.title} className="w-full h-full object-contain" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="space-y-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug">{item.title}</h3>
                                                {item.badge && (
                                                    <span className="inline-flex px-2 py-1 text-[11px] font-semibold rounded-full bg-orange-50 text-orange-600 border border-orange-100">{item.badge}</span>
                                                )}
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <span className="material-icons text-base text-gray-400">storefront</span>
                                                    <span>Ships in 2-4 days</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {(() => {
                                                    const resultsInfo = convertedPromoItems.find(pi => pi.product.id === item.id);
                                                    const key = `${item.id}:${item.variant_id || 'default'}`;
                                                    const itemPriceDisplay = getConvertedPrice(`item-${key}`, item.price, item.currency || 'USD');
                                                    const discountedPriceDisplay = resultsInfo ? formatPrice(resultsInfo.convertedDiscountedPrice, preferredCurrency) : itemPriceDisplay;

                                                    return (
                                                        <>
                                                            <p className="font-bold text-lg text-gray-900">
                                                                {discountedPriceDisplay}
                                                            </p>
                                                            {resultsInfo?.appliedPromotions.map((promo, idx) => (
                                                                <p key={idx} className={`text-[10px] font-bold uppercase tracking-wider ${promo.type === 'quantity_discount' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                                                    {promo.description}
                                                                </p>
                                                            ))}
                                                            <p className="text-xs text-gray-500">per item</p>
                                                            {resultsInfo && resultsInfo.appliedPromotions.some(p => p.description.toLowerCase().includes('buy')) && (
                                                                <div className="mt-2">
                                                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                                        Item total: {formatPrice(resultsInfo.convertedTotal, preferredCurrency)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                                            <div className="flex items-center gap-2 bg-gray-50 rounded-full px-2 py-1 border border-gray-100">
                                                <button
                                                    onClick={() => onUpdateQuantity(item.id, -1, item.variant_id)}
                                                    className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-gray-300 disabled:opacity-50"
                                                    disabled={item.quantity <= 1}
                                                    aria-label="Decrease quantity"
                                                >
                                                    <span className="material-icons text-sm">remove</span>
                                                </button>
                                                <span className="font-semibold w-8 text-center text-gray-900">{item.quantity}</span>
                                                <button
                                                    onClick={() => onUpdateQuantity(item.id, 1, item.variant_id)}
                                                    className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-gray-300 disabled:opacity-50"
                                                    disabled={maxed}
                                                    aria-label="Increase quantity"
                                                >
                                                    <span className="material-icons text-sm">add</span>
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                                <button
                                                    onClick={() => onRemoveFromCart(item.id, item.variant_id)}
                                                    className="flex items-center gap-1 text-red-500 hover:text-red-600 font-semibold"
                                                >
                                                    <span className="material-icons text-base">delete_outline</span>
                                                    Remove
                                                </button>
                                            </div>
                                        </div>

                                        {item.stock !== undefined && (
                                            <div className="mt-3 space-y-1">
                                                <div className="flex items-center justify-between text-xs font-semibold">
                                                    <span className="text-gray-600">Vendor stock</span>
                                                    <span className={`${(remaining ?? 0) <= 3 ? 'text-red-600' : 'text-gray-700'}`}>
                                                        {(remaining ?? 0)} left
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${(remaining ?? 0) <= 3 ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}
                                                        style={{ width: `${barPct}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Summary */}
                    <div className="space-y-3">
                        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-lg">Order summary</h3>
                                <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-1">Secure</span>
                            </div>
                            <div className="space-y-3 text-sm text-gray-700">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatPrice(subtotal, preferredCurrency)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shipping</span>
                                    <span>{shipping === 0 ? 'Free' : formatPrice(shipping, preferredCurrency)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Items</span>
                                    <span>{cartItems.length}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-rose-600 font-medium">
                                        <span>Coupon Discount</span>
                                        <span>-{formatPrice(discount, preferredCurrency)}</span>
                                    </div>
                                )}
                                {bulkSavings > 0 && (
                                    <div className="flex justify-between text-emerald-600 font-medium">
                                        <span>Bulk Savings</span>
                                        <span>-{formatPrice(bulkSavings, preferredCurrency)}</span>
                                    </div>
                                )}
                                <div className="border-t pt-3 flex justify-between text-base font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>{formatPrice(finalTotal, preferredCurrency)}</span>
                                </div>
                            </div>

                            <div className="mt-4">
                                {discount > 0 && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center gap-2">
                                        <span className="material-icons text-emerald-600 text-sm">confirmation_number</span>
                                        <p className="text-xs font-bold text-emerald-700">
                                            Best coupon "{appliedCoupon?.code}" automatically applied!
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={onCheckoutClick}
                                className="w-full bg-black text-white py-3 rounded-full font-bold mt-5 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-md"
                            >
                                Proceed to checkout
                                <span className="material-icons text-sm">arrow_forward</span>
                            </button>

                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                                <span className="material-icons text-sm">lock</span>
                                <span>256-bit encrypted checkout</span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <span className="material-icons text-2xl">local_shipping</span>
                                <div className="space-y-1">
                                    <p className="font-semibold text-sm">Free express shipping over {formatPrice(shippingThreshold, preferredCurrency)}</p>
                                    <p className="text-xs opacity-90">You're {formatPrice(Math.max(0, shippingThreshold - subtotal), preferredCurrency)} away from free delivery.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartView;
