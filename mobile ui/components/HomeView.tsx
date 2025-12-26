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
}

export const HomeView: React.FC<HomeViewProps> = ({ products, onProductClick, showPromotions = true, onViewAllDeals, onVisualSearch, onFilterClick }) => {
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

          {/* Premium Info Bar */}
          <div className="px-4">
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 flex justify-between items-center shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                  <span className="material-icons-round">local_shipping</span>
                </div>
                <div>
                  <div className="text-[11px] font-black text-green-600 uppercase tracking-widest">Free Shipping</div>
                  <div className="text-[9px] text-gray-400 font-bold uppercase">On all orders today</div>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-100 dark:bg-gray-800" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <span className="material-icons-round">verified_user</span>
                </div>
                <div>
                  <div className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Secure</div>
                  <div className="text-[9px] text-gray-400 font-bold uppercase">Money back guarantee</div>
                </div>
              </div>
            </div>
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
