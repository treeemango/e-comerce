import React, { useMemo, useState } from 'react';
import { updateProductDetails } from '../../lib/api';
import { Product } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';

interface SellerDiscountProductViewProps {
    product: Product;
    onClose: () => void;
    onSuccess: () => void;
}

export const SellerDiscountProductView: React.FC<SellerDiscountProductViewProps> = ({
    product,
    onClose,
    onSuccess
}) => {
    const [salePrice, setSalePrice] = useState<string>(String(product.price ?? 0));
    const [originalPrice, setOriginalPrice] = useState<string>(String(product.originalPrice ?? product.rrp ?? product.price ?? 0));
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [startClock, setStartClock] = useState('00:00');
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endClock, setEndClock] = useState('23:59');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const computed = useMemo(() => {
        const sale = Number(salePrice);
        const original = Number(originalPrice);
        const valid = Number.isFinite(sale) && Number.isFinite(original) && sale >= 0 && original >= 0;
        const discountPct = valid && original > 0 && original > sale
            ? Math.round(((original - sale) / original) * 100)
            : 0;
        return { sale, original, valid, discountPct };
    }, [salePrice, originalPrice]);

    const handleSave = async () => {
        setError(null);

        if (!computed.valid) {
            setError('Please enter valid prices.');
            return;
        }

        if (computed.original <= 0) {
            setError('Original price must be greater than 0.');
            return;
        }

        if (computed.sale > computed.original) {
            setError('Sale price cannot be higher than original price.');
            return;
        }

        const startsAtIso = new Date(`${startDate}T${startClock}:00`).toISOString();
        const endsAtIso = new Date(`${endDate}T${endClock}:00`).toISOString();
        if (new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
            setError('End date/time must be after start date/time.');
            return;
        }

        setIsSaving(true);
        try {
            await updateProductDetails(product.id, {
                price: computed.sale,
                originalPrice: computed.original,
                isFlashSale: true,
                flashSaleStart: startsAtIso,
                flashSaleEnd: endsAtIso,
            });
            onSuccess();
        } catch (e) {
            console.error(e);
            setError('Failed to update product pricing.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col pt-safe animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="px-4 py-4 border-b flex items-center justify-between bg-white sticky top-0">
                <button onClick={onClose} className="p-2 -ml-2" aria-label="Back" type="button">
                    <span className="material-icons">arrow_back</span>
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-bold">Discount Product</h2>
                    <p className="text-[10px] text-gray-400 truncate max-w-[220px]">{product.title}</p>
                </div>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Product summary */}
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex gap-4">
                    <div className="w-14 h-14 bg-white rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                        {product.image ? (
                            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <span className="material-icons">image</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-gray-900 truncate">{product.title}</div>
                        <div className="text-[11px] text-gray-500 mt-1">
                            Current: <span className="font-bold text-gray-900">{formatCurrency(product.price ?? 0, product.currency)}</span>
                        </div>
                        {computed.discountPct > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wider">
                                <span className="material-icons text-[14px]">sell</span>
                                {computed.discountPct}% OFF
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700 flex gap-2">
                        <span className="material-icons text-base">error_outline</span>
                        <div className="font-bold">{error}</div>
                    </div>
                )}

                {/* Pricing inputs */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Original Price (Compare at)</label>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={originalPrice}
                            onChange={(e) => setOriginalPrice(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-base font-black focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            placeholder="0.00"
                            min={0}
                            step={0.01}
                        />
                        <p className="text-[10px] text-gray-400">Shown as the crossed-out price on the product page.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sale Price</label>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={salePrice}
                            onChange={(e) => setSalePrice(e.target.value)}
                            className={cn(
                                "w-full bg-gray-50 border rounded-2xl px-4 py-4 text-base font-black focus:outline-none focus:ring-2",
                                computed.original > 0 && computed.sale > computed.original
                                    ? "border-red-200 focus:ring-red-500/20"
                                    : "border-gray-100 focus:ring-orange-500/20"
                            )}
                            placeholder="0.00"
                            min={0}
                            step={0.01}
                        />
                        <p className="text-[10px] text-gray-400">This is the price customers pay.</p>
                    </div>
                </div>

                {/* Schedule */}
                <div className="space-y-3">
                    <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Schedule</div>
                        <p className="text-[10px] text-gray-400 mt-1">Set when this discount starts and ends.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-base font-black focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Time</label>
                            <input
                                type="time"
                                value={startClock}
                                onChange={(e) => setStartClock(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-base font-black focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-base font-black focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Time</label>
                            <input
                                type="time"
                                value={endClock}
                                onChange={(e) => setEndClock(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-base font-black focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4">
                    <div className="text-xs font-black text-orange-700 uppercase tracking-wider">Summary</div>
                    <div className="mt-2 text-sm text-orange-900 font-bold">
                        {computed.discountPct > 0
                            ? `Customers will see ${computed.discountPct}% off.`
                            : 'No discount shown (prices are equal).'}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t bg-white sticky bottom-0">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span className="material-icons text-lg">save</span>
                            Apply Discount
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
