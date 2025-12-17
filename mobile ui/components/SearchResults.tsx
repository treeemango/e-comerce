import React, { useState } from 'react';
import { Product, AppliedFilters } from '@/types';
import { fetchFilteredProducts, trackSearch } from '@/lib/api';
import { ProductCard } from './ProductCard';
import { FilterPanel } from './FilterPanel';

interface SearchResultsProps {
    query: string;
    results: Product[]; // Kept for backwards compatibility but will be overridden
    onBack: () => void;
    onUserClick?: () => void;
    onProductClick: (product: Product) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ query, onBack, onUserClick, onProductClick }) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
        category_ids: [],
        brand_ids: [],
        price_min: null,
        price_max: null,
        attributes: {}
    });

    React.useEffect(() => {
        const performSearch = async () => {
            if (!query) return;

            setLoading(true);
            try {
                // Track the search
                await trackSearch(query);

                // Fetch results
                const results = await fetchFilteredProducts(query, appliedFilters);
                setSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        };

        performSearch();
    }, [query, appliedFilters]);

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark relative">
            {/* Custom Header for Search Results */}
            <header className="bg-surface-light dark:bg-surface-dark shadow-sm flex-none z-50">
                <div className="flex items-center justify-between px-2 py-2 gap-2">
                    <button onClick={onBack} className="p-1">
                        <span className="material-icons-outlined text-xl text-black dark:text-white">arrow_back_ios_new</span>
                    </button>

                    <div className="flex-grow relative">
                        <div className="w-full flex items-center bg-white dark:bg-black border border-black dark:border-gray-600 rounded-full px-3 py-1.5">
                            <span className="flex-grow text-sm text-black dark:text-white truncate">{query}</span>
                            <button className="bg-gray-300 dark:bg-gray-700 rounded-full w-4 h-4 flex items-center justify-center ml-2" onClick={onBack}>
                                <span className="material-icons-round text-white text-[10px]">close</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-black dark:text-white">
                        <button className="p-1"><span className="material-icons-outlined text-2xl">format_list_bulleted</span></button>
                        <button className="relative p-1" onClick={onUserClick}>
                            <img src="https://i.pravatar.cc/100?img=5" alt="User" className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700" />
                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">24</span>
                        </button>
                        <button className="relative p-1">
                            <span className="material-icons-outlined text-2xl">shopping_cart</span>
                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">4</span>
                        </button>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto hide-scrollbar border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${isFilterOpen ? 'bg-black text-white dark:bg-white dark:text-black font-bold' : 'bg-gray-100 dark:bg-gray-800'}`}
                    >
                        <span className="material-icons-outlined text-sm">filter_alt</span>
                        Filters
                    </button>
                    <button className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                        Sort by
                        <span className="material-icons-outlined text-sm">expand_more</span>
                    </button>
                    <button className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                        Category
                        <span className="material-icons-outlined text-sm">expand_more</span>
                    </button>
                    <button className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                        Colour
                        <span className="material-icons-outlined text-sm">expand_more</span>
                    </button>
                    <button className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                        Price Range
                        <span className="material-icons-outlined text-sm">expand_more</span>
                    </button>
                </div>
            </header>

            {/* Filter Panel Overlay */}
            {isFilterOpen && (
                <FilterPanel
                    onClose={() => setIsFilterOpen(false)}
                    searchQuery={query}
                    appliedFilters={appliedFilters}
                    onApplyFilters={(newFilters) => {
                        setAppliedFilters(newFilters);
                        setIsFilterOpen(false);
                    }}
                />
            )}

            {/* Main Results Content (Hidden when filter is open to prevent double scroll) */}
            {!isFilterOpen && (
                <div className="flex-grow overflow-y-auto pb-20">
                    {/* Value Props */}
                    <div className="bg-[#FFF8F0] dark:bg-orange-900/10 px-4 py-2 flex items-center justify-between text-xs border-b border-orange-100 dark:border-orange-900/30">
                        <div className="flex items-center gap-1 text-banner-green dark:text-green-400 font-bold whitespace-nowrap">
                            <span className="material-icons-outlined text-base">check</span>
                            Free shipping
                        </div>
                        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
                        <div className="flex items-center gap-1 text-banner-green dark:text-green-400 font-bold overflow-hidden">
                            <span className="material-icons-outlined text-base">check</span>
                            <span className="truncate">Price adjustment within 30 days</span>
                        </div>
                        <span className="material-icons-outlined text-gray-400 text-sm ml-1">chevron_right</span>
                    </div>

                    {/* Deals Banner */}
                    <div className="px-2 pt-2">
                        <div className="border border-gray-200 dark:border-gray-700 rounded-full py-1 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-surface-dark shadow-sm">
                            <span className="material-icons-outlined text-sm mr-1">bolt</span>
                            Deals end today
                        </div>
                    </div>

                    <div className="px-3 py-2 text-[10px] text-gray-500 flex items-center gap-1">
                        Learn more about these results
                        <span className="material-icons-outlined text-[10px]">help_outline</span>
                    </div>

                    {/* Results Grid */}
                    <div className="px-2">
                        {loading ? (
                            <div className="flex justify-center items-center h-40 text-sm">Searching...</div>
                        ) : searchResults.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {searchResults.map(product => (
                                    <ProductCard key={product.id} product={product} onClick={() => onProductClick(product)} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col justify-center items-center h-40 text-sm text-gray-500">
                                <span className="material-icons-outlined text-4xl mb-2">search_off</span>
                                <p>No results found for "{query}"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
