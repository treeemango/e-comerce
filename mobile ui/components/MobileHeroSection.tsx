import React, { useState, useEffect } from 'react';
import { fetchHeroDeals, type LightningDealItem } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { Product } from '@/types';

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
}

export const MobileHeroSection: React.FC<MobileHeroSectionProps> = ({ onProductClick }) => {
    const [deals, setDeals] = useState<LightningDealItem[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDeals();
    }, []);

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

    if (loading) {
        return (
            <div className="w-full h-48 bg-gray-900 animate-pulse flex items-center justify-center">
                <div className="text-white/20 text-xs font-bold tracking-widest uppercase">Loading Elite Deals...</div>
            </div>
        );
    }

    if (deals.length === 0) return null;

    return (
        <div className="relative w-full h-[220px] overflow-hidden">
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

                        <div className="absolute inset-0 flex items-center px-6 gap-4">
                            {/* Product Info */}
                            <div className="flex-1 flex flex-col justify-center h-full z-10 space-y-2">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 w-fit">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                    <span className="text-[8px] font-black text-white/90 uppercase tracking-tighter">{deal.tag || 'Elite Deal'}</span>
                                </div>

                                <h2 className="text-xl font-black text-white leading-tight line-clamp-2 drop-shadow-lg">
                                    {deal.title}
                                </h2>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-white">{formatPrice(deal.price, deal.currency)}</span>
                                    {deal.discountPercent > 0 && (
                                        <span className="text-[10px] font-bold text-red-100 px-1.5 py-0.5 bg-red-600 rounded-lg">-{deal.discountPercent}%</span>
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
                                    } as Product)}
                                    className="mt-2 bg-white text-black text-[10px] font-black px-5 py-2 rounded-xl shadow-xl w-fit flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                                >
                                    GET IT NOW
                                    <span className="material-icons-outlined text-xs">arrow_forward</span>
                                </button>
                            </div>

                            {/* Product Visual */}
                            <div className="relative w-[130px] h-[160px] flex items-center justify-center">
                                {/* Glass Platform */}
                                <div className="absolute bottom-4 inset-x-0 h-4 bg-black/40 blur-xl rounded-[100%] scale-x-50" />

                                <div className="relative w-full h-full flex items-center justify-center p-2 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                                    <img
                                        src={deal.image}
                                        alt={deal.title}
                                        className={`w-full h-full object-contain drop-shadow-2xl transition-all duration-1000 delay-300 ${isActive ? 'scale-100 rotate-0' : 'scale-75 rotate-12 opacity-50'}`}
                                    />
                                </div>

                                {((deal.rating ?? 0) > 0 && (deal.reviews ?? 0) > 0) && (
                                    <div className="absolute -top-2 -right-2 bg-white shadow-xl p-2 rounded-xl rotate-12 flex items-center gap-0.5 border border-white">
                                        <span className="material-icons-round text-slate-900 dark:text-slate-100 text-[10px]">star</span>
                                        <span className="text-[10px] font-black">{deal.rating?.toFixed(1)}</span>
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
    );
};
