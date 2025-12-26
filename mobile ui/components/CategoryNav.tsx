import React, { useState, useEffect, useRef } from 'react';
import { TrendingCategoryOverlay } from '@/lib/api';

interface CategoryNavProps {
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  onNavigateToCategories?: (departmentId: string) => void;
  onCategoryClick?: (categoryId: string, categoryName: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({ activeCategoryId, onSelectCategory, onNavigateToCategories, onCategoryClick }) => {
  const [categories, setCategories] = useState<TrendingCategoryOverlay[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { fetchTrendingCategoriesOverlay } = await import('@/lib/api');
        const data = await fetchTrendingCategoriesOverlay();

        // Group by parent category and take the top subcategory for each department
        const parentMap = new Map();
        data.forEach(item => {
          const parentId = item.parent_category_id;
          if (!parentMap.has(parentId) ||
            (parentMap.get(parentId).trend_score < item.trend_score)) {
            parentMap.set(parentId, item);
          }
        });

        const uniqueParents = Array.from(parentMap.values());
        setCategories(uniqueParents);
      } catch (error) {
        console.error('Error fetching trending categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Smooth scroll to active category
  useEffect(() => {
    if (!loading && categories.length > 0 && scrollRef.current) {
      const activeIndex = categories.findIndex(cat => cat.subcategory_id === activeCategoryId);
      if (activeIndex !== -1) {
        const container = scrollRef.current;
        const buttons = container.querySelectorAll('button');
        const activeButton = buttons[activeIndex + 1]; // +1 for "All" button

        if (activeButton) {
          activeButton.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }
    }
  }, [activeCategoryId, loading, categories]);

  const skeletons = Array.from({ length: 8 });

  return (
    <nav
      className="w-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100/50 dark:border-gray-800/50 sticky top-0 z-30"
      role="navigation"
      aria-label="Product categories"
    >
      <div
        ref={scrollRef}
        className="flex items-center gap-2.5 px-4 py-3 overflow-x-auto hide-scrollbar scroll-smooth"
      >
        {/* All Categories Button - Premium Style */}
        <button
          className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-wider transition-all duration-300 min-h-[44px] snap-center active:scale-95 ${activeCategoryId === '' || activeCategoryId === 'all'
              ? 'bg-primary text-white shadow-lg shadow-primary/30'
              : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800'
            }`}
          onClick={() => onSelectCategory('')}
          aria-pressed={activeCategoryId === '' || activeCategoryId === 'all'}
        >
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-base">apps</span>
            <span>All</span>
          </div>
        </button>

        {/* Category Buttons - Glass Chips */}
        {(loading ? skeletons : categories).map((item, idx) => {
          const isActive = activeCategoryId === (item?.subcategory_id || '');

          return (
            <button
              key={loading ? `skeleton-${idx}` : (item?.subcategory_id || idx)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[12px] font-bold transition-all duration-300 min-h-[44px] snap-center active:scale-95 ${isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800'
                }`}
              onClick={() => {
                if (!loading && item) {
                  if (onCategoryClick) {
                    onCategoryClick(item.parent_category_id, item.parent_category_name);
                  } else if (item.parent_category_id && onNavigateToCategories) {
                    onNavigateToCategories(item.parent_category_id);
                  }
                }
              }}
              disabled={loading}
              aria-pressed={isActive}
              title={loading ? undefined : item?.subcategory_name}
            >
              {loading ? (
                <span className="block h-4 w-16 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : (
                <div className="flex items-center gap-2">
                  {item?.is_hot && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" title="Hot category" />
                  )}
                  {item?.is_trending && !item?.is_hot && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full shadow-sm shadow-orange-500/50" title="Trending category" />
                  )}
                  <span className="truncate max-w-[100px]">
                    {item?.parent_category_name || 'Department'}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

