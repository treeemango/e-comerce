import React, { useEffect, useState } from 'react';
import { createAutomaticDiscount } from '../../lib/api';
import { AutomaticDiscount } from '../../types';
import { cn } from '../../lib/utils';
import { getCurrencySymbol, getSellerCurrency } from '../../lib/seller-currency';

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
                        <div className="fixed inset-0 z-[70]" onClick={close} />
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
    const [startsAtTime, setStartsAtTime] = useState('00:00');
    const [endsAtTime, setEndsAtTime] = useState('23:59');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toNumberOrZero = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        const n = Number(trimmed);
        return Number.isFinite(n) ? Math.max(0, n) : 0;
    };

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const startsAtIso = new Date(`${startsAt}T${startsAtTime}:00`).toISOString();
            const endsAtIso = new Date(`${endsAt}T${endsAtTime}:00`).toISOString();

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
                starts_at: startsAtIso,
                ends_at: endsAtIso,
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
                    <div className="flex items-center">
                        <label className="text-sm font-bold text-gray-700">Discount Name</label>
                        <FieldHelp text="Shown to customers at checkout. Use a clear name like 'Black Friday 10% OFF'." />
                    </div>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Summer Sale 2024"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                    />
                </div>

                {/* Sub-type Selection */}
                <div className="space-y-2">
                    <div className="flex items-center">
                        <label className="text-sm font-bold text-gray-700">Discount Type</label>
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

                {/* Values Based on Type */}
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

                {/* Requirements */}
                <div className="space-y-2">
                    <div className="flex items-center">
                        <label className="text-sm font-bold text-gray-700">Minimum Requirement</label>
                        <FieldHelp text="Optional. Set a minimum order subtotal required before the automatic discount triggers." />
                    </div>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currencySymbol}</span>
                        <input
                            type="number"
                            value={minRequirementValueInput}
                            onChange={(e) => setMinRequirementValueInput(e.target.value)}
                            min={0}
                            placeholder="Min. purchase amount (optional)"
                            className={cn(
                                "w-full border border-gray-300 rounded-lg pr-4 py-2.5 text-sm focus:border-orange-500 outline-none",
                                currencyLeftPadClass
                            )}
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 ml-1">Customers must spend this amount to trigger the discount.</p>
                </div>

                {/* Start Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <label className="text-sm font-bold text-gray-700">Start Date</label>
                            <FieldHelp text="Discount becomes active on this date (local time)." />
                        </div>
                        <input
                            type="date"
                            value={startsAt}
                            onChange={(e) => setStartsAt(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-orange-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <label className="text-sm font-bold text-gray-700">Start Time</label>
                            <FieldHelp text="Time of day the discount starts (local time)." />
                        </div>
                        <input
                            type="time"
                            value={startsAtTime}
                            onChange={(e) => setStartsAtTime(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-orange-500 outline-none"
                        />
                    </div>
                </div>

                {/* End Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <label className="text-sm font-bold text-gray-700">End Date</label>
                            <FieldHelp text="Discount stops applying after this date (local time)." />
                        </div>
                        <input
                            type="date"
                            value={endsAt}
                            onChange={(e) => setEndsAt(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-orange-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <label className="text-sm font-bold text-gray-700">End Time</label>
                            <FieldHelp text="Time of day the discount ends (local time)." />
                        </div>
                        <input
                            type="time"
                            value={endsAtTime}
                            onChange={(e) => setEndsAtTime(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-orange-500 outline-none"
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
