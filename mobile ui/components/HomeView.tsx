import React from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface HomeViewProps {
  products: Product[];
  onProductClick: (p: Product) => void;
  onAddToCart?: (p: Product) => void;
  showPromotions?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({ products, onProductClick, onAddToCart, showPromotions = true }) => {
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
          {/* Hero Banner */}
          <div className="relative w-full h-32 sm:h-40 bg-gradient-to-r from-red-600 to-red-800 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <img
                alt="Snowman decoration"
                className="h-24 w-auto object-contain opacity-90 transform -rotate-12 translate-y-2"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrv545M_Srb70VET2oDKnIA8E3Vo6Pw9J4TkQVSGxdcJVk_xH6IM-Mxkykzdx6h2JpQgbkKK4U44weP1KjMnymP-6Tgp0Wn3IDZJOvvSn6NZ9sgeKwC27j_s0x0zYks-eWRZZMLkMk3_WhzEGW0g-hflAarWNWw5EgBOFMKDvjnwnl6zW6s8S4FSOPB1wMAZW343aBcadZv6pz9P-jO_v4GbOQg_WM4MQSF6plYrKYdqAuml8NDUJDWeQMNHMfalgjIDW1zp26tjDF"
              />
              <div className="text-center text-white z-10 flex flex-col items-center">
                <p className="text-xs sm:text-sm font-semibold text-yellow-200 mb-1 drop-shadow-md">
                  JINGLE BELLS, SAVINGS ALL THE WAY
                </p>
                <h2 className="text-lg sm:text-2xl font-black uppercase leading-tight drop-shadow-md">
                  Not Long Until<br />The Big Day!
                </h2>
                <button className="mt-2 bg-yellow-400 text-red-800 text-xs font-bold px-4 py-1 rounded-full shadow-lg hover:bg-yellow-300 transition">
                  SHOP NOW {'>'}
                </button>
              </div>
              <img
                alt="Reindeer decoration"
                className="h-24 w-auto object-contain opacity-90 transform rotate-12 translate-y-2"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_5gLdW517Yp0ubfTydkLVrjI7FvJJRLDAxpaghWT-hz589KGi2QsMlAwQSqp5SDZXZm50eXDUfHxHPhOJ8TlU6KNAbNFAlKLCwCDg1wpwjpKnsT2ksF25kZ5FytVUH7WpwC7MUBzZ3nYXLtLNjPygOw2G6orJozTkGoUqK3nJWOhVNUpdtkyIYcEtz0SxXKGjCCaGyIcJS91y8gxyYV4fxnaz0XXqTtfMqTyq7H6-rnoq1iXhN4CxIgejtqesicR5osKt-IVm3wTK"
              />
            </div>
            <div className="absolute inset-0 bg-white/10 opacity-20 pointer-events-none"></div>
          </div>

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

          {/* Featured Grid */}
          <div className="grid grid-cols-2 gap-2 px-2 pb-2">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-2 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400 text-sm font-bold mb-2">
                Clearance deals <span className="material-icons-outlined text-sm">chevron_right</span>
              </div>
              <div className="relative aspect-square mb-2 bg-gray-50 dark:bg-gray-800 rounded-md overflow-hidden">
                <img alt="Men's shorts" className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAcn8mn3r9gGLNuRF_6tammHGtxYj9VspKSWe0hFtPuch2GeHHKqIsXPAFIXqz3vHV4n54hm1WJk3xuUTb6QDMFejhEfAfoeSu08GHayjSggPGxGh00zM-PdazKENM5XBNTlpIZGJYtL8dY4FGrXZbNcwTbOT0Gclng8gtQHpMC9UlQdGRsJoI6N7B5R86jxzz6aLai4rLqOyNwfncDM5uAEJD-RyFLNu3BomDZNmMiWn8tI9bOzGPWFE1FZIIsJm2P5zcf-DkySuC" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-red-600 dark:text-red-400 font-bold text-lg">£5.47</span>
                <span className="text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 text-[10px] px-1 rounded-sm mb-1">-54%</span>
              </div>
              <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark line-through mt-0.5">RRP £12.01</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-2 shadow-sm border border-amber-100 dark:border-amber-900/30">
              <div className="flex items-center justify-center gap-1 text-primary text-sm font-bold mb-2">
                Lightning deals <span className="material-icons-outlined text-sm">chevron_right</span>
              </div>
              <div className="relative aspect-square mb-2 bg-white dark:bg-gray-800 rounded-md overflow-hidden">
                <div className="absolute top-2 left-2 bg-[#C99C79] text-white rounded-full w-10 h-10 flex flex-col items-center justify-center text-[9px] leading-tight font-bold z-10 shadow-sm">
                  <span>10</span>
                  <span>Pairs</span>
                </div>
                <img alt="Socks pack" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZ28kSi_0RtzG-zkG7ID7Zstj1Z-6DU-7dXBfsT6BFftTvApAV1exAZVhIaBR34cpEsI7zZzknqHqLlK5O2UEVFAmeMwljqe3TTq98-R-mKx7TTxAwIjAZWjQhWlLnDseOUJePsSzk1_bpqiAz6U7y0KKme_lGXf9dsT7-EgQsWVdRl3PttTFaJJUl2e1_KrBoIgHr3SZgNQXa-6gXoxpFS7r1E8x5CnP95zg1VcO10VNxoO_ZAbRje5iN3RebINUIRtmMTdDCtFFs" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-primary font-bold text-lg">£5.08</span>
                <span className="text-primary border border-primary text-[10px] px-1 rounded-sm mb-1">-50%</span>
              </div>
              <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark line-through mt-0.5">RRP £10.35</div>
            </div>
          </div>

          {/* Sub-Filters */}
          <div className="bg-surface-light dark:bg-surface-dark pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <div className="scroll-fade px-3 overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-2 min-w-max">
                {[{ label: 'All', icon: 'bolt' }, { label: '5-Star Rated', icon: 'chat_bubble_outline' }, { label: 'Best Sellers', icon: 'thumb_up' }].map((filter, idx) => (
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
            onClick={() => onProductClick(item)}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
};
