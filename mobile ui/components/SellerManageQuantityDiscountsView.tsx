import React, { useState, useEffect } from 'react';
import { fetchQuantityDiscounts, updateQuantityDiscounts } from '../../lib/api';
import { Product, QuantityDiscountTier } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { getCurrencySymbol } from '../../lib/currency';

interface SellerManageQuantityDiscountsViewProps {
    product: Product;
    onClose: () => void;
    onSuccess: () => void;
}

export const SellerManageQuantityDiscountsView: React.FC<SellerManageQuantityDiscountsViewProps> = ({
    product,
    onClose,
    onSuccess
}) => {
    const [tiers, setTiers] = useState<QuantityDiscountTier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadTiers = async () => {
            try {
                const data = await fetchQuantityDiscounts(product.id.toString());
                setTiers(data);
            } catch (error) {
                console.error('Failed to load quantity discounts', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadTiers();
    }, [product.id]);

    const handleAddTier = () => {
        const nextMinQty = tiers.length > 0 ? tiers[tiers.length - 1].min_quantity + 5 : 10;
        const nextPrice = tiers.length > 0 ? tiers[tiers.length - 1].unit_price * 0.95 : product.price * 0.9;

        setTiers([...tiers, {
            id: 'temp-' + Date.now(),
            product_id: product.id.toString(),
            min_quantity: nextMinQty,
            unit_price: Number(nextPrice.toFixed(2))
        }]);
    };

    const handleRemoveTier = (index: number) => {
        setTiers(tiers.filter((_, i) => i !== index));
    };

    const handleUpdateTier = (index: number, field: keyof QuantityDiscountTier, value: number) => {
        const newTiers = [...tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setTiers(newTiers);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Remove temp IDs before sending to API
            const tiersToSave = tiers.map(({ id, ...rest }) => rest) as QuantityDiscountTier[];
            const success = await updateQuantityDiscounts(product.id.toString(), tiersToSave);
            if (success) {
                onSuccess();
            } else {
                alert('Failed to save quantity discounts');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col pt-safe animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="px-4 py-4 border-b flex items-center justify-between bg-white sticky top-0">
                <button onClick={onClose} className="p-2 -ml-2">
                    <span className="material-icons">close</span>
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-bold">Bulk Pricing</h2>
                    <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{product.title}</p>
                </div>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Intro */}
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <div className="flex gap-3">
                        <span className="material-icons text-blue-500">info</span>
                        <div>
                            <p className="text-sm font-bold text-blue-900">Tiered Pricing</p>
                            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                                Set lower unit prices for higher quantities. Buyers will see these on the product page.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Base Price Display */}
                <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Base Price</span>
                    <span className="text-lg font-black text-gray-900">{formatCurrency(product.price, product.currency)}</span>
                </div>

                {/* Tiers List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Discount Tiers</span>
                        <button
                            onClick={handleAddTier}
                            className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1"
                        >
                            <span className="material-icons text-sm">add</span>
                            Add Tier
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2].map(i => <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse" />)}
                        </div>
                    ) : tiers.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-8">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                                <span className="material-icons text-3xl">groups</span>
                            </div>
                            <p className="text-sm font-bold text-gray-900">No bulk discounts set</p>
                            <p className="text-xs text-gray-400 mt-1">Start rewarding customers who buy in wholesale quantities.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tiers.map((tier, index) => (
                                <div key={tier.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-end gap-3 animate-in fade-in zoom-in-95">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Min. Qty</label>
                                        <input
                                            type="number"
                                            value={tier.min_quantity}
                                            onChange={(e) => handleUpdateTier(index, 'min_quantity', Number(e.target.value))}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-black focus:outline-none"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Unit Price ({getCurrencySymbol(product.currency)})</label>
                                        <input
                                            type="number"
                                            value={tier.unit_price}
                                            onChange={(e) => handleUpdateTier(index, 'unit_price', Number(e.target.value))}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-black focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveTier(index)}
                                        className="mb-2 p-2 text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        <span className="material-icons">delete_outline</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t bg-white sticky bottom-0">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span className="material-icons text-lg">save</span>
                            Apply Pricing Rules
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
