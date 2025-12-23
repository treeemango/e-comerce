import React, { useMemo, useState, useEffect } from 'react';
import { Product, UserCoupon, AppliedCoupon } from '@/types';
import { applyPromotionsToCart, PromotionsResult } from '@/lib/promotions';
import { fetchUserCoupons, applyCoupon, checkout, fetchCartDeliveryFee, syncCart, fetchUserAddresses, UserAddress, fetchTaxBreakdown, TaxBreakdown } from '@/lib/api';

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

const getEstimatedDelivery = (isExpress: boolean) => {
  const date = new Date();
  const minDays = isExpress ? 1 : 3;
  const maxDays = isExpress ? 2 : 5;

  const minDate = new Date(date);
  minDate.setDate(date.getDate() + minDays);

  const maxDate = new Date(date);
  maxDate.setDate(date.getDate() + maxDays);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${minDate.toLocaleDateString(undefined, options)} - ${maxDate.toLocaleDateString(undefined, options)}`;
};

type CheckoutStep = 'shipping' | 'payment' | 'review';

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({ items, userId, onClose, onPlaceOrder }) => {
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [isGuest, setIsGuest] = useState(!userId);
  const [shipping, setShipping] = useState<'standard' | 'express'>('standard');
  const [payment, setPayment] = useState<'card' | 'mpesa' | 'cod' | 'wallet'>('card');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [promoResult, setPromoResult] = useState<PromotionsResult | null>(null);

  const [addressData, setAddressData] = useState({
    firstName: '',
    lastName: '',
    email: '',
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
  const [townSuggestions, setTownSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [taxInfo, setTaxInfo] = useState<TaxBreakdown | null>(null);

  const KENYAN_TOWNS = [
    'Nairobi - CBD', 'Nairobi - Westlands', 'Nairobi - Kilimani', 'Nairobi - Lavington', 'Nairobi - Karen',
    'Nairobi - South C', 'Nairobi - South B', 'Nairobi - Embakasi', 'Nairobi - Roysambu', 'Nairobi - Kasarani',
    'Nairobi - Langata', 'Nairobi - Ruai', 'Mombasa - Nyali', 'Mombasa - Bamburi', 'Mombasa - CBD',
    'Kisumu - Milimani', 'Kisumu - CBD', 'Nakuru - Milimani', 'Eldoret', 'Thika', 'Ruiru', 'Kiambu',
    'Machakos', 'Naivasha', 'Nanyuki', 'Kitale', 'Malindi', 'Diani', 'Kericho', 'Kisii'
  ];

  const COUNTRIES = [
    { code: 'DZ', name: 'Algeria' },
    { code: 'AO', name: 'Angola' },
    { code: 'BJ', name: 'Benin' },
    { code: 'BW', name: 'Botswana' },
    { code: 'BF', name: 'Burkina Faso' },
    { code: 'BI', name: 'Burundi' },
    { code: 'CV', name: 'Cabo Verde' },
    { code: 'CM', name: 'Cameroon' },
    { code: 'CF', name: 'Central African Republic' },
    { code: 'TD', name: 'Chad' },
    { code: 'KM', name: 'Comoros' },
    { code: 'CG', name: 'Congo-Brazzaville' },
    { code: 'CD', name: 'Congo-Kinshasa' },
    { code: 'DJ', name: 'Djibouti' },
    { code: 'EG', name: 'Egypt' },
    { code: 'GQ', name: 'Equatorial Guinea' },
    { code: 'ER', name: 'Eritrea' },
    { code: 'SZ', name: 'Eswatini' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'GA', name: 'Gabon' },
    { code: 'GM', name: 'Gambia' },
    { code: 'GH', name: 'Ghana' },
    { code: 'GN', name: 'Guinea' },
    { code: 'GW', name: 'Guinea-Bissau' },
    { code: 'CI', name: 'Ivory Coast' },
    { code: 'KE', name: 'Kenya' },
    { code: 'LS', name: 'Lesotho' },
    { code: 'LR', name: 'Liberia' },
    { code: 'LY', name: 'Libya' },
    { code: 'MG', name: 'Madagascar' },
    { code: 'MW', name: 'Malawi' },
    { code: 'ML', name: 'Mali' },
    { code: 'MR', name: 'Mauritania' },
    { code: 'MU', name: 'Mauritius' },
    { code: 'MA', name: 'Morocco' },
    { code: 'MZ', name: 'Mozambique' },
    { code: 'NA', name: 'Namibia' },
    { code: 'NE', name: 'Niger' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'ST', name: 'Sao Tome and Principe' },
    { code: 'SN', name: 'Senegal' },
    { code: 'SC', name: 'Seychelles' },
    { code: 'SL', name: 'Sierra Leone' },
    { code: 'SO', name: 'Somalia' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'SS', name: 'South Sudan' },
    { code: 'SD', name: 'Sudan' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'TG', name: 'Togo' },
    { code: 'TN', name: 'Tunisia' },
    { code: 'UG', name: 'Uganda' },
    { code: 'ZM', name: 'Zambia' },
    { code: 'ZW', name: 'Zimbabwe' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'US', name: 'United States' },
  ];

  useEffect(() => {
    if (userId) {
      fetchUserAddresses(userId).then(addresses => {
        setSavedAddresses(addresses);
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setAddressData({
            firstName: defaultAddr.first_name,
            lastName: defaultAddr.last_name,
            email: '',
            phoneNumber: defaultAddr.phone_number,
            postcode: defaultAddr.postcode,
            addressLine1: defaultAddr.address_line1,
            townCity: defaultAddr.town_city,
            county: defaultAddr.county,
            country: defaultAddr.country,
          });
        }
      });
    }
  }, [userId]);

  useEffect(() => {
    const applyPromos = async () => {
      const result = await applyPromotionsToCart(items);
      setPromoResult(result);
    };
    applyPromos();
  }, [items]);

  useEffect(() => {
    const getDeliveryFee = async () => {
      const fee = await fetchCartDeliveryFee(userId || null, shipping === 'express');
      setDeliveryFee(fee);
    };
    getDeliveryFee();
  }, [userId, shipping, items]);

  useEffect(() => {
    const autoApplyBestCoupon = async () => {
      if (!userId || items.length === 0 || hasAttemptedAutoApply || appliedCoupon) return;

      try {
        setHasAttemptedAutoApply(true);
        const userCoupons = await fetchUserCoupons(userId);

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
        setCouponError(result.message || 'Invalid coupon');
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

  // Fetch dynamic tax breakdown when country or amounts change
  useEffect(() => {
    const getTaxInfo = async () => {
      const taxableSubtotal = Math.max(0, subtotal - totalSavings - discountAmount);
      const tax = await fetchTaxBreakdown(taxableSubtotal, deliveryFee, addressData.country);
      setTaxInfo(tax);
    };
    if (subtotal > 0) {
      getTaxInfo();
    }
  }, [subtotal, deliveryFee, totalSavings, discountAmount, addressData.country]);

  // Use dynamic tax from API, fallback to 16% if unavailable
  const taxes = taxInfo?.tax_amount ?? ((subtotal + deliveryFee - totalSavings - discountAmount) * 0.16);
  const taxName = taxInfo?.tax_name ?? 'VAT';
  const taxPercentage = taxInfo?.tax_percentage ?? 16;
  const total = Math.max(0, (promoResult?.finalTotal || subtotal) - discountAmount) + deliveryFee + taxes;

  const handlePlaceOrder = async () => {
    if (payment === 'mpesa' && !mpesaPhone) {
      alert('Please enter M-Pesa phone number');
      return;
    }

    try {
      const flatItems: Product[] = [];
      items.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          flatItems.push(item.product);
        }
      });

      const syncSuccess = await syncCart(userId || null, flatItems);
      if (!syncSuccess) {
        alert('Failed to synchronize cart.');
        return;
      }

      const orderId = await checkout(
        userId || null,
        payment === 'mpesa' ? 'M-Pesa' : payment.toUpperCase(),
        {
          ...addressData,
          phoneNumber: payment === 'mpesa' ? mpesaPhone : addressData.phoneNumber,
        },
        {
          couponCode: appliedCoupon?.code,
          expressDelivery: shipping === 'express',
        }
      );

      if (orderId) {
        onPlaceOrder({ couponCode: appliedCoupon?.code });
      } else {
        alert('Order failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error placing order');
    }
  };

  const handleAddressSelect = (id: string) => {
    setSelectedAddressId(id);
    const addr = savedAddresses.find(a => a.id === id);
    if (addr) {
      setAddressData({
        firstName: addr.first_name,
        lastName: addr.last_name,
        email: addressData.email,
        phoneNumber: addr.phone_number,
        postcode: addr.postcode,
        addressLine1: addr.address_line1,
        townCity: addr.town_city,
        county: addr.county,
        country: addr.country,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-white dark:bg-surface-dark rounded-t-[2.5rem] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header with Progress */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-black dark:text-white">Checkout</h2>
            <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <span className="material-icons-outlined text-sm">close</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map(i => {
              const isActive = (step === 'shipping' && i === 1) || (step === 'payment' && i === 2) || (step === 'review' && i === 3);
              const isDone = (step === 'payment' && i < 2) || (step === 'review' && i < 3);
              return (
                <React.Fragment key={i}>
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${isActive ? 'bg-primary' : isDone ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-800'}`} />
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* Step 1: Shipping */}
          {step === 'shipping' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {userId && savedAddresses.length > 0 && (
                <section>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Saved Addresses</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {savedAddresses.map(addr => (
                      <div
                        key={addr.id}
                        onClick={() => handleAddressSelect(addr.id)}
                        className={`flex-shrink-0 w-48 p-3 rounded-2xl border-2 transition-all ${selectedAddressId === addr.id ? 'border-primary bg-orange-50 dark:bg-gray-900' : 'border-gray-100 dark:border-gray-800'}`}
                      >
                        <p className="text-xs font-bold truncate">{addr.first_name} {addr.last_name}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-2 mt-1">{addr.address_line1}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{addr.town_city}</p>
                      </div>
                    ))}
                    <div
                      onClick={() => { setSelectedAddressId('new'); setAddressData({ ...addressData, addressLine1: '', postcode: '', townCity: '' }) }}
                      className={`flex-shrink-0 w-48 p-3 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-gray-400 ${selectedAddressId === 'new' ? 'border-primary bg-orange-50 text-primary' : 'border-gray-200 dark:border-gray-800'}`}
                    >
                      <span className="material-icons text-lg mb-1">add</span>
                      <span className="text-[10px] font-bold">Add New</span>
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Delivery Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="First Name" value={addressData.firstName} onChange={e => setAddressData({ ...addressData, firstName: e.target.value })} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-0 text-sm" />
                  <input placeholder="Last Name" value={addressData.lastName} onChange={e => setAddressData({ ...addressData, lastName: e.target.value })} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-0 text-sm" />
                </div>
                {(isGuest || !userId) && (
                  <input placeholder="Email Address" value={addressData.email} onChange={e => setAddressData({ ...addressData, email: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-0 text-sm" />
                )}
                <input placeholder="Phone Number" value={addressData.phoneNumber} onChange={e => setAddressData({ ...addressData, phoneNumber: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-0 text-sm" />
                <input placeholder="Shipping Address" value={addressData.addressLine1} onChange={e => setAddressData({ ...addressData, addressLine1: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-0 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      placeholder="Town / City"
                      value={addressData.townCity}
                      onChange={e => {
                        const val = e.target.value;
                        setAddressData({ ...addressData, townCity: val });
                        if (val.length > 1) {
                          const filtered = KENYAN_TOWNS.filter(t => t.toLowerCase().includes(val.toLowerCase()));
                          setTownSuggestions(filtered);
                          setShowSuggestions(true);
                        } else {
                          setShowSuggestions(false);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-0 text-sm"
                    />
                    {showSuggestions && townSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl max-h-48 overflow-auto">
                        {townSuggestions.map(town => (
                          <div
                            key={town}
                            className="px-4 py-3 hover:bg-orange-50 dark:hover:bg-gray-900 text-xs font-medium dark:text-white border-b border-gray-50 dark:border-gray-800 last:border-0"
                            onClick={() => {
                              setAddressData({ ...addressData, townCity: town });
                              setShowSuggestions(false);
                            }}
                          >
                            {town}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input placeholder="Postcode" value={addressData.postcode} onChange={e => setAddressData({ ...addressData, postcode: e.target.value })} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-0 text-sm" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Country</label>
                  <select
                    value={addressData.country}
                    onChange={e => setAddressData({ ...addressData, country: e.target.value })}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-0 text-sm dark:text-white"
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-1">Tax calculated based on country</p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Shipping Method</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div
                    onClick={() => setShipping('standard')}
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${shipping === 'standard' ? 'border-primary bg-orange-50 dark:bg-gray-900' : 'border-gray-100 dark:border-gray-800'}`}
                  >
                    <div>
                      <p className="text-sm font-bold">Standard Delivery</p>
                      <p className="text-[10px] text-gray-500">Est. {getEstimatedDelivery(false)}</p>
                    </div>
                    <p className="text-sm font-black text-green-600">FREE</p>
                  </div>
                  <div
                    onClick={() => setShipping('express')}
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${shipping === 'express' ? 'border-primary bg-orange-50 dark:bg-gray-900' : 'border-gray-100 dark:border-gray-800'}`}
                  >
                    <div>
                      <p className="text-sm font-bold">Express Delivery</p>
                      <p className="text-[10px] text-gray-500">Est. {getEstimatedDelivery(true)}</p>
                    </div>
                    <p className="text-sm font-black text-primary">{formatPrice(6.99, currency)}</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 'payment' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Select Payment Method</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'card', label: 'Credit / Debit Card', icon: 'credit_card', color: 'blue' },
                    { id: 'mpesa', label: 'M-Pesa Mobile Money', icon: 'phone_android', color: 'green' },
                    { id: 'wallet', label: 'User Wallet', icon: 'account_balance_wallet', color: 'orange' },
                    { id: 'cod', label: 'Cash on Delivery', icon: 'payments', color: 'gray' }
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setPayment(opt.id as any)}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${payment === opt.id ? 'border-primary bg-orange-50 dark:bg-gray-900' : 'border-gray-100 dark:border-gray-800'}`}
                    >
                      <span className={`material-icons-outlined text-${opt.color}-500`}>{opt.icon}</span>
                      <span className="text-sm font-bold flex-1">{opt.label}</span>
                      {payment === opt.id && <span className="material-icons-outlined text-primary text-sm">check_circle</span>}
                    </div>
                  ))}
                </div>
              </section>

              {payment === 'mpesa' && (
                <section className="animate-in fade-in">
                  <h3 className="text-[10px] font-black uppercase text-gray-400 mb-2">M-Pesa Number</h3>
                  <input placeholder="254..." value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-0 text-sm font-bold" />
                </section>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <section className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-3xl space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Order Summary</h3>
                  <span className="text-xs font-bold text-primary">{items.length} items</span>
                </div>
                {items.slice(0, 3).map(item => (
                  <div key={item.product.id} className="flex gap-3">
                    <img src={item.product.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold line-clamp-1">{item.product.title}</p>
                      <p className="text-[9px] text-gray-500">Qty {item.quantity}</p>
                    </div>
                  </div>
                ))}
                {items.length > 3 && <p className="text-[10px] text-gray-400 text-center font-bold">+ {items.length - 3} more items</p>}
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl">
                  <span className="material-icons text-blue-500">local_shipping</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold">Delivery to {addressData.townCity}</p>
                    <p className="text-[10px] text-gray-500">Scheduled: {getEstimatedDelivery(shipping === 'express')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50/50 dark:bg-green-900/20 rounded-2xl">
                  <span className="material-icons text-green-500">verified_user</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold">Payment via {payment.toUpperCase()}</p>
                    <p className="text-[10px] text-gray-500">SSL Encrypted Transaction</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-indigo-600 font-bold">
                <span>Coupon Applied</span>
                <span>-{formatPrice(discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-500">
              <span>{taxName} ({taxPercentage}%)</span>
              <span>{formatPrice(taxes, currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-black dark:text-white pt-2 border-t border-gray-50 dark:border-gray-800">
              <span>Total Amount</span>
              <span className="text-primary text-lg">{formatPrice(total, currency)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (step === 'shipping') setStep('payment');
              else if (step === 'payment') setStep('review');
              else handlePlaceOrder();
            }}
            className="w-full bg-primary py-4 rounded-full font-black text-white shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group transition-all active:scale-[0.98]"
          >
            <span>{step === 'review' ? 'Place Order Now' : 'Continue'}</span>
            <span className="material-icons text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>

          {step !== 'shipping' && (
            <button onClick={() => {
              if (step === 'payment') setStep('shipping');
              if (step === 'review') setStep('payment');
            }} className="w-full mt-3 py-2 text-xs font-bold text-gray-400">Go Back</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutSheet;

