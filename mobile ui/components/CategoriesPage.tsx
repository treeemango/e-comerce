import React, { useState } from 'react';
import { fetchTrendingCategoriesOverlay, TrendingCategoryOverlay } from '@/lib/api';
import { ValueProps } from './ValueProps';

interface CategoriesPageProps {
  selectedDepartmentId?: string;
  onSelectCategory?: (categoryId: string) => void;
  onBack?: () => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  selectedDepartmentId,
  onSelectCategory,
  onBack
}) => {
    const [categories, setCategories] = useState<TrendingCategoryOverlay[]>([]);
    const [selectedParentId, setSelectedParentId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const loadCategories = async () => {
            try {
                setLoading(true);
                const data = await fetchTrendingCategoriesOverlay(35, 35);
                setCategories(data);

                // Set selected department or first one as default
                const targetParentId = selectedDepartmentId || (data.length > 0 ? data[0].parent_category_id : '');
                setSelectedParentId(targetParentId);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        loadCategories();
    }, [selectedDepartmentId]);

    // Group categories by parent for the sidebar
    const parentCategories = React.useMemo(() => {
        const seen = new Set<string>();
        const parents: { id: string; name: string; sort_order: number }[] = [];
        categories.forEach(c => {
            if (!seen.has(c.parent_category_id)) {
                seen.add(c.parent_category_id);
                parents.push({
                    id: c.parent_category_id,
                    name: c.parent_category_name,
                    sort_order: c.parent_category_sort_order
                });
            }
        });
        return parents.sort((a, b) => a.sort_order - b.sort_order);
    }, [categories]);

    const selectedSubcategories = categories.filter(c => c.parent_category_id === selectedParentId);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black">
            <ValueProps />

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-[28%] bg-gray-50 dark:bg-surface-dark overflow-y-auto hide-scrollbar pb-20">
                    {parentCategories.map((parent) => {
                        const isSelected = selectedParentId === parent.id;
                        return (
                            <button
                                key={parent.id}
                                onClick={() => setSelectedParentId(parent.id)}
                                className={`w-full text-left py-4 px-2 text-[13px] leading-tight transition-colors relative
                            ${isSelected
                                        ? 'bg-white dark:bg-black text-black dark:text-white font-bold'
                                        : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                {isSelected && (
                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></span>
                                )}
                                {parent.name}
                            </button>
                        );
                    })}
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto pb-24 bg-white dark:bg-black px-3 py-3">
                    <h2 className="font-bold text-sm mb-4 text-black dark:text-white">Shop by category</h2>

                    {loading ? (
                        <div className="flex justify-center items-center h-40 text-xs">Loading...</div>
                    ) : selectedSubcategories.length > 0 ? (
                        <div className="grid grid-cols-3 gap-y-6 gap-x-2">
                            {selectedSubcategories.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex flex-col items-center gap-2 cursor-pointer group"
                                    onClick={() => onSelectCategory?.(item.subcategory_id)}
                                >
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                                        <img
                                            src={item.trending_product_image_url || 'https://via.placeholder.com/150'}
                                            alt={item.subcategory_name}
                                            className="w-full h-full rounded-full object-cover bg-gray-100 dark:bg-gray-800 group-hover:scale-105 transition-transform duration-200"
                                        />
                                        {item.hot_badge_text && (
                                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold px-1 rounded-sm shadow-sm">
                                                {item.hot_badge_text}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-center text-gray-600 dark:text-gray-300 leading-tight group-hover:text-primary transition-colors">
                                        {item.subcategory_name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-xs">
                            <span>No sub-categories found.</span>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
