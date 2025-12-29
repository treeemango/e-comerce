import React from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { MobileHeroSection } from './MobileHeroSection';
import { MobileLightningDealsRow } from './MobileLightningDealsRow';

interface HomeViewProps {
  products: Product[];
  onProductClick: (p: Product) => void;
  showPromotions?: boolean;
  onViewAllDeals?: () => void;
  onVisualSearch?: (p: Product) => void;
  onFilterClick?: (filter: string) => void;
  onPlatformReviewsClick?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ products, onProductClick, showPromotions = true, onViewAllDeals, onVisualSearch, onFilterClick, onPlatformReviewsClick }) => {
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
    <div className="w-full max-w-md mx-auto sm:max-w-full pb-8">
      {showPromotions && (
        <div className="space-y-6">
          {/* Dynamic Hero Section */}
          <div className="px-4 pt-4">
            <div className="rounded-3xl overflow-hidden shadow-premium">
              <MobileHeroSection onProductClick={onProductClick} />
            </div>
          </div>

          {/* Swaggy Premium Trust Bar */}
          <div className="px-4">
            <button
              onClick={onPlatformReviewsClick}
              className="w-full max-w-5xl mx-auto bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-black rounded-[2rem] p-4 md:p-6 lg:p-8 flex flex-col gap-3 md:gap-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-zinc-800 active:scale-[0.98] transition-all group overflow-hidden relative"
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
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-icons text-[10px] md:text-sm text-orange-400">star</span>
                        ))}
                      </div>
                      <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">4.9/5 Rating</span>
                    </div>
                  </div>
                </div>
                <div className="flex -space-x-2 md:-space-x-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-white dark:border-zinc-900 bg-gray-200 overflow-hidden shadow-sm">
                      <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-white dark:border-zinc-900 bg-primary flex items-center justify-center text-[8px] md:text-[10px] font-black text-white shadow-sm">
                    +50K
                  </div>
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
                <div className="flex items-center gap-1 text-primary animate-pulse">
                  <span className="text-[9px] md:text-xs font-black uppercase tracking-widest">Read Reviews</span>
                  <span className="material-icons text-[14px] md:text-lg">chevron_right</span>
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
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-black text-lg tracking-tight uppercase">Explore More</h3>
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
