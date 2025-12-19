
import React, { useState } from 'react';
import { createAutomaticDiscount } from '../../../lib/api';
import { cn } from '../../../lib/utils';

interface CreateAutomaticDiscountViewProps {
    sellerId: string;
    onCancel: () => void;
    onSuccess: () => void;
}

const CreateAutomaticDiscountView: React.FC<CreateAutomaticDiscountViewProps> = ({
    sellerId,
    onCancel,
    onSuccess
}) => {
    const [name, setName] = useState('');
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount' | 'buy_x_get_y'>('percentage');
    const [discountValue, setDiscountValue] = useState<number>(10);
    const [buyQty, setBuyQty] = useState<number>(2);
    const [getQty, setGetQty] = useState<number>(1);
    const [minRequirementValue, setMinRequirementValue] = useState<number>(0);
    const [startsAt, setStartsAt] = useState(new Date().toISOString().split('T')[0]);
    const [endsAt, setEndsAt] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const success = await createAutomaticDiscount({
                seller_id: sellerId,
                name,
                discount_type: discountType,
                discount_value: discountValue,
                buy_qty: discountType === 'buy_x_get_y' ? buyQty : null,
                get_qty: discountType === 'buy_x_get_y' ? getQty : null,
                min_requirement_value: minRequirementValue,
                starts_at: new Date(startsAt).toISOString(),
                ends_at: new Date(endsAt).toISOString(),
                status: 'active'
            });

            if (success) {
                onSuccess();
            } else {
                alert('Failed to create discount');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Create Automatic Discount</h2>
                <p className="text-sm text-gray-500 mt-1">Automatic discounts apply to all eligible products without requiring a coupon code.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Basic Info */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Discount Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Black Friday Special"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                            />
                            <p className="text-xs text-gray-400 mt-1.5">This name will be visible to customers at checkout.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Discount Type</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(['percentage', 'fixed_amount', 'buy_x_get_y'] as const).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setDiscountType(type)}
                                        className={cn(
                                            "py-3 px-2 rounded-lg text-xs font-bold border transition-all text-center",
                                            discountType === type
                                                ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20"
                                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                                        )}
                                    >
                                        {type.replace(/_/g, ' ').toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                            {discountType === 'buy_x_get_y' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Buy Quantity</label>
                                        <input
                                            type="number"
                                            value={buyQty}
                                            onChange={(e) => setBuyQty(Number(e.target.value))}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 font-bold focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Get Free Qty</label>
                                        <input
                                            type="number"
                                            value={getQty}
                                            onChange={(e) => setGetQty(Number(e.target.value))}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 font-bold focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-600 uppercase">
                                        {discountType === 'percentage' ? 'Percentage Off (%)' : 'Amount Off ($)'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                            {discountType === 'percentage' ? '%' : '$'}
                                        </span>
                                        <input
                                            type="number"
                                            value={discountValue}
                                            onChange={(e) => setDiscountValue(Number(e.target.value))}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 font-bold focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Conditions & Dates */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Minimum Requirement</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input
                                    type="number"
                                    value={minRequirementValue}
                                    onChange={(e) => setMinRequirementValue(Number(e.target.value))}
                                    placeholder="0.00"
                                    className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:border-orange-500 outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">Minimum purchase amount required to trigger the discount.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">Start Date</label>
                                <input
                                    type="date"
                                    value={startsAt}
                                    onChange={(e) => setStartsAt(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-orange-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">End Date</label>
                                <input
                                    type="date"
                                    value={endsAt}
                                    onChange={(e) => setEndsAt(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-orange-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 mt-auto">
                            <h4 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                                <span className="material-icons text-orange-500 text-sm">info</span>
                                Summary
                            </h4>
                            <p className="text-sm text-orange-800 leading-relaxed">
                                {discountType === 'percentage' ? (
                                    <>Customers will get <span className="font-bold">{discountValue}% off</span> products.</>
                                ) : discountType === 'fixed_amount' ? (
                                    <>Customers will get <span className="font-bold">${discountValue} off</span> products.</>
                                ) : (
                                    <>Buy <span className="font-bold">{buyQty}</span>, get <span className="font-bold">{getQty}</span> free.</>
                                )}
                                {minRequirementValue > 0 && (
                                    <> Applies to orders over <span className="font-bold">${minRequirementValue}</span>.</>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100 flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !name}
                        className="px-10 py-2.5 bg-orange-500 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="material-icons text-sm">check_circle</span>
                                Activate Discount
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateAutomaticDiscountView;
