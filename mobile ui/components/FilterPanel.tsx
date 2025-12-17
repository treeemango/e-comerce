import React, { useState } from 'react';
import { fetchSearchFilters } from '@/lib/api';
import { SearchFilters, AppliedFilters } from '@/types';

interface FilterPanelProps {
    onClose: () => void;
    searchQuery: string;
    appliedFilters: AppliedFilters;
    onApplyFilters: (filters: AppliedFilters) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ onClose, searchQuery, appliedFilters, onApplyFilters }) => {
    const [filters, setFilters] = useState<SearchFilters | null>(null);
    const [localFilters, setLocalFilters] = useState<AppliedFilters>(appliedFilters);
    const [selectedSection, setSelectedSection] = useState('categories');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const loadFilters = async () => {
            setLoading(true);
            try {
                const data = await fetchSearchFilters(searchQuery, appliedFilters);
                setFilters(data);
            } catch (error) {
                console.error('Error loading filters:', error);
            } finally {
                setLoading(false);
            }
        };
        loadFilters();
    }, [searchQuery]);

    const toggleCategory = (catId: string) => {
        setLocalFilters(prev => ({
            ...prev,
            category_ids: prev.category_ids.includes(catId)
                ? prev.category_ids.filter(id => id !== catId)
                : [...prev.category_ids, catId]
        }));
    };

    const toggleBrand = (brandId: string) => {
        setLocalFilters(prev => ({
            ...prev,
            brand_ids: prev.brand_ids.includes(brandId)
                ? prev.brand_ids.filter(id => id !== brandId)
                : [...prev.brand_ids, brandId]
        }));
    };

    const handleApply = () => {
        onApplyFilters(localFilters);
        onClose();
    };

    const handleReset = () => {
        const resetFilters: AppliedFilters = {
            category_ids: [],
            brand_ids: [],
            price_min: null,
            price_max: null,
            attributes: {}
        };
        setLocalFilters(resetFilters);
        onApplyFilters(resetFilters);
        onClose();
    };

    const sections = [
        { id: 'categories', name: 'Categories', count: filters?.categories?.length || 0 },
        { id: 'brands', name: 'Brands', count: filters?.brands?.length || 0 },
        { id: 'price', name: 'Price Range', count: 0 }
    ];

    return (
        <div className="flex flex-col flex-grow overflow-hidden bg-white dark:bg-black w-full h-full absolute inset-0 z-40 top-[98px]">
            {/* Sidebar & Content Container */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-[25%] bg-gray-50 dark:bg-surface-dark overflow-y-auto hide-scrollbar pb-20">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setSelectedSection(section.id)}
                            className={`w-full text-left py-4 px-3 text-xs font-medium relative transition-colors border-b border-transparent
                                ${selectedSection === section.id
                                    ? 'bg-white dark:bg-black text-black dark:text-white font-bold'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            {selectedSection === section.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                            )}
                            <div>{section.name}</div>
                            {section.count > 0 && (
                                <div className="text-[10px] text-gray-400 mt-0.5">{section.count} options</div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Right Content */}
                <div className="w-[75%] overflow-y-auto p-4 pb-20 scroll-smooth">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">Loading filters...</div>
                    ) : (
                        <>
                            {selectedSection === 'categories' && (
                                <div>
                                    <h3 className="font-bold text-sm mb-3 text-black dark:text-white">Categories</h3>
                                    <div className="flex flex-col gap-2">
                                        {filters?.categories?.map((cat) => (
                                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={localFilters.category_ids.includes(cat.id)}
                                                    onChange={() => toggleCategory(cat.id)}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="text-sm text-black dark:text-white">{cat.name}</span>
                                                <span className="text-xs text-gray-400 ml-auto">({cat.product_count})</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedSection === 'brands' && (
                                <div>
                                    <h3 className="font-bold text-sm mb-3 text-black dark:text-white">Brands</h3>
                                    <div className="flex flex-col gap-2">
                                        {filters?.brands?.map((brand) => (
                                            <label key={brand.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={localFilters.brand_ids.includes(brand.id)}
                                                    onChange={() => toggleBrand(brand.id)}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="text-sm text-black dark:text-white">{brand.brand_name}</span>
                                                <span className="text-xs text-gray-400 ml-auto">({brand.product_count})</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedSection === 'price' && (
                                <div>
                                    <h3 className="font-bold text-sm mb-3 text-black dark:text-white">Price Range</h3>
                                    {filters?.price_range && (
                                        <div className="text-xs text-gray-500 mb-3">
                                            £{filters.price_range.min.toFixed(2)} - £{filters.price_range.max.toFixed(2)}
                                            <span className="ml-2">({filters.price_range.product_count} products)</span>
                                        </div>
                                    )}
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            value={localFilters.price_min || ''}
                                            onChange={(e) => setLocalFilters({ ...localFilters, price_min: e.target.value ? Number(e.target.value) : null })}
                                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm"
                                        />
                                        <span>-</span>
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            value={localFilters.price_max || ''}
                                            onChange={(e) => setLocalFilters({ ...localFilters, price_max: e.target.value ? Number(e.target.value) : null })}
                                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="absolute bottom-0 w-full p-3 border-t border-gray-100 dark:border-gray-800 flex gap-3 bg-white dark:bg-black z-50">
                <button className="flex-1 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-black dark:text-white font-bold text-sm" onClick={handleReset}>
                    Reset
                </button>
                <button onClick={handleApply} className="flex-1 py-2 rounded-full bg-primary text-white font-bold text-sm">
                    Show {filters?.total_products || 0} results
                </button>
            </div>
        </div>
    );
};
