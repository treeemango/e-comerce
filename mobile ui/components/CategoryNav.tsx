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
  const [focusedIndex, setFocusedIndex] = useState(-1);
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

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const newIndex = Math.max(0, index - 1);
      setFocusedIndex(newIndex);
      scrollToButton(newIndex);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const newIndex = Math.min(categories.length, index + 1);
      setFocusedIndex(newIndex);
      scrollToButton(newIndex);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (index === 0) {
        onSelectCategory('');
      } else if (categories[index - 1]) {
        onSelectCategory(categories[index - 1].subcategory_id);
      }
    }
  };

  const scrollToButton = (index: number) => {
    if (scrollRef.current) {
      const buttons = scrollRef.current.querySelectorAll('button');
      const targetButton = buttons[index];
      if (targetButton) {
        targetButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  };

  const skeletons = Array.from({ length: 8 });

  return (
    <nav
      className="w-full bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800"
      role="navigation"
      aria-label="Product categories"
    >
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* All Categories Button */}
        <button
          className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 min-h-[44px] min-w-[60px] snap-center focus:outline-none focus:ring-2 focus:ring-primary/50 ${activeCategoryId === '' || activeCategoryId === 'all'
            ? 'bg-primary text-white shadow-md transform scale-105'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95'
            }`}
          onClick={() => onSelectCategory('')}
          onKeyDown={(e) => handleKeyDown(e, 0)}
          aria-pressed={activeCategoryId === '' || activeCategoryId === 'all'}
          tabIndex={0}
        >
          All
        </button>

        {/* Category Buttons */}
        {(loading ? skeletons : categories).map((item, idx) => {
          const isActive = activeCategoryId === (item?.subcategory_id || '');
          const isFocused = focusedIndex === idx + 1;

          return (
            <button
              key={loading ? `skeleton-${idx}` : (item?.subcategory_id || idx)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 min-h-[44px] snap-center focus:outline-none focus:ring-2 focus:ring-primary/50 ${isActive
                ? 'bg-primary text-white shadow-md transform scale-105'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95'
                } ${isFocused ? 'ring-2 ring-primary/50' : ''} ${item?.is_hot ? 'ring-2 ring-red-400/50' : item?.is_trending ? 'ring-2 ring-orange-400/50' : ''
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
              onKeyDown={(e) => handleKeyDown(e, idx + 1)}
              disabled={loading}
              aria-pressed={isActive}
              tabIndex={0}
              title={loading ? undefined : item?.subcategory_name}
            >
              {loading ? (
                <span className="block h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : (
                <div className="flex items-center gap-1">
                  {item?.is_hot && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Hot category" />
                  )}
                  {item?.is_trending && !item?.is_hot && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full" title="Trending category" />
                  )}
                  <span className="truncate max-w-[120px]">
                    {item?.parent_category_name || 'Department'}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Indicator Line */}
      <div className="relative h-0.5 bg-gray-200 dark:bg-gray-700">
        <div
          className="absolute top-0 h-full bg-primary transition-all duration-300 ease-out rounded-full"
          style={{
            width: '60px',
            transform: `translateX(${focusedIndex >= 0 ? focusedIndex * 72 : 0}px)`,
            opacity: focusedIndex >= 0 ? 1 : 0
          }}
        />
      </div>
    </nav>
  );
};
