import React, { useState, useEffect } from 'react';
import { PILL_FILTERS } from '../constants';
import ProductCard from './ProductCard';
import { Product, SearchFilters, AppliedFilters, VisualCategory, AttributeValue, CategoryFilter, BrandFilter, Breadcrumb } from '../types';
import { fetchSearchFilters, fetchFilteredProducts, fetchNavbarCategories, NavbarCategory } from '../lib/api';
import ProductCardSkeleton from './ProductCardSkeleton';

interface ProductSectionProps {
  isFiveStarView?: boolean;
  searchQuery?: string;
  onProductClick: (product: Product) => void;
  products?: Product[];
  initialCategoryIds?: string[];
  title?: string;
  vendorId?: string;
  onAddToCart: (product: Product, event?: React.MouseEvent | React.TouchEvent) => void;
  visualCategories?: VisualCategory[];
  onCategoryClick?: (categoryIds: string[], title: string, subcategories?: VisualCategory[], newBreadcrumbs?: Breadcrumb[]) => void;
  breadcrumbs?: Breadcrumb[];
  onHomeClick?: () => void;
}

const ProductSection: React.FC<ProductSectionProps> = ({
  isFiveStarView = false,
  searchQuery,
  onProductClick,
  products: propProducts,
  initialCategoryIds = [],
  title,
  vendorId,
  onAddToCart,
  visualCategories = [],
  onCategoryClick,
  breadcrumbs = [],
  onHomeClick
}) => {
  const [products, setProducts] = useState<Product[]>(propProducts || []);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    category_ids: initialCategoryIds,
    brand_ids: [],
    price_min: null,
    price_max: null,
    attributes: {}
  });
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showVerticalFilters, setShowVerticalFilters] = useState(false);

  const totalAppliedFilters =
    appliedFilters.category_ids.length +
    appliedFilters.brand_ids.length +
    (appliedFilters.price_min !== null || appliedFilters.price_max !== null ? 1 : 0) +
    Object.values(appliedFilters.attributes).reduce((acc: number, curr) => acc + (curr as string[]).length, 0);


  // Update products state when propProducts changes (from App.tsx)
  useEffect(() => {
    if (propProducts) {
      setProducts(propProducts);
    }
  }, [propProducts]);

  // Stabilize the category IDs dependency to prevent infinite loops
  const categoryIdsHash = JSON.stringify(initialCategoryIds);

  // Update applied filters when initialCategoryIds change
  useEffect(() => {
    if (initialCategoryIds.length > 0) {
      setAppliedFilters(prev => ({
        ...prev,
        category_ids: initialCategoryIds
      }));
    }
  }, [categoryIdsHash]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-container')) {
        setActiveFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch filters when search query or category changes
  useEffect(() => {
    // If we have a search query OR initial categories, we need to load filters
    if (searchQuery || initialCategoryIds.length > 0) {
      // Create a temporary filter object that represents the *target* state
      // This ensures we fetch filters for the NEW category, even if appliedFilters state isn't updated yet
      const targetFilters = {
        ...appliedFilters,
        category_ids: initialCategoryIds
      };

      // Load filters using this target state
      loadSearchFilters(targetFilters);
    } else {
      setSearchFilters(null);
      if (initialCategoryIds.length === 0) {
        setAppliedFilters({
          category_ids: [],
          brand_ids: [],
          price_min: null,
          price_max: null,
          attributes: {}
        });
      }
    }
  }, [searchQuery, categoryIdsHash]);

  // Fetch products when filters change
  useEffect(() => {
    if (searchQuery || hasActiveFilters()) {
      loadFilteredProducts();
    }
  }, [searchQuery, appliedFilters, vendorId]);

  const loadSearchFilters = async (overrideFilters?: AppliedFilters) => {
    // Use override filters if provided (e.g. during category switch), otherwise use state
    const filtersToUse = overrideFilters || appliedFilters;

    if (!searchQuery && filtersToUse.category_ids.length === 0 && !hasActiveFilters()) return;

    setIsLoadingFilters(true);
    const filters = await fetchSearchFilters(searchQuery || '', filtersToUse);
    setSearchFilters(filters);
    setIsLoadingFilters(false);
  };

  const loadFilteredProducts = async () => {
    console.log('[ProductSection] loadFilteredProducts called', {
      searchQuery,
      hasActiveFilters: hasActiveFilters(),
      appliedFilters
    });

    if (!searchQuery && !hasActiveFilters() && !vendorId) {
      console.log('[ProductSection] Skipping - no search query and no active filters');
      return;
    }

    setIsLoadingProducts(true);
    console.log('[ProductSection] Calling fetchFilteredProducts...');
    const products = await fetchFilteredProducts(searchQuery || '', appliedFilters);
    console.log('[ProductSection] Received products:', products.length, 'products');

    // Client-side vendor filter if needed
    let finalProducts = products;
    if (vendorId) {
      finalProducts = finalProducts.filter(p => p.vendor?.vendor_id === vendorId || p.vendor?.user_id === vendorId);
    }

    setFilteredProducts(finalProducts);
    setIsLoadingProducts(false);
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setAppliedFilters(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId]
    }));
  };

  const toggleBrandFilter = (brandId: string) => {
    setAppliedFilters(prev => ({
      ...prev,
      brand_ids: prev.brand_ids.includes(brandId)
        ? prev.brand_ids.filter(id => id !== brandId)
        : [...prev.brand_ids, brandId]
    }));
  };

  const setPriceRange = (min: number | null, max: number | null) => {
    setAppliedFilters(prev => ({
      ...prev,
      price_min: min,
      price_max: max
    }));
  };

  const clearAllFilters = () => {
    setAppliedFilters({
      category_ids: [],
      brand_ids: [],
      price_min: null,
      price_max: null,
      attributes: {}
    });
  };

  // Store category data with IDs for filtering
  const [navbarCategoriesData, setNavbarCategoriesData] = useState<NavbarCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    const loadNavbarCategories = async () => {
      const categories = await fetchNavbarCategories();
      setNavbarCategoriesData(categories || []);
    };
    loadNavbarCategories();
  }, []);

  // Get unique departments for display
  interface Department {
    id: string;
    name: string;
    handle: string;
  }

  const departmentMap = new Map<string, Department>();
  navbarCategoriesData.forEach(c => {
    if (!departmentMap.has(c.department_id)) {
      departmentMap.set(c.department_id, {
        id: c.department_id,
        name: c.department_name,
        handle: c.department_handle
      });
    }
  });

  const uniqueDepartments = Array.from(departmentMap.values());

  const handleCategoryClick = (departmentId: string | null, categoryName: string) => {
    setSelectedCategoryId(departmentId);

    if (departmentId === null) {
      // "Recommended" clicked - clear all filters
      clearAllFilters();
    } else {
      // Get all category IDs that belong to this department
      const departmentCategoryIds = navbarCategoriesData
        .filter(c => c.department_id === departmentId)
        .map(c => c.category_id);

      // Apply these category IDs as filters
      setAppliedFilters(prev => ({
        ...prev,
        category_ids: departmentCategoryIds,
        brand_ids: [],
        price_min: null,
        price_max: null,
        attributes: {}
      }));
    }
  };

  const hasActiveFilters = () => {
    return appliedFilters.category_ids.length > 0 ||
      appliedFilters.brand_ids.length > 0 ||
      appliedFilters.price_min !== null ||
      appliedFilters.price_max !== null;
  };

  // Filter logic for non-search views
  // If we have a search query OR active filters, show filtered products
  // Otherwise show the default list, unless we are in the "modern browsing" mode which uses filteredProducts always.
  // Given the user request, we basically always rely on filteredProducts for the browsing view.
  let displayedProducts = (searchQuery || hasActiveFilters()) ? filteredProducts : products;

  if (isFiveStarView && !searchQuery) {
    displayedProducts = products.filter(p => p.rating >= 5);
  }

  // Landing "Recommended" state: show skeleton while we wait for the initial feed
  const showRecommendedSkeleton =
    !searchQuery && !hasActiveFilters() && !isFiveStarView && products.length === 0 && !isLoadingProducts;



  return (
    <section>
      {/* Visual Subcategory Circles */}
      {visualCategories && visualCategories.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 no-scrollbar px-1 mb-2">
          {visualCategories.map((cat) => (
            <div
              key={cat.id}
              className="flex flex-col items-center cursor-pointer min-w-[120px] group"
              onClick={() => {
                if (onCategoryClick) {
                  // Append subcategory to current breadcrumbs
                  const newCrumb: Breadcrumb = {
                    label: cat.name,
                    type: 'subcategory',
                    id: cat.id
                  };
                  const newCrumbs = [...(breadcrumbs.length ? breadcrumbs : [{ label: 'Home', type: 'home' }]), newCrumb];
                  onCategoryClick([cat.id], cat.name, [], newCrumbs);
                }
              }}
            >
              <div className="w-28 h-28 rounded-full border border-gray-200 p-1 group-hover:border-primary transition-colors overflow-hidden bg-gray-50 mb-3 shadow-sm">
                <img
                  src={cat.image || 'https://via.placeholder.com/100'}
                  alt={cat.name}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-sm text-center font-medium text-gray-800 dark:text-gray-200 group-hover:text-primary leading-tight line-clamp-2 max-w-[110px] h-10 flex items-center justify-center">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      )}
      {/* Breadcrumbs */}
      {!searchQuery && breadcrumbs.length > 0 && (
        <nav className="flex items-center text-sm text-gray-500 mb-4 px-1">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span
                className={`${idx === breadcrumbs.length - 1 ? 'font-semibold text-gray-900 dark:text-gray-100' : 'hover:text-primary cursor-pointer'}`}
                onClick={() => {
                  if (idx === breadcrumbs.length - 1) return; // Current page, do nothing

                  if (crumb.type === 'home' && onHomeClick) {
                    onHomeClick();
                  } else if (crumb.type === 'category' && onCategoryClick && crumb.data) {
                    // Navigate back to the category/department view
                    // We slice the breadcrumbs up to this point (inclusive)
                    const newCrumbs = breadcrumbs.slice(0, idx + 1);
                    onCategoryClick(
                      crumb.data.categoryIds || [],
                      crumb.data.title || crumb.label,
                      crumb.data.visualCategories || [],
                      newCrumbs
                    );
                  }
                }}
              >
                {crumb.label}
              </span>
              {idx < breadcrumbs.length - 1 && (
                <span className="mx-2 text-gray-400">/</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header */}
      {!searchQuery && (
        <div className="flex items-center mb-6">
          {title ? (
            <h2 className="text-2xl font-bold ml-2 text-slate-900 dark:text-white uppercase">
              {title}
            </h2>
          ) : isFiveStarView ? (
            <>
              <span className="material-icons text-yellow-400 text-3xl animate-bounce">star</span>
              <h2 className="text-2xl font-bold ml-2 text-slate-900 dark:text-white uppercase">
                5-Star Rated Items
              </h2>
            </>
          ) : (
            <>
              <span className="material-icons text-shop-red text-3xl animate-pulse">local_fire_department</span>
              <h2 className="text-2xl font-bold ml-2 text-slate-900 dark:text-white uppercase">
                Black Friday Deals
              </h2>
            </>
          )}

          {!isFiveStarView && !title && (
            <p className="ml-4 text-slate-500 dark:text-slate-400 hidden sm:block">/ EXPLORE YOUR INTERESTS</p>
          )}
        </div>
      )}

      {/* Category Pills (Legacy Navbar) - Shown ONLY on Landing Page (No Search, No Category Selected) */}
      {!searchQuery && !isFiveStarView && initialCategoryIds.length === 0 && (
        <div className="mb-8 relative group">
          <div className="flex items-center space-x-2 overflow-x-auto pb-4 scrollbar-hide mask-fade-right">
            {/* Recommended Button */}
            <button
              onClick={() => handleCategoryClick(null, 'Recommended')}
              className={`px-4 py-2 rounded-full border text-sm whitespace-nowrap transition-all duration-200
                ${selectedCategoryId === null
                  ? "border-shop-red bg-red-50 text-shop-red dark:bg-red-900/20 dark:border-red-500 font-semibold shadow-sm"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-shop-red hover:text-shop-red dark:hover:border-shop-red"
                }`}
            >
              Recommended
            </button>

            {/* Department Buttons */}
            {uniqueDepartments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => handleCategoryClick(dept.id, dept.name)}
                className={`px-4 py-2 rounded-full border text-sm whitespace-nowrap transition-all duration-200
                  ${selectedCategoryId === dept.id
                    ? "border-shop-red bg-red-50 text-shop-red dark:bg-red-900/20 dark:border-red-500 font-semibold shadow-sm"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-shop-red hover:text-shop-red dark:hover:border-shop-red"
                  }`}
              >
                {dept.name}
              </button>
            ))}
            <button className="p-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-shop-red hover:text-shop-red dark:hover:border-shop-red text-sm shadow-sm sticky right-0">
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* Search Result Specific Header/Filters - Shown on Search OR Category Pages */}
      {(!isFiveStarView && (searchQuery || initialCategoryIds.length > 0)) && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                  {searchFilters ? `${searchFilters.total_products} results` : 'Loading results...'}
                </span>
                {isLoadingFilters && (
                  <span className="material-icons text-gray-400 text-sm animate-spin">refresh</span>
                )}
              </div>
              {hasActiveFilters() && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Modern Horizontal Scrollable Filter Pills */}
            <div className="relative filter-container z-50">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
                {/* Main Filters Button */}
                <button
                  onClick={() => setShowVerticalFilters(true)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap border ${totalAppliedFilters > 0
                    ? 'bg-gray-100 border-gray-300 text-black'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <span className="material-icons text-base">filter_list</span>
                  Filters
                  {totalAppliedFilters > 0 && (
                    <span className="ml-0.5">({totalAppliedFilters})</span>
                  )}
                </button>

                {/* Category Filter Pill */}
                {searchFilters && searchFilters.categories.length > 0 && (
                  <button
                    onClick={() => setActiveFilter(activeFilter === 'category' ? null : 'category')}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap border ${activeFilter === 'category' || appliedFilters.category_ids.length > 0
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                  >
                    Category
                    {appliedFilters.category_ids.length > 0 && (
                      <span className="bg-white text-black rounded-full px-1.5 py-0.5 text-xs font-bold">
                        {appliedFilters.category_ids.length}
                      </span>
                    )}
                    <span className="material-icons text-base">expand_more</span>
                  </button>
                )}

                {/* Brand Filter Pill */}
                {searchFilters && searchFilters.brands.length > 0 && (
                  <button
                    onClick={() => setActiveFilter(activeFilter === 'brand' ? null : 'brand')}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap border ${activeFilter === 'brand' || appliedFilters.brand_ids.length > 0
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                  >
                    Brand
                    {appliedFilters.brand_ids.length > 0 && (
                      <span className="bg-white text-black rounded-full px-1.5 py-0.5 text-xs font-bold">
                        {appliedFilters.brand_ids.length}
                      </span>
                    )}
                    <span className="material-icons text-base">expand_more</span>
                  </button>
                )}

                {/* Price Filter Pill */}
                {searchFilters && searchFilters.price_range.max_price > 0 && (
                  <button
                    onClick={() => setActiveFilter(activeFilter === 'price' ? null : 'price')}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap border ${activeFilter === 'price' || appliedFilters.price_min !== null || appliedFilters.price_max !== null
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                  >
                    Price
                    <span className="material-icons text-base">expand_more</span>
                  </button>
                )}

                {/* Dynamic Attribute Filter Pills */}
                {searchFilters && Object.keys(searchFilters.attributes).length > 0 &&
                  Object.entries(searchFilters.attributes).map(([attributeName, attributeValues]: [string, AttributeValue[]]) => {
                    const selectedCount = appliedFilters.attributes[attributeName]?.length || 0;
                    const isActive = activeFilter === attributeName;

                    return (
                      <button
                        key={attributeName}
                        onClick={() => setActiveFilter(isActive ? null : attributeName)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap border ${isActive || selectedCount > 0
                          ? 'bg-black text-white border-black shadow-sm'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }`}
                      >
                        {attributeName}
                        {selectedCount > 0 && (
                          <span className="bg-white text-black rounded-full px-1.5 py-0.5 text-xs font-bold">
                            {selectedCount}
                          </span>
                        )}
                        <span className="material-icons text-base">expand_more</span>
                      </button>
                    );
                  })}
              </div>

              {/* Unified Mega Overlay */}
              {activeFilter && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-6 max-h-[400px] overflow-y-auto">

                    {/* Category Content */}
                    {activeFilter === 'category' && searchFilters && (
                      <div className="flex flex-wrap gap-2">
                        {searchFilters.categories.map((cat: CategoryFilter) => {
                          const isSelected = appliedFilters.category_ids.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              onClick={() => toggleCategoryFilter(cat.id)}
                              className={`px-4 py-2 rounded-full text-sm border transition-all ${isSelected
                                ? 'bg-black border-black text-white'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-gray-400'
                                }`}
                            >
                              {cat.name} <span className="opacity-60 text-xs ml-1">({cat.product_count})</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Brand Content */}
                    {activeFilter === 'brand' && searchFilters && (
                      <div className="flex flex-wrap gap-2">
                        {searchFilters.brands.map((brand: BrandFilter) => {
                          const isSelected = appliedFilters.brand_ids.includes(brand.id);
                          return (
                            <button
                              key={brand.id}
                              onClick={() => toggleBrandFilter(brand.id)}
                              className={`px-4 py-2 rounded-full text-sm border transition-all ${isSelected
                                ? 'bg-black border-black text-white'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-gray-400'
                                }`}
                            >
                              {brand.brand_name} <span className="opacity-60 text-xs ml-1">({brand.product_count})</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Price Content */}
                    {activeFilter === 'price' && searchFilters && (
                      <div className="space-y-4 max-w-sm">
                        <div className="text-sm text-gray-500">
                          Range: £{searchFilters.price_range.min_price.toFixed(2)} - £{searchFilters.price_range.max_price.toFixed(2)}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Min Price</label>
                            <input
                              type="number"
                              value={appliedFilters.price_min || ''}
                              onChange={(e) => setAppliedFilters(prev => ({ ...prev, price_min: e.target.value ? parseFloat(e.target.value) : null }))}
                              placeholder={searchFilters.price_range.min_price.toString()}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Max Price</label>
                            <input
                              type="number"
                              value={appliedFilters.price_max || ''}
                              onChange={(e) => setAppliedFilters(prev => ({ ...prev, price_max: e.target.value ? parseFloat(e.target.value) : null }))}
                              placeholder={searchFilters.price_range.max_price.toString()}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setPriceRange(null, null)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Clear</button>
                          <button onClick={() => setActiveFilter(null)} className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">Apply</button>
                        </div>
                      </div>
                    )}

                    {/* Attribute Content */}
                    {activeFilter && searchFilters?.attributes[activeFilter] && (
                      <div className="flex flex-wrap gap-3">
                        {searchFilters.attributes[activeFilter].map((attr) => {
                          const isSelected = appliedFilters.attributes[activeFilter]?.includes(attr.value) || false;
                          const isColor = activeFilter.toLowerCase().includes('color') || activeFilter.toLowerCase().includes('colour');

                          if (isColor) {
                            return (
                              <button
                                key={attr.value}
                                onClick={() => {
                                  setAppliedFilters(prev => {
                                    const current = prev.attributes[activeFilter] || [];
                                    const updated = current.includes(attr.value)
                                      ? current.filter(v => v !== attr.value)
                                      : [...current, attr.value];
                                    const newAttrs = { ...prev.attributes };
                                    if (updated.length > 0) newAttrs[activeFilter] = updated;
                                    else delete newAttrs[activeFilter];
                                    return { ...prev, attributes: newAttrs };
                                  });
                                }}
                                className="flex flex-col items-center gap-1 group"
                              >
                                <div
                                  className={`w-10 h-10 rounded-full border-2 shadow-sm transition-all ${isSelected ? 'border-black scale-110 ring-2 ring-offset-2 ring-black' : 'border-gray-200 hover:border-gray-400'}`}
                                  style={{ backgroundColor: attr.value.toLowerCase() }}
                                  title={attr.value}
                                />
                                <span className={`text-xs ${isSelected ? 'font-bold' : 'text-gray-600'}`}>{attr.value}</span>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={attr.value}
                              onClick={() => {
                                setAppliedFilters(prev => {
                                  const current = prev.attributes[activeFilter] || [];
                                  const updated = current.includes(attr.value)
                                    ? current.filter(v => v !== attr.value)
                                    : [...current, attr.value];
                                  const newAttrs = { ...prev.attributes };
                                  if (updated.length > 0) newAttrs[activeFilter] = updated;
                                  else delete newAttrs[activeFilter];
                                  return { ...prev, attributes: newAttrs };
                                });
                              }}
                              className={`px-4 py-2 rounded-full text-sm border transition-all ${isSelected
                                ? 'bg-black border-black text-white'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-gray-400'
                                }`}
                            >
                              {attr.value} <span className="opacity-60 text-xs ml-1">({attr.product_count})</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                    <button
                      onClick={() => {
                        if (activeFilter === 'category') setAppliedFilters(prev => ({ ...prev, category_ids: [] }));
                        else if (activeFilter === 'brand') setAppliedFilters(prev => ({ ...prev, brand_ids: [] }));
                        else if (activeFilter === 'price') setPriceRange(null, null);
                        else if (activeFilter) setAppliedFilters(prev => {
                          const newAttrs = { ...prev.attributes };
                          delete newAttrs[activeFilter];
                          return { ...prev, attributes: newAttrs };
                        });
                      }}
                      className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setActiveFilter(null)}
                      className="px-6 py-2 rounded-full bg-[#ff6b00] text-white text-sm font-bold hover:bg-[#e66000] shadow-sm transition-colors"
                    >
                      Show {searchFilters?.total_products || 0} results
                    </button>
                  </div>
                </div>
              )}
              {/* Scroll indicator - right arrow */}
              <div className="flex-shrink-0 w-8"></div>
            </div>

            {/* Gradient fade effect on right edge */}
            <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none"></div>
          </div>

          {/* Vertical Filter Sidebar */}
          {showVerticalFilters && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm transition-opacity"
                onClick={() => setShowVerticalFilters(false)}
              />
              <div className="fixed top-0 left-0 h-full w-[320px] bg-white dark:bg-gray-800 z-[70] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-lg font-bold">Filters</h2>
                  <button
                    onClick={() => setShowVerticalFilters(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <span className="material-icons">close</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-8">
                  {/* Categories */}
                  {searchFilters?.categories.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3 text-gray-900 dark:text-white">Category</h3>
                      <div className="space-y-2">
                        {searchFilters.categories.map((cat) => (
                          <label key={cat.id} className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${appliedFilters.category_ids.includes(cat.id)
                              ? 'bg-black border-black'
                              : 'border-gray-300 group-hover:border-gray-400'
                              }`}>
                              {appliedFilters.category_ids.includes(cat.id) && <span className="material-icons text-white text-[10px]">check</span>}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={appliedFilters.category_ids.includes(cat.id)}
                              onChange={() => toggleCategoryFilter(cat.id)}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Brands */}
                  {searchFilters?.brands.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3 text-gray-900 dark:text-white">Brand</h3>
                      <div className="space-y-2">
                        {searchFilters.brands.map((brand) => (
                          <label key={brand.id} className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${appliedFilters.brand_ids.includes(brand.id)
                              ? 'bg-black border-black'
                              : 'border-gray-300 group-hover:border-gray-400'
                              }`}>
                              {appliedFilters.brand_ids.includes(brand.id) && <span className="material-icons text-white text-[10px]">check</span>}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={appliedFilters.brand_ids.includes(brand.id)}
                              onChange={() => toggleBrandFilter(brand.id)}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{brand.brand_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attributes */}
                  {searchFilters && Object.entries(searchFilters.attributes).map(([attrName, values]: [string, AttributeValue[]]) => {
                    const isColor = attrName.toLowerCase().includes('color') || attrName.toLowerCase().includes('colour');

                    return (
                      <div key={attrName}>
                        <h3 className="font-medium mb-3 text-gray-900 dark:text-white">{attrName}</h3>
                        {isColor ? (
                          <div className="flex flex-wrap gap-3">
                            {values.map((attr) => {
                              const isSelected = appliedFilters.attributes[attrName]?.includes(attr.value);
                              return (
                                <button
                                  key={attr.value}
                                  onClick={() => {
                                    setAppliedFilters(prev => {
                                      const current = prev.attributes[attrName] || [];
                                      const updated = current.includes(attr.value)
                                        ? current.filter(v => v !== attr.value)
                                        : [...current, attr.value];
                                      const newAttrs = { ...prev.attributes };
                                      if (updated.length > 0) newAttrs[attrName] = updated;
                                      else delete newAttrs[attrName];
                                      return { ...prev, attributes: newAttrs };
                                    });
                                  }}
                                  className="flex flex-col items-center gap-1"
                                >
                                  <div
                                    className={`w-8 h-8 rounded-full border shadow-sm ${isSelected ? 'ring-2 ring-offset-2 ring-black border-black' : 'border-gray-200'}`}
                                    style={{ backgroundColor: attr.value.toLowerCase() }}
                                    title={attr.value}
                                  />
                                  <span className="text-xs text-gray-500">{attr.value}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {values.map((attr) => (
                              <label key={attr.value} className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${appliedFilters.attributes[attrName]?.includes(attr.value)
                                  ? 'bg-black border-black'
                                  : 'border-gray-300 group-hover:border-gray-400'
                                  }`}>
                                  {appliedFilters.attributes[attrName]?.includes(attr.value) && <span className="material-icons text-white text-[10px]">check</span>}
                                </div>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={appliedFilters.attributes[attrName]?.includes(attr.value) || false}
                                  onChange={() => {
                                    setAppliedFilters(prev => {
                                      const current = prev.attributes[attrName] || [];
                                      const updated = current.includes(attr.value)
                                        ? current.filter(v => v !== attr.value)
                                        : [...current, attr.value];
                                      const newAttrs = { ...prev.attributes };
                                      if (updated.length > 0) newAttrs[attrName] = updated;
                                      else delete newAttrs[attrName];
                                      return { ...prev, attributes: newAttrs };
                                    });
                                  }}
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{attr.value}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-3">
                  <button
                    onClick={clearAllFilters}
                    className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setShowVerticalFilters(false)}
                    className="flex-1 px-4 py-2.5 rounded-full bg-[#ff6b00] text-white text-sm font-bold hover:bg-[#e66000] shadow-sm transition-colors"
                  >
                    Show {searchFilters?.total_products || 0} results
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}





      {(isLoadingProducts || showRecommendedSkeleton) && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          <ProductCardSkeleton count={12} />
        </div>
      )}

      {!isLoadingProducts && !showRecommendedSkeleton && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          {displayedProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              showLocalBadge={!!searchQuery}
              onProductClick={onProductClick}
              onAddToCart={onAddToCart}
            />
          ))}
          {displayedProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No items found{searchQuery && ` for "${searchQuery}"`}.
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ProductSection;
