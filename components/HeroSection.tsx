import React, { useState, useEffect, useMemo } from 'react';
import { fetchHeroDeals, type LightningDealItem } from '@/lib/api';
import { getCurrencySymbol } from '@/lib/currency';

const formatPrice = (value: number, currency?: string) => `${getCurrencySymbol(currency || 'USD')}${value.toFixed(2)}`;

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

const HeroSection: React.FC = () => {
  const [deals, setDeals] = useState<LightningDealItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playedVideos, setPlayedVideos] = useState<string[]>([]);

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

  if (isLoading) {
    return (
      <section className="mb-8 lg:mb-12 relative">
        <div className="relative h-[450px] md:h-[500px] rounded-3xl overflow-hidden shadow-2xl bg-slate-900">
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
      <div className="relative h-[500px] md:h-[550px] rounded-3xl overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] bg-black">
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

              {/* Animated Glow/Orbs */}
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/10 blur-[120px] rounded-full animate-pulse delay-1000" />

              {/* Optional Video Background Layer - limited to 1 play per session/navigation */}
              {youtubeVideo && isActive && !playedVideos.includes(deal.id.toString()) && (
                <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none overflow-hidden">
                  <iframe
                    src={`${youtubeVideo.url}${youtubeVideo.url.includes('?') ? '&' : '?'}autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeVideo.url.split('/').pop()}`}
                    className="w-full h-full scale-[1.5] object-cover"
                    allow="autoplay; encrypted-media"
                    title="Background Video"
                  />
                </div>
              )}

              {/* Split Content Layout */}
              <div className="absolute inset-0 flex flex-col md:flex-row items-center justify-between px-8 md:px-20 py-12 gap-10">

                {/* Left Side: Product Info */}
                <div className="flex-1 text-left space-y-6 max-w-2xl">
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 transition-all duration-700 delay-300 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <span className="flex h-2 w-2 rounded-full bg-green-400 animate-ping" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-white/80">{deal.tag || 'TOP RATED'}</span>
                  </div>

                  <h2 className={`text-4xl md:text-6xl font-black leading-none tracking-tight text-white transition-all duration-700 delay-500 ${isActive ? 'translate-x-0 opacity-100' : 'translate-x-[-40px] opacity-0'}`}>
                    {deal.title}
                  </h2>

                  <div className={`flex items-baseline gap-4 transition-all duration-700 delay-700 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter">
                      {formatPrice(deal.price, deal.currency)}
                    </span>
                    {deal.originalPrice > deal.price && (
                      <span className="text-xl md:text-2xl text-white/40 line-through font-medium">
                        {formatPrice(deal.originalPrice, deal.currency)}
                      </span>
                    )}
                    {(deal.discountPercent || 0) > 0 && (
                      <span className={`text-sm font-bold px-3 py-1 rounded-lg bg-red-500 text-white ml-2 animate-bounce flex items-center gap-1`}>
                        <span className="material-icons text-xs">trending_down</span>
                        -{deal.discountPercent}%
                      </span>
                    )}
                  </div>

                  <p className={`text-lg md:text-xl text-white/70 max-w-md line-clamp-2 transition-all duration-700 delay-900 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    Premium selection with elite ratings. Experience performance and value in one package.
                  </p>

                  <div className={`pt-6 transition-all duration-700 delay-1000 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <a
                      href={`/product/${deal.id}`}
                      className="group/btn relative px-10 py-4 bg-white text-black font-black rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.3)] flex items-center justify-center gap-3 w-full md:w-fit"
                    >
                      SHOP THIS DEAL
                      <span className="material-icons transition-transform group-hover/btn:translate-x-2">arrow_forward</span>
                    </a>
                  </div>
                </div>

                {/* Right Side: Floating Product Image - Enhanced for white bg images */}
                <div className={`flex-1 relative w-full h-[300px] md:h-full flex items-center justify-center transition-all duration-1000 delay-500 ${isActive ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-20 opacity-0 scale-90'}`}>
                  {/* Image Shadow/Glow */}
                  <div className="absolute inset-x-0 bottom-10 h-10 bg-black/40 blur-2xl rounded-[100%] scale-x-50" />

                  <div className="relative group/img cursor-pointer max-w-[90%] md:max-w-none">
                    {/* Glass Container for images with solid backgrounds */}
                    <div className="relative p-2 md:p-4 rounded-[40px] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
                      <img
                        src={deal.image}
                        alt={deal.title}
                        className="w-full h-[220px] md:w-[420px] md:h-[420px] object-contain rounded-[30px] drop-shadow-2xl animate-float transition-transform duration-700 group-hover/img:scale-110"
                        loading="eager"
                      />
                    </div>

                    {/* Floating Product Badge */}
                    <div className="absolute -top-6 -right-6 md:-top-10 md:-right-10 bg-white shadow-2xl rotate-12 group-hover:rotate-0 transition-all duration-500 p-4 md:p-6 rounded-[30px] border border-white">
                      <div className="text-[10px] text-black/40 font-black uppercase tracking-widest mb-1">Elite Rank</div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-icons text-yellow-500 text-xl md:text-2xl">star</span>
                        <span className="text-xl md:text-3xl font-black text-black">4.9</span>
                      </div>
                    </div>
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
      `}} />
    </section>
  );
};

export default HeroSection;
