import React from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { MobileHeroSection } from './MobileHeroSection';
import { MobileLightningDealsRow } from './MobileLightningDealsRow';
import { fetchEventBanner, type EventBannerData, getSectionTitles } from '@/lib/event-banner-service';

interface HomeViewProps {
  products: Product[];
  onProductClick: (p: Product) => void;
  showPromotions?: boolean;
  onViewAllDeals?: () => void;
  onVisualSearch?: (p: Product) => void;
  onFilterClick?: (filter: string) => void;
  onPlatformReviewsClick?: () => void;
  hasPlatformReviews?: boolean;
  eventBanner?: EventBannerData | null;
}

export const HomeView: React.FC<HomeViewProps> = ({ products, onProductClick, showPromotions = true, onViewAllDeals, onVisualSearch, onFilterClick, onPlatformReviewsClick, hasPlatformReviews = false, eventBanner }) => {
  const formatPrice = (price: number, currency?: string) => {
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currency || 'USD',
        maximumFractionDigits: 2,
      }).format(price);
    } catch (e) {
      return `${currency ? currency + ' ' : ''}${price}`;
    }
  };

  return (
    <div className="w-full pb-8">
      {/* SEO: Hidden H1 for brand recognition */}
      <h1 className="sr-only">JuaExpress | Shop, Sell & Deliver across UK & Africa</h1>

      {showPromotions && (
        <div className="space-y-6">
          {/* Dynamic Hero Section */}
          <div className="px-4 pt-4">
            <div className="rounded-3xl overflow-hidden shadow-premium">
              <MobileHeroSection onProductClick={onProductClick} eventBanner={eventBanner} />
            </div>
          </div>

          {/* Swaggy Premium Trust Bar */}
          <div className="px-4">
            <button
              onClick={onPlatformReviewsClick}
              disabled={!onPlatformReviewsClick}
              className={`w-full max-w-5xl mx-auto bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-black rounded-[2rem] p-4 md:p-6 lg:p-8 flex flex-col gap-3 md:gap-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-zinc-800 transition-all group overflow-hidden relative ${onPlatformReviewsClick ? 'active:scale-[0.98]' : 'opacity-80 cursor-default'
                }`}
            >
              {/* Decorative background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />

              <div className="flex justify-between items-center relative z-10 w-full">
                <div className="flex items-center gap-3 md:gap-5">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary rotate-3 group-hover:rotate-0 transition-transform">
                    <span className="material-icons-round text-2xl md:text-4xl">verified</span>
                  </div>
                  <div className="text-left">
                    <div className="text-[13px] md:text-xl font-black text-gray-900 dark:text-white tracking-tight">Elite Trust Quality</div>
                    <div className="flex items-center gap-1.5 mt-0.5 md:mt-1">
                      <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Policies & help center
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 text-primary ${onPlatformReviewsClick ? 'animate-pulse' : 'opacity-40 grayscale'}`}>
                  <span className="text-[9px] md:text-xs font-black uppercase tracking-widest">Read Policies</span>
                  {onPlatformReviewsClick && <span className="material-icons text-[14px] md:text-lg">chevron_right</span>}
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-100 dark:via-zinc-800 to-transparent" />

              <div className="flex justify-between items-center relative z-10 w-full">
                <div className="flex items-center gap-4 md:gap-8">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <span className="material-icons text-[14px] md:text-lg text-emerald-500">local_shipping</span>
                    <span className="text-[9px] md:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Free Shipping</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-gray-300 md:bg-gray-400" />
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <span className="material-icons text-[14px] md:text-lg text-blue-500">shield</span>
                    <span className="text-[9px] md:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Escrow Secure</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-primary opacity-70">
                  <span className="text-[9px] md:text-xs font-black uppercase tracking-widest">Trusted Experience</span>
                </div>
              </div>
            </button>
          </div>

          {/* Flash Deals Section - Horizontal */}
          <div className="space-y-4">
            <div className="px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-price-red">bolt</span>
                <h3 className="font-black text-lg tracking-tight uppercase">Flash Deals</h3>
              </div>
              <button
                onClick={onViewAllDeals}
                className="text-[10px] font-black text-primary uppercase tracking-widest"
              >
                See All
              </button>
            </div>
            <div className="scroll-fade">
              <MobileLightningDealsRow
                onProductClick={onProductClick}
                onViewAll={onViewAllDeals || (() => { })}
                eventBanner={eventBanner}
              />
            </div>
          </div>

          {/* Tags / Sub-Filters */}
          <div className="px-4 overflow-x-auto hide-scrollbar scroll-fade">
            <div className="flex items-center gap-2.5 min-w-max">
              {[
                { label: 'For You', icon: 'auto_awesome', id: 'all' },
                { label: 'Best Sellers', icon: 'trending_up', id: 'best_sellers' },
                { label: 'New Arrivals', icon: 'new_releases', id: 'new' },
                { label: 'Top Rated', icon: 'star_outline', id: 'top_rated' }
              ].map((filter, idx) => (
                <button
                  key={filter.label}
                  onClick={() => {
                    if (filter.id === 'all') return;
                    onFilterClick?.(filter.id);
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${idx === 0
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
                    }`}
                >
                  <span className="material-icons-round text-sm">{filter.icon}</span>
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Product Feed */}
      <div className="mt-8 px-4">
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-primary animate-pulse">local_fire_department</span>
            <h3 className="font-black text-lg tracking-tight uppercase">
              {React.useMemo(() => getSectionTitles(eventBanner).trendingDeals.title, [eventBanner])}
            </h3>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-8">
            {React.useMemo(() => getSectionTitles(eventBanner).trendingDeals.subtitle, [eventBanner])}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {products.map((item, idx) => (
            <div key={idx} className="animate-premium-pop" style={{ animationDelay: `${idx * 0.05}s` }}>
              <ProductCard
                product={item}
                onProductClick={onProductClick}
                onVisualSearch={onVisualSearch}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
