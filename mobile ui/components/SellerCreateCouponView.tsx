import React, { useState, useEffect } from 'react';
import { createCoupon, fetchSellerProductsForCoupons } from '../../lib/api';
import { Product } from '../../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SellerCreateCouponViewProps {
    sellerId: string;
    onClose: () => void;
    onSuccess: () => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// Format date to local ISO string for input[type="datetime-local"]
const toLocalISO = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - tzOffset);
    return local.toISOString().slice(0, 16);
};

export const SellerCreateCouponView: React.FC<SellerCreateCouponViewProps> = ({ sellerId, onClose, onSuccess }) => {
    const [step, setStep] = useState<1 | 2>(1); // 1: Details, 2: Products
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
    const [discountValue, setDiscountValue] = useState('');
    const [quantity, setQuantity] = useState('100');
    const [startTime, setStartTime] = useState(toLocalISO(new Date()));
    const [endTime, setEndTime] = useState(toLocalISO(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));

    // Product Selection
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

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
        if (!name || !discountValue || !startTime || !endTime) {
            alert("Please fill in all required fields.");
            return;
        }
        if (selectedProductIds.length === 0) {
            alert("Please select at least one product.");
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await createCoupon({
                name,
                code: code.toUpperCase(),
                discount_amount: discountType === 'amount' ? Number(discountValue) : undefined,
                discount_percentage: discountType === 'percent' ? Number(discountValue) : undefined,
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
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
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-white shadow-sm z-10">
                <button onClick={onClose} className="text-gray-500 p-2 -ml-2">
                    <span className="material-icons">close</span>
                </button>
                <div className="font-bold text-gray-900">
                    {step === 1 ? 'New Coupon Details' : 'Select Products'}
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
            <div className="flex-1 overflow-y-auto p-5 pb-24">
                {step === 1 ? (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-900">Name</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-orange-500"
                                placeholder="e.g. Summer Sale"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-900">Code (Optional)</label>
                            <input
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-orange-500 uppercase font-mono"
                                placeholder="SUMMER2025"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-900">Type</label>
                                <select
                                    value={discountType}
                                    onChange={e => setDiscountType(e.target.value as any)}
                                    className="w-full border border-gray-300 rounded-lg p-3 bg-white"
                                >
                                    <option value="amount">Fixed ($)</option>
                                    <option value="percent">Percent (%)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-900">Value</label>
                                <input
                                    type="number"
                                    value={discountValue}
                                    onChange={e => setDiscountValue(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-orange-500"
                                    placeholder={discountType === 'amount' ? '5.00' : '10'}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-900">Start Time</label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-orange-500"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-900">End Time</label>
                            <input
                                type="datetime-local"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-orange-500"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-900">Quantity Limit</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-orange-500"
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
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-10 safe-area-bottom">
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
                            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg"
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
