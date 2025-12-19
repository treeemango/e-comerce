import React, { useState, useEffect } from 'react';
import { fetchCoupons, fetchAutomaticDiscounts } from '../../lib/api';
import { PromoCoupon, AutomaticDiscount } from '../../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SellerPromotionsViewProps {
    sellerId: string;
    onCreateCoupon: () => void;
    onCreateAutomaticDiscount?: () => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export const SellerPromotionsView: React.FC<SellerPromotionsViewProps> = ({
    sellerId,
    onCreateCoupon,
    onCreateAutomaticDiscount
}) => {
    const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
    const [autoDiscounts, setAutoDiscounts] = useState<AutomaticDiscount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mainTab, setMainTab] = useState<'coupons' | 'automatic'>('coupons');
    const [couponTab, setCouponTab] = useState<'all' | 'ongoing' | 'upcoming' | 'expired'>('all');

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                if (sellerId) {
                    const [couponData, autoData] = await Promise.all([
                        fetchCoupons(sellerId),
                        fetchAutomaticDiscounts(sellerId)
                    ]);
                    setCoupons(couponData);
                    setAutoDiscounts(autoData);
                }
            } catch (e) {
                console.error("Failed to load promotions", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [sellerId]);

    const filteredCoupons = coupons.filter(c => {
        if (couponTab === 'all') return true;
        return c.status?.toLowerCase() === couponTab;
    });

    return (
        <div className="bg-gray-50 min-h-full pb-20">
            {/* Header */}
            <div className="bg-white px-4 pt-4 pb-0 sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Promotions</h2>
                        <p className="text-xs text-gray-500 mt-1">Boost your sales with deals</p>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex gap-4 border-b">
                    <button
                        onClick={() => setMainTab('coupons')}
                        className={cn(
                            "pb-3 px-2 text-sm font-bold transition-all border-b-2",
                            mainTab === 'coupons' ? "border-orange-500 text-orange-600" : "border-transparent text-gray-400"
                        )}
                    >
                        Seller Coupons
                    </button>
                    <button
                        onClick={() => setMainTab('automatic')}
                        className={cn(
                            "pb-3 px-2 text-sm font-bold transition-all border-b-2",
                            mainTab === 'automatic' ? "border-orange-500 text-orange-600" : "border-transparent text-gray-400"
                        )}
                    >
                        Automatic Discounts
                    </button>
                </div>
            </div>

            {mainTab === 'coupons' && (
                <>
                    {/* Sub Tabs for Coupons */}
                    <div className="bg-white px-4 flex gap-6 border-b overflow-x-auto no-scrollbar">
                        {['all', 'ongoing', 'upcoming', 'expired'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setCouponTab(tab as any)}
                                className={cn(
                                    "py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors capitalize",
                                    couponTab === tab
                                        ? "border-orange-500 text-orange-600"
                                        : "border-transparent text-gray-500"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 space-y-3">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : filteredCoupons.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                                <span className="material-icons text-4xl mb-2 opacity-30">local_offer</span>
                                <p>No coupons found in this category.</p>
                            </div>
                        ) : (
                            filteredCoupons.map(coupon => (
                                <div key={coupon.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 relative overflow-hidden transition-all active:scale-[0.98]">
                                    {/* Status Badge */}
                                    <div className={cn(
                                        "absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider",
                                        coupon.status === 'Ongoing' ? "bg-green-100 text-green-700" :
                                            coupon.status === 'Expired' ? "bg-red-100 text-red-700" :
                                                "bg-blue-100 text-blue-700"
                                    )}>
                                        {coupon.status}
                                    </div>

                                    <div className="pr-12">
                                        <h3 className="font-bold text-gray-900 text-lg">{coupon.name}</h3>
                                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                                            Code: <span className="text-gray-900 bg-gray-100 px-1 rounded">{coupon.code || 'AUTO'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-700">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400">Discount</span>
                                            <span className="font-bold text-orange-600 text-base">
                                                {coupon.discount_amount ? `$${coupon.discount_amount}` : `${coupon.discount_percentage}%`} OFF
                                            </span>
                                        </div>
                                        <div className="w-px h-8 bg-gray-100" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400">Usage</span>
                                            <span className="font-medium">
                                                {coupon.claimed_quantity}/{coupon.total_quantity || '∞'}
                                            </span>
                                        </div>
                                        <div className="w-px h-8 bg-gray-100" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400">Ends In</span>
                                            <span className="font-medium text-orange-600">
                                                {Math.ceil((new Date(coupon.end_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-gray-400 border-t pt-2 mt-1">
                                        {new Date(coupon.start_time).toLocaleDateString()} - {new Date(coupon.end_time).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {mainTab === 'automatic' && (
                <div className="p-4 space-y-3">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : autoDiscounts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                            <span className="material-icons text-4xl mb-2 opacity-20">flash_on</span>
                            <p className="text-sm font-medium">No automatic discounts</p>
                            <p className="text-xs opacity-60 mt-1 max-w-[200px]">Create rules like "10% off for orders over $100" to boost basket size</p>
                            <button
                                onClick={onCreateAutomaticDiscount}
                                className="mt-4 px-4 py-2 bg-orange-100 text-orange-600 rounded-lg text-sm font-bold"
                            >
                                Setup Now
                            </button>
                        </div>
                    ) : (
                        autoDiscounts.map(discount => (
                            <div key={discount.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between transition-all active:scale-[0.98]">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                                        <span className="material-icons">
                                            {discount.discount_type === 'percentage' ? 'percent' :
                                                discount.discount_type === 'fixed_amount' ? 'payments' : 'card_giftcard'}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{discount.name}</h3>
                                        <div className="text-xs text-orange-600 font-bold">
                                            {discount.discount_type === 'buy_x_get_y'
                                                ? `Buy ${discount.buy_qty} Get ${discount.get_qty} FREE`
                                                : discount.discount_type === 'percentage'
                                                    ? `${discount.discount_value}% OFF`
                                                    : `$${discount.discount_value} OFF`}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                            {discount.min_requirement_value > 0 ? `Min. spend $${discount.min_requirement_value}` : 'No minimum'}
                                        </div>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                    discount.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                )}>
                                    {discount.status}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* FAB */}
            <button
                onClick={mainTab === 'coupons' ? onCreateCoupon : onCreateAutomaticDiscount}
                className="fixed bottom-24 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-90 transition-transform z-20"
            >
                <span className="material-icons text-2xl">add</span>
            </button>
        </div>
    );
};

