
import React, { useState, useEffect } from 'react';
import { fetchQuantityDiscounts, updateQuantityDiscounts } from '../../../lib/api';
import { Product, QuantityDiscountTier } from '../../../types';
import { cn, formatCurrency } from '../../../lib/utils';

interface ManageQuantityDiscountsViewProps {
    product: Product;
    onClose: () => void;
    onSuccess: () => void;
}

const ManageQuantityDiscountsView: React.FC<ManageQuantityDiscountsViewProps> = ({
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
        const nextMinQty = tiers.length > 0 ? tiers[tiers.length - 1].min_quantity + 5 : 5;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Remove temp IDs before sending to API
            const tiersToSave = tiers.map(({ id, ...rest }) => ({
                product_id: product.id.toString(),
                min_quantity: rest.min_quantity,
                unit_price: rest.unit_price
            })) as QuantityDiscountTier[];

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Manage Bulk Pricing</h2>
                        <p className="text-xs text-gray-400 mt-1 max-w-[400px] truncate">{product.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <span className="material-icons text-gray-400">close</span>
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 md:col-span-2">
                            <div className="flex gap-3">
                                <span className="material-icons text-blue-500">info_outline</span>
                                <div>
                                    <p className="text-sm font-bold text-blue-900 leading-tight">Tiered Discounts</p>
                                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                        Attract wholesale buyers by offering lower unit prices for higher quantities.
                                        Tiers must be in increasing order of quantity.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-center items-center text-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Standard Price</span>
                            <span className="text-xl font-black text-gray-900">{formatCurrency(product.price, product.currency)}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Discount Tiers</h3>
                            <button
                                type="button"
                                onClick={handleAddTier}
                                className="text-orange-600 hover:text-orange-700 text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-lg transition-colors"
                            >
                                <span className="material-icons text-sm">add</span>
                                Add New Tier
                            </button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2].map(i => <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />)}
                                </div>
                            ) : tiers.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-3">
                                        <span className="material-icons">inventory_2</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900">No bulk pricing tiers yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Click above to start adding wholesale prices.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {tiers.map((tier, index) => (
                                        <div key={tier.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-4 group">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1 ml-1">Min. Quantity</label>
                                                <input
                                                    type="number"
                                                    value={tier.min_quantity}
                                                    onChange={(e) => handleUpdateTier(index, 'min_quantity', Number(e.target.value))}
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1 ml-1">Wholesale price ($)</label>
                                                <input
                                                    type="number"
                                                    value={tier.unit_price}
                                                    onChange={(e) => handleUpdateTier(index, 'unit_price', Number(e.target.value))}
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRemoveTier(index)}
                                                className="p-2 text-gray-300 hover:text-red-500 transition-colors mt-4"
                                            >
                                                <span className="material-icons">delete_outline</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-8 py-2 bg-orange-500 text-white font-bold rounded-lg shadow-lg shadow-orange-500/10 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="material-icons text-sm">check_circle</span>
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManageQuantityDiscountsView;
