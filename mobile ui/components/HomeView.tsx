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
}

export const HomeView: React.FC<HomeViewProps> = ({ products, onProductClick, showPromotions = true, onViewAllDeals, onVisualSearch }) => {
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
    <div className="w-full max-w-md mx-auto sm:max-w-full sm:px-4 md:px-0">
      {showPromotions && (
        <>
          {/* Dynamic Hero Section */}
          <MobileHeroSection />

          {/* Quick Info Bar */}
          <div className="bg-[#FFF8F0] dark:bg-orange-900/10 p-3 flex justify-between items-start text-xs border-b border-orange-100 dark:border-orange-900/30">
            <div className="flex flex-col gap-1 w-1/2 pr-2 border-r border-orange-200 dark:border-orange-800/30">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold">
                <span className="material-icons-outlined text-sm">check</span>
                Free shipping
              </div>
              <div className="text-text-secondary-light dark:text-text-secondary-dark pl-5 text-[10px] leading-tight">
                Incredible
              </div>
            </div>
            <div className="flex flex-col gap-1 w-1/2 pl-3">
              <div className="flex items-center gap-1 text-text-primary-light dark:text-text-primary-dark font-bold">
                <span className="material-icons-outlined text-sm">inventory_2</span>
                Free returns
              </div>
              <div className="text-text-secondary-light dark:text-text-secondary-dark pl-5 text-[10px] leading-tight">
                Up to 90 days*
              </div>
            </div>
          </div>

          {/* Price Guarantee */}
          <div className="px-2 py-2 bg-surface-light dark:bg-surface-dark">
            <div className="bg-green-700 dark:bg-green-800 text-white py-2 px-3 rounded-md flex items-center justify-between text-xs font-bold shadow-sm">
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-base">verified_user</span>
                <span>Never overpay with our Price Match Guarantee</span>
              </div>
              <span className="material-icons-outlined text-sm">chevron_right</span>
            </div>
          </div>


          {/* Mobile Lightning Deals Row */}
          <MobileLightningDealsRow
            onProductClick={onProductClick}
            onViewAll={onViewAllDeals || (() => { })}
          />

          {/* Sub-Filters */}
          <div className="bg-surface-light dark:bg-surface-dark pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <div className="scroll-fade px-3 overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-2 min-w-max">
                {[{ label: 'All', icon: 'bolt' }, { label: '5-Star Rated', icon: 'star' }, { label: 'Best Sellers', icon: 'thumb_up' }].map((filter, idx) => (
                  <button
                    key={filter.label}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${idx === 0
                      ? 'bg-primary text-white border-primary'
                      : 'bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <span className="material-icons-outlined text-base">{filter.icon}</span>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-black p-1">
        {products.map((item, idx) => (
          <ProductCard
            key={idx}
            product={item}
            onProductClick={onProductClick}
            onVisualSearch={onVisualSearch}
          />
        ))}
      </div>
    </div>
  );
};
