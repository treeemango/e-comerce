
import React, { useEffect, useState } from 'react';
import { createAutomaticDiscount } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { getCurrencySymbol, getSellerCurrency } from '../../../lib/seller-currency';

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
    const [sellerCurrency, setSellerCurrency] = useState<string>('USD');
    const currencySymbol = getCurrencySymbol(sellerCurrency);
    const currencyLeftPadClass = currencySymbol.length <= 1
        ? 'pl-8'
        : currencySymbol.length === 2
            ? 'pl-10'
            : currencySymbol.length === 3
                ? 'pl-12'
                : 'pl-14';
    const currencyRightPadClass = currencySymbol.length <= 1
        ? 'pr-10'
        : currencySymbol.length === 2
            ? 'pr-12'
            : currencySymbol.length === 3
                ? 'pr-14'
                : 'pr-16';

    const [name, setName] = useState('');
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount' | 'buy_x_get_y'>('percentage');
    const [discountValueInput, setDiscountValueInput] = useState<string>('10');
    const [buyQtyInput, setBuyQtyInput] = useState<string>('2');
    const [getQtyInput, setGetQtyInput] = useState<string>('1');
    const [minRequirementValueInput, setMinRequirementValueInput] = useState<string>('0');
    const [startsAt, setStartsAt] = useState(new Date().toISOString().split('T')[0]);
    const [endsAt, setEndsAt] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const toNumberOrZero = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        const n = Number(trimmed);
        return Number.isFinite(n) ? Math.max(0, n) : 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const discountValue = toNumberOrZero(discountValueInput);
            const minRequirementValue = toNumberOrZero(minRequirementValueInput);
            const buyQty = Math.floor(toNumberOrZero(buyQtyInput));
            const getQty = Math.floor(toNumberOrZero(getQtyInput));

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
                            <div className="flex items-center mb-2">
                                <label className="block text-sm font-bold text-gray-700">Discount Name</label>
                                <FieldHelp text="Shown to customers at checkout. Use a clear name like 'Black Friday 10% OFF'." />
                            </div>
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
                            <div className="flex items-center mb-2">
                                <label className="block text-sm font-bold text-gray-700">Discount Type</label>
                                <FieldHelp text="Percentage: % off. Fixed: money off. Buy X Get Y: buy a quantity and get extra units free." />
                            </div>
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
                                        <div className="flex items-center">
                                            <label className="text-xs font-bold text-gray-600 uppercase">Buy Quantity</label>
                                            <FieldHelp text="How many items the buyer must purchase to trigger the offer." />
                                        </div>
                                        <input
                                            type="number"
                                            value={buyQtyInput}
                                            onChange={(e) => setBuyQtyInput(e.target.value)}
                                            min={0}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 font-bold focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <label className="text-xs font-bold text-gray-600 uppercase">Get Free Qty</label>
                                            <FieldHelp text="How many extra units the buyer receives for free." />
                                        </div>
                                        <input
                                            type="number"
                                            value={getQtyInput}
                                            onChange={(e) => setGetQtyInput(e.target.value)}
                                            min={0}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 font-bold focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center">
                                        <label className="text-xs font-bold text-gray-600 uppercase">
                                        {discountType === 'percentage' ? 'Percentage Off (%)' : `Amount Off (${sellerCurrency})`}
                                        </label>
                                        <FieldHelp text={discountType === 'percentage' ? 'Percent off each eligible item (e.g. 10 means 10% off).' : `Fixed amount off each eligible item (e.g. 5 means ${currencySymbol}5 off).`} />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                            {discountType === 'percentage' ? '%' : currencySymbol}
                                        </span>
                                        <input
                                            type="number"
                                            value={discountValueInput}
                                            onChange={(e) => setDiscountValueInput(e.target.value)}
                                            min={0}
                                            className={cn(
                                                "w-full border border-gray-300 rounded-lg pl-4 py-2 font-bold focus:border-orange-500 outline-none",
                                                discountType === 'percentage' ? 'pr-10' : currencyRightPadClass
                                            )}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Conditions & Dates */}
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center mb-2">
                                <label className="block text-sm font-bold text-gray-700">Minimum Requirement</label>
                                <FieldHelp text="Optional. Set a minimum order subtotal required before the automatic discount triggers." />
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currencySymbol}</span>
                                <input
                                    type="number"
                                    value={minRequirementValueInput}
                                    onChange={(e) => setMinRequirementValueInput(e.target.value)}
                                    min={0}
                                    placeholder="0.00"
                                    className={cn(
                                        "w-full border border-gray-300 rounded-lg pr-4 py-2.5 focus:border-orange-500 outline-none",
                                        currencyLeftPadClass
                                    )}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">Minimum purchase amount required to trigger the discount.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <label className="block text-sm font-bold text-gray-700">Start Date</label>
                                    <FieldHelp text="Discount becomes active on this date (local time)." />
                                </div>
                                <input
                                    type="date"
                                    value={startsAt}
                                    onChange={(e) => setStartsAt(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-orange-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <label className="block text-sm font-bold text-gray-700">End Date</label>
                                    <FieldHelp text="Discount stops applying after this date (local time)." />
                                </div>
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
                                    <>Customers will get <span className="font-bold">{toNumberOrZero(discountValueInput)}% off</span> products.</>
                                ) : discountType === 'fixed_amount' ? (
                                    <>Customers will get <span className="font-bold">{currencySymbol}{toNumberOrZero(discountValueInput)} off</span> products.</>
                                ) : (
                                    <>Buy <span className="font-bold">{Math.floor(toNumberOrZero(buyQtyInput))}</span>, get <span className="font-bold">{Math.floor(toNumberOrZero(getQtyInput))}</span> free.</>
                                )}
                                {toNumberOrZero(minRequirementValueInput) > 0 && (
                                    <> Applies to orders over <span className="font-bold">{currencySymbol}{toNumberOrZero(minRequirementValueInput)}</span>.</>
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
