import React, { useMemo, useState, useEffect } from 'react';
import { CouponApplicationResult, Product } from '../types';
import { applyCoupon, checkout, fetchUserCoupons, fetchCartDeliveryFee, syncCart, fetchUserAddresses, UserAddress, fetchTaxBreakdown, TaxBreakdown } from '../lib/api';
import { getCurrencySymbol, useCurrencyConverter, formatPrice } from '@/lib/currency';

import { applyPromotionsToCart, PromotionsResult } from '@/lib/promotions';
import { logistics } from '../lib/logistics-service';
import { ShippingRate } from '../lib/logistics-types';

interface CheckoutViewProps {
    cartItems: Product[];
    totalAmount: number;
    onCheckoutComplete: (orderId: string, email?: string) => void;
    userId?: string;
}

type CheckoutStep = 'shipping' | 'payment' | 'review';

const CheckoutView: React.FC<CheckoutViewProps> = ({ cartItems, totalAmount, onCheckoutComplete, userId }) => {
    const [step, setStep] = useState<CheckoutStep>('shipping');
    const [isGuest, setIsGuest] = useState(!userId);
    const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');

    const [formData, setFormData] = useState({
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

    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        expiry: '',
        cvv: '',
    });

    const [paymentMethod, setPaymentMethod] = useState<'Card' | 'M-Pesa' | 'PayPal' | 'Apple Pay' | 'Google Pay'>('Card');
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [isExpress, setIsExpress] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(0);

    const [appliedCoupon, setAppliedCoupon] = useState<CouponApplicationResult['coupon'] | null>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<'cart_empty' | 'stock' | 'payment' | 'sync' | 'generic' | null>(null);
    const [promoResult, setPromoResult] = useState<PromotionsResult | null>(null);
    const [hasAttemptedAutoApply, setHasAttemptedAutoApply] = useState(false);
    const [townSuggestions, setTownSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [taxInfo, setTaxInfo] = useState<TaxBreakdown | null>(null);

    // Logistics state
    const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
    const [isFetchingRates, setIsFetchingRates] = useState(false);
    const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);

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
                    setFormData({
                        firstName: defaultAddr.first_name,
                        lastName: defaultAddr.last_name,
                        email: '', // Email not in address table usually
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

    const groupedItems = useMemo(() => {
        return cartItems.reduce((acc, item) => {
            const key = `${item.id}-${item.variant_id || 'default'}`;
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
            const fee = await fetchCartDeliveryFee(userId || null, isExpress);
            setDeliveryFee(fee);
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

    // Fetch real-time shipping rates when address changes
    useEffect(() => {
        const fetchRates = async () => {
            // Only fetch if basic destination info is present
            if (!formData.country || !formData.townCity || items.length === 0) return;

            setIsFetchingRates(true);
            try {
                // Destination address from form
                const destinationAddress = {
                    name: `${formData.firstName} ${formData.lastName}`.trim() || 'Guest Customer',
                    phone: formData.phoneNumber || '0000000000',
                    email: formData.email,
                    street_address: formData.addressLine1 || 'Pending Address',
                    city: formData.townCity,
                    country_code: COUNTRIES.find(c => c.name === formData.country)?.code || 'KE',
                    postal_code: formData.postcode
                };

                // Source address placeholder (In production, this could be per-vendor)
                const sourceAddress = {
                    name: 'JuaExpress Warehouse',
                    phone: '+254700000000',
                    street_address: 'Industrial Area',
                    city: 'Nairobi',
                    country_code: 'KE'
                };

                // Calculate package info
                const parcels = [
                    {
                        weight: items.reduce((sum, item) => sum + (item.quantity * 0.5), 0),
                        length: 20,
                        width: 15,
                        height: 10
                    }
                ];

                const rates = await logistics.getAllRates({
                    origin: sourceAddress,
                    destination: destinationAddress,
                    parcels: parcels
                });

                setShippingRates(rates);
                // Selection logic: persist selection if possible, else pick standard
                if (rates.length > 0) {
                    const match = selectedRate ? rates.find(r => r.service_code === selectedRate.service_code) : null;
                    if (!match) setSelectedRate(rates[0]);
                }
            } catch (err) {
                console.error('Error fetching shipping rates:', err);
            } finally {
                setIsFetchingRates(false);
            }
        };

        const timeoutId = setTimeout(fetchRates, 1000); // 1s debounce
        return () => clearTimeout(timeoutId);
    }, [formData.country, formData.townCity, formData.addressLine1, items.length]);


    const bulkSavings = promoResult ? promoResult.totalSavings : 0;

    // Fetch dynamic tax breakdown when country or amounts change
    useEffect(() => {
        const getTaxInfo = async () => {
            const taxableSubtotal = Math.max(0, subtotal - bulkSavings - discountAmount);
            const tax = await fetchTaxBreakdown(taxableSubtotal, deliveryFee, formData.country);
            setTaxInfo(tax);
        };
        if (subtotal > 0) {
            getTaxInfo();
        }
    }, [subtotal, deliveryFee, bulkSavings, discountAmount, formData.country]);

    // Use dynamic tax from API, fallback to 16% if unavailable
    const taxAmount = taxInfo?.tax_amount ?? ((subtotal + deliveryFee - bulkSavings - discountAmount) * 0.16);
    const taxName = taxInfo?.tax_name ?? 'VAT';
    const taxPercentage = taxInfo?.tax_percentage ?? 16;

    // --- CURRENCY CONVERSION ---
    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];
        const baseCurrency = items[0]?.currency || 'USD';

        // Items
        items.forEach(item => {
            const key = `${item.id}:${item.variant_id || 'default'}`;
            vals.push({ id: `item-${key}`, amount: item.price, currency: item.currency || 'USD' });
        });

        // Totals
        // Use real-time rate if selected, otherwise fallback to legacy deliveryFee
        const actualDeliveryFee = selectedRate ? selectedRate.rate_amount : deliveryFee;
        vals.push({ id: 'delivery-fee', amount: actualDeliveryFee, currency: selectedRate?.currency || baseCurrency });

        vals.push({ id: 'tax-amount', amount: taxAmount, currency: baseCurrency });
        vals.push({ id: 'discount-amount', amount: discountAmount, currency: baseCurrency });
        vals.push({ id: 'bulk-savings', amount: bulkSavings, currency: baseCurrency });
        vals.push({ id: 'subtotal-summary', amount: subtotal, currency: baseCurrency });

        return vals;
    }, [items, deliveryFee, selectedRate, taxAmount, discountAmount, bulkSavings, subtotal]);

    const { convertedValues, preferredCurrency } = useCurrencyConverter(priceValues);

    const getConvertedAmount = (id: string, fallback: number) => {
        return convertedValues[id]?.convertedAmount ?? fallback;
    };

    const getConvertedPriceStr = (id: string, fallback: number, currency: string) => {
        return convertedValues[id]?.converted ?? formatPrice(fallback, currency);
    };

    const getConvertedSummaryPriceStr = (id: string, fallback: number) => {
        return convertedValues[id]?.converted ?? formatPrice(fallback, preferredCurrency);
    };

    // Use converted values for the final totals to ensure accuracy
    const convertedSubtotal = getConvertedAmount('subtotal-summary', subtotal);
    const convertedDeliveryFee = getConvertedAmount('delivery-fee', deliveryFee);
    const convertedTaxAmount = getConvertedAmount('tax-amount', taxAmount);
    const convertedDiscountAmount = getConvertedAmount('discount-amount', discountAmount);
    const convertedBulkSavings = getConvertedAmount('bulk-savings', bulkSavings);

    const finalTotal = Math.max(0, convertedSubtotal + convertedDeliveryFee - convertedDiscountAmount - convertedBulkSavings + convertedTaxAmount);




    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'townCity') {
            if (value.length > 1) {
                const filtered = KENYAN_TOWNS.filter(t =>
                    t.toLowerCase().includes(value.toLowerCase())
                );
                setTownSuggestions(filtered);
                setShowSuggestions(true);
            } else {
                setShowSuggestions(false);
            }
        }
    };

    const handleAddressSelect = (id: string) => {
        setSelectedAddressId(id);
        const addr = savedAddresses.find(a => a.id === id);
        if (addr) {
            setFormData({
                firstName: addr.first_name,
                lastName: addr.last_name,
                email: formData.email,
                phoneNumber: addr.phone_number,
                postcode: addr.postcode,
                addressLine1: addr.address_line1,
                townCity: addr.town_city,
                county: addr.county,
                country: addr.country,
            });
        }
    };

    const handleApplyCoupon = async (code: string) => {
        if (!code) return;

        setIsApplyingCoupon(true);

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
            } else {
                setAppliedCoupon(null);
                setDiscountAmount(0);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const handleSubmitOrder = async () => {
        setIsProcessing(true);
        setError(null);
        setErrorType(null);

        try {
            const syncSuccess = await syncCart(userId || null, cartItems);
            if (!syncSuccess) {
                setError('Failed to synchronize your cart. Please refresh and try again.');
                setErrorType('sync');
                setIsProcessing(false);
                return;
            }

            const orderId = await checkout(
                userId || null,
                paymentMethod,
                {
                    ...formData,
                    phoneNumber: paymentMethod === 'M-Pesa' ? mpesaPhone : formData.phoneNumber,
                },
                {
                    couponCode: appliedCoupon?.code || null,
                    expressDelivery: isExpress,
                    logisticsMeta: selectedRate ? {
                        provider: selectedRate.carrier_id as any,
                        service_id: selectedRate.service_code,
                        rate_id: selectedRate.carrier_id,
                        cost: selectedRate.rate_amount
                    } : null
                }
            );

            if (orderId) {
                onCheckoutComplete(orderId, formData.email || undefined);
            } else {
                setError('Order could not be processed. Please try again.');
                setErrorType('generic');
            }
        } catch (err: any) {
            console.error('Checkout error:', err);
            const errorMessage = err?.message?.toLowerCase() || '';

            if (errorMessage.includes('cart is empty') || errorMessage.includes('no items')) {
                setError('Your cart appears to be empty. Please add items and try again.');
                setErrorType('cart_empty');
            } else if (errorMessage.includes('insufficient stock') || errorMessage.includes('out of stock')) {
                setError('Some items are no longer available in the requested quantity. Please review your cart.');
                setErrorType('stock');
            } else if (errorMessage.includes('payment') || errorMessage.includes('declined')) {
                setError('Payment could not be processed. Please check your payment details and try again.');
                setErrorType('payment');
            } else {
                setError('Something went wrong. Please try again or contact support.');
                setErrorType('generic');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const StepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            {['Shipping', 'Payment', 'Review'].map((s, idx) => {
                const stepLower = s.toLowerCase() as CheckoutStep;
                const isActive = step === stepLower;
                const isCompleted = (step === 'payment' && idx === 0) || (step === 'review' && idx < 2);

                return (
                    <React.Fragment key={s}>
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? 'bg-orange-500 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                {isCompleted ? '✓' : idx + 1}
                            </div>
                            <span className={`text-xs mt-1 ${isActive ? 'text-orange-500 font-bold' : 'text-gray-500'}`}>{s}</span>
                        </div>
                        {idx < 2 && <div className={`w-16 h-1 mt-[-16px] ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                    </React.Fragment>
                );
            })}
        </div>
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <StepIndicator />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Step 1: Shipping */}
                        {step === 'shipping' && (
                            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shipping Address</h2>
                                    {!userId && (
                                        <button onClick={() => setIsGuest(!isGuest)} className="text-sm text-orange-500 hover:underline">
                                            {isGuest ? 'Sign in for faster checkout' : 'Checkout as guest'}
                                        </button>
                                    )}
                                </div>

                                {userId && savedAddresses.length > 0 && (
                                    <div className="mb-6 space-y-3">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Select a saved address:</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {savedAddresses.map(addr => (
                                                <div
                                                    key={addr.id}
                                                    onClick={() => handleAddressSelect(addr.id)}
                                                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-orange-500 bg-orange-50 dark:bg-gray-700' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200'}`}
                                                >
                                                    <p className="font-bold text-sm">{addr.first_name} {addr.last_name}</p>
                                                    <p className="text-xs text-gray-500 line-clamp-1">{addr.address_line1}</p>
                                                    <p className="text-xs text-gray-500">{addr.town_city}, {addr.postcode}</p>
                                                </div>
                                            ))}
                                            <div
                                                onClick={() => { setSelectedAddressId('new'); setFormData({ ...formData, addressLine1: '', postcode: '', townCity: '' }) }}
                                                className={`p-3 border-2 border-dashed rounded-lg cursor-pointer flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 ${selectedAddressId === 'new' ? 'border-orange-500 bg-orange-50 text-orange-500' : ''}`}
                                            >
                                                <span className="material-icons text-sm mr-1">add</span> New Address
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                                            <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 dark:bg-gray-700 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                                            <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 dark:bg-gray-700 dark:text-white" />
                                        </div>
                                    </div>

                                    {(isGuest || !userId) && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (for order confirmation)</label>
                                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 dark:bg-gray-700 dark:text-white" />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone number</label>
                                        <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 dark:bg-gray-700 dark:text-white" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postcode</label>
                                            <input type="text" name="postcode" value={formData.postcode} onChange={handleInputChange} className="w-full border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 dark:bg-gray-700 dark:text-white" />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Town / City</label>
                                            <input
                                                type="text"
                                                name="townCity"
                                                value={formData.townCity}
                                                onChange={handleInputChange}
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                onFocus={() => formData.townCity.length > 1 && setShowSuggestions(true)}
                                                className="w-full border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 dark:bg-gray-700 dark:text-white"
                                                autoComplete="off"
                                            />
                                            {showSuggestions && townSuggestions.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                                                    {townSuggestions.map(town => (
                                                        <div
                                                            key={town}
                                                            className="px-4 py-2 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer text-sm dark:text-white"
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, townCity: town }));
                                                                setShowSuggestions(false);
                                                            }}
                                                        >
                                                            {town}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1</label>
                                        <input type="text" name="addressLine1" value={formData.addressLine1} onChange={handleInputChange} className="w-full border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 dark:bg-gray-700 dark:text-white" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                                        <select
                                            name="country"
                                            value={formData.country}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 dark:bg-gray-700 dark:text-white bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        >
                                            {COUNTRIES.map(country => (
                                                <option key={country.code} value={country.name}>
                                                    {country.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Tax will be calculated based on your shipping country</p>
                                    </div>

                                    {/* Shipping Options */}
                                    {formData.townCity && shippingRates.length > 0 && (
                                        <div className="mt-6 space-y-3 animate-in fade-in duration-500">
                                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Shipping Options</h3>
                                            <div className="space-y-2">
                                                {shippingRates.map(rate => {
                                                    const rateKey = `${rate.carrier_id}-${rate.service_code}`;
                                                    const isSelected = selectedRate?.carrier_id === rate.carrier_id && selectedRate?.service_code === rate.service_code;

                                                    return (
                                                        <div
                                                            key={rateKey}
                                                            onClick={() => setSelectedRate(rate)}
                                                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-orange-500 bg-orange-50 dark:bg-gray-700' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-orange-500' : 'border-gray-300'}`}>
                                                                    {isSelected && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm text-gray-900 dark:text-white">{rate.carrier_name} - {rate.service_name}</p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                        {rate.service_code === 'LOCAL_PARCEL'
                                                                            ? 'Deliver via G4S, EasyCoach, etc. Fee paid on collection.'
                                                                            : `Estimated delivery: ${rate.estimated_delivery_days} days`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-sm text-gray-900 dark:text-white">
                                                                    {rate.rate_amount === 0 && rate.service_code === 'LOCAL_PARCEL' ? 'TBD' : formatPrice(rate.rate_amount, rate.currency)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {isFetchingRates && (
                                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 animate-pulse">
                                            <span className="material-icons animate-spin text-sm">sync</span>
                                            Calculating shipping rates...
                                        </div>
                                    )}

                                    <div className="pt-6">
                                        <button
                                            onClick={() => setStep('payment')}
                                            className="w-full bg-black text-white py-3 rounded-full font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            Continue to Payment
                                            <span className="material-icons text-sm">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Payment */}
                        {step === 'payment' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Payment Method</h2>
                                    <div className="space-y-4">
                                        {/* Card Selection */}
                                        <div className={`p-4 border-2 rounded-xl cursor-pointer ${paymentMethod === 'Card' ? 'border-orange-500 bg-orange-50 dark:bg-gray-700' : 'border-gray-100 dark:border-gray-800'}`} onClick={() => setPaymentMethod('Card')}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <input type="radio" checked={paymentMethod === 'Card'} onChange={() => { }} className="text-orange-500" />
                                                <span className="font-bold">Credit / Debit Card</span>
                                                <div className="flex gap-1 ml-auto">
                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4" />
                                                </div>
                                            </div>
                                            {paymentMethod === 'Card' && (
                                                <div className="grid grid-cols-2 gap-4 mt-4 animate-in fade-in">
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Card Number</label>
                                                        <input type="text" placeholder="XXXX XXXX XXXX XXXX" className="w-full border-gray-200 dark:border-gray-600 rounded-lg py-2 px-3 dark:bg-gray-800" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Expiry Date</label>
                                                        <input type="text" placeholder="MM/YY" className="w-full border-gray-200 dark:border-gray-600 rounded-lg py-2 px-3 dark:bg-gray-800" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">CVV</label>
                                                        <input type="text" placeholder="123" className="w-full border-gray-200 dark:border-gray-600 rounded-lg py-2 px-3 dark:bg-gray-800" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* M-Pesa Selection */}
                                        <div className={`p-4 border-2 rounded-xl cursor-pointer ${paymentMethod === 'M-Pesa' ? 'border-orange-500 bg-orange-50 dark:bg-gray-700' : 'border-gray-100 dark:border-gray-800'}`} onClick={() => setPaymentMethod('M-Pesa')}>
                                            <div className="flex items-center gap-3">
                                                <input type="radio" checked={paymentMethod === 'M-Pesa'} onChange={() => { }} className="text-orange-500" />
                                                <span className="font-bold">M-Pesa / Mobile Money</span>
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-Pesa_logo.png" alt="M-Pesa" className="h-6 ml-auto" />
                                            </div>
                                            {paymentMethod === 'M-Pesa' && (
                                                <div className="mt-4 animate-in fade-in">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">M-Pesa Phone Number</label>
                                                    <input type="tel" placeholder="254..." value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} className="w-full max-w-xs border-gray-200 dark:border-gray-600 rounded-lg py-2 px-3 dark:bg-gray-800" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-8 flex gap-4">
                                        <button onClick={() => setStep('shipping')} className="flex-1 py-3 border border-gray-300 rounded-full font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">Back</button>
                                        <button onClick={() => setStep('review')} className="flex-1 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all">Review Order</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {step === 'review' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Review & Place Order</h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8 pb-6 border-b border-gray-100 dark:border-gray-700">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Shipping To</h3>
                                                <button onClick={() => setStep('shipping')} className="text-xs text-orange-500 hover:underline">Change</button>
                                            </div>
                                            <p className="text-sm font-medium">{formData.firstName} {formData.lastName}</p>
                                            <p className="text-sm text-gray-500">{formData.addressLine1}</p>
                                            <p className="text-sm text-gray-500">{formData.townCity}, {formData.postcode}</p>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Shipping Method</h3>
                                                <button onClick={() => setStep('shipping')} className="text-xs text-orange-500 hover:underline">Change</button>
                                            </div>
                                            {selectedRate ? (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedRate.carrier_name} - {selectedRate.service_name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Est. delivery: {selectedRate.estimated_delivery_days} days</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500">Standard Delivery</p>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Payment Method</h3>
                                                <button onClick={() => setStep('payment')} className="text-xs text-orange-500 hover:underline">Change</button>
                                            </div>
                                            <p className="text-sm font-medium">{paymentMethod}</p>
                                            {paymentMethod === 'M-Pesa' && <p className="text-sm text-gray-500">{mpesaPhone}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Items in Order ({items.length})</h3>
                                        {items.map((item, index) => (
                                            <div key={`${item.id}-${item.variant_id || index}`} className="flex gap-4">
                                                <img src={item.image} alt={item.title} className="w-16 h-16 object-cover rounded-lg" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                                </div>
                                                <p className="text-sm font-bold">
                                                    {getConvertedPriceStr(`item-${item.id}:${item.variant_id || 'default'}`, item.price * item.quantity, item.currency || 'USD')}
                                                </p>
                                            </div>

                                        ))}
                                    </div>

                                    {/* Error Display */}
                                    {error && (
                                        <div className={`mb-6 p-4 rounded-xl border-2 flex items-start gap-3 ${errorType === 'payment' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                            errorType === 'stock' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                                                'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                            }`}>
                                            <span className={`material-icons text-lg ${errorType === 'payment' ? 'text-red-500' :
                                                errorType === 'stock' ? 'text-amber-500' :
                                                    'text-gray-500'
                                                }`}>
                                                {errorType === 'payment' ? 'credit_card_off' :
                                                    errorType === 'stock' ? 'inventory' :
                                                        errorType === 'cart_empty' ? 'remove_shopping_cart' :
                                                            'error_outline'}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{error}</p>
                                                {errorType === 'stock' && (
                                                    <p className="text-xs text-gray-500 mt-1">Some items may have been purchased by others.</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => { setError(null); setErrorType(null); }}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <span className="material-icons text-sm">close</span>
                                            </button>
                                        </div>
                                    )}

                                    {selectedRate?.service_code === 'LOCAL_PARCEL' && (
                                        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl flex items-center gap-2 mb-4">
                                            <span className="material-icons text-orange-500 text-sm">info</span>
                                            <p className="text-[10px] font-bold text-orange-800 dark:text-orange-200 uppercase tracking-wider">
                                                Note: You'll pay the transport fee directly to the courier on collection.
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleSubmitOrder}
                                            disabled={isProcessing}
                                            className="flex-1 bg-orange-500 text-white py-4 rounded-full font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 text-lg shadow-xl disabled:opacity-50"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <span className="material-icons text-sm animate-spin">autorenew</span>
                                                    Processing...
                                                </>
                                            ) : error ? 'Try Again' : 'Place Order Now'}
                                        </button>
                                    </div>
                                    <p className="text-center text-[10px] text-gray-400 mt-4">By clicking "{error ? 'Try Again' : 'Place Order Now'}", you agree to our Terms of Use and Privacy Policy</p>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Right Column: Order Summary (Visible in all steps) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sticky top-8">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Order Summary</h2>

                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>Subtotal ({cartItems.length} items)</span>
                                    <span>{getConvertedSummaryPriceStr('subtotal-summary', subtotal)}</span>
                                </div>

                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>Shipping</span>
                                    <span className={(deliveryFee === 0 || selectedRate?.service_code === 'LOCAL_PARCEL') ? 'text-orange-600 font-bold' : 'text-gray-900 dark:text-white font-bold'}>
                                        {selectedRate?.service_code === 'LOCAL_PARCEL'
                                            ? 'Paid on Collection'
                                            : (deliveryFee === 0 ? 'FREE' : getConvertedSummaryPriceStr('delivery-fee', convertedDeliveryFee))}
                                    </span>
                                </div>
                                {selectedRate?.service_code === 'LOCAL_PARCEL' && (
                                    <p className="text-[10px] text-right text-orange-500 font-bold -mt-3 italic">Transport fee payable to carrier</p>
                                )}
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>{taxName} ({taxPercentage}%)</span>
                                    <span>{getConvertedSummaryPriceStr('tax-amount', convertedTaxAmount)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-rose-700 dark:text-rose-400 font-medium">
                                        <span>Coupon Discount</span>
                                        <span>-{getConvertedSummaryPriceStr('discount-amount', convertedDiscountAmount)}</span>
                                    </div>
                                )}
                                {bulkSavings > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                                        <span>Bulk Savings</span>
                                        <span>-{getConvertedSummaryPriceStr('bulk-savings', convertedBulkSavings)}</span>
                                    </div>
                                )}

                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-lg text-gray-900 dark:text-white">Order Total</span>
                                    <span className="font-bold text-xl text-orange-600">{formatPrice(finalTotal, preferredCurrency)}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Total inclusive of all applicable taxes and fees.</p>
                            </div>


                            {appliedCoupon && (
                                <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3 rounded-lg flex items-center gap-2">
                                    <span className="material-icons text-emerald-600 text-sm">confirmation_number</span>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Best Deal Applied</p>
                                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Coupon "{appliedCoupon.code}" added automatically</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 pt-4 border-t border-gray-50 dark:border-gray-700">
                                <div className="flex items-start gap-2 text-[10px] text-gray-400 uppercase tracking-tighter">
                                    <span className="material-icons text-green-500 text-xs">verified</span>
                                    <p>Secure checkout with SSL encryption</p>
                                </div>
                                <div className="flex items-start gap-2 text-[10px] text-gray-400 uppercase tracking-tighter">
                                    <span className="material-icons text-green-500 text-xs">policy</span>
                                    <p>Safe shopping guarantee</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default CheckoutView;

