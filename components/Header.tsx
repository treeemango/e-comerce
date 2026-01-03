import React, { useState, useEffect, useMemo } from 'react';
import LoyaltyTierBadge from './LoyaltyTierBadge';
import { CATEGORIES, FEATURED_CATEGORIES, PRODUCTS } from '../constants';
import { fetchSuggestions, trackSearch, SearchSuggestion, fetchTrendingCategoriesOverlay, TrendingCategoryOverlay, fetchRecentViews, RecentViewProduct, fetchPopularSearches, fetchRecentSearches, SearchKeywordEntry } from '../lib/api';
import { Product, User, LoyaltyProfile, VisualCategory, Breadcrumb } from '../types';
import { getCurrencySymbol, SUPPORTED_CURRENCIES, getUserCurrency, setUserCurrency, useCurrencyConverter, formatPrice } from '@/lib/currency';
import { detectUserCurrency } from '@/lib/currency-service';
import { FlagIcon } from '@/lib/FlagIcon';
import { useNotifications } from './NotificationContext';
import NotificationInbox from './NotificationInbox';
import CountrySelector from './CountrySelector';

interface HeaderProps {
  onHomeClick?: () => void;
  onFiveStarClick?: () => void;
  onBestSellingClick?: () => void;
  onSearch?: (query: string) => void;
  onCameraClick?: () => void;
  onCategoryClick?: (categoryIds: string[], title: string, subcategories?: VisualCategory[], newBreadcrumbs?: Breadcrumb[]) => void;
  onAccountPageClick?: (pageTitle: string) => void;
  onProductClick?: (product: Product) => void;
  onCheckoutClick?: () => void;
  onSignInClick?: () => void;
  onSignOutClick?: () => void;
  cartItemCount?: number;
  user?: User | null;
  loyaltyProfile?: LoyaltyProfile | null;
  onOpenNotifications?: () => void;
  onCartClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onHomeClick,
  onFiveStarClick,
  onBestSellingClick,
  onSearch,
  onCameraClick,
  onCategoryClick,
  onAccountPageClick,
  onProductClick,
  onCheckoutClick,
  onSignInClick,
  onSignOutClick,
  cartItemCount = 0,
  user,
  loyaltyProfile,
  onOpenNotifications,
  onCartClick
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [overlayData, setOverlayData] = useState<TrendingCategoryOverlay[]>([]);
  const [activeParentCategoryId, setActiveParentCategoryId] = useState<string | null>(null);
  const [recentViews, setRecentViews] = useState<RecentViewProduct[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchKeywordEntry[]>([]);
  const [popularSearches, setPopularSearches] = useState<SearchKeywordEntry[]>([]);
  const [currentCurrency, setCurrentCurrency] = useState<string>(getUserCurrency());
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const { history } = useNotifications();
  const unreadNotificationCount = useMemo(
    () => (user ? history.filter((n) => !n.is_read).length : 0),
    [user, history]
  );
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [isTopCategoriesOverlayOpen, setIsTopCategoriesOverlayOpen] = useState(false);
  const [selectedOverlayDepartmentId, setSelectedOverlayDepartmentId] = useState<string | null>(null);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const categoriesDropdownTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle categories dropdown hover with delay
  const handleCategoriesMouseEnter = () => {
    if (categoriesDropdownTimeoutRef.current) {
      clearTimeout(categoriesDropdownTimeoutRef.current);
      categoriesDropdownTimeoutRef.current = null;
    }
    setIsCategoriesDropdownOpen(true);
  };

  const handleCategoriesMouseLeave = () => {
    // Add a 300ms delay before closing to allow movement between button and dropdown
    categoriesDropdownTimeoutRef.current = setTimeout(() => {
      setIsCategoriesDropdownOpen(false);
    }, 300);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (categoriesDropdownTimeoutRef.current) {
        clearTimeout(categoriesDropdownTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      setIsMobileCategoriesOpen(false);
    }
  }, [isMobileMenuOpen]);

  // Prepare currency conversion for recent views
  const recentViewPriceValues = useMemo(() =>
    recentViews.map((item) => ({
      id: item.id,
      amount: item.price ?? 0,
      currency: item.currency || 'USD'
    })),
    [recentViews]
  );

  const { convertedValues: recentViewConverted } = useCurrencyConverter(recentViewPriceValues, currentCurrency);

  useEffect(() => {
    const loadRecentViews = async () => {
      if (user?.id) {
        const views = await fetchRecentViews();
        setRecentViews(views);
      } else {
        setRecentViews([]);
      }
    };
    loadRecentViews();
  }, [user]);

  useEffect(() => {
    const loadOverlayData = async () => {
      const data = await fetchTrendingCategoriesOverlay();
      setOverlayData(data);
      if (data.length > 0) {
        setActiveParentCategoryId(data[0].parent_category_id);
      }
    };
    loadOverlayData();
  }, [user]);

  // Load search metadata when focus opens dropdown
  useEffect(() => {
    if (!isSearchFocused) return;

    const loadSearchMeta = async () => {
      const [recent, popular] = await Promise.all([
        fetchRecentSearches(),
        fetchPopularSearches()
      ]);
      setRecentSearches(recent);
      setPopularSearches(popular);
    };

    loadSearchMeta();
  }, [isSearchFocused]);

  // Auto-detect user currency on component mount
  useEffect(() => {
    const loadUserCurrency = async () => {
      try {
        const detectedCurrency = await detectUserCurrency();
        if (detectedCurrency && detectedCurrency !== currentCurrency) {
          setCurrentCurrency(detectedCurrency);
          setUserCurrency(detectedCurrency);
          console.log(`Auto-detected user currency: ${detectedCurrency}`);
        }
      } catch (error) {
        console.error('Error auto-detecting currency:', error);
        // Fallback to existing currency
      }
    };

    // Only run if no saved preference exists
    if (!localStorage.getItem('preferred_currency')) {
      loadUserCurrency();
    }
  }, []);

  // Group data by parent category
  const parentCategories = Array.from(new Set(overlayData.map(d => d.parent_category_id)))
    .map(id => {
      const item = overlayData.find(d => d.parent_category_id === id);
      return {
        id: item!.parent_category_id,
        name: item!.parent_category_name,
        sort_order: item!.parent_category_sort_order
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  // Get subcategories for active parent
  const activeSubcategories = overlayData
    .filter(d => d.parent_category_id === activeParentCategoryId)
    .sort((a, b) => b.trend_score - a.trend_score)
    .slice(0, 8); // Show top 8 subcategories

  // Get all subcategory IDs for a parent category to enable "Department View"
  const getSubcategoryIdsForParent = (parentId: string) => {
    return overlayData
      .filter(d => d.parent_category_id === parentId)
      .map(d => d.subcategory_id);
  };

  // Get visual subcategory objects for a parent category
  const getVisualSubcategoriesForParent = (parentId: string): VisualCategory[] => {
    return overlayData
      .filter(d => d.parent_category_id === parentId)
      .map(d => ({
        id: d.subcategory_id,
        name: d.subcategory_name,
        image: d.trending_product_image_url
      }))
      // Sort or pick top items if needed, for now getting all or top ones
      .slice(0, 10); // Limit to reasonable number
  };

  const topTrendingSubcategories = [...overlayData]
    .sort((a, b) => b.trend_score - a.trend_score)
    .slice(0, 8)
    .map((d, idx) => ({
      term: d.subcategory_name,
      image: d.trending_product_image_url,
      isHot: idx < 3
    }));

  // Debounce search suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchValue.length >= 2) {
        const results = await fetchSuggestions(searchValue);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleSearchSubmit = () => {
    if (onSearch && searchValue.trim()) {
      onSearch(searchValue);
      setIsSearchFocused(false);
      trackSearch(searchValue);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchValue(suggestion.keyword);
    if (onSearch) {
      onSearch(suggestion.keyword);
      setIsSearchFocused(false);
      trackSearch(suggestion.keyword);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  return (
    <header
      className="relative bg-primary text-white py-4 px-4 lg:px-6 flex items-center justify-between z-[51]"
      onMouseLeave={() => {
        setIsMobileMenuOpen(false);
        setIsTopCategoriesOverlayOpen(false);
      }}
    >
      {/* Left Section: Logo & Categories */}
      <div className="flex items-center space-x-4 lg:space-x-6">
        {/* Mobile Menu Button - Visible below 1340px */}
        <button
          className="min-[1340px]:hidden text-white py-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onMouseEnter={() => setIsMobileMenuOpen(true)}
        >
          <span className="material-icons">menu</span>
        </button>

        <h1 className="text-xl">
          <span
            className="font-bold cursor-pointer hover:text-gray-200 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              if (onHomeClick) onHomeClick();
            }}
          >
            JuaExpress
          </span>
        </h1>

        {/* Desktop Links - Hidden below 1340px */}
        <div className="hidden min-[1340px]:flex items-center space-x-4">
          <a
            href="#"
            className="flex items-center space-x-1 hover:text-gray-200 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              if (onFiveStarClick) onFiveStarClick();
            }}
          >
            <span className="material-icons text-slate-900 dark:text-slate-100 text-base">star</span>
            <span className="text-sm font-medium">5-Star Rated</span>
          </a>

          <a
            href="#"
            className="text-sm font-medium hover:text-gray-200 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              if (onBestSellingClick) onBestSellingClick();
            }}
          >
            Best-Selling Items
          </a>

          {/* Categories Dropdown Group - Always visible on desktop layout */}
          <div
            className="relative"
            onMouseEnter={handleCategoriesMouseEnter}
            onMouseLeave={handleCategoriesMouseLeave}
          >
            <button className={`bg-black px-4 py-2 rounded-full flex items-center space-x-2 text-sm font-medium transition-all ${isCategoriesDropdownOpen ? 'bg-opacity-100' : 'bg-opacity-80 hover:bg-opacity-100'}`}>
              <span>Categories</span>
              <span className={`material-icons text-xs transition-transform duration-200 ${isCategoriesDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {/* Mega Menu Dropdown */}
            <div
              className={`absolute top-full left-0 w-[840px] transition-all duration-200 z-50 ${isCategoriesDropdownOpen
                  ? 'opacity-100 pointer-events-auto translate-y-0 mt-2'
                  : 'opacity-0 pointer-events-none -translate-y-2 mt-2'
                }`}
            >
              <div className="bg-background-light dark:bg-gray-800 shadow-lg rounded-lg flex overflow-hidden border border-gray-200 dark:border-gray-700 min-h-[400px]">

                {/* Left Side: Category List */}
                <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto max-h-[500px]">
                  <nav className="py-2">
                    <ul>
                      {parentCategories.map((cat) => (
                        <li key={cat.id} className={activeParentCategoryId === cat.id ? "bg-gray-100 dark:bg-gray-800 border-l-4 border-primary" : "border-l-4 border-transparent"}>
                          <a
                            href="#"
                            className={`flex justify-between items-center py-3 px-4 text-sm ${activeParentCategoryId === cat.id ? "font-semibold text-primary dark:text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                            onMouseEnter={() => setActiveParentCategoryId(cat.id)}
                            onClick={(e) => {
                              e.preventDefault();
                              const childIds = getSubcategoryIdsForParent(cat.id);
                              const visualSubcats = getVisualSubcategoriesForParent(cat.id);
                              if (onCategoryClick) {
                                const homeCrumb = { label: 'Home', type: 'home' } as const;
                                const categoryCrumb = {
                                  label: cat.name,
                                  type: 'category',
                                  id: cat.id,
                                  data: { title: cat.name, categoryIds: childIds, visualCategories: visualSubcats }
                                } as const;
                                onCategoryClick(childIds, cat.name, visualSubcats, [homeCrumb, categoryCrumb]);
                              }
                            }}
                          >
                            <span className="truncate">{cat.name}</span>
                            {activeParentCategoryId === cat.id && <span className="material-icons text-base text-primary">chevron_right</span>}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>

                {/* Right Side: Featured Grid */}
                <div className="w-2/3 p-6 bg-white dark:bg-gray-800 overflow-y-auto max-h-[500px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      {parentCategories.find(c => c.id === activeParentCategoryId)?.name}
                    </h3>
                    <a
                      href="#"
                      className="text-xs text-primary font-bold hover:underline flex items-center group/viewall"
                      onClick={(e) => {
                        e.preventDefault();
                        const activeCat = parentCategories.find(c => c.id === activeParentCategoryId);
                        if (activeCat && onCategoryClick) {
                          const childIds = getSubcategoryIdsForParent(activeCat.id);
                          const visualSubcats = getVisualSubcategoriesForParent(activeCat.id);
                          const homeCrumb = { label: 'Home', type: 'home' } as const;
                          const categoryCrumb = {
                            label: activeCat.name,
                            type: 'category',
                            id: activeCat.id,
                            data: { title: activeCat.name, categoryIds: childIds, visualCategories: visualSubcats }
                          } as const;
                          onCategoryClick(childIds, activeCat.name, visualSubcats, [homeCrumb, categoryCrumb]);
                          setIsTopCategoriesOverlayOpen(false); // Close overlay on click
                        }
                      }}
                    >
                      View all <span className="material-icons text-xs ml-0.5 group-hover/viewall:translate-x-1 transition-transform">arrow_forward</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-4 gap-x-4 gap-y-6">
                    {activeSubcategories.map((item) => (
                      <div key={item.subcategory_id} className="text-center group/item cursor-pointer">
                        <a
                          href="#"
                          className="block"
                          onClick={(e) => {
                            e.preventDefault();
                            // Pass empty visuals for a specific subcategory view (no top circles needed)
                            // Pass empty visuals for a specific subcategory view (no top circles needed)
                            const parentName = parentCategories.find(p => p.id === activeParentCategoryId)?.name || 'Category';
                            const parentId = activeParentCategoryId || '';

                            if (onCategoryClick) {
                              const homeCrumb = { label: 'Home', type: 'home' } as const;
                              const parentCrumb = {
                                label: parentName,
                                type: 'category',
                                id: parentId,
                                // We re-fetch data for the parent crumb to ensure we can go back
                                data: {
                                  title: parentName,
                                  categoryIds: getSubcategoryIdsForParent(parentId),
                                  visualCategories: getVisualSubcategoriesForParent(parentId)
                                }
                              } as const;
                              const subCrumb = {
                                label: item.subcategory_name,
                                type: 'subcategory',
                                id: item.subcategory_id
                              } as const;

                              onCategoryClick([item.subcategory_id], item.subcategory_name, [], [homeCrumb, parentCrumb, subCrumb]);
                            }
                          }}
                        >
                          <div className="relative inline-block mb-2">
                            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto overflow-hidden border border-gray-200 dark:border-gray-600 group-hover/item:border-primary transition-colors">
                              {item.trending_product_image_url ? (
                                <img
                                  alt={item.subcategory_name}
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover/item:scale-110"
                                  src={item.trending_product_image_url}
                                />
                              ) : (
                                <span className="material-icons text-gray-400 text-3xl">image</span>
                              )}
                            </div>
                            {item.hot_badge_text && (
                              <span className={`absolute -top-1 -right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white dark:border-gray-800 whitespace-nowrap
                                ${item.hot_badge_text.includes('HOT') ? 'bg-orange-500 text-white' :
                                  item.hot_badge_text.includes('TRENDING') ? 'bg-blue-500 text-white' :
                                    item.hot_badge_text.includes('NEW') ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'}`}>
                                {item.hot_badge_text}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 group-hover/item:text-primary transition-colors line-clamp-2 h-8 flex items-center justify-center font-medium leading-tight px-1">
                            {item.subcategory_name}
                          </p>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Search Bar */}
      <div className="flex-1 max-w-5xl mx-4 lg:mx-8 hidden sm:block min-w-[200px]">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-30">
            <span className="material-icons text-gray-400 group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-full h-11 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-gray-700 transition-all shadow-sm focus:shadow-md relative z-20 border border-transparent focus:border-primary/20"
            placeholder="Search for products, brands and more..."
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />
          <button
            className="absolute right-1 top-1 bottom-1 px-4 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors z-20 shadow-md flex items-center justify-center transform active:scale-95"
            onClick={(e) => {
              e.preventDefault();
              if (onCameraClick) onCameraClick();
            }}
            title="Search with camera"
          >
            <span className="material-icons text-lg">photo_camera</span>
          </button>

          {/* Search Dropdown */}
          {
            isSearchFocused && (
              <div className="absolute top-[calc(100%-20px)] left-0 w-full pt-6 bg-white dark:bg-gray-800 rounded-b-lg shadow-xl z-10 text-gray-800 dark:text-gray-200 border-x border-b border-gray-100 dark:border-gray-700 max-h-[28rem] overflow-y-auto custom-scrollbar">
                <div className="p-4 space-y-4">
                  {suggestions.length > 0 ? (
                    <>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Suggestions</h4>
                      <ul className="mb-2">
                        {suggestions.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between gap-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 cursor-pointer group/suggestion"
                            onClick={() => handleSuggestionClick(item)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-icons text-gray-400 text-sm">search</span>
                              <span className="text-sm font-medium">{item.keyword}</span>
                            </div>
                            <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                              {Math.round(item.similarity_score * 100)}% match
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : searchValue.length > 1 ? (
                    <div className="text-sm text-gray-500 py-2 text-center">No suggestions found</div>
                  ) : (
                    <>
                      {/* Recently Searched */}
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Recently searched</h4>
                        <span className="material-icons text-gray-400 text-sm cursor-pointer hover:text-red-500">delete</span>
                      </div>
                      <ul className="mb-3 space-y-1">
                        {(recentSearches.length > 0 ? recentSearches : []).map((item, idx) => (
                          <li
                            key={`${item.keyword}-${idx}`}
                            className="flex items-center gap-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 cursor-pointer"
                            onClick={() => {
                              setSearchValue(item.keyword);
                              if (onSearch) {
                                onSearch(item.keyword);
                                setIsSearchFocused(false);
                              }
                            }}
                          >
                            <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-xs font-semibold">
                              <span className="material-icons text-gray-400 text-sm">history</span>
                            </div>
                            <span className="text-sm">{item.keyword}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Popular Right Now */}
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Popular right now</h4>
                      <ul className="space-y-1">
                        {(popularSearches.length > 0 ? popularSearches.map((item, idx) => ({
                          term: item.keyword,
                          isHot: idx < 3
                        })) : topTrendingSubcategories).map((item, idx) => (
                          <li
                            key={`${item.term}-${idx}`}
                            className="flex items-center gap-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 cursor-pointer group/search"
                            onClick={() => {
                              setSearchValue(item.term);
                              if (onSearch) {
                                onSearch(item.term);
                                setIsSearchFocused(false);
                              }
                            }}
                          >
                            <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full group-hover/search:bg-gray-200 dark:group-hover/search:bg-gray-600 overflow-hidden">
                              {item.image ? (
                                <img src={item.image} alt="" className="w-full h-full object-cover" />
                              ) : item.isHot ? (
                                <span className="material-icons text-orange-500 text-sm">local_fire_department</span>
                              ) : (
                                <span className="material-icons text-gray-400 text-sm">search</span>
                              )}
                            </div>
                            <div className="flex-1 flex justify-between items-center">
                              <span className={`text-sm ${item.isHot ? 'font-medium' : ''}`}>{item.term}</span>
                              {item.isHot && <span className="material-icons text-orange-500 text-sm">local_fire_department</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* Right Section: User & Cart */}
      <div className="flex items-center space-x-4">
        {/* Mobile Search Icon */}
        <button className="sm:hidden text-white">
          <span className="material-icons">search</span>
        </button>

        {/* User Account Section */}
        {user ? (
          <div className="hidden lg:flex items-center space-x-2 cursor-pointer relative group">
            <div className="flex items-center space-x-2 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center font-bold text-white shadow-inner">
                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
              <div className="text-xs leading-tight">
                <p className="text-gray-200 group-hover:text-white">Hello, {user.name?.split(' ')[0] || 'Buyer'}</p>
                <p className="font-bold">Orders & Account</p>
              </div>
            </div>

            {/* User Account Dropdown */}
            <div className="absolute top-full right-0 pt-2 w-[480px] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto z-50">
              <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-lg overflow-hidden flex text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700">

                {/* Left Column: Inspired by recent views */}
                <div className="w-5/12 bg-gray-50 dark:bg-gray-900 p-4 border-r border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white">Inspired by recent views</h4>
                    <span className="material-icons text-gray-400 text-sm">chevron_right</span>
                  </div>
                  <div className="space-y-3">
                    {recentViews.length > 0 ? (
                      recentViews.map(product => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 group/prod cursor-pointer"
                          onClick={() => {
                            const mapped: Product = {
                              id: product.id,
                              title: product.name,
                              price: product.price,
                              currency: product.currency || 'USD',
                              rating: product.vendor?.rating || 0,
                              reviews: product.vendor?.review_count || 0,
                              image: product.image_url,
                              vendor: product.vendor
                                ? {
                                  vendor_id: product.vendor.id || product.seller_id || '',
                                  business_name: product.vendor.name || 'Store',
                                  business_country: 'Kenya',
                                  vendor_rating: product.vendor.rating || 0,
                                  review_count: product.vendor.review_count || 0,
                                  completed_orders: product.vendor.review_count || 0,
                                  user_id: product.vendor.id,
                                }
                                : undefined,
                            };
                            onProductClick?.(mapped);
                          }}
                        >
                          <img src={product.image_url} alt={product.name} className="w-10 h-10 object-contain bg-white rounded p-0.5 border border-gray-200 dark:border-gray-700" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate group-hover/prod:text-primary transition-colors">{product.name}</p>
                            <div className="text-xs font-bold text-gray-900 dark:text-white">
                              {recentViewConverted[product.id]?.converted ?? formatPrice(product.price, product.currency || currentCurrency)}
                            </div>
                          </div>
                          <button
                            className="text-gray-400 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add-to-cart hook can be wired here in the future
                            }}
                          >
                            <span className="material-icons text-sm">shopping_cart</span>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 py-4 text-center">
                        Viewing history will appear here
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: User Menu */}
                <div className="w-7/12 p-4">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-white text-xl font-medium">
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <span className="text-lg font-bold text-gray-800 dark:text-white block">{user.name || user.email}</span>
                      {loyaltyProfile && (
                        <div className="mt-1">
                          <LoyaltyTierBadge loyaltyProfile={loyaltyProfile} size="small" showPoints={false} />
                        </div>
                      )}
                    </div>
                  </div>

                  <nav className="space-y-1">
                    {[
                      { icon: 'receipt_long', label: 'Your orders' },
                      { icon: 'favorite', label: 'Saved items' },
                      { icon: 'rate_review', label: 'Your reviews' },
                      { icon: 'mail', label: 'Messages' },
                      { icon: 'person_outline', label: 'Your profile' },
                      { icon: 'confirmation_number', label: 'Coupon codes' },
                      { icon: 'account_balance_wallet', label: 'Credit balance' },
                      { icon: 'storefront', label: 'Followed stores' },
                      { icon: 'history', label: 'Browsing history' },
                      { icon: 'location_on', label: 'Addresses' },
                      { icon: 'verified_user', label: 'Account security' },
                      { icon: 'security', label: 'Permissions' },
                      { icon: 'notifications_none', label: 'Notifications' },
                    ].map((item, i) => (
                      <a
                        key={i}
                        href="#"
                        className="flex items-center gap-3 px-2 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          if (onAccountPageClick) onAccountPageClick(item.label);
                        }}
                      >
                        <span className="material-icons text-[20px] text-gray-400 w-6">{item.icon}</span>
                        <span>{item.label}</span>
                      </a>
                    ))}
                  </nav>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                    <a href="#" className="flex items-center gap-3 px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
                      <span className="material-icons text-[20px] text-gray-400 w-6">switch_account</span>
                      <span>Switch accounts</span>
                    </a>
                    <a
                      href="#"
                      className="flex items-center gap-3 px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        if (onSignOutClick) onSignOutClick();
                      }}
                    >
                      <span className="material-icons text-[20px] text-gray-400 w-6">logout</span>
                      <span>Sign out</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              // Explicit buyer entry point: clear any admin/seller intent and go to shopper auth
              sessionStorage.removeItem('auth_context');
              if (onSignInClick) onSignInClick();
            }}
            className="hidden lg:flex items-center gap-2 bg-black bg-opacity-80 hover:bg-opacity-100 px-4 py-2 rounded-full transition-all border border-gray-700"
          >
            <span className="material-icons text-sm text-white">person</span>
            <span className="text-sm font-bold text-white">Sign In / Register</span>
          </button>
        )}
        {/* Currency Selector */}
        <div className="relative">
          <button
            className="flex items-center gap-1 px-2 py-1 bg-black bg-opacity-80 hover:bg-opacity-100 rounded-full text-white text-sm font-medium transition-all"
            onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
          >
            <span className="material-icons text-sm">currency_exchange</span>
            <span>{currentCurrency}</span>
            <span className={`material-icons text-xs transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          {/* Currency Dropdown */}
          {isCurrencyOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 z-50 max-h-60 overflow-y-auto">
              <div className="p-2">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-2">Select Currency</h4>
                <div className="space-y-1">
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <button
                      key={currency.code}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${currentCurrency === currency.code
                        ? 'bg-primary text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      onClick={() => {
                        setCurrentCurrency(currency.code);
                        setUserCurrency(currency.code);
                        setIsCurrencyOpen(false);
                        // Force page refresh to update all prices
                        window.location.reload();
                      }}
                    >
                      <FlagIcon
                        emoji={currency.flag}
                        label={currency.name}
                        fallbackText={currency.code}
                        className="w-5 h-5"
                      />
                      <div className="flex-1 text-left">
                        <span className="font-medium">{currency.code}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{currency.name}</span>
                      </div>
                      {currentCurrency === currency.code && (
                        <span className="material-icons text-sm">check</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    Prices will update automatically
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <a
          href="#"
          id="cart-icon-container"
          className="relative group hover:text-gray-200 transition-colors p-1"
          onClick={(e) => {
            e.preventDefault();
            if (onCartClick) onCartClick();
          }}
        >
          <span className="material-icons text-2xl">shopping_cart</span>
          <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full group-hover:scale-110 transition-transform">
            {cartItemCount}
          </span>
        </a>

        {/* Notification Bell */}
        <div className="relative">
          <button
            className="relative p-1 hover:text-gray-200 transition-colors text-white/80"
            onClick={(e) => {
              e.preventDefault();
              if (onOpenNotifications) onOpenNotifications();
            }}
          >
            <span className="material-icons text-2xl">notifications</span>
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black h-4 w-4 flex items-center justify-center rounded-full border-2 border-primary animate-pulse">
                {unreadNotificationCount}
              </span>
            )}
          </button>
        </div>
      </div>


      {/* Mobile Drawer (Basic) */}
      {
        isMobileMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-900 shadow-xl min-[1340px]:hidden p-4 border-t border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto">
            <nav className="space-y-3">
              {/* User Account Section - Only if logged in */}
              {user && (
                <button
                  className="flex items-center gap-3 w-full py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors text-left"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onAccountPageClick) onAccountPageClick('Your profile'); // Navigate to main profile
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-white text-base font-medium">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 block">Hello, {user.name?.split(' ')[0] || 'User'}</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white block">Orders & Account</span>
                  </div>
                  <span className="material-icons text-gray-400">chevron_right</span>
                </button>
              )}
              {user && <hr className="border-gray-100 dark:border-gray-800" />}
              <button
                className="flex items-center justify-between w-full text-gray-800 dark:text-white py-2"
                onClick={() => {
                  setIsMobileMenuOpen(false); // Close the drawer
                  setIsTopCategoriesOverlayOpen(true); // Open the full overlay
                }}
              >
                <div className="flex items-center space-x-2">
                  <span className="material-icons text-primary">category</span>
                  <span>Categories</span>
                </div>
                <span className="material-icons text-gray-400">chevron_right</span>
              </button>

              <a
                href="#"
                className="flex items-center space-x-2 text-gray-800 dark:text-white py-2"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  if (onFiveStarClick) onFiveStarClick();
                }}
              >
                <span className="material-icons text-slate-900 dark:text-slate-100">star</span>
                <span>5-Star Rated</span>
              </a>

              <a
                href="#"
                className="flex items-center space-x-2 text-gray-800 dark:text-white py-2"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  if (onBestSellingClick) onBestSellingClick();
                }}
              >
                <span className="material-icons text-orange-500">local_fire_department</span>
                <span>Best-Selling Items</span>
              </a>

              {user ? (
                <a
                  href="#"
                  className="flex items-center space-x-2 text-gray-800 dark:text-white py-2"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onSignOutClick) onSignOutClick();
                  }}
                >
                  <span className="material-icons text-gray-500">logout</span>
                  <span>Sign out</span>
                </a>
              ) : (
                <a
                  href="#"
                  className="flex items-center space-x-2 text-gray-800 dark:text-white py-2"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onSignInClick) onSignInClick();
                  }}
                >
                  <span className="material-icons text-gray-500">person</span>
                  <span>Sign In</span>
                </a>
              )}
            </nav>
          </div>
        )
      }

      {/* Full Screen Categories Overlay (Department View) */}
      {isTopCategoriesOverlayOpen && (
        <div className="absolute top-full left-0 w-full h-[calc(100vh-80px)] z-[40] bg-white dark:bg-black flex flex-col shadow-2xl border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-5 duration-200">
          {/* Header of Overlay */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-surface-dark">
            <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
              <span className="material-icons text-primary">category</span>
              Browse Categories
            </h2>
            <button
              onClick={() => setIsTopCategoriesOverlayOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
            >
              <span className="material-icons text-gray-500 dark:text-gray-400 font-bold">close</span>
            </button>
          </div>

          {/* Two-Column Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar: Departments */}
            <aside className="w-[30%] bg-gray-50 dark:bg-surface-dark overflow-y-auto border-r border-gray-100 dark:border-gray-800">
              <div className="p-3">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] px-2">Departments</span>
              </div>
              {parentCategories.map((parent) => {
                const isSelected = (selectedOverlayDepartmentId || parentCategories[0]?.id) === parent.id;
                return (
                  <button
                    key={parent.id}
                    onClick={() => {
                      setSelectedOverlayDepartmentId(parent.id);
                      setIsTopCategoriesOverlayOpen(false); // Close overlay
                      // Trigger navigation
                      const childIds = getSubcategoryIdsForParent(parent.id); // Get children just in case, but we navigate to parent
                      const visualSubcats = getVisualSubcategoriesForParent(parent.id);

                      if (onCategoryClick) {
                        const homeCrumb = { label: 'Home', type: 'home' } as const;
                        const parentCrumb = {
                          label: parent.name,
                          type: 'category',
                          id: parent.id,
                          data: {
                            title: parent.name,
                            categoryIds: childIds,
                            visualCategories: visualSubcats
                          }
                        } as const;

                        onCategoryClick(
                          [parent.id], // Pass parent ID as the main category ID
                          parent.name,
                          visualSubcats,
                          [homeCrumb, parentCrumb]
                        );
                      }
                    }}
                    onMouseEnter={() => setSelectedOverlayDepartmentId(parent.id)}
                    className={`w-full text-left py-4 px-4 text-[13px] leading-tight transition-all duration-300 relative group ${isSelected
                      ? 'bg-white dark:bg-black text-primary font-black border-l-4 border-primary shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium border-l-4 border-transparent'
                      }`}
                  >
                    <span>{parent.name}</span>
                  </button>
                );
              })}
            </aside>

            {/* Right Content: Subcategories Grid */}
            <main className="flex-1 overflow-y-auto bg-white dark:bg-black p-4 pb-20">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">
                  {parentCategories.find(p => p.id === (selectedOverlayDepartmentId || parentCategories[0]?.id))?.name}
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {overlayData
                  .filter(d => d.parent_category_id === (selectedOverlayDepartmentId || parentCategories[0]?.id))
                  .sort((a, b) => b.trend_score - a.trend_score)
                  .map((item) => (
                    <button
                      key={item.subcategory_id}
                      className="flex flex-col items-center gap-2 group text-center"
                      onClick={() => {
                        setIsTopCategoriesOverlayOpen(false);
                        // Trigger navigation logic
                        const childIds = getSubcategoryIdsForParent(item.parent_category_id);
                        const visualSubcats = getVisualSubcategoriesForParent(item.parent_category_id);

                        if (onCategoryClick) {
                          const homeCrumb = { label: 'Home', type: 'home' } as const;
                          const parentCrumb = {
                            label: item.parent_category_name,
                            type: 'category',
                            id: item.parent_category_id,
                            data: {
                              title: item.parent_category_name,
                              categoryIds: childIds,
                              visualCategories: visualSubcats
                            }
                          } as const;
                          const subCrumb = {
                            label: item.subcategory_name,
                            type: 'subcategory',
                            id: item.subcategory_id
                          } as const;

                          onCategoryClick(
                            [item.subcategory_id],
                            item.subcategory_name,
                            [],
                            [homeCrumb, parentCrumb, subCrumb]
                          );
                        }
                      }}
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 group-hover:border-primary transition-colors">
                        {item.trending_product_image_url ? (
                          <img
                            src={item.trending_product_image_url}
                            alt={item.subcategory_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-icons text-gray-300">image</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors line-clamp-2">
                        {item.subcategory_name}
                      </span>
                    </button>
                  ))}
              </div>
            </main>
          </div>
        </div>
      )}


    </header >
  );
};

export default Header;
