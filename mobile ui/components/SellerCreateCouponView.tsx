import React, { useState, useEffect } from 'react';
import { createCoupon, fetchSellerProductsForCoupons } from '../../lib/api';
import { Product } from '../../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getSellerCurrency } from '../../lib/seller-currency';

const FieldHelp: React.FC<{ text: string }> = ({ text }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);

    const close = () => setOpen(false);

    const updatePosition = React.useCallback(() => {
        const el = buttonRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const tooltipWidth = 288;
        const gap = 10;
        const left = Math.min(
            Math.max(12, rect.left + rect.width / 2 - tooltipWidth / 2),
            Math.max(12, window.innerWidth - tooltipWidth - 12)
        );
        const top = Math.min(rect.bottom + gap, Math.max(12, window.innerHeight - 12));
        setPos({ top, left, width: tooltipWidth });
    }, []);

    useEffect(() => {
        if (!open) return;
        updatePosition();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        const onResize = () => updatePosition();
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onResize, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onResize, true);
        };
    }, [open, updatePosition]);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-label="Help"
                className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600"
            >
                <span className="material-icons text-[14px]">help_outline</span>
            </button>
            {open && pos && typeof document !== 'undefined'
                ? (
                    <>
                        <div
                            className="fixed inset-0 z-[70]"
                            onClick={close}
                        />
                        <div
                            className="fixed z-[80] rounded-lg bg-gray-900 text-white text-xs leading-relaxed px-3 py-2 shadow-lg"
                            style={{ top: pos.top, left: pos.left, width: pos.width }}
                        >
                            {text}
                        </div>
                    </>
                )
                : null}
        </>
    );
};

interface SellerCreateCouponViewProps {
    sellerId: string;
    onClose: () => void;
    onSuccess: () => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export const SellerCreateCouponView: React.FC<SellerCreateCouponViewProps> = ({ sellerId, onClose, onSuccess }) => {
    const [step, setStep] = useState<1 | 2>(1); // 1: Details, 2: Products
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [sellerCurrency, setSellerCurrency] = useState<string>('USD');

    // Form Data
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
    const [discountValue, setDiscountValue] = useState('');
    const [quantity, setQuantity] = useState('100');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [startClock, setStartClock] = useState('00:00');
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endClock, setEndClock] = useState('23:59');

    // Product Selection
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

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
        const loadProducts = async () => {
            setIsLoadingProducts(true);
            try {
                const data = await fetchSellerProductsForCoupons(sellerId);
                setProducts(data);
            } catch (e) {
                console.error("Failed to load products", e);
            } finally {
                setIsLoadingProducts(false);
            }
        };
        if (sellerId) loadProducts();
    }, [sellerId]);

    const handleToggleProduct = (id: string) => {
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedProductIds.length === products.length) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(products.map(p => String(p.id)));
        }
    };

    const handleSubmit = async () => {
        if (!name || !discountValue || !startDate || !endDate) {
            alert("Please fill in all required fields.");
            return;
        }
        if (selectedProductIds.length === 0) {
            alert("Please select at least one product.");
            return;
        }

        setIsSubmitting(true);
        try {
            const startsAtIso = new Date(`${startDate}T${startClock}:00`).toISOString();
            const endsAtIso = new Date(`${endDate}T${endClock}:00`).toISOString();

            const success = await createCoupon({
                name,
                code: code.toUpperCase(),
                discount_amount: discountType === 'amount' ? Number(discountValue) : undefined,
                discount_percentage: discountType === 'percent' ? Number(discountValue) : undefined,
                start_time: startsAtIso,
                end_time: endsAtIso,
                total_quantity: Number(quantity),
                product_ids: selectedProductIds
            });

            if (success.success) {
                alert("Coupon created!");
                onSuccess();
            } else {
                throw new Error(success.error?.message);
            }
        } catch (error: any) {
            alert("Failed to create coupon: " + (error.message || "Unknown error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col animate-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
                <button onClick={onClose} className="text-gray-500 p-2 -ml-2">
                    <span className="material-icons">close</span>
                </button>
                <div className="font-bold text-gray-900">
                    {step === 1 ? 'Create new coupon' : 'Select products'}
                </div>
                <div className="w-10 text-right">
                    {step === 2 && (
                        <button onClick={handleSelectAll} className="text-orange-500 text-xs font-bold">
                            {selectedProductIds.length === products.length ? 'NONE' : 'ALL'}
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                {step === 1 ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center">
                                <label className="text-sm font-bold text-gray-900">Coupon name</label>
                                <FieldHelp text="Internal name for your reference. Customers won't see this name." />
                            </div>
                            <p className="text-xs text-gray-500">Enter a name under 50 characters. This name is not shown to buyers.</p>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                placeholder="e.g. Summer Sale"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center">
                                <label className="text-sm font-bold text-gray-900">Coupon Code (Optional)</label>
                                <FieldHelp text="Optional custom code buyers type at checkout. Leave blank to auto-generate a code." />
                            </div>
                            <p className="text-xs text-gray-500">Custom code for users to enter. Leave blank to auto-generate.</p>
                            <input
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 uppercase font-mono"
                                placeholder="SUMMER2025"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center">
                                <label className="text-sm font-bold text-gray-900">Discount Value</label>
                                <FieldHelp text="Choose either a fixed amount off (e.g. $5) or a percentage off (e.g. 10%)." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-900">Type</label>
                                <select
                                    value={discountType}
                                    onChange={e => setDiscountType(e.target.value as any)}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                >
                                    <option value="amount">Fixed ({sellerCurrency})</option>
                                    <option value="percent">Percent (%)</option>
                                </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-900">Value</label>
                                <input
                                    type="number"
                                    value={discountValue}
                                    onChange={e => setDiscountValue(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    placeholder={discountType === 'amount' ? '5.00' : '10'}
                                />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center">
                                <label className="text-sm font-bold text-gray-900">Schedule</label>
                                <FieldHelp text="Set when the coupon starts and ends. Use the time fields to avoid the large calendar popup." />
                            </div>
                            <p className="text-xs text-gray-500">Choose when the coupon starts and ends.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900">Start Time</label>
                                    <input
                                        type="time"
                                        value={startClock}
                                        onChange={e => setStartClock(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900">End Time</label>
                                    <input
                                        type="time"
                                        value={endClock}
                                        onChange={e => setEndClock(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center">
                                <label className="text-sm font-bold text-gray-900">Total Quantity</label>
                                <FieldHelp text="Total number of coupons available to be claimed/used across all buyers." />
                            </div>
                            <input
                                type="number"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            />
                        </div>
                    </div>
                ) : (
                    // Step 2: Product Selection
                    <div className="space-y-3">
                        <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-800 mb-4 flex items-start gap-2">
                            <span className="material-icons text-sm">info</span>
                            Select products to apply this coupon to.
                        </div>

                        {isLoadingProducts ? (
                            <div className="text-center py-10 text-gray-400">Loading products...</div>
                        ) : (
                            products.map(p => {
                                const selected = selectedProductIds.includes(String(p.id));
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => handleToggleProduct(String(p.id))}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.99]",
                                            selected ? "border-orange-500 bg-orange-50/50" : "border-gray-200 bg-white"
                                        )}
                                    >
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                                            {p.image ? (
                                                <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">No Img</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">{p.title}</div>
                                            <div className="text-xs text-gray-500">${p.price} • Stock: {p.stock}</div>
                                        </div>
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border flex items-center justify-center",
                                            selected ? "bg-orange-500 border-orange-500" : "border-gray-300"
                                        )}>
                                            {selected && <span className="material-icons text-white text-sm">check</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-10 safe-area-bottom">
                {step === 1 ? (
                    <button
                        onClick={() => {
                            if (!name || !discountValue) {
                                alert("Please complete form");
                                return;
                            }
                            setStep(2);
                        }}
                        className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg shadow-lg active:scale-[0.98] transition"
                    >
                        Next: Select Products
                    </button>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-[2] py-3 bg-orange-500 text-white font-bold rounded-lg shadow-lg active:scale-[0.98] transition disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isSubmitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            Create Coupon ({selectedProductIds.length})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
