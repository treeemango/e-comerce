import React, { useEffect, useMemo, useState } from 'react';
import { fetchLightningDeals, LightningDealItem } from '@/lib/api';
import { Product } from '@/types';
import { ProductCard } from './ProductCard'; // Reusing the unified card
import { type EventBannerData } from '@/lib/event-banner-service';
import { getEventIconSrc } from '@/lib/event-icons';

interface MobileDealsPageProps {
    onBack: () => void;
    onProductClick: (product: Product) => void;
    onVisualSearch?: (product: Product) => void;
    eventBanner?: EventBannerData | null;
}

export const MobileDealsPage: React.FC<MobileDealsPageProps> = ({ onBack, onProductClick, onVisualSearch, eventBanner }) => {
    const [deals, setDeals] = useState<LightningDealItem[]>([]);
    const [loading, setLoading] = useState(true);

    const showEventBanner = !!eventBanner && eventBanner.eventName !== 'default';

    const eventBannerBackground = useMemo(() => {
        if (!showEventBanner) return undefined;
        return `linear-gradient(90deg, ${eventBanner!.backgroundColor}, ${eventBanner!.accentColor}dd)`;
    }, [eventBanner, showEventBanner]);

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
        media: deal.media,
        gallery_media: deal.gallery_media,
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
        seller_id: (deal as any).seller_id || (deal as any).vendor_id,
        vendor: (deal as any).vendor,
        stock: 50,
        in_stock: deal.in_stock ?? true,
        listing_type: deal.listing_type
    } as Product);

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col">
            {/* Header */}
            <div className="shadow-sm">
                {showEventBanner && (
                    <div
                        className="h-10 flex items-center justify-between px-4 text-white overflow-hidden cursor-pointer"
                        style={{ background: eventBannerBackground }}
                        onClick={() => {
                            const url = new URL(window.location.href);
                            url.search = '';
                            url.searchParams.set('view', 'event-deals');
                            url.searchParams.set('event', eventBanner?.eventName || 'Event Deals');
                            const rawParts = [
                                eventBanner?.eventName || 'Event Deals',
                                eventBanner?.searchQuery || '',
                                eventBanner?.headline || '',
                                eventBanner?.subheadline || '',
                                eventBanner?.lightningDealsTitle || '',
                                eventBanner?.trendingTitle || ''
                            ];
                            const parts = Array.from(
                                new Set(
                                    rawParts
                                        .map(p => String(p || '').trim())
                                        .filter(Boolean)
                                        .map(p => p.slice(0, 60))
                                )
                            ).slice(0, 6);
                            const search = parts.join('|').slice(0, 240);
                            url.searchParams.set('search', search);
                            window.open(url.toString(), '_self');
                        }}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="flex items-center gap-1.5">
                                {(eventBanner?.iconKeys || [eventBanner?.iconKey]).filter(Boolean).slice(0, 2).map((key, idx) => (
                                    <div
                                        key={idx}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md border border-white/20 shadow-sm"
                                    >
                                        <img src={getEventIconSrc(key as string)} alt="" className="h-4 w-4 object-contain" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/70 leading-none truncate">{eventBanner?.eventName}</span>
                                <span className="text-[10px] font-black tracking-tight uppercase mt-0.5 line-clamp-1 truncate">{eventBanner?.headline || 'Event Deals'}</span>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-white text-black text-[8px] font-black rounded-full shadow-lg shrink-0">
                            {eventBanner?.cta || 'Shop Now'}
                        </div>
                    </div>
                )}

                <div
                    className={`px-3 py-3 border-b ${showEventBanner ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'} ${showEventBanner ? '' : 'bg-white dark:bg-surface-dark'} ${showEventBanner ? 'text-white' : ''}`}
                    style={showEventBanner ? { background: eventBannerBackground } : undefined}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className={`p-1 rounded-full transition-colors ${showEventBanner ? 'hover:bg-white/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                            <span className={`material-icons-outlined text-2xl ${showEventBanner ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>arrow_back</span>
                        </button>
                        <div className="flex-1">
                            <h1 className={`text-lg font-bold flex items-center gap-2 ${showEventBanner ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                <span className={`material-icons ${showEventBanner ? 'text-white' : 'text-orange-500'}`}>bolt</span>
                                Lightning Deals
                            </h1>
                        </div>
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
