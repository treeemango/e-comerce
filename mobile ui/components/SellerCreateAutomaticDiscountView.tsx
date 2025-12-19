import React, { useState } from 'react';
import { createAutomaticDiscount } from '../../lib/api';
import { AutomaticDiscount } from '../../types';
import { cn } from '../../lib/utils';

interface SellerCreateAutomaticDiscountViewProps {
    sellerId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const SellerCreateAutomaticDiscountView: React.FC<SellerCreateAutomaticDiscountViewProps> = ({
    sellerId,
    onClose,
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
        <div className="fixed inset-0 bg-white z-[60] flex flex-col pt-safe animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="px-4 py-4 border-b flex items-center justify-between">
                <button onClick={onClose} className="p-2 -ml-2">
                    <span className="material-icons">close</span>
                </button>
                <h2 className="text-lg font-bold">New Automatic Discount</h2>
                <div className="w-10" />
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                {/* Discount Name */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Discount Title</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Summer Sale 2024"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                </div>

                {/* Sub-type Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Discount Type</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['percentage', 'fixed_amount', 'buy_x_get_y'] as const).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setDiscountType(type)}
                                className={cn(
                                    "py-3 px-1 rounded-xl text-[10px] font-bold border transition-all text-center leading-tight uppercase",
                                    discountType === type
                                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "bg-white border-gray-100 text-gray-500"
                                )}
                            >
                                {type.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Values Based on Type */}
                <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 space-y-4">
                    {discountType === 'buy_x_get_y' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-orange-600 uppercase">Buy Quantity</label>
                                <input
                                    type="number"
                                    value={buyQty}
                                    onChange={(e) => setBuyQty(Number(e.target.value))}
                                    className="w-full bg-white border border-orange-100 rounded-xl px-4 py-3 text-sm font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-orange-600 uppercase">Get Free Qty</label>
                                <input
                                    type="number"
                                    value={getQty}
                                    onChange={(e) => setGetQty(Number(e.target.value))}
                                    className="w-full bg-white border border-orange-100 rounded-xl px-4 py-3 text-sm font-bold"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-orange-600 uppercase">
                                {discountType === 'percentage' ? 'Percentage Off (%)' : 'Amount Off ($)'}
                            </label>
                            <input
                                type="number"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(Number(e.target.value))}
                                className="w-full bg-white border border-orange-100 rounded-xl px-4 py-3 text-sm font-bold"
                            />
                        </div>
                    )}
                </div>

                {/* Requirements */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Minimum Requirement</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input
                            type="number"
                            value={minRequirementValue}
                            onChange={(e) => setMinRequirementValue(Number(e.target.value))}
                            placeholder="Min. purchase amount (optional)"
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-8 pr-4 py-3 text-sm font-medium focus:outline-none"
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 ml-1">Customers must spend this amount to trigger the discount.</p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Starts At</label>
                        <input
                            type="date"
                            value={startsAt}
                            onChange={(e) => setStartsAt(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ends At</label>
                        <input
                            type="date"
                            value={endsAt}
                            onChange={(e) => setEndsAt(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none"
                        />
                    </div>
                </div>
            </form>

            <div className="p-4 border-t bg-white sticky bottom-0">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !name}
                    className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span className="material-icons text-lg">check_circle</span>
                            Confirm & Activate
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
