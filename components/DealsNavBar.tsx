import React from 'react';
import { DealCategoryNavItem } from '../lib/api';

interface DealsNavBarProps {
  categories: DealCategoryNavItem[];
  loading?: boolean;
  onSelectCategory?: (categoryId: string | null) => void;
}

const DealsNavBar: React.FC<DealsNavBarProps> = ({ categories, loading, onSelectCategory }) => {
  const skeletons = Array.from({ length: 12 });

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center gap-6 min-w-max px-2 py-3">
        {/* Always show Recommended button */}
        <button
          className="flex flex-col items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[110px]"
          onClick={() => onSelectCategory?.(null)}
        >
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm ring-2 ring-slate-200 dark:ring-slate-600">
            <span className="material-icons text-3xl">grid_view</span>
          </span>
          <span className="text-center leading-tight">Recommended</span>
        </button>
        {(loading ? skeletons : categories).map((item, idx) => (
          <button
            key={loading ? idx : (item as DealCategoryNavItem).categoryId}
            className="flex flex-col items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[110px]"
            onClick={() => !loading && onSelectCategory?.((item as DealCategoryNavItem).categoryId)}
          >
            <span className="h-24 w-24 overflow-hidden rounded-full bg-gray-50 shadow-md dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              {loading ? (
                <span className="block h-full w-full animate-pulse bg-gray-200 dark:bg-gray-700" />
              ) : (
                <img
                  src={(item as DealCategoryNavItem).featuredImageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=60'}
                  alt={(item as DealCategoryNavItem).categoryName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </span>
            <span className="max-w-[120px] text-center leading-tight line-clamp-2">
              {loading ? (
                <span className="block h-3 w-[90px] rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : (
                (item as DealCategoryNavItem).categoryName
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DealsNavBar;
