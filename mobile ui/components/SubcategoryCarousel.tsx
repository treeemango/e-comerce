import React, { useState, useEffect } from 'react';

interface Subcategory {
    id: string;
    name: string;
    icon?: string;
    imageUrl?: string;
}

interface SubcategoryCarouselProps {
    categoryId: string;
    categoryName: string;
    onSelectSubcategory: (subcategoryId: string) => void;
    activeSubcategoryId: string;
}

export const SubcategoryCarousel: React.FC<SubcategoryCarouselProps> = ({
    categoryId,
    categoryName,
    onSelectSubcategory,
    activeSubcategoryId
}) => {
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch subcategories for the selected category
        const fetchSubcategories = async () => {
            try {
                setLoading(true);

                // Import API dynamically to avoid circular dependencies if any
                const { fetchTrendingCategoriesOverlay } = await import('@/lib/api');
                const data = await fetchTrendingCategoriesOverlay();

                // Filter for subcategories that belong to the selected parent category
                // The SQL returns rows for each subcategory
                const relevantSubcategories = data.filter(item =>
                    item.parent_category_id === categoryId
                );

                // Map to component format
                const mappedSubcategories: Subcategory[] = [
                    { id: 'all', name: 'All', icon: 'apps' },
                    ...relevantSubcategories.map(item => ({
                        id: item.subcategory_id,
                        name: item.subcategory_name,
                        imageUrl: item.trending_product_image_url || undefined,
                        // fallback icon if no image
                        icon: !item.trending_product_image_url ? 'category' : undefined
                    }))
                ];

                // Remove duplicates if any (though SQL should handle distinct subcategories)
                const uniqueSubcategories = mappedSubcategories.filter((sub, index, self) =>
                    index === self.findIndex((t) => t.id === sub.id)
                );

                setSubcategories(uniqueSubcategories);

                // Default to the first real subcategory (not "All") for a more modern UX.
                // Users can still tap "All" manually if they want.
                const hasActive = uniqueSubcategories.some(s => s.id === activeSubcategoryId);
                const nextDefault = uniqueSubcategories.find(s => s.id !== 'all');
                if ((!hasActive || activeSubcategoryId === 'all' || activeSubcategoryId === '') && nextDefault && nextDefault.id !== activeSubcategoryId) {
                    onSelectSubcategory(nextDefault.id);
                }
            } catch (error) {
                console.error('Error fetching subcategories:', error);
                // Fallback to empty or previous state
                setSubcategories([{ id: 'all', name: 'All', icon: 'apps' }]);
            } finally {
                setLoading(false);
            }
        };

        if (categoryId) {
            fetchSubcategories();
        }
    }, [categoryId]);

    if (!categoryId || loading) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 pb-1.5">

            {/* Subcategory Carousel */}
            <div className="px-3 pt-1.5">
                <div className="flex items-start gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth pb-1.5">
                    {subcategories.map((sub) => {
                        const isActive = activeSubcategoryId === sub.id;
                        return (
                            <button
                                key={sub.id}
                                onClick={() => onSelectSubcategory(sub.id)}
                                className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
                            >
                                {/* Circular Icon */}
                                <div className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${isActive
                                    ? 'border-primary shadow-md scale-105'
                                    : 'border-gray-200 dark:border-gray-700 group-hover:border-primary/50'
                                    }`}>
                                    {sub.imageUrl ? (
                                        <img
                                            src={sub.imageUrl}
                                            alt={sub.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : sub.icon ? (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                            <span className="material-icons-outlined text-2xl text-gray-600 dark:text-gray-400">
                                                {sub.icon}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                                    )}

                                    {/* Active Checkmark */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                            <span className="material-icons text-primary text-2xl">check_circle</span>
                                        </div>
                                    )}
                                </div>

                                {/* Label */}
                                <span className={`text-xs font-medium text-center max-w-[70px] line-clamp-2 leading-tight transition-colors ${isActive
                                    ? 'text-primary dark:text-primary'
                                    : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                    {sub.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
