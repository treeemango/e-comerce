import React, { useState } from 'react';
import { Product, AppliedFilters } from '@/types';
import { fetchFilteredProducts, trackSearch } from '@/lib/api';
import { applyEventBoostRanking, extractEventBoostTerms } from '@/lib/event-boost';
import { ProductCard } from './ProductCard';
import { FilterPanel } from './FilterPanel';
import { type EventBannerData } from '@/lib/event-banner-service';
import { getEventIconSrc } from '@/lib/event-icons';

type SortOption = 'best_match' | 'newest' | 'rating' | 'price_low' | 'price_high';

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

    // Optional: event-deals themed header/banner (mobile parity with web)
    eventBanner?: EventBannerData | null;
    headerTitleOverride?: string;
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
    isVisualSearch = false,
    eventBanner,
    headerTitleOverride
}) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('best_match');
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

    const showEventBanner = !!eventBanner && eventBanner.eventName !== 'default';
    const isEventDealsView = showEventBanner && !!headerTitleOverride;

    // Display text - hide AI keywords for visual search
    const displayQuery = isVisualSearch ? 'Visual Search' : (headerTitleOverride || query);

    const sortLabel = React.useMemo(() => {
        switch (sortBy) {
            case 'best_match':
                return 'Best match';
            case 'newest':
                return 'Newest';
            case 'rating':
                return 'Top rated';
            case 'price_low':
                return 'Price: low to high';
            case 'price_high':
                return 'Price: high to low';
            default:
                return 'Best match';
        }
    }, [sortBy]);

    const displayedResults = React.useMemo(() => {
        if (sortBy === 'best_match') return searchResults;

        const sorted = [...searchResults];
        switch (sortBy) {
            case 'newest':
                return sorted.sort((a, b) => {
                    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
                    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
                    return bTime - aTime;
                });
            case 'rating':
                return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case 'price_low':
                return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
            case 'price_high':
                return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
            default:
                return sorted;
        }
    }, [searchResults, sortBy]);

    React.useEffect(() => {
        const performSearch = async () => {
            if (!query) return;

            setLoading(true);
            try {
                await trackSearch(query);
                const results = await fetchFilteredProducts(query, appliedFilters);
                if (isEventDealsView) {
                    const terms = extractEventBoostTerms(query, [
                        eventBanner?.eventName,
                        eventBanner?.headline,
                        eventBanner?.subheadline,
                        eventBanner?.cta,
                    ]);
                    setSearchResults(applyEventBoostRanking(results, terms));
                } else {
                    setSearchResults(results);
                }
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
                {showEventBanner && (
                    <div
                        className="h-10 flex items-center justify-between px-4 text-white overflow-hidden"
                        style={{
                            background: `linear-gradient(90deg, ${eventBanner!.backgroundColor}, ${eventBanner!.accentColor}dd)`
                        }}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="flex items-center gap-1.5">
                                {(eventBanner!.iconKeys || [eventBanner!.iconKey]).filter(Boolean).slice(0, 2).map((key, idx) => (
                                    <div
                                        key={idx}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md border border-white/20 shadow-sm"
                                    >
                                        <img src={getEventIconSrc(key as string)} alt="" className="h-4 w-4 object-contain" />
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/70 leading-none truncate">{eventBanner!.eventName}</span>
                                <span className="text-[10px] font-black tracking-tight uppercase mt-0.5 line-clamp-1 truncate">{eventBanner!.headline || 'Event Deals'}</span>
                            </div>
                        </div>

                        <div className="px-3 py-1 bg-white text-black text-[8px] font-black rounded-full shadow-lg shrink-0">
                            {eventBanner!.cta || 'Shop Now'}
                        </div>
                    </div>
                )}

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

                    <button
                        onClick={() => setIsSortOpen(true)}
                        className={`flex items-center gap-1 px-4 py-2 rounded-xl border text-[12px] font-semibold whitespace-nowrap active:scale-95 transition-all ${isSortOpen
                            ? 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                        aria-haspopup="dialog"
                        aria-expanded={isSortOpen}
                    >
                        <span className="material-icons-round text-sm opacity-70">sort</span>
                        {`Sort: ${sortLabel}`}
                        <span className="material-icons-round text-sm opacity-60">expand_more</span>
                    </button>
                </div>
            </header>

            {/* Sort By Bottom Sheet */}
            {isSortOpen && !isFilterOpen && (
                <div
                    className="fixed inset-0 z-[60]"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Sort options"
                >
                    <button
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setIsSortOpen(false)}
                        aria-label="Close sort options"
                    />
                    <div className="absolute left-0 right-0 bottom-0 bg-white dark:bg-black rounded-t-3xl border-t border-gray-100 dark:border-gray-800 shadow-2xl">
                        <div className="px-5 pt-4 pb-2">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between">
                                <h3 className="text-[14px] font-black text-gray-900 dark:text-white">Sort by</h3>
                                <button
                                    onClick={() => setIsSortOpen(false)}
                                    className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100 dark:active:bg-gray-900"
                                    aria-label="Close"
                                >
                                    <span className="material-icons-round text-xl text-gray-600 dark:text-gray-300">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="px-3 pb-6">
                            {(
                                [
                                    { id: 'best_match', label: 'Best match' },
                                    { id: 'newest', label: 'Newest' },
                                    { id: 'rating', label: 'Top rated' },
                                    { id: 'price_low', label: 'Price: low to high' },
                                    { id: 'price_high', label: 'Price: high to low' },
                                ] as Array<{ id: SortOption; label: string }>
                            ).map((opt) => {
                                const selected = sortBy === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => {
                                            setSortBy(opt.id);
                                            setIsSortOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all ${selected
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-transparent text-gray-800 dark:text-gray-200 active:bg-gray-50 dark:active:bg-gray-900'
                                            }`}
                                    >
                                        <span className="text-[13px] font-bold">{opt.label}</span>
                                        {selected ? (
                                            <span className="material-icons-round text-lg">check</span>
                                        ) : (
                                            <span className="w-5" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

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

                    <div className="px-4">
                        {loading ? (
                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                    <div key={n} className="aspect-[3/4] rounded-3xl bg-gray-100 dark:bg-gray-900 animate-pulse"></div>
                                ))}
                            </div>
                        ) : displayedResults.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {displayedResults.map(product => (
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
