import React, { useState } from 'react';
import { fetchSearchFilters } from '@/lib/api';
import { SearchFilters, AppliedFilters, AttributeValue } from '@/types';
import { getCurrencySymbol, useCurrencyConverter, convertAmount, getUserCurrency } from '@/lib/currency';

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

    // Currency Conversion
    const userCurrency = getUserCurrency();
    const [localMin, setLocalMin] = useState<string>('');
    const [localMax, setLocalMax] = useState<string>('');

    const { convertedValues: priceRangeConverted } = useCurrencyConverter(
        filters?.price_range ? [
            { amount: filters.price_range.min, currency: filters.price_range.currency || 'USD', id: 'min' },
            { amount: filters.price_range.max, currency: filters.price_range.currency || 'USD', id: 'max' }
        ] : []
    );

    // Sync input fields with applied filters (converted)
    React.useEffect(() => {
        const syncPrices = async () => {
            const baseCurrency = filters?.price_range?.currency || 'USD';
            if (localFilters.price_min) {
                const val = await convertAmount(localFilters.price_min, baseCurrency, userCurrency);
                setLocalMin(val !== null ? val.toFixed(0) : '');
            } else {
                setLocalMin('');
            }
            if (localFilters.price_max) {
                const val = await convertAmount(localFilters.price_max, baseCurrency, userCurrency);
                setLocalMax(val !== null ? val.toFixed(0) : '');
            } else {
                setLocalMax('');
            }
        };
        // Only sync if applied filters change externally or on load
        if (selectedSection === 'price') {
            syncPrices();
        }
    }, [localFilters.price_min, localFilters.price_max, selectedSection, userCurrency, filters?.price_range?.currency]);

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

    const toggleCondition = (condition: string) => {
        setLocalFilters(prev => ({
            ...prev,
            conditions: (prev.conditions || []).includes(condition)
                ? (prev.conditions || []).filter(c => c !== condition)
                : [...(prev.conditions || []), condition]
        }));
    };

    // Toggle attribute value
    const toggleAttribute = (attrName: string, value: string) => {
        setLocalFilters(prev => {
            const currentVals = prev.attributes?.[attrName] || [];
            const newVals = currentVals.includes(value)
                ? currentVals.filter(v => v !== value)
                : [...currentVals, value];
            return {
                ...prev,
                attributes: {
                    ...prev.attributes,
                    [attrName]: newVals
                }
            };
        });
    };

    const handleApply = async () => {
        // Convert prices back to base currency before applying
        const baseCurrency = filters?.price_range?.currency || 'USD';
        let min = null;
        let max = null;

        if (localMin) {
            min = await convertAmount(parseFloat(localMin), userCurrency, baseCurrency);
        }
        if (localMax) {
            max = await convertAmount(parseFloat(localMax), userCurrency, baseCurrency);
        }

        const finalFilters = {
            ...localFilters,
            price_min: min,
            price_max: max
        };

        onApplyFilters(finalFilters);
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
            vendor_countries: [],
            conditions: []
        };
        setLocalFilters(resetFilters);
        setLocalMin('');
        setLocalMax('');
    };

    const getActiveCount = (id: string) => {
        switch (id) {
            case 'categories': return localFilters.category_ids.length;
            case 'brands': return localFilters.brand_ids.length;
            case 'countries': return localFilters.vendor_countries.length;
            case 'conditions': return (localFilters.conditions?.length || 0);
            case 'price': return (localFilters.price_min || localFilters.price_max) ? 1 : 0;
            case 'attributes':
                return Object.values(localFilters.attributes || {}).reduce((acc: number, arr) => acc + (arr as string[]).length, 0);
            default: return 0;
        }
    };

    const sections = [
        { id: 'categories', name: 'Category' },
        { id: 'price', name: 'Price' },
        { id: 'brands', name: 'Brands' },
        { id: 'attributes', name: 'Attributes' }
    ];

    return (
        <div className="flex flex-col flex-grow overflow-hidden bg-white dark:bg-gray-950 w-full h-full absolute inset-0 z-50 animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
                <button
                    onClick={onClose}
                    className="p-2 -ml-2 text-gray-600 dark:text-gray-300"
                >
                    <span className="material-icons-round text-xl">arrow_back</span>
                </button>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Filters</h2>
                <button
                    onClick={handleReset}
                    className="text-primary font-medium text-sm"
                >
                    Clear
                </button>
            </div>
            {/* Sidebar & Content Container */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Simple Navigation like reference image */}
                <div className="w-[40%] max-w-[160px] bg-gray-50 dark:bg-gray-900 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
                    {sections.map((section) => {
                        const isSelected = selectedSection === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setSelectedSection(section.id)}
                                className={`w-full text-left py-4 px-4 relative flex items-center justify-between transition-all
                                    ${isSelected
                                        ? 'bg-white dark:bg-gray-950'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                {/* Orange left border for selected */}
                                {isSelected && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                                )}
                                <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {section.name}
                                </span>
                                <span className={`material-icons-round text-lg ${isSelected ? 'text-primary' : 'text-gray-400'}`}>
                                    chevron_right
                                </span>
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
                                            <div className="text-[15px] font-bold text-black dark:text-white">
                                                {priceRangeConverted?.min?.converted || `${getCurrencySymbol(filters.price_range.currency)}${filters.price_range.min.toFixed(0)}`} — {priceRangeConverted?.max?.converted || `${getCurrencySymbol(filters.price_range.currency)}${filters.price_range.max.toFixed(0)}`}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-medium mt-1">Based on {filters.price_range.product_count} matches</div>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase px-1">Minimum Price ({getCurrencySymbol(userCurrency)})</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(userCurrency)}</span>
                                                <input
                                                    type="number"
                                                    placeholder={priceRangeConverted?.min?.amount?.toFixed(0) || "0"}
                                                    value={localMin}
                                                    onChange={(e) => setLocalMin(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl text-[15px] font-bold focus:ring-2 focus:ring-primary/20 transition-all text-black dark:text-white"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase px-1">Maximum Price ({getCurrencySymbol(userCurrency)})</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(userCurrency)}</span>
                                                <input
                                                    type="number"
                                                    placeholder={priceRangeConverted?.max?.amount?.toFixed(0) || "Max"}
                                                    value={localMax}
                                                    onChange={(e) => setLocalMax(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl text-[15px] font-bold focus:ring-2 focus:ring-primary/20 transition-all text-black dark:text-white"
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

                            {selectedSection === 'conditions' && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Product Condition</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {filters?.conditions?.map((cond) => {
                                            const isActive = (localFilters.conditions || []).includes(cond.condition);
                                            const label = cond.condition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                            return (
                                                <button
                                                    key={cond.condition}
                                                    onClick={() => toggleCondition(cond.condition)}
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
                                                        {label}
                                                    </span>
                                                    <span className="ml-auto text-[10px] font-black text-gray-400">
                                                        {cond.product_count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {selectedSection === 'attributes' && (
                                <div className="space-y-6">
                                    {/* Attributes are now Record<string, AttributeValue[]> */}
                                    {filters?.attributes && Object.keys(filters.attributes).length > 0 && (Object.entries(filters.attributes) as [string, AttributeValue[]][]).map(([attrName, values]) => (
                                        <div key={attrName} className="space-y-3">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {attrName}
                                            </h4>
                                            <div className="space-y-2">
                                                {values.map((item) => {
                                                    const isActive = (localFilters.attributes?.[attrName] || []).includes(item.value);
                                                    return (
                                                        <button
                                                            key={item.value}
                                                            onClick={() => toggleAttribute(attrName, item.value)}
                                                            className="w-full flex items-center justify-between py-1.5 text-left"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isActive
                                                                    ? 'bg-primary border-primary'
                                                                    : 'border-gray-300 dark:border-gray-600'}`}
                                                                >
                                                                    {isActive && (
                                                                        <span className="material-icons-round text-white" style={{ fontSize: '12px' }}>check</span>
                                                                    )}
                                                                </div>
                                                                <span className={`text-sm ${isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                    {item.value}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-gray-400">
                                                                {item.product_count}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Fallback if no attributes available */}
                                    {(!filters?.attributes || Object.keys(filters.attributes).length === 0) && (
                                        <div className="text-center py-8 text-gray-400">
                                            <span className="material-icons-round text-3xl mb-2">tune</span>
                                            <p className="text-sm">No attributes available</p>
                                        </div>
                                    )}
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
