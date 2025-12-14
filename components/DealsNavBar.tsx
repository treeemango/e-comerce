import React from 'react';
import { DealCategoryNavItem } from '../lib/api';

interface DealsNavBarProps {
  categories: DealCategoryNavItem[];
  loading?: boolean;
  onSelectCategory?: (categoryId: string | null) => void;
}

const DealsNavBar: React.FC<DealsNavBarProps> = ({ categories, loading, onSelectCategory }) => {
  const skeletons = Array.from({ length: 8 });

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center gap-6 min-w-max px-2 py-1">
        <button
          className="flex flex-col items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[110px]"
          onClick={() => onSelectCategory?.(null)}
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg ring-2 ring-orange-300/60">All</span>
          <span className="text-center leading-tight">Recommended</span>
        </button>
        {(loading ? skeletons : categories).map((item, idx) => (
          <button
            key={loading ? idx : item.categoryId}
            className="flex flex-col items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[110px]"
            onClick={() => !loading && onSelectCategory?.(item.categoryId)}
          >
            <span className="h-20 w-20 overflow-hidden rounded-full bg-gray-50 shadow-md dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {loading ? (
                <span className="block h-full w-full animate-pulse bg-gray-200 dark:bg-gray-700" />
              ) : (
                <img
                  src={item.featuredImageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=60'}
                  alt={item.categoryName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </span>
            <span className="max-w-[120px] text-center leading-tight line-clamp-2">{loading ? '...' : item.categoryName}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DealsNavBar;
