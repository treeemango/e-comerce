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

    const toggleCountry = (country: string) => {
        setLocalFilters(prev => ({
            ...prev,
            vendor_countries: prev.vendor_countries.includes(country)
                ? prev.vendor_countries.filter(c => c !== country)
                : [...prev.vendor_countries, country]
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
            attributes: {},
            delivery_locations: [],
            vendor_countries: []
        };
        setLocalFilters(resetFilters);
        onApplyFilters(resetFilters);
        onClose();
    };

    const getActiveCount = (id: string) => {
        switch (id) {
            case 'categories': return localFilters.category_ids.length;
            case 'brands': return localFilters.brand_ids.length;
            case 'countries': return localFilters.vendor_countries.length;
            case 'price': return (localFilters.price_min || localFilters.price_max) ? 1 : 0;
            default: return 0;
        }
    };

    const sections = [
        { id: 'categories', name: 'Categories', icon: 'category' },
        { id: 'brands', name: 'Brands', icon: 'loyalty' },
        { id: 'price', name: 'Price Range', icon: 'payments' },
        { id: 'countries', name: 'Countries', icon: 'public' }
    ];

    return (
        <div className="flex flex-col flex-grow overflow-hidden bg-white dark:bg-black w-full h-full absolute inset-0 z-40 top-[112px] animate-in slide-in-from-bottom duration-300">
            {/* Sidebar & Content Container */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Refined Navigation */}
                <div className="w-[30%] bg-gray-50/50 dark:bg-gray-950/50 overflow-y-auto hide-scrollbar border-r border-gray-100 dark:border-gray-900 pb-20">
                    {sections.map((section) => {
                        const activeCount = getActiveCount(section.id);
                        const isSelected = selectedSection === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setSelectedSection(section.id)}
                                className={`w-full text-left py-5 px-4 relative transition-all
                                    ${isSelected
                                        ? 'bg-white dark:bg-gray-900 text-primary'
                                        : 'text-gray-500 dark:text-gray-400'
                                    }`}
                            >
                                {isSelected && (
                                    <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-primary rounded-r-full shadow-[2px_0_8px_rgba(255,107,0,0.3)]"></div>
                                )}
                                <div className="flex flex-col gap-1">
                                    <span className={`material-icons-round text-xl ${isSelected ? 'text-primary' : 'text-gray-300 dark:text-gray-700'}`}>
                                        {section.icon}
                                    </span>
                                    <span className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-gray-900 dark:text-white' : ''}`}>
                                        {section.name}
                                    </span>
                                    {activeCount > 0 && (
                                        <div className="absolute top-4 right-3 bg-primary text-white text-[9px] font-black rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 border-2 border-white dark:border-black">
                                            {activeCount}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Right Content - Modern Pill Filters */}
                <div className="w-[70%] overflow-y-auto p-5 pb-24 scroll-smooth">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Updating...</span>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-500">
                            {selectedSection === 'categories' && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Filtered Categories</h3>
                                    <div className="flex flex-col gap-2">
                                        {filters?.categories?.map((cat) => {
                                            const isActive = localFilters.category_ids.includes(cat.id);
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => toggleCategory(cat.id)}
                                                    className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${isActive
                                                            ? 'bg-primary/5 border-primary shadow-sm'
                                                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 active:scale-[0.98]'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isActive ? 'bg-primary border-primary' : 'border-gray-200 dark:border-gray-700'
                                                        }`}>
                                                        {isActive && <span className="material-icons-round text-white text-sm">check</span>}
                                                    </div>
                                                    <span className={`text-[13px] font-bold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {cat.name}
                                                    </span>
                                                    <span className="ml-auto text-[10px] font-black text-gray-400">
                                                        {cat.product_count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {selectedSection === 'brands' && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Popular Brands</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {filters?.brands?.map((brand) => {
                                            const isActive = localFilters.brand_ids.includes(brand.id);
                                            return (
                                                <button
                                                    key={brand.id}
                                                    onClick={() => toggleBrand(brand.id)}
                                                    className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${isActive
                                                            ? 'bg-primary/5 border-primary'
                                                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${isActive ? 'bg-primary border-primary' : 'border-gray-200 dark:border-gray-700'
                                                        }`}>
                                                        {isActive && <span className="material-icons-round text-white text-sm">check</span>}
                                                    </div>
                                                    <span className={`text-[13px] font-bold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {brand.brand_name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {selectedSection === 'price' && (
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Price Adjustment</h3>
                                    {filters?.price_range && (
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                            <div className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wide">Market Range</div>
                                            <div className="text-[15px] font-bold text-gray-800 dark:text-white">
                                                ${filters.price_range.min.toFixed(0)} — ${filters.price_range.max.toFixed(0)}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-medium mt-1">Based on {filters.price_range.product_count} matches</div>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase px-1">Minimum Price</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={localFilters.price_min || ''}
                                                    onChange={(e) => setLocalFilters({ ...localFilters, price_min: e.target.value ? Number(e.target.value) : null })}
                                                    className="w-full pl-8 pr-4 py-3.5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl text-[15px] font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase px-1">Maximum Price</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    value={localFilters.price_max || ''}
                                                    onChange={(e) => setLocalFilters({ ...localFilters, price_max: e.target.value ? Number(e.target.value) : null })}
                                                    className="w-full pl-8 pr-4 py-3.5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl text-[15px] font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedSection === 'countries' && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Ships From</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {filters?.vendor_countries?.map((vc) => {
                                            const isActive = localFilters.vendor_countries.includes(vc.country);
                                            return (
                                                <button
                                                    key={vc.country}
                                                    onClick={() => toggleCountry(vc.country)}
                                                    className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${isActive
                                                            ? 'bg-primary/5 border-primary shadow-sm'
                                                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                                                        }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isActive ? 'bg-primary border-primary' : 'border-gray-200 dark:border-gray-700'
                                                        }`}>
                                                        {isActive && <span className="material-icons-round text-white text-sm">check</span>}
                                                    </div>
                                                    <span className={`text-[13px] font-bold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {vc.country}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Bottom Actions - Glass Effect */}
            <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-xl flex gap-3 z-50">
                <button
                    className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white font-black text-[13px] uppercase tracking-widest active:bg-gray-50 dark:active:bg-gray-900 transition-all"
                    onClick={handleReset}
                >
                    Reset
                </button>
                <button
                    onClick={handleApply}
                    className="flex-[2] py-4 rounded-2xl bg-primary text-white font-black text-[13px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
                >
                    Apply {filters?.total_products ? `(${filters.total_products})` : ''}
                </button>
            </div>
        </div>
    );
};
