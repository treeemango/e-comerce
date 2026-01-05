
import React, { useEffect, useRef, useState } from 'react';

import { createCoupon, fetchSellerProductsForCoupons, fetchTrendingPlatformEventName } from '../../../lib/api';
import { Product } from '../../../types';
import { getCurrencySymbol, getSellerCurrency } from '../../../lib/seller-currency';
import { detectUserCountry } from '../../../lib/event-banner-service';

const FieldHelp: React.FC<{ text: string }> = ({ text }) => {
    const [open, setOpen] = React.useState(false);
    return (
        <span
            className="relative inline-flex"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-label="Help"
                className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
                <span className="material-icons text-[14px]">help_outline</span>
            </button>
            {open && (
                <span className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-72 rounded-lg bg-gray-900 text-white text-xs leading-relaxed px-3 py-2 shadow-lg">
                    {text}
                </span>
            )}
        </span>
    );
};

interface CreateCouponViewProps {
    sellerId: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

// Format a Date into the yyyy-MM-ddTHH:mm string expected by datetime-local inputs.
const toLocalInputValue = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - tzOffset);
    return local.toISOString().slice(0, 16);
};

const CreateCouponView: React.FC<CreateCouponViewProps> = ({ sellerId, onSuccess, onCancel }) => {
    const [sellerCurrency, setSellerCurrency] = useState<string>('USD');
    const currencySymbol = getCurrencySymbol(sellerCurrency);

    const [couponName, setCouponName] = useState('');
    const [trendingEventName, setTrendingEventName] = useState<string | null>(null);
    const didAutofillNameRef = useRef(false);
    const [code, setCode] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
    const [discountValueInput, setDiscountValueInput] = useState<string>('');
    const [quantityInput, setQuantityInput] = useState<string>('100');

    // Product Selection
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const loadCurrency = async () => {
            if (!sellerId) return;
            const currency = await getSellerCurrency(sellerId);
            if (!cancelled) setSellerCurrency(currency || 'USD');
        };
        loadCurrency();
        return () => {
            cancelled = true;
        };
    }, [sellerId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const country = await detectUserCountry().catch(() => 'GLOBAL');
                const eventName = await fetchTrendingPlatformEventName(country);
                if (cancelled) return;
                setTrendingEventName(eventName);
                if (!didAutofillNameRef.current && !couponName.trim() && eventName) {
                    didAutofillNameRef.current = true;
                    setCouponName(eventName.slice(0, 50));
                }
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
        // Intentionally do not depend on couponName to avoid overriding user edits.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loadProducts = async () => {
            setIsLoadingProducts(true);
            try {
                const sellerProducts = await fetchSellerProductsForCoupons(sellerId);
                setProducts(sellerProducts);
            } catch (err) {
                console.error("Failed to load products", err);
            } finally {
                setIsLoadingProducts(false);
            }
        };
        if (sellerId) loadProducts();
    }, [sellerId]);

    const toNumberOrZero = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        const n = Number(trimmed);
        return Number.isFinite(n) ? Math.max(0, n) : 0;
    };

    const handleToggleProduct = (id: string) => {
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        const discountValue = toNumberOrZero(discountValueInput);
        const quantity = Math.floor(toNumberOrZero(quantityInput));

        if (!couponName || !startTime || !endTime || discountValue <= 0) {
            alert("Please fill in all required fields");
            return;
        }

        if (selectedProductIds.length === 0) {
            alert("Select at least one product to apply this coupon.");
            return;
        }

        const success = await createCoupon({
            name: couponName,
            code: code,
            [discountType === 'amount' ? 'discount_amount' : 'discount_percentage']: discountValue,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            total_quantity: quantity,
            product_ids: selectedProductIds
        });

        if (success.success) {
            alert("Coupon created successfully!");
            if (onSuccess) onSuccess();
        } else {
            alert("Failed to create coupon: " + (success.error?.message || "Unknown error"));
        }
    };

    // Show the full catalog so sellers can pick visually instead of hunting via search.
    const filteredProducts = products;

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="text-xs text-gray-500 mb-2">
                Coupon <span className="mx-1">&gt;</span> <span className="text-gray-900 font-medium">Create new coupon</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create new coupon</h1>

            <div className="flex gap-6 items-start pb-24">
                <div className="flex-1 space-y-6">
                    {/* Settings Panel */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900">Coupon settings</h3>
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded text-xs text-gray-700 flex items-start gap-2">
                                <span className="material-icons text-orange-500 text-sm mt-0.5">info</span>
                                You can set a no-threshold coupon which can only be applied to a single product.
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <div className="flex items-center">
                                    <label className="text-sm font-bold text-gray-900">Coupon name</label>
                                    <FieldHelp text="Internal name for your reference. Customers won't see this name." />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">Enter a name for the coupon with less than 50 characters.The coupon name will not be visible to customers.</p>
                            {trendingEventName && (
                                <button
                                    type="button"
                                    className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
                                    onClick={() => setCouponName(trendingEventName.slice(0, 50))}
                                >
                                    Trending: {trendingEventName}
                                </button>
                            )}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={couponName}
                                    onChange={(e) => setCouponName(e.target.value)}
                                    placeholder="Enter coupon name"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                    maxLength={50}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{couponName.length}/50</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center">
                                <label className="text-sm font-bold text-gray-900">Coupon Code (Optional)</label>
                                <FieldHelp text="Optional custom code buyers type at checkout. Leave blank to auto-generate a code." />
                            </div>
                            <p className="text-xs text-gray-500">Custom code for users to enter. Leave blank to auto-generate.</p>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="SUMMER2025"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm uppercase font-mono"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center">
                                <label className="text-sm font-bold text-gray-900">Discount Value</label>
                                <FieldHelp text={
                                    `Choose either a fixed amount off (e.g. ${currencySymbol}5) or a percentage off (e.g. 10%).`
                                } />
                            </div>
                            <div className="flex gap-4 items-center">
                                <select
                                    value={discountType}
                                    onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    <option value="amount">Fixed Amount ({sellerCurrency})</option>
                                    <option value="percent">Percentage (%)</option>
                                </select>
                                <input
                                    type="number"
                                    value={discountValueInput}
                                    onChange={(e) => setDiscountValueInput(e.target.value)}
                                    min={0}
                                    placeholder="0"
                                    className="border border-gray-300 rounded px-3 py-2 text-sm w-32"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center">
                                <label className="text-sm font-bold text-gray-900">Total Quantity</label>
                                <FieldHelp text="Total number of coupons available to be claimed/used across all buyers." />
                            </div>
                            <input
                                type="number"
                                value={quantityInput}
                                onChange={(e) => setQuantityInput(e.target.value)}
                                min={0}
                                className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center">
                                <label className="text-sm font-bold text-gray-900">Schedule</label>
                                <FieldHelp text="The coupon can be claimed/used only within this active time range." />
                            </div>
                            <p className="text-xs text-gray-500">Select a duration of between 1-90 days.</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 w-1/2"
                                    step={900}
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 w-1/2"
                                    step={900}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                <button
                                    type="button"
                                    onClick={() => setStartTime(toLocalInputValue(new Date()))}
                                    className="px-3 py-1 rounded-full border border-gray-200 hover:border-orange-300 hover:text-orange-700"
                                >
                                    Set start to now
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const start = startTime ? new Date(startTime) : new Date();
                                        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
                                        setEndTime(toLocalInputValue(end));
                                        if (!startTime) setStartTime(toLocalInputValue(start));
                                    }}
                                    className="px-3 py-1 rounded-full border border-gray-200 hover:border-orange-300 hover:text-orange-700"
                                >
                                    +7 days
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const start = startTime ? new Date(startTime) : new Date();
                                        const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
                                        setEndTime(toLocalInputValue(end));
                                        if (!startTime) setStartTime(toLocalInputValue(start));
                                    }}
                                    className="px-3 py-1 rounded-full border border-gray-200 hover:border-orange-300 hover:text-orange-700"
                                >
                                    +30 days
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">Coupon Validity</label>
                            <p className="text-xs text-gray-500">The validity is calculated from when the user receives the coupon.</p>
                            <p className="text-xs text-orange-500 font-medium">Valid for 24 hours once claimed</p>
                        </div>
                    </div>

                    {/* Product Select Panel */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                        <div className="space-y-1">
                            <div className="flex items-center">
                                <h3 className="font-bold text-gray-900">Select product with coupons</h3>
                                <FieldHelp text="Coupons apply only to the products you select here. Select at least one product to continue." />
                            </div>
                            <p className="text-xs text-gray-500">Relevant products and the number of coupons are recommended based on product strategies. Sellers are advised to refer to these recommendations.</p>
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">
                                    {selectedProductIds.length} selected
                                </span>
                                <span className="text-xs text-gray-500">{filteredProducts.length} shown</span>
                                <span className="text-xs text-gray-400">{products.length} total</span>
                                <button
                                    onClick={() => setSelectedProductIds([])}
                                    className="text-xs text-orange-600 hover:text-orange-700 font-medium underline-offset-4 hover:underline"
                                >
                                    Clear selection
                                </button>
                                <button
                                    onClick={() => setSelectedProductIds(filteredProducts.map(p => String(p.id)))}
                                    className="text-xs text-orange-600 hover:text-orange-700 font-medium underline-offset-4 hover:underline"
                                >
                                    Select all
                                </button>
                            </div>
                            <div className="text-xs text-gray-500">Tap a card to add or remove a product.</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                            {isLoadingProducts && (
                                <div className="col-span-full text-center text-sm text-gray-500 py-6">Loading products...</div>
                            )}

                            {!isLoadingProducts && filteredProducts.length === 0 && (
                                <div className="col-span-full text-center text-sm text-gray-500 py-6 bg-gray-50 border border-dashed border-gray-200 rounded">No products available yet.</div>
                            )}

                            {!isLoadingProducts && filteredProducts.map(product => {
                                const checked = selectedProductIds.includes(String(product.id));
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => handleToggleProduct(String(product.id))}
                                        className={`group relative border rounded-lg p-4 text-left transition shadow-sm hover:-translate-y-0.5 ${checked ? 'border-orange-400 ring-2 ring-orange-200 bg-orange-50/60' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                                    >
                                        <div className="absolute top-3 right-3">
                                            <span className={`material-icons text-lg ${checked ? 'text-orange-500' : 'text-gray-300 group-hover:text-gray-400'}`}>
                                                {checked ? 'check_circle' : 'radio_button_unchecked'}
                                            </span>
                                        </div>
                                        <div className="flex gap-3 items-start w-full">
                                            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0 border border-gray-200">
                                                {product.image ? (
                                                    <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                                                )}
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 line-clamp-2">{product.title}</p>
                                                <div className="text-xs text-gray-500">ID: {product.id}</div>
                                                <div className="text-sm font-medium text-gray-900">{product.currency || 'USD'} {product.price}</div>
                                                <div className="text-xs text-gray-500">Stock: {product.stock ?? '—'}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                                            <span>Tap to {checked ? 'remove' : 'select'}</span>
                                            <span className="material-icons text-sm text-orange-400 group-hover:translate-x-0.5 transition">chevron_right</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Preview Sidebar */}
                <div className="w-80 space-y-4">
                    <div className="flex items-center">
                        <h3 className="font-bold text-gray-900">Buyer browsing example</h3>
                        <FieldHelp text="Preview only. This shows how the coupon could appear to buyers." />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="aspect-square bg-gray-100 relative">
                            <img src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400" alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                                Bought in the last 24 hours
                            </div>
                        </div>
                        <div className="p-3">
                            <div className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 w-fit px-1 rounded mb-1">
                                <span className="material-icons text-[10px]">local_shipping</span> Free shipping from shop provider
                            </div>
                            <p className="text-xs font-medium text-gray-900 line-clamp-2 mb-2">
                                Trendy Dermis Crocodile Print Shoulder Bag, Solid Color Crossbody Bag, Perfect Sling Bag For Wom...
                            </p>

                            {/* Coupon Ticket */}
                            <div className="bg-white border border-red-200 rounded border-l-4 border-l-red-500 p-2 shadow-sm mb-2 flex justify-between items-center">
                                <div>
                                    <div className="text-sm font-bold text-gray-900">Extra $3.00 off &gt;</div>
                                    <div className="text-[10px] text-gray-500">Expires in 2 days</div>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-sm font-bold text-gray-900">$24.99</span>
                                <span className="text-xs text-red-500">Extra$3.00 off &gt;</span>
                                <span className="text-[10px] text-gray-500">Pay $21.99 Today</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Action Bar */}
            <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-4 z-10">
                <button
                    onClick={onCancel}
                    className="px-6 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleCreate}
                    className="px-6 py-2 bg-orange-500 rounded text-sm font-medium text-white hover:bg-orange-600 shadow-sm"
                >
                    Create Coupon
                </button>
            </div>
        </div>
    );
};

export default CreateCouponView;
