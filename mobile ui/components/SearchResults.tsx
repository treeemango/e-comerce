import React, { useState } from 'react';
import { Product, AppliedFilters } from '@/types';
import { fetchFilteredProducts, trackSearch } from '@/lib/api';
import { ProductCard } from './ProductCard';
import { FilterPanel } from './FilterPanel';

interface SearchResultsProps {
    query: string;
    results: Product[]; // Kept for backwards compatibility
    onBack: () => void;
    onUserClick?: () => void;
    onProductClick: (product: Product) => void;
    onVisualSearch?: (product: Product) => void;
    userAvatar?: string | null;
    userName?: string | null;
    notificationCount?: number;
    cartCount?: number;
    isVisualSearch?: boolean; // Hide AI keywords when true
}

export const SearchResults: React.FC<SearchResultsProps> = ({
    query,
    onBack,
    onUserClick,
    onProductClick,
    onVisualSearch,
    userAvatar,
    userName,
    notificationCount = 0,
    cartCount = 0,
    isVisualSearch = false
}) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
        category_ids: [],
        brand_ids: [],
        price_min: null,
        price_max: null,
        attributes: {},
        delivery_locations: [],
        vendor_countries: []
    });

    // Display text - hide AI keywords for visual search
    const displayQuery = isVisualSearch ? 'Visual Search' : query;

    React.useEffect(() => {
        const performSearch = async () => {
            if (!query) return;

            setLoading(true);
            try {
                await trackSearch(query);
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
        <div className="flex flex-col h-full bg-white dark:bg-black relative">
            {/* Unified Search Results Header */}
            <header className="bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-900"
                    >
                        <span className="material-icons-round text-gray-800 dark:text-white text-2xl">chevron_left</span>
                    </button>

                    <div
                        className="flex-grow flex items-center bg-gray-100 dark:bg-gray-900 rounded-2xl px-4 py-2.5 cursor-pointer active:scale-[0.98] transition-all"
                        onClick={onBack}
                    >
                        <span className="material-icons-round text-primary text-lg mr-2">
                            {isVisualSearch ? 'photo_camera' : 'search'}
                        </span>
                        <span className="flex-grow text-[13px] font-bold text-gray-800 dark:text-gray-200 truncate">{displayQuery}</span>
                        {!isVisualSearch && <span className="material-icons-round text-gray-400 text-sm ml-2">edit</span>}
                    </div>

                    <div className="flex items-center gap-1">
                        <button className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-900 relative">
                            <span className="material-icons-round text-gray-800 dark:text-white text-2xl">shopping_cart</span>
                            {cartCount > 0 && (
                                <span className="absolute top-2 right-2 bg-primary text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center border-2 border-white dark:border-black shadow-sm">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Modern Filters Bar */}
                <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${isFilterOpen || Object.values(appliedFilters).some(v => Array.isArray(v) ? v.length > 0 : v !== null)
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        <span className="material-icons-round text-sm">tune</span>
                        Filters
                    </button>

                    {['Sort by', 'Category', 'Price', 'Brand'].map((filter) => (
                        <button
                            key={filter}
                            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-[12px] font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap active:scale-95 transition-all"
                        >
                            {filter}
                            <span className="material-icons-round text-sm opacity-60">expand_more</span>
                        </button>
                    ))}
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

            {/* Main Results Content */}
            {!isFilterOpen && (
                <div className="flex-grow overflow-y-auto pb-24">


                    {/* Meta Info */}
                    <div className="px-5 py-4 flex items-center justify-between">
                        <div className="text-[12px] font-bold text-gray-800 dark:text-gray-100">
                            {loading ? 'Searching...' : isVisualSearch
                                ? `${searchResults.length} Similar Products Found`
                                : `${searchResults.length} Results for "${query}"`
                            }
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            <span className="material-icons-round text-sm">verified_user</span>
                            Secure
                        </div>
                    </div>

                    {/* Results Grid */}
                    <div className="px-4">
                        {loading ? (
                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map(n => (
                                    <div key={n} className="aspect-[3/4] rounded-3xl bg-gray-100 dark:bg-gray-900 animate-pulse"></div>
                                ))}
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {searchResults.map(product => (
                                    <div key={product.id} className="animate-premium-pop">
                                        <ProductCard
                                            product={product}
                                            onProductClick={onProductClick}
                                            onVisualSearch={onVisualSearch}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-premium-pop">
                                <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-6">
                                    <span className="material-icons-round text-gray-300 dark:text-gray-800 text-4xl">search_off</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">No matching items</h3>
                                <p className="text-sm text-gray-500 mb-8 max-w-[240px]">
                                    {isVisualSearch
                                        ? "We couldn't find similar products. Try taking a clearer photo or cropping to focus on the product."
                                        : `We couldn't find anything for "${query}". Try adjusting your filters or search keywords.`
                                    }
                                </p>
                                <button
                                    onClick={onBack}
                                    className="px-8 py-3 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                >
                                    Try New Search
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
