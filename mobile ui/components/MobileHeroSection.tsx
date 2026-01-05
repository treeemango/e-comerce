import React, { useState, useEffect, useMemo } from 'react';
import { fetchHeroDeals, type LightningDealItem } from '@/lib/api';
import { useCurrencyConverter, formatPrice as currencyFormatPrice } from '@/lib/currency';
import { Product } from '@/types';
import { fetchEventBanner, type EventBannerData, TRUST_BADGES } from '@/lib/event-banner-service';
import { getEventIconSrc } from '@/lib/event-icons';

// Thematic Mapping for Categories (Shared logic but mobile-tuned colors)
const CATEGORY_THEMES: Record<string, { gradient: string; accent: string; text: string }> = {
    'electronics': {
        gradient: 'from-slate-900 via-blue-900 to-slate-950',
        accent: 'text-blue-400',
        text: 'text-white'
    },
    'fashion': {
        gradient: 'from-rose-900 via-pink-900/40 to-slate-900',
        accent: 'text-pink-300',
        text: 'text-white'
    },
    'beauty': {
        gradient: 'from-purple-900 via-fuchsia-900/30 to-slate-900',
        accent: 'text-fuchsia-300',
        text: 'text-white'
    },
    'home': {
        gradient: 'from-emerald-900 via-teal-900/30 to-slate-900',
        accent: 'text-teal-300',
        text: 'text-white'
    },
    'sports': {
        gradient: 'from-orange-900 via-red-900/30 to-slate-900',
        accent: 'text-orange-300',
        text: 'text-white'
    },
    'default': {
        gradient: 'from-slate-900 via-gray-900 to-black',
        accent: 'text-yellow-400',
        text: 'text-white'
    }
};

const THEME_LIST = Object.values(CATEGORY_THEMES).filter(t => t !== CATEGORY_THEMES.default);

const getTheme = (categoryId?: string, index: number = 0) => {
    if (!categoryId) return THEME_LIST[index % THEME_LIST.length] || CATEGORY_THEMES.default;
    const key = categoryId.toLowerCase();
    for (const themeKey in CATEGORY_THEMES) {
        if (themeKey !== 'default' && key.includes(themeKey)) return CATEGORY_THEMES[themeKey];
    }
    return THEME_LIST[index % THEME_LIST.length] || CATEGORY_THEMES.default;
};

interface MobileHeroSectionProps {
    onProductClick?: (product: Product) => void;
    eventBanner?: EventBannerData | null;
}

export const MobileHeroSection: React.FC<MobileHeroSectionProps> = ({ onProductClick, eventBanner: propEventBanner }) => {
    const [deals, setDeals] = useState<LightningDealItem[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isBannerLoading, setIsBannerLoading] = useState(!propEventBanner);
    const [internalEventBanner, setInternalEventBanner] = useState<EventBannerData | null>(null);

    const eventBanner = propEventBanner || internalEventBanner;

    useEffect(() => {
        loadDeals();
        // Fetch dynamic event banner if not provided by parent
        if (!propEventBanner) {
            fetchEventBanner()
                .then(setInternalEventBanner)
                .catch(console.error)
                .finally(() => setIsBannerLoading(false));
        }
    }, [propEventBanner]);

    const loadDeals = async () => {
        try {
            const data = await fetchHeroDeals(undefined, 5);
            if (data && data.length > 0) {
                setDeals(data);
            }
        } catch (e) {
            console.error('MobileHeroSection fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (deals.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % deals.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [deals.length]);

    // Currency conversion for deal prices - MUST be before any early returns
    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];
        deals.forEach((deal, idx) => {
            vals.push({ id: `deal-${idx}-price`, amount: deal.price, currency: deal.currency || 'USD' });
        });
        return vals;
    }, [deals]);

    const { convertedValues, preferredCurrency } = useCurrencyConverter(priceValues);

    const getConvertedPrice = (idx: number, fallback: number) => {
        return convertedValues[`deal-${idx}-price`]?.converted ?? currencyFormatPrice(fallback, preferredCurrency);
    };

    // Wait for both deals and banner to load
    if (loading || isBannerLoading) {
        return (
            <div className="w-full h-56 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 animate-pulse flex flex-col items-center justify-center gap-3 rounded-xl mx-2">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-slate-700 rounded-lg" />
                    <div className="h-3 w-32 bg-slate-700 rounded" />
                </div>
                <div className="h-24 w-24 bg-slate-700 rounded-xl" />
                <div className="h-4 w-48 bg-slate-700 rounded" />
                <div className="text-white/20 text-[10px] font-bold tracking-widest uppercase mt-2">Loading Banner...</div>
            </div>
        );
    }

    if (deals.length === 0) return null;

    return (
        <div className="relative w-full overflow-hidden">
            {/* Banner Overlay */}
            {eventBanner && eventBanner.eventName !== 'default' && (
                <div
                    className="absolute top-0 inset-x-0 h-10 flex items-center justify-between px-6 z-20 text-white overflow-hidden group/event cursor-pointer"
                    style={{
                        background: `linear-gradient(90deg, ${eventBanner.backgroundColor}, ${eventBanner.accentColor}dd)`
                    }}
                    onClick={() => {
                        const url = new URL(window.location.href);
                        url.search = '';
                        url.searchParams.set('view', 'event-deals');
                        url.searchParams.set('event', eventBanner.eventName || 'Event Deals');
                        const rawParts = [
                            eventBanner.eventName || 'Event Deals',
                            eventBanner.searchQuery || '',
                            eventBanner.headline || '',
                            eventBanner.subheadline || '',
                            eventBanner.lightningDealsTitle || '',
                            eventBanner.trendingTitle || ''
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
                        window.open(url.toString(), '_blank');
                    }}
                >
                    <div className={`flex items-center gap-2 ${eventBanner.layout === 'center' ? 'mx-auto' : ''}`}>
                        <div className="flex items-center gap-1.5">
                            {(eventBanner.iconKeys || [eventBanner.iconKey]).filter(Boolean).map((key, idx) => (
                                <div key={idx} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md border border-white/20 shadow-sm animate-pulse-slow">
                                    <img src={getEventIconSrc(key as string)} alt="" className="h-4 w-4 object-contain" />
                                </div>
                            ))}
                        </div>
                        <div className={`flex flex-col ${eventBanner.layout === 'center' ? 'items-center' : ''}`}>
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/70 leading-none">{eventBanner.eventName}</span>
                            <h3 className="text-[10px] font-black tracking-tight uppercase mt-0.5 line-clamp-1">{eventBanner.headline}</h3>
                        </div>
                    </div>
                    <button className="px-3 py-1 bg-white text-black text-[8px] font-black rounded-full shadow-lg">
                        {eventBanner.cta}
                    </button>
                </div>
            )}

            {/* Urgency Badge */}
            {eventBanner?.urgencyText && (
                <div className="absolute top-12 right-6 z-20 animate-pulse">
                    <div className="bg-red-600 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-tighter">
                        <span className="material-icons text-[10px]">timer</span>
                        {eventBanner.urgencyText}
                    </div>
                </div>
            )}

            <div className={`relative w-full ${eventBanner && eventBanner.eventName !== 'default' ? 'h-[300px]' : 'h-[260px]'}`}>
                {deals.map((deal, idx) => {
                    const isActive = idx === currentSlide;
                    const theme = getTheme(deal.category_id || deal.category_name, idx);

                    return (
                        <div
                            key={deal.id}
                            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${isActive ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-10 scale-95 pointer-events-none'}`}
                        >
                            {/* Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
                            <div className="absolute inset-0 bg-black/20" /> {/* Slight overlay for text clarity */}

                            {/* Ambient Glows */}
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full transition-all duration-1000 ${isActive ? 'opacity-100 scale-150' : 'opacity-0 scale-50'}`} />

                            <div className={`absolute inset-0 flex items-center px-6 gap-4 ${eventBanner && eventBanner.eventName !== 'default' ? 'pt-10' : ''}`}>
                                {/* Product Info */}
                                <div className="flex-1 flex flex-col justify-center h-full z-10 space-y-2">
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 w-fit">
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                        <span className="text-[8px] font-black text-white/90 uppercase tracking-tighter">{deal.tag || 'Elite Deal'}</span>
                                    </div>

                                    <h2 className="text-lg font-black text-white leading-tight line-clamp-2 drop-shadow-lg">
                                        {deal.title}
                                    </h2>

                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                        <span className="text-xl font-black text-white truncate max-w-[120px]">{getConvertedPrice(idx, deal.price)}</span>
                                        {deal.discountPercent > 0 && (
                                            <span className="text-[8px] font-bold text-red-100 px-1 py-0.5 bg-red-600 rounded-md shrink-0">-{deal.discountPercent}%</span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => onProductClick?.({
                                            id: deal.id,
                                            title: deal.title,
                                            price: deal.price,
                                            image: deal.image,
                                            currency: deal.currency,
                                            originalPrice: deal.originalPrice,
                                            discountPercent: deal.discountPercent,
                                            rating: deal.rating,
                                            reviews: deal.reviews,
                                            category: deal.category_name,
                                            seller_id: deal.seller_id || deal.vendor_id,
                                            vendor: deal.vendor,
                                        } as Product)}
                                        className="mt-1 bg-white text-black text-[9px] font-black px-4 py-2 rounded-xl shadow-xl w-fit flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                                    >
                                        GET IT NOW
                                        <span className="material-icons-outlined text-[10px]">arrow_forward</span>
                                    </button>

                                    {/* Trust Badges */}
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        {TRUST_BADGES.slice(0, 2).map((badge, idx) => (
                                            <span
                                                key={idx}
                                                className="flex items-center gap-1 text-white/60 text-[8px]"
                                            >
                                                <span
                                                    className="material-icons-outlined text-[10px]"
                                                    style={{ color: badge.color }}
                                                >
                                                    {badge.icon}
                                                </span>
                                                {badge.text}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Product Visual */}
                                <div className="relative w-[120px] h-[180px] flex items-center justify-center shrink-0">
                                    {/* Glass Platform */}
                                    <div className="absolute bottom-4 inset-x-0 h-4 bg-black/40 blur-xl rounded-[100%] scale-x-50" />

                                    <div className="relative w-full h-[150px] flex items-center justify-center p-2 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                                        <img
                                            src={deal.image}
                                            alt={deal.title}
                                            className={`w-full h-full object-contain drop-shadow-2xl transition-all duration-1000 delay-300 ${isActive ? 'scale-100 rotate-0' : 'scale-75 rotate-12 opacity-50'}`}
                                        />
                                    </div>

                                    {((deal.rating ?? 0) > 0 && (deal.reviews ?? 0) > 0) && (
                                        <div className="absolute -top-1 -right-1 bg-white shadow-xl p-1.5 rounded-lg rotate-12 flex items-center gap-0.5 border border-white">
                                            <span className="material-icons-round text-slate-900 dark:text-slate-100 text-[8px]">star</span>
                                            <span className="text-[9px] font-black">{deal.rating?.toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Slide Indicators */}
                <div className="absolute bottom-4 left-6 z-20 flex gap-1.5">
                    {deals.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const styles = `
@keyframes pulse-slow {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}
.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}
`;

if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}
