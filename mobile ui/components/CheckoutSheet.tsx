import React, { useMemo, useState, useEffect } from 'react';
import { Product, UserCoupon, AppliedCoupon } from '@/types';
import { applyPromotionsToCart, PromotionsResult } from '@/lib/promotions';
import { fetchUserCoupons, applyCoupon, checkout, fetchCartDeliveryFee, syncCart } from '@/lib/api';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CheckoutSheetProps {
  items: CartItem[];
  userId?: string;
  onClose: () => void;
  onPlaceOrder: (options?: { couponCode?: string | null }) => void;
}

const formatPrice = (value: number, currency?: string) => {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    return `${currency ? currency + ' ' : ''}${value.toFixed(2)}`;
  }
};

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({ items, userId, onClose, onPlaceOrder }) => {
  const [shipping, setShipping] = useState<'standard' | 'express'>('standard');
  const [payment, setPayment] = useState<'card' | 'mpesa' | 'cod' | 'wallet'>('card');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<'home' | 'new'>('home');
  const [promoResult, setPromoResult] = useState<PromotionsResult | null>(null);

  const [addressData, setAddressData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    postcode: '',
    addressLine1: '',
    townCity: '',
    county: '',
    country: 'Kenya',
  });

  const [deliveryFee, setDeliveryFee] = useState(0);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [hasAttemptedAutoApply, setHasAttemptedAutoApply] = useState(false);

  useEffect(() => {
    const applyPromos = async () => {
      const result = await applyPromotionsToCart(items);
      setPromoResult(result);
    };
    applyPromos();
  }, [items]);

  useEffect(() => {
    const getDeliveryFee = async () => {
      if (userId) {
        const fee = await fetchCartDeliveryFee(userId, shipping === 'express');
        setDeliveryFee(fee);
      }
    };
    getDeliveryFee();
  }, [userId, shipping, items]);

  // Auto-apply best coupon
  useEffect(() => {
    const autoApplyBestCoupon = async () => {
      if (!userId || items.length === 0 || hasAttemptedAutoApply || appliedCoupon) return;

      try {
        setHasAttemptedAutoApply(true);
        const userCoupons = await fetchUserCoupons(userId);

        // Filter for active and unused coupons
        const activeCoupons = userCoupons.filter(uc =>
          !uc.used_at &&
          uc.coupon.status === 'Ongoing' &&
          new Date(uc.coupon.end_time) > new Date()
        );

        if (activeCoupons.length === 0) return;

        const currentSubtotal = promoResult?.subtotal || items.reduce((sum, line) => sum + (line.product.price || 0) * line.quantity, 0);

        let bestCoupon = null;
        let maxDiscount = 0;

        for (const uc of activeCoupons) {
          let potentialDiscount = 0;
          if (uc.coupon.discount_amount) {
            potentialDiscount = uc.coupon.discount_amount;
          } else if (uc.coupon.discount_percentage) {
            potentialDiscount = (currentSubtotal * uc.coupon.discount_percentage) / 100;
          }

          if (potentialDiscount > maxDiscount) {
            maxDiscount = potentialDiscount;
            bestCoupon = uc.coupon;
          }
        }

        if (bestCoupon) {
          handleApplyCoupon(bestCoupon.code);
        }
      } catch (err) {
        console.error('Failed to auto-apply coupon:', err);
      }
    };

    if (promoResult) {
      autoApplyBestCoupon();
    }
  }, [userId, items, promoResult, hasAttemptedAutoApply]);

  const handleApplyCoupon = async (code: string) => {
    if (!code) return;
    setIsApplying(true);
    setCouponError(null);

    try {
      const productIds = items.map(item => item.product.id.toString());
      const result = await applyCoupon(code, productIds, userId);

      if (result.success && result.coupon) {
        setAppliedCoupon(result.coupon);
        setCouponCode(result.coupon.code);

        const currentSubtotal = promoResult?.subtotal || items.reduce((sum, line) => sum + (line.product.price || 0) * line.quantity, 0);
        let disc = 0;
        if (result.coupon.type === 'fixed') {
          disc = result.coupon.discount_amount || 0;
        } else if (result.coupon.type === 'percentage') {
          disc = (currentSubtotal * (result.coupon.discount_percentage || 0)) / 100;
        }
        setDiscountAmount(disc);
      } else {
        setCouponError(result.message);
      }
    } catch (err) {
      setCouponError('Failed to apply coupon');
    } finally {
      setIsApplying(false);
    }
  };


  const currency = items[0]?.product.currency;

  const subtotal = useMemo(
    () => promoResult?.subtotal || items.reduce((sum, line) => sum + (line.product.price || 0) * line.quantity, 0),
    [items, promoResult]
  );

  const totalSavings = promoResult?.totalSavings || 0;
  const fees = 0; // placeholder for taxes/fees if needed
  const total = Math.max(0, (promoResult?.finalTotal || subtotal) - discountAmount) + deliveryFee + fees;

  const handlePlaceOrder = async () => {
    if (!userId) {
      alert('Please sign in to place order');
      return;
    }

    if (payment === 'mpesa' && !mpesaPhone) {
      alert('Please enter M-Pesa phone number');
      return;
    }

    if (selectedAddress === 'new') {
      const { firstName, lastName, addressLine1, townCity, postcode } = addressData;
      if (!firstName || !lastName || !addressLine1 || !townCity || !postcode) {
        alert('Please fill in all required address fields');
        return;
      }
    }

    try {
      // Sync cart items to database before checkout
      const flatItems: Product[] = [];
      items.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          flatItems.push(item.product);
        }
      });

      const syncSuccess = await syncCart(userId, flatItems);
      if (!syncSuccess) {
        alert('Failed to synchronize cart. Please try again.');
        return;
      }

      // For demo purposes, we'll assume "home" is already saved. 
      // In a real app, you'd fetch this from the user's profile.
      const shippingDetails = selectedAddress === 'home'
        ? {
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '254712345678',
          addressLine1: '123 Market Street',
          postcode: '00100',
          townCity: 'Nairobi',
          county: 'Nairobi',
          country: 'Kenya'
        }
        : addressData;

      const orderId = await checkout(
        userId,
        payment === 'mpesa' ? 'M-Pesa' : payment.toUpperCase(),
        {
          ...shippingDetails,
          phoneNumber: payment === 'mpesa' ? mpesaPhone : shippingDetails.phoneNumber,
        },
        {
          couponCode: appliedCoupon?.code,
          expressDelivery: shipping === 'express',
        }
      );

      if (orderId) {
        onPlaceOrder({ couponCode: appliedCoupon?.code });
      } else {
        alert('Failed to place order. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error placing order');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-white dark:bg-surface-dark rounded-t-3xl shadow-2xl border-t border-gray-200 dark:border-gray-800 max-h-[85vh] overflow-hidden">
        {/* Drag handle / header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto" />
          <button aria-label="Close" className="absolute right-4 top-3 text-gray-500" onClick={onClose}>
            <span className="material-icons-outlined text-xl">close</span>
          </button>
        </div>

        <div className="px-4 pb-4 pt-1 overflow-y-auto space-y-4">
          {/* Address */}
          <section className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-primary">location_on</span>
                <h3 className="text-sm font-bold text-black dark:text-white">Delivery address</h3>
              </div>
              <button className="text-xs font-semibold text-primary" onClick={() => setSelectedAddress('new')}>Change</button>
            </div>
            <div className="space-y-2">
              <label className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${selectedAddress === 'home' ? 'border-primary bg-orange-50/50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'}`}>
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddress === 'home'}
                  onChange={() => setSelectedAddress('home')}
                  className="text-primary focus:ring-primary"
                />
                <div className="text-xs text-gray-700 dark:text-gray-200">
                  <div className="font-bold">Home</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">123 Market Street, Suite 4, Nairobi</div>
                </div>
              </label>

              <label className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${selectedAddress === 'new' ? 'border-primary bg-orange-50/50 dark:bg-gray-800' : 'border-dashed border-gray-300 dark:border-gray-700'}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddress === 'new'}
                    onChange={() => setSelectedAddress('new')}
                    className="text-primary focus:ring-primary"
                  />
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-200">Add a new address</div>
                </div>

                {selectedAddress === 'new' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      placeholder="First Name"
                      className="col-span-1 p-2 text-[11px] border rounded-lg dark:bg-gray-900 border-gray-200 dark:border-gray-700 dark:text-white"
                      value={addressData.firstName}
                      onChange={(e) => setAddressData({ ...addressData, firstName: e.target.value })}
                    />
                    <input
                      placeholder="Last Name"
                      className="col-span-1 p-2 text-[11px] border rounded-lg dark:bg-gray-900 border-gray-200 dark:border-gray-700 dark:text-white"
                      value={addressData.lastName}
                      onChange={(e) => setAddressData({ ...addressData, lastName: e.target.value })}
                    />
                    <input
                      placeholder="Address Line 1"
                      className="col-span-2 p-2 text-[11px] border rounded-lg dark:bg-gray-900 border-gray-200 dark:border-gray-700 dark:text-white"
                      value={addressData.addressLine1}
                      onChange={(e) => setAddressData({ ...addressData, addressLine1: e.target.value })}
                    />
                    <input
                      placeholder="Town / City"
                      className="col-span-1 p-2 text-[11px] border rounded-lg dark:bg-gray-900 border-gray-200 dark:border-gray-700 dark:text-white"
                      value={addressData.townCity}
                      onChange={(e) => setAddressData({ ...addressData, townCity: e.target.value })}
                    />
                    <input
                      placeholder="Postcode"
                      className="col-span-1 p-2 text-[11px] border rounded-lg dark:bg-gray-900 border-gray-200 dark:border-gray-700 dark:text-white"
                      value={addressData.postcode}
                      onChange={(e) => setAddressData({ ...addressData, postcode: e.target.value })}
                    />
                  </div>
                )}
              </label>
            </div>
          </section>

          {/* Items summary */}
          <section className="bg-white dark:bg-gray-900/30 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-black dark:text-white">Order summary</h3>
              <span className="text-xs text-gray-500">{items.reduce((s, i) => s + i.quantity, 0)} items</span>
            </div>
            <div className="space-y-3">
              {items.map((line) => (
                <div key={line.product.id} className="flex gap-3 items-start">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={line.product.image} alt={line.product.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-black dark:text-white line-clamp-2">{line.product.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Qty {line.quantity}</div>
                  </div>
                  <div className="text-xs font-bold text-black dark:text-white whitespace-nowrap flex flex-col items-end">
                    {(() => {
                      const resultInfo = promoResult?.items.find(pi => pi.product.id === line.product.id);
                      return (
                        <>
                          <div className={resultInfo && resultInfo.total < (line.product.price || 0) * line.quantity ? 'text-emerald-600' : ''}>
                            {formatPrice(resultInfo ? resultInfo.total : (line.product.price || 0) * line.quantity, currency)}
                          </div>
                          {resultInfo && resultInfo.total < (line.product.price || 0) * line.quantity && (
                            <div className="text-[9px] text-gray-400 line-through">
                              {formatPrice((resultInfo.originalPrice || line.product.price || 0) * line.quantity, currency)}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Shipping */}
          <section className="bg-white dark:bg-gray-900/30 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-black dark:text-white mb-2">Delivery speed</h3>
            <div className="grid grid-cols-2 gap-2">
              {[{ key: 'standard', label: 'Standard (3-5d)', price: 0 }, { key: 'express', label: 'Express (1-2d)', price: 6.99 }].map((opt) => (
                <button
                  key={opt.key}
                  className={`rounded-2xl border p-3 text-left text-xs font-semibold transition-all ${shipping === opt.key ? 'border-primary bg-orange-50/50 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'}`}
                  onClick={() => setShipping(opt.key as 'standard' | 'express')}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt.label}</span>
                    {shipping === opt.key && <span className="material-icons-outlined text-[14px]">check_circle</span>}
                  </div>
                  <div className="text-[11px] font-bold mt-1 text-gray-500">{opt.price === 0 ? 'Free' : formatPrice(opt.price, currency)}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Payment */}
          <section className="bg-white dark:bg-gray-900/30 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-black dark:text-white mb-2">Payment</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'card', label: 'Card' },
                { key: 'mpesa', label: 'M-Pesa' },
                { key: 'wallet', label: 'Wallet' },
                { key: 'cod', label: 'Cash' }
              ].map((opt) => (
                <button
                  key={opt.key}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${payment === opt.key ? 'border-primary bg-orange-50/50 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'}`}
                  onClick={() => setPayment(opt.key as any)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {payment === 'mpesa' && (
              <div className="mt-3 space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">M-Pesa Phone Number</label>
                <input
                  placeholder="2547XXXXXXXX"
                  className="w-full p-3 text-xs border rounded-xl dark:bg-gray-900 border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:border-primary transition-all"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                />
                <p className="text-[9px] text-gray-400">Payment request will be sent to this number.</p>
              </div>
            )}
            <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {payment === 'cod' ? 'Pay on delivery available for eligible orders.' : payment === 'mpesa' ? 'Mobile money payments are fast and secure.' : 'Cards and wallets are processed securely with 3D Secure.'}
            </div>
          </section>

          {/* Coupons Savings Display */}
          {discountAmount > 0 && (
            <section className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-sm">confirmation_number</span>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Best coupon "{appliedCoupon?.code}" automatically applied!
                </div>
              </div>
            </section>
          )}
          {couponError && <div className="text-[10px] text-red-500 mt-1 px-4 font-medium">{couponError}</div>}

          {/* Totals */}
          <section className="bg-white dark:bg-gray-900/30 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-lg font-black text-black dark:text-white">
              <span>Total</span>
              <span>{formatPrice(total, currency)}</span>
            </div>
            {totalSavings > 0 && (
              <div className="text-right text-[10px] text-indigo-600 font-bold mt-0.5">
                Total savings: {formatPrice(totalSavings, currency)}
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>Shipping</span>
              <span className={deliveryFee === 0 ? 'text-green-600 font-bold' : 'font-bold'}>
                {deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-indigo-600 font-bold">
                <span>Coupon discount</span>
                <span>-{formatPrice(discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>Fees & taxes</span>
              <span>{formatPrice(fees, currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-black dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Total</span>
              <span>{formatPrice(total, currency)}</span>
            </div>
            <button
              className="w-full bg-primary hover:bg-orange-600 text-white font-black rounded-full py-4 text-sm shadow-xl shadow-primary/20 transition-all active:scale-[0.98] mt-2 group"
              onClick={handlePlaceOrder}
            >
              <div className="flex items-center justify-center gap-2">
                <span>Place order ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                <span className="material-icons-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSheet;
