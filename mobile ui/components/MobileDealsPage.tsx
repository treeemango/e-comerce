import React, { useEffect, useState } from 'react';
import { fetchLightningDeals, LightningDealItem } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { Product } from '@/types';
import { ProductCard } from './ProductCard'; // Reusing the unified card

interface MobileDealsPageProps {
    onBack: () => void;
    onProductClick: (product: Product) => void;
    onVisualSearch?: (product: Product) => void;
}

export const MobileDealsPage: React.FC<MobileDealsPageProps> = ({ onBack, onProductClick, onVisualSearch }) => {
    const [deals, setDeals] = useState<LightningDealItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDeals();
    }, []);

    const loadDeals = async () => {
        try {
            // Fetch more deals for the full page
            const data = await fetchLightningDeals(undefined, 50);
            setDeals(data);
        } catch (error) {
            console.error('Failed to load deals page', error);
        } finally {
            setLoading(false);
        }
    };

    // Convert LightningDealItem to Product for the ProductCard
    const mapDealToProduct = (deal: LightningDealItem): Product => ({
        id: deal.id,
        title: deal.title,
        price: deal.price,
        originalPrice: deal.originalPrice,
        image: deal.image,
        discountPercent: deal.discountPercent,
        currency: deal.currency,
        rating: deal.rating || 0,
        reviews: deal.reviews || 0,
        deal_type: deal.deal_type,
        coupon_end: deal.coupon_end,
        coupon_name: deal.coupon_name,
        coupon_discount_percent: deal.coupon_discount_percent,
        is_express_delivery: deal.is_express_delivery,
        delivery_time_estimate: deal.delivery_time_estimate,
        delivery_time_days: deal.delivery_time_days,
        delivery_scope: deal.delivery_scope,
        stock: 50,
        in_stock: deal.in_stock ?? true,
        listing_type: deal.listing_type
    } as Product);

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 px-3 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <span className="material-icons-outlined text-2xl text-gray-700 dark:text-gray-300">arrow_back</span>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="material-icons text-orange-500">bolt</span>
                            Lightning Deals
                        </h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-grow p-2">
                {loading ? (
                    <div className="grid grid-cols-2 gap-2 w-full">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="aspect-[4/5] bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 w-full">
                        {deals.map(deal => (
                            <div key={deal.id} className="w-full min-w-0">
                                <ProductCard
                                    product={mapDealToProduct(deal)}
                                    onProductClick={onProductClick}
                                    onVisualSearch={onVisualSearch}
                                    showSellerLine={false}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
