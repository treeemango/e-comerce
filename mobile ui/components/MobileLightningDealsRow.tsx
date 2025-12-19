import React, { useEffect, useState } from 'react';
import { fetchLightningDeals, LightningDealItem } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { Product } from '@/types';

interface MobileLightningDealsRowProps {
    onProductClick: (product: Product) => void;
    onViewAll: () => void;
}

export const MobileLightningDealsRow: React.FC<MobileLightningDealsRowProps> = ({ onProductClick, onViewAll }) => {
    const [deals, setDeals] = useState<LightningDealItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDeals();
    }, []);

    const loadDeals = async () => {
        try {
            const data = await fetchLightningDeals(undefined, 8);
            setDeals(data);
        } catch (error) {
            console.error('Failed to load mobile lightning deals', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="py-2 px-2 animate-pulse">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
                <div className="flex gap-2 overflow-hidden">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-32 h-40 bg-gray-200 dark:bg-gray-800 rounded-lg flex-shrink-0"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (deals.length === 0) return null;

    const getDealBadge = (deal: LightningDealItem) => {
        switch (deal.deal_type) {
            case 'coupon': return { color: 'from-orange-500 to-amber-500', text: 'COUPON', icon: 'local_offer' };
            case 'hot_discount': return { color: 'from-red-600 to-rose-600', text: 'HOT', icon: 'whatshot' };
            default: return { color: 'from-orange-500 to-red-500', text: 'DEAL', icon: 'bolt' };
        }
    };

    return (
        <div className="py-3 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-orange-950/10 dark:to-amber-950/10 border-y border-orange-100 dark:border-orange-900/30">
            {/* Header */}
            <div className="px-3 flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-200/50 dark:shadow-none">
                        <span className="material-icons text-lg">bolt</span>
                    </div>
                    <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white leading-none uppercase tracking-wide">Lightning Deals</div>
                        <div className="text-[10px] font-medium text-orange-600 dark:text-orange-400">Limited time offers</div>
                    </div>
                </div>
                <button
                    onClick={onViewAll}
                    className="flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-white/10 px-2 py-1 rounded-full border border-gray-200 dark:border-white/10"
                >
                    See all <span className="material-icons text-xs">chevron_right</span>
                </button>
            </div>

            {/* Row */}
            <div className="flex overflow-x-auto gap-3 px-3 pb-2 hide-scrollbar snap-x snap-mandatory">
                {deals.map(deal => {
                    const badge = getDealBadge(deal);
                    return (
                        <div
                            key={deal.id}
                            className="flex-shrink-0 w-36 snap-start bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 relative group active:scale-95 transition-transform"
                            onClick={() => onProductClick({
                                id: deal.id,
                                title: deal.title,
                                price: deal.price,
                                originalPrice: deal.originalPrice,
                                image: deal.image,
                                discountPercent: deal.discountPercent,
                                currency: deal.currency,
                                rating: 0,
                                reviews: 0
                            } as Product)}
                        >
                            <div className="aspect-[4/5] relative bg-gray-100 dark:bg-gray-800">
                                <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />

                                {/* Discount Tag */}
                                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                    -{deal.discountPercent}%
                                </div>

                                {/* Deal Type Badge */}
                                <div className={`absolute bottom-2 left-2 right-2 bg-gradient-to-r ${badge.color} text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center justify-center gap-1 backdrop-blur-sm`}>
                                    <span className="material-icons text-[10px]">{badge.icon}</span>
                                    {badge.text}
                                </div>
                            </div>
                            <div className="p-2">
                                <div className="text-sm font-bold text-red-600 dark:text-red-400">
                                    {formatPrice(deal.price, deal.currency)}
                                </div>
                                <div className="text-[10px] text-gray-400 line-through">
                                    {formatPrice(deal.originalPrice, deal.currency)}
                                </div>
                                <div className="mt-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 w-2/3 rounded-full"></div>
                                </div>
                                <div className="text-[9px] text-gray-500 mt-0.5 text-right">65% sold</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
