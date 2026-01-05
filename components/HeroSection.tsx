import React, { useState, useEffect, useMemo } from 'react';
import { fetchHeroDeals, type LightningDealItem } from '@/lib/api';
import { useCurrencyConverter } from '@/lib/currency';
import { Product } from '@/types';
import { fetchEventBanner, type EventBannerData, TRUST_BADGES } from '@/lib/event-banner-service';
import { getEventIconSrc } from '@/lib/event-icons';

// Vibe-based gradients for event banners
const VIBE_GRADIENTS: Record<string, string> = {
  romantic: 'linear-gradient(135deg, #9f1239, #ec4899)',
  festive: 'linear-gradient(135deg, #166534, #fbbf24)',
  patriotic: 'linear-gradient(135deg, #1e3a8a, #dc2626)',
  premium: 'linear-gradient(135deg, #1e293b, #fbbf24)',
  fun: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
  spiritual: 'linear-gradient(135deg, #0f3460, #e2c044)'
};

const getEventBannerGradient = (banner: EventBannerData) => {
  const hasAiColors = Boolean(banner.backgroundColor) && Boolean(banner.accentColor);
  if (hasAiColors) return `linear-gradient(135deg, ${banner.backgroundColor}, ${banner.accentColor})`;
  return VIBE_GRADIENTS[banner.vibe || 'premium'] || VIBE_GRADIENTS.premium;
};

// Thematic Mapping for Categories
const CATEGORY_THEMES: Record<string, { gradient: string; accent: string; text: string }> = {
  'electronics': {
    gradient: 'from-slate-950 via-blue-950 to-slate-900',
    accent: 'text-blue-400',
    text: 'text-white'
  },
  'women-clothing': {
    gradient: 'from-rose-950 via-pink-900/40 to-slate-900',
    accent: 'text-pink-300',
    text: 'text-white'
  },
  'men-clothing': {
    gradient: 'from-gray-950 via-slate-900 to-black',
    accent: 'text-amber-400',
    text: 'text-white'
  },
  'beauty': {
    gradient: 'from-purple-950 via-fuchsia-900/30 to-slate-900',
    accent: 'text-fuchsia-300',
    text: 'text-white'
  },
  'home': {
    gradient: 'from-emerald-950 via-teal-900/30 to-slate-900',
    accent: 'text-teal-300',
    text: 'text-white'
  },
  'sports': {
    gradient: 'from-orange-950 via-red-900/30 to-slate-900',
    accent: 'text-orange-300',
    text: 'text-white'
  },
  'default': {
    gradient: 'from-gray-900 via-gray-800 to-black',
    accent: 'text-yellow-400',
    text: 'text-white'
  }
};

const THEME_LIST = Object.values(CATEGORY_THEMES).filter(t => t !== CATEGORY_THEMES.default);

const getTheme = (categoryId?: string, index: number = 0) => {
  if (!categoryId) {
    // Variety based on index if no category
    return THEME_LIST[index % THEME_LIST.length] || CATEGORY_THEMES.default;
  }

  const key = categoryId.toLowerCase();
  for (const themeKey in CATEGORY_THEMES) {
    if (themeKey !== 'default' && key.includes(themeKey)) return CATEGORY_THEMES[themeKey];
  }

  return THEME_LIST[index % THEME_LIST.length] || CATEGORY_THEMES.default;
};

interface HeroSectionProps {
  onProductClick?: (product: Product) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onProductClick }) => {
  const [deals, setDeals] = useState<LightningDealItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBannerLoading, setIsBannerLoading] = useState(true);
  const [playedVideos, setPlayedVideos] = useState<string[]>([]);
  const [eventBanner, setEventBanner] = useState<EventBannerData | null>(null);

  // Load played videos from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('hero_videos_played');
      if (stored) {
        setPlayedVideos(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error reading sessionStorage:', e);
    }
  }, []);

  useEffect(() => {
    loadDeals();
    // Fetch dynamic event banner
    fetchEventBanner()
      .then(setEventBanner)
      .catch(console.error)
      .finally(() => setIsBannerLoading(false));
  }, []);

  const loadDeals = async () => {
    try {
      const data = await fetchHeroDeals();
      if (data && data.length > 0) {
        setDeals(data);
      }
    } catch (error) {
      console.error('Error loading hero deals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Currency conversion for all deals
  const priceValues = useMemo(() =>
    deals.map(deal => ({
      amount: deal.price,
      currency: deal.currency || 'USD',
      id: `hero-${deal.id}-price`
    })),
    [deals]
  );

  const originalPriceValues = useMemo(() =>
    deals.filter(deal => deal.originalPrice && deal.originalPrice > deal.price)
      .map(deal => ({
        amount: deal.originalPrice!,
        currency: deal.currency || 'USD',
        id: `hero-${deal.id}-original`
      })),
    [deals]
  );

  const { convertedValues: convertedPrices } = useCurrencyConverter(priceValues);
  const { convertedValues: convertedOriginalPrices } = useCurrencyConverter(originalPriceValues);

  const getPrice = (dealId: string, isOriginal: boolean = false) => {
    const key = isOriginal ? `hero-${dealId}-original` : `hero-${dealId}-price`;
    const converted = isOriginal ? convertedOriginalPrices[key] : convertedPrices[key];
    return converted?.converted || converted?.original || '';
  };

  useEffect(() => {
    if (deals.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % deals.length);
    }, 8000); // Slower rotation for premium feel
    return () => clearInterval(timer);
  }, [deals.length]);

  // Wise action: Track playback to play only once per product per session
  useEffect(() => {
    if (deals.length === 0) return;

    const dealId = deals[currentSlide].id.toString();

    // Only mark as played when we leave this slide or unmount
    return () => {
      setPlayedVideos(prev => {
        if (!prev.includes(dealId)) {
          const nextPlayed = [...prev, dealId];
          try {
            sessionStorage.setItem('hero_videos_played', JSON.stringify(nextPlayed));
          } catch (e) {
            console.error('Error writing to sessionStorage:', e);
          }
          return nextPlayed;
        }
        return prev;
      });
    };
  }, [currentSlide, deals]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % deals.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + deals.length) % deals.length);
  };

  // Show loading state while banner or deals are loading
  if (isLoading || isBannerLoading) {
    return (
      <section className="mb-8 lg:mb-12 relative">
        {/* Banner skeleton */}
        <div className="hidden md:flex w-screen relative left-1/2 -translate-x-1/2 h-12 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 animate-pulse items-center">
          <div className="mx-auto flex items-center gap-4">
            <div className="h-8 w-8 bg-slate-600 rounded-xl" />
            <div className="h-4 w-48 bg-slate-600 rounded" />
          </div>
        </div>
        <div className="relative h-[450px] md:h-[500px] rounded-3xl overflow-hidden shadow-2xl bg-slate-900 mt-2">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 animate-shimmer"
            style={{ backgroundSize: '200% 100%' }} />
          <div className="absolute inset-0 flex flex-col md:flex-row items-center px-8 md:px-20 gap-12">
            <div className="flex-1 space-y-6">
              <div className="h-6 bg-slate-800 rounded w-32 animate-pulse" />
              <div className="h-16 bg-slate-800 rounded w-full animate-pulse" />
              <div className="h-24 bg-slate-800 rounded w-3/4 animate-pulse" />
              <div className="h-14 bg-slate-800 rounded-full w-48 animate-pulse" />
            </div>
            <div className="flex-1 w-full flex justify-center">
              <div className="w-64 h-64 md:w-80 md:h-80 bg-slate-800 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (deals.length === 0) return null;

  return (
    <section className="mb-8 lg:mb-12 relative group">
      {/* Desktop full-width event banner (outside the rounded hero) */}
      {eventBanner && eventBanner.eventName !== 'default' && (
        <div
          className="hidden md:flex relative left-1/2 -translate-x-1/2 w-screen h-12 items-center justify-between z-20 text-white overflow-hidden group/event cursor-pointer"
          style={{ background: getEventBannerGradient(eventBanner) }}
          onClick={() => {
            const url = new URL(window.location.href);
            url.search = '';
            url.searchParams.set('view', 'event-deals');
            url.searchParams.set('event', eventBanner.eventName || 'Event Deals');
            if (eventBanner.searchQuery) {
              url.searchParams.set('search', eventBanner.searchQuery);
            }
            window.open(url.toString(), '_blank');
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/event:animate-shimmer" />

          <div className="w-full flex items-center justify-between px-8 md:px-20 relative z-10">
            <div className={`flex items-center gap-6 ${eventBanner.layout === 'center' ? 'mx-auto' : ''}`}>
              <div className="flex items-center gap-2">
                {(eventBanner.iconKeys || [eventBanner.iconKey]).filter(Boolean).map((key, idx) => (
                  <div key={idx} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-lg animate-float-slow" style={{ animationDelay: `${idx * 0.5}s` }}>
                    <img src={getEventIconSrc(key as string)} alt="" className="h-5 w-5 object-contain" />
                  </div>
                ))}
              </div>
              <div className={`flex flex-col ${eventBanner.layout === 'center' ? 'items-center' : ''}`}>
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/70 leading-none">{eventBanner.eventName}</span>
                <div className="text-sm font-black tracking-tight uppercase mt-0.5 flex items-baseline gap-2">
                  <span className="line-clamp-1">{eventBanner.headline}</span>
                  <span className="opacity-60 font-bold text-xs lowercase italic hidden lg:inline">— {eventBanner.subheadline}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="px-6 py-2 bg-white text-black text-xs font-black rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
                {eventBanner.cta}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative h-[580px] sm:h-[520px] md:h-[550px] rounded-3xl overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] bg-black">
        {/* Banner Overlay */}
        {eventBanner && eventBanner.eventName !== 'default' && (
          <div
            className="absolute top-0 inset-x-0 h-16 flex md:hidden items-center justify-between px-8 md:px-20 z-20 text-white overflow-hidden group/event cursor-pointer"
            style={{ background: getEventBannerGradient(eventBanner) }}
            onClick={() => {
              const url = new URL(window.location.href);
              url.search = '';
              url.searchParams.set('view', 'event-deals');
              url.searchParams.set('event', eventBanner.eventName || 'Event Deals');
              if (eventBanner.searchQuery) {
                url.searchParams.set('search', eventBanner.searchQuery);
              }
              window.open(url.toString(), '_blank');
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/event:animate-shimmer" />

            <div className="flex items-center gap-6 relative z-10">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/20">
                <img src={getEventIconSrc(eventBanner.iconKey)} alt="" className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/70 leading-none">{eventBanner.eventName}</span>
                <h3 className="text-xl font-black tracking-tight uppercase mt-1">
                  {eventBanner.headline}
                  <span className="ml-3 opacity-60 font-bold text-xs lowercase italic">— {eventBanner.subheadline}</span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 relative z-10">
              <button className="px-6 py-2 bg-white text-black text-xs font-black rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
                {eventBanner.cta}
              </button>
            </div>
          </div>
        )}

        {/* Urgency Badge */}
        {eventBanner?.urgencyText && (
          <div className="absolute top-20 md:top-4 right-8 md:right-20 z-20">
            <div className="bg-red-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg border border-white/20 uppercase tracking-widest flex items-center gap-2">
              <span className="material-icons text-xs">timer</span>
              {eventBanner.urgencyText}
            </div>
          </div>
        )}

        {deals.map((deal, index) => {
          const theme = getTheme(deal.category_id || deal.category_name, index);
          const isActive = index === currentSlide;
          const youtubeVideo = deal.media?.find(m => m.type === 'youtube');

          return (
            <div
              key={deal.id || `hero-deal-${index}`}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
                }`}
            >
              {/* Background with Immersive Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} transition-colors duration-1000`} />

              {/* Subtle ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/10" />

              {/* Optional Video Background Layer - limited to 1 play per session/navigation */}
              {youtubeVideo && isActive && !playedVideos.includes(deal.id.toString()) && (
                <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none overflow-hidden">
                  <iframe
                    src={`${youtubeVideo.url}${youtubeVideo.url.includes('?') ? '&' : '?'}autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeVideo.url.split('/').pop()}`}
                    className="w-full h-full scale-[1.5] object-cover"
                    allow="autoplay; encrypted-media"
                    title="Background Video"
                  />
                </div>
              )}

              {/* Split Content Layout */}
              <div className={`absolute inset-x-0 bottom-0 flex flex-col md:flex-row items-center justify-between px-4 sm:px-8 md:px-20 py-6 sm:py-8 md:py-12 gap-6 md:gap-12 ${eventBanner && eventBanner.eventName !== 'default' ? 'top-16 md:top-0' : 'top-0'}`}>

                {/* Left Side: Product Info */}
                <div className="flex-1 text-left space-y-2 sm:space-y-4 md:space-y-6 max-w-2xl w-full">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 transition-all duration-700 delay-300 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/80">{deal.tag || 'Top pick'}</span>
                  </div>

                  <h2 className={`text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-white transition-all duration-700 delay-500 line-clamp-2 ${isActive ? 'translate-x-0 opacity-100' : 'translate-x-[-40px] opacity-0'}`}>
                    {deal.title}
                  </h2>

                  <div className={`flex flex-wrap items-baseline gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2 transition-all duration-700 delay-700 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tighter shrink-0">
                      {getPrice(deal.id, false)}
                    </span>
                    {deal.originalPrice > deal.price && (
                      <span className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/40 line-through font-medium shrink-0">
                        {getPrice(deal.id, true)}
                      </span>
                    )}
                    {(deal.discountPercent || 0) > 0 && (
                      <span className={`text-xs sm:text-sm font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-red-500/90 text-white flex items-center gap-1 shrink-0`}>
                        -{deal.discountPercent}%
                      </span>
                    )}

                    {(deal.rating || 0) > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shrink-0">
                        <span className="material-icons text-amber-400 text-sm">star</span>
                        <span className="text-white font-bold text-sm">{(deal.rating || 0).toFixed(1)}</span>
                        {(deal.reviews || 0) > 0 && (
                          <span className="text-white/40 text-xs font-medium">({deal.reviews})</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`pt-3 sm:pt-4 md:pt-6 transition-all duration-700 delay-1000 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
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
                      className="group/btn relative px-7 sm:px-9 md:px-11 py-3 sm:py-3.5 bg-white text-black font-bold text-sm sm:text-base rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] shadow-lg flex items-center justify-center gap-2 sm:gap-3 w-full md:w-fit"
                    >
                      Shop this deal
                      <span className="material-icons transition-transform group-hover/btn:translate-x-1">arrow_forward</span>
                    </button>

                    {/* Trust Badges - Hide on smallest screens */}
                    <div className="hidden sm:flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-4">
                      {TRUST_BADGES.map((badge, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1.5 text-white/70 text-xs md:text-sm"
                        >
                          <span
                            className="material-icons text-sm"
                            style={{ color: badge.color }}
                          >
                            {badge.icon}
                          </span>
                          {badge.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side: Floating Product Image - Enhanced for white bg images */}
                <div className={`flex-shrink-0 relative w-full h-[180px] sm:h-[220px] md:h-full md:flex-1 flex items-center justify-center transition-all duration-1000 delay-500 ${isActive ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-20 opacity-0 scale-90'}`}>
                  {/* Image Shadow/Glow */}
                  <div className="absolute inset-x-0 bottom-10 h-10 bg-black/40 blur-2xl rounded-[100%] scale-x-50" />

                  <div className="relative group/img cursor-pointer max-w-[70%] sm:max-w-[80%] md:max-w-none">
                    {/* Glass Container for images with solid backgrounds */}
                    <div className="relative p-1.5 sm:p-2 md:p-4 rounded-2xl sm:rounded-3xl md:rounded-[40px] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
                      <img
                        src={deal.image}
                        alt={deal.title}
                        className="w-full h-[140px] sm:h-[180px] md:w-[350px] md:h-[350px] lg:w-[420px] lg:h-[420px] object-contain rounded-xl sm:rounded-2xl md:rounded-[30px] drop-shadow-xl md:animate-float transition-transform duration-700 group-hover/img:scale-[1.04]"
                        loading="eager"
                      />
                    </div>

                    {/* Floating Rating Badge (only when rating exists) */}
                    {Number.isFinite(Number(deal.rating)) && (
                      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/95 shadow-lg transition-all duration-300 px-3 py-1.5 rounded-full border border-black/5">
                        <div className="flex items-center gap-1.5">
                          <span className="material-icons text-amber-500 text-base">star</span>
                          <span className="text-sm font-bold text-black">{Number(deal.rating).toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-10 right-10 z-30 flex items-center gap-4">
        <div className="flex gap-2">
          {deals.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 transition-all duration-500 rounded-full ${i === currentSlide ? 'w-10 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={prevSlide}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-90"
          >
            <span className="material-icons">chevron_left</span>
          </button>
          <button
            onClick={nextSlide}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-90"
          >
            <span className="material-icons">chevron_right</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(2deg); }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 3s linear infinite;
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        .animate-float-slow {
          animation: float-slow 4s ease-in-out infinite;
        }
      `}} />
    </section>
  );
};

export default HeroSection;
