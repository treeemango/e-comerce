import React, { useState, useEffect } from 'react';
import { fetchCoupons } from '../../lib/api';
import { PromoCoupon } from '../../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SellerPromotionsViewProps {
    sellerId: string;
    onCreateCoupon: () => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export const SellerPromotionsView: React.FC<SellerPromotionsViewProps> = ({ sellerId, onCreateCoupon }) => {
    const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'upcoming' | 'expired'>('all');

    useEffect(() => {
        const loadDat = async () => {
            setIsLoading(true);
            try {
                if (sellerId) {
                    const data = await fetchCoupons(sellerId);
                    setCoupons(data);
                }
            } catch (e) {
                console.error("Failed to load coupons", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadDat();
    }, [sellerId]);

    const filteredCoupons = coupons.filter(c => {
        if (activeTab === 'all') return true;
        // Simple client-side status mapping, assuming API returns status string or we derive it
        // The API actually returns a 'status' field: 'Ongoing' | 'Upcoming' | 'Expired'
        return c.status?.toLowerCase() === activeTab;
    });

    return (
        <div className="bg-gray-50 min-h-full pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
                <h2 className="text-xl font-bold text-gray-900">Promotions</h2>
                <p className="text-xs text-gray-500 mt-1">Manage your shop coupons and discounts</p>
            </div>

            {/* Tabs */}
            <div className="bg-white px-4 flex gap-6 border-b overflow-x-auto no-scrollbar">
                {['all', 'ongoing', 'upcoming', 'expired'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                            "py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors capitalize",
                            activeTab === tab
                                ? "border-orange-500 text-orange-600"
                                : "border-transparent text-gray-500"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* List */}
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
                        <div key={coupon.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 relative overflow-hidden">
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
                                    <span className="font-bold text-orange-600">
                                        {coupon.discount_amount ? `$${coupon.discount_amount} OFF` : `${coupon.discount_percentage}% OFF`}
                                    </span>
                                </div>
                                <div className="w-px h-8 bg-gray-100" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400">Usage</span>
                                    <span className="font-medium">
                                        {coupon.claimed_quantity}/{coupon.total_quantity || '∞'}
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

            {/* FAB */}
            <button
                onClick={onCreateCoupon}
                className="fixed bottom-24 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-90 transition-transform z-20"
            >
                <span className="material-icons text-2xl">add</span>
            </button>
        </div>
    );
};
