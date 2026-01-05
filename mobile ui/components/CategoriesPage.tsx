import React, { useState } from 'react';
import { fetchTrendingCategoriesOverlay, TrendingCategoryOverlay } from '@/lib/api';


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

    const sidebarSkeletons = React.useMemo(() => Array.from({ length: 20 }), []);
    const gridSkeletons = React.useMemo(() => Array.from({ length: 36 }), []);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-black">


            <div className="flex flex-1 overflow-hidden">
                {/* Premium Sidebar */}
                <aside className="w-[30%] bg-white dark:bg-surface-dark overflow-y-auto hide-scrollbar pb-20 border-r border-gray-100 dark:border-gray-800">
                    <div className="p-3">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] px-2">Departments</span>
                    </div>
                    {loading
                        ? sidebarSkeletons.map((_, idx) => (
                            <div key={idx} className="px-4 py-4">
                                <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                            </div>
                        ))
                        : parentCategories.map((parent) => {
                            const isSelected = selectedParentId === parent.id;
                            return (
                                <button
                                    key={parent.id}
                                    onClick={() => setSelectedParentId(parent.id)}
                                    className={`w-full text-left py-4 px-4 text-[13px] leading-tight transition-all duration-300 relative group ${isSelected
                                        ? 'bg-primary/5 dark:bg-primary/10 text-primary font-black'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 font-medium'
                                        }`}
                                >
                                    {isSelected && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-lg shadow-primary/30"></span>
                                    )}
                                    <span className={`${isSelected ? 'ml-2' : ''} transition-all`}>{parent.name}</span>
                                </button>
                            );
                        })}
                </aside>

                {/* Main Grid Content */}
                <main className="flex-1 overflow-y-auto pb-24 bg-gray-50 dark:bg-black px-4 py-4">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Browse Categories</h2>
                        {loading ? (
                            <span className="block h-3 w-14 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        ) : (
                            <span className="text-[10px] font-bold text-gray-300">{selectedSubcategories.length} items</span>
                        )}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-3 gap-y-6 gap-x-3 min-h-full">
                            {gridSkeletons.map((_, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                                    <div className="w-14 h-3 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : selectedSubcategories.length > 0 ? (
                        <div className="grid grid-cols-3 gap-y-6 gap-x-3">
                            {selectedSubcategories.map((item, idx) => (
                                <button
                                    key={idx}
                                    className="flex flex-col items-center gap-2.5 group focus:outline-none"
                                    onClick={() => onSelectCategory?.(item.subcategory_id)}
                                >
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-lg shadow-gray-200/50 dark:shadow-black/30 border border-gray-100 dark:border-gray-800 group-hover:scale-105 group-hover:shadow-xl transition-all duration-300">
                                            <img
                                                src={item.trending_product_image_url || 'https://via.placeholder.com/150'}
                                                alt={item.subcategory_name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {item.hot_badge_text && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-md shadow-red-500/30 uppercase tracking-wide">
                                                {item.hot_badge_text}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-center text-gray-700 dark:text-gray-300 font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 max-w-[80px]">
                                        {item.subcategory_name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-3">
                                <span className="material-icons-round text-3xl text-gray-300">category</span>
                            </div>
                            <span className="text-sm font-bold text-gray-400">No categories found</span>
                            <span className="text-[11px] text-gray-300 mt-1">Try selecting another department</span>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

