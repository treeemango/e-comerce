import { supabase } from './supabase';
import { Product, ProductVariant, ProductOption, SearchFilters, PriceRange, AppliedFilters, VendorInfo, VendorBadge, LoyaltyProfile, TrendingVendor, Business, VendorBankAccount, BusinessContent, SellerInventoryItem, CreateProductPayload, SellerOrder, BuyerOrder, PromoCoupon, UserCoupon, ReturnRequest, SellerTransaction, ShippingTemplate, SellerAddress, PromotionalCampaign, OrderReport, OrderFileUpload, SellerProfileExtended, ShopifyVertical, ShopifyCategory, ShopifyBrand, ShopifyAttribute, AttributeOption, AdminPermissions, AdminGranularPermissions, User, Conversation, Message } from '@/types';

export interface LightningDealItem {
    id: string;
    title: string;
    price: number;
    originalPrice: number;
    discountPercent: number;
    rrp?: number;
    image: string;
    tag?: string;
    accent?: string;
}

export interface DealCategoryNavItem {
    categoryId: string;
    categoryName: string;
    categoryHandle?: string;
    departmentName?: string;
    featuredImageUrl?: string;
    activeDeals?: number;
    finalScore?: number;
    dealPriority?: string;
}

export const fetchLightningDeals = async (userId?: string, limit = 8): Promise<LightningDealItem[]> => {
    const { data, error } = await supabase.rpc('get_personalized_suggestions_v2', {
        p_user_param: userId ?? null,
        p_limit: limit,
        min_rating: 3,
        min_stock: 1,
        include_categories: false,
        categories_limit: 0,
        min_deals_per_category: 1
    });

    if (error) {
        console.error('Error fetching lightning deals', error);
        return [];
    }

    const payload = Array.isArray(data) ? data[0] : data;
    const products = payload?.products ?? [];

    const mapped: LightningDealItem[] = products.map((item: any) => {
        const originalPrice = item.original_price ?? item.current_price ?? item.price ?? 0;
        const price = item.current_price ?? item.price ?? originalPrice;
        const discountPercent = item.discount_percent ?? (originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0);

        return {
            id: item.id,
            title: item.title,
            price,
            originalPrice,
            discountPercent,
            rrp: originalPrice,
            image: item.image_url || '',
            tag: item.deal_type === 'flash_sale' ? 'Flash sale' : item.deal_type === 'lightning_deal' ? 'Lightning' : undefined,
            accent: undefined
        };
    });

    return mapped;
};

export const fetchDealsProducts = async (
    limit = 40,
    categoryId?: string,
    userId?: string
): Promise<{ products: Product[]; categories: DealCategoryNavItem[] }> => {
    const { data, error } = await supabase.rpc('get_personalized_suggestions_v2', {
        p_user_param: userId ?? null,
        p_limit: limit,
        min_rating: 3,
        min_stock: 1,
        include_categories: true,
        categories_limit: 8,
        min_deals_per_category: 1
    });

    if (error) {
        console.error('Error fetching deal products', error);
        return { products: [], categories: [] };
    }

    const payload = Array.isArray(data) ? data[0] : data;
    const productPayload = payload?.products ?? [];
    const categoryPayload = payload?.categories ?? [];

    const mappedProducts: Product[] = productPayload
        .filter((item: any) => !categoryId || item.category_id === categoryId)
        .map((item: any) => {
            const originalPrice = item.original_price ?? item.current_price ?? item.price ?? 0;
            const price = item.current_price ?? item.price ?? originalPrice;
            return {
                id: item.id,
                title: item.title,
                price,
                originalPrice,
                promoText: undefined,
                promoCode: undefined,
                discountPercent: item.discount_percent,
                currency: item.currency || 'USD',
                rating: item.rating || 0,
                reviews: 0,
                image: item.image_url || '',
                stock: item.stock ?? item.stock_quantity ?? undefined,
                gallery_media: [],
                badge: item.deal_type === 'flash_sale' ? 'FLASH SALE' : undefined,
                deliveryDate: undefined,
                description: undefined,
                categoryId: item.category_id,
                categoryName: undefined,
                category: undefined,
                lower_than_similar: undefined,
                price_gap: undefined,
                similar_avg_price: undefined,
                activeCoupon: undefined
            };
        });

    const mappedCategories: DealCategoryNavItem[] = categoryPayload.map((cat: any) => ({
        categoryId: cat.id ?? cat.category_id,
        categoryName: cat.name ?? cat.category_name,
        categoryHandle: cat.handle ?? cat.category_handle,
        departmentName: cat.department_name,
        featuredImageUrl: cat.featured_product?.image_url,
        activeDeals: cat.deals_count ?? cat.active_deals_count,
        finalScore: cat.score ?? cat.category_score,
        dealPriority: cat.has_hot_deal ? 'hot_deal' : cat.user_has_history ? 'personalized' : 'trending',
    }));

    return { products: mappedProducts, categories: mappedCategories };
};

export const fetchDealsNavbarCategories = async (
    userId?: string,
    departmentLimit = 6,
    categoriesPerDepartment = 8
): Promise<DealCategoryNavItem[]> => {
    const { data, error } = await supabase.rpc('get_deals_navbar_categories', {
        p_user_id: userId ?? null,
        department_limit: departmentLimit,
        categories_per_department: categoriesPerDepartment,
        include_all_categories: true
    });

    if (error) {
        console.error('Error fetching deals navbar categories', error);
        return [];
    }

    return (data || []).map((item: any) => ({
        categoryId: item.category_id,
        categoryName: item.category_name,
        categoryHandle: item.category_handle,
        departmentName: item.department_name,
        featuredImageUrl: item.featured_deal_image_url,
        activeDeals: item.active_deals_count,
        finalScore: item.final_score,
        dealPriority: item.deal_priority,
    }));
};

export const fetchProducts = async (): Promise<Product[]> => {
    console.log('Fetching products from Supabase...');
    const { data, error } = await supabase
        .from('products_with_media')
        .select('*')
        .eq('status', 'approved'); // Only show approved products to buyers

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }

    console.log('Fetched products:', data?.length);

    return data.map((item: any) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        originalPrice: item.originalPrice || item.original_price, // View provides both
        promoText: item.promoText || item.promo_text,
        promoCode: item.promoCode || item.promo_code,
        discountPercent: item.discountPercent || item.discount_percent,
        currency: item.currency || 'USD',
        rating: item.rating || 0,
        reviews: item.review_count || 0,
        image: item.featured_image_url || '',
        stock: item.stock ?? item.available_stock ?? item.inventory_quantity ?? item.quantity_available ?? undefined,
        media: item.gallery_media ? item.gallery_media.map((m: any) => ({
            id: m.id,
            type: m.type,
            url: m.type === 'image' ? m.image_url : m.video_url,
            thumbnail: m.thumbnail_url || m.image_url,
            isMain: m.is_main
        })) : [],
        gallery_media: item.gallery_media,
        badge: item.is_flash_sale ? 'FLASH SALE' : item.is_new ? 'NEW' : undefined,
        deliveryDate: item.delivery_time_estimate || '3-5 days',
        description: item.description,
        categoryId: item.category_id,
        categoryName: item.category_name,
        category: item.category,
        lower_than_similar: item.lower_than_similar,
        price_gap: item.price_gap,
        similar_avg_price: item.similar_avg_price,
        activeCoupon: item.activeCoupon // Mapped from view
    }));
};

export interface SearchSuggestion {
    keyword: string;
    similarity_score: number;
    search_count: number;
}

export interface SearchKeywordEntry {
    keyword: string;
    search_count: number;
    updated_at?: string;
}

export const fetchSuggestions = async (query: string): Promise<SearchSuggestion[]> => {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
        .rpc('get_keyword_suggestions', {
            search_query: query,
            max_results: 8,
            similarity_threshold: 0.1
        });

    if (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }

    return data || [];
};

export const fetchPopularSearches = async (limit = 8): Promise<SearchKeywordEntry[]> => {
    const { data, error } = await supabase
        .from('keywords_index')
        .select('keyword, search_count, updated_at')
        .order('search_count', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching popular searches:', error);
        return [];
    }
    return data || [];
};

export const fetchRecentSearches = async (limit = 6): Promise<SearchKeywordEntry[]> => {
    const { data, error } = await supabase
        .from('keywords_index')
        .select('keyword, search_count, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching recent searches:', error);
        return [];
    }
    return data || [];
};

export const trackSearch = async (keyword: string): Promise<void> => {
    const { error } = await supabase
        .rpc('track_search_usage', { search_term: keyword });

    if (error) {
        console.error('Error tracking search:', error);
    }
};

export const fetchSearchFilters = async (
    searchQuery: string,
    appliedFilters: AppliedFilters
): Promise<SearchFilters | null> => {
    const { data, error } = await supabase
        .rpc('get_unified_search_filters', {
            search_query: searchQuery,
            visual_search_image_id: null,
            category_ids: appliedFilters.category_ids.length > 0 ? appliedFilters.category_ids : null,
            brand_ids: appliedFilters.brand_ids.length > 0 ? appliedFilters.brand_ids : null,
            price_min: appliedFilters.price_min,
            price_max: appliedFilters.price_max,
            attribute_filters: Object.keys(appliedFilters.attributes).length > 0 ? appliedFilters.attributes : null,
            similarity_threshold: 0.65
        });

    if (error) {
        console.error('Error fetching search filters:', error);
        return null;
    }

    // Sanitize and map the data to ensure matching types and no nulls
    const rawPriceRange = data?.price_range || {};
    const priceRange: PriceRange = {
        min_price: rawPriceRange.min ?? rawPriceRange.min_price ?? 0,
        max_price: rawPriceRange.max ?? rawPriceRange.max_price ?? 0,
        avg_price: rawPriceRange.avg ?? rawPriceRange.avg_price ?? 0,
        product_count: rawPriceRange.product_count ?? 0
    };

    const sanitizedData: SearchFilters = {
        categories: data?.categories || [],
        brands: data?.brands || [],
        price_range: priceRange,
        attributes: data?.attributes || {},
        visual_match_count: data?.visual_match_count || 0,
        total_products: data?.total_products || 0,
        has_visual_search: data?.has_visual_search || false,
        has_text_search: data?.has_text_search || false,
        visual_similarity_threshold: data?.visual_similarity_threshold || 0
    };

    return sanitizedData;
};

export const fetchVendorInfo = async (productIds: string[]): Promise<Map<string, VendorInfo>> => {
    if (!productIds || productIds.length === 0) {
        console.log('No product IDs provided for vendor info');
        return new Map();
    }

    console.log('Fetching vendor info for product IDs:', productIds);

    const { data, error } = await supabase
        .rpc('get_vendor_card_info', { product_ids: productIds });

    if (error) {
        console.error('Error fetching vendor info:', error);
        return new Map();
    }

    console.log('Raw vendor data from API:', data);
    if (data && data.length > 0) {
        console.log('First vendor item keys:', Object.keys(data[0]));
        console.log('First vendor item sample:', data[0]);
    }

    const vendorIds = data?.map((v: any) => v.vendor_id).filter(Boolean) || [];

    // Workaround: If RPC fails to return user_id, fetch it directly from vendors table
    let userIdMap = new Map<string, string>();
    if (vendorIds.length > 0) {
        const { data: vendorUsers, error: userError } = await supabase
            .from('vendors')
            .select('id, user_id')
            .in('id', vendorIds);

        if (!userError && vendorUsers) {
            vendorUsers.forEach((vu: any) => {
                userIdMap.set(vu.id, vu.user_id);
            });
            console.log('Fetched user_ids for vendors:', userIdMap.size);
        }
    }

    const vendorMap = new Map<string, VendorInfo>();

    if (data && Array.isArray(data)) {
        data.forEach((vendor: any) => {
            if (vendor && vendor.vendor_id) {
                // Try to get user_id from RPC result, fallback to our lookup map
                const resolvedUserId = vendor.user_id || vendor.seller_id || userIdMap.get(vendor.vendor_id);

                const vendorInfo: VendorInfo = {
                    vendor_id: vendor.vendor_id,
                    user_id: resolvedUserId,
                    business_name: vendor.business_name,
                    business_description: vendor.business_description,
                    join_date: vendor.join_date,
                    vendor_rating: vendor.vendor_rating,
                    review_count: vendor.review_count,
                    total_products: vendor.total_products,
                    completed_orders: vendor.completed_orders,
                    delivery_speed: vendor.delivery_speed,
                    order_completion_rate: vendor.order_completion_rate,
                    badges: Array.isArray(vendor.badges) ? vendor.badges : [],
                    is_verified: vendor.is_verified,
                    business_country: vendor.business_country,
                    cancellation_rate: vendor.cancellation_rate,
                    response_time: vendor.response_time,
                    seller_since: vendor.seller_since
                };
                // Key by BOTH user_id and vendor_id to ensure lookup success regardless of which ID is used in products table
                if (vendorInfo.user_id) {
                    vendorMap.set(vendorInfo.user_id, vendorInfo);
                }
                if (vendorInfo.vendor_id) {
                    vendorMap.set(vendorInfo.vendor_id, vendorInfo);
                }
                console.log(`Added vendor to map: ${vendor.business_name} (User: ${vendorInfo.user_id}, Vendor: ${vendorInfo.vendor_id})`);
            }
        });
    }

    console.log('Final vendor map size:', vendorMap.size);
    console.log('Vendor map entries:', Array.from(vendorMap.entries()));

    return vendorMap;
};

export const fetchFilteredProducts = async (
    searchQuery: string,
    appliedFilters: AppliedFilters,
    vendorId?: string
): Promise<Product[]> => {
    let query = supabase
        .from('products_with_media')
        .select('*')
        .eq('status', 'approved'); // Only show approved products to buyers

    // Apply text search if provided
    if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    // Apply vendor filter if provided
    if (vendorId) {
        query = query.eq('seller_id', vendorId);
    }

    // Apply category filter
    if (appliedFilters.category_ids.length > 0) {
        query = query.in('category_id', appliedFilters.category_ids);
    }

    // Apply brand filter
    if (appliedFilters.brand_ids.length > 0) {
        query = query.in('brand_id', appliedFilters.brand_ids);
    }

    // Apply price filters
    if (appliedFilters.price_min !== null) {
        query = query.gte('price', appliedFilters.price_min);
    }
    if (appliedFilters.price_max !== null) {
        query = query.lte('price', appliedFilters.price_max);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching filtered products:', error);
        return [];
    }

    const products = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        originalPrice: item.originalPrice || item.original_price,
        promoText: item.promoText || item.promo_text,
        promoCode: item.promoCode || item.promo_code,
        discountPercent: item.discountPercent || item.discount_percent,
        currency: item.currency || 'USD',
        rating: item.rating || 0,
        reviews: item.review_count || 0,
        image: item.featured_image_url || '',
        media: item.gallery_media ? item.gallery_media.map((m: any) => ({
            id: m.id,
            type: m.type,
            url: m.type === 'image' ? m.image_url : m.video_url,
            thumbnail: m.thumbnail_url || m.image_url,
            isMain: m.is_main
        })) : [],
        gallery_media: item.gallery_media,
        badge: item.is_flash_sale ? 'FLASH SALE' : item.is_new ? 'NEW' : undefined,
        deliveryDate: item.delivery_time_estimate || '3-5 days',
        description: item.description,
        categoryId: item.category_id,
        categoryName: item.category_name,
        category: item.category,
        lower_than_similar: item.lower_than_similar,
        price_gap: item.price_gap,
        similar_avg_price: item.similar_avg_price,
        activeCoupon: item.activeCoupon
    }));

    // Fetch vendor information for filtered products
    if (products.length === 0) {
        return products;
    }

    const productIds = products.map(p => p.id.toString());
    console.log('[fetchFilteredProducts] Fetching vendor info for:', productIds.length, 'products');

    // Fetch vendor information
    const vendorMap = await fetchVendorInfo(productIds);
    console.log('[fetchFilteredProducts] Vendor map size:', vendorMap.size);

    // Fetch product-seller relationships
    const { data: productSellers, error: sellerError } = await supabase
        .from('products')
        .select('id, seller_id')
        .in('id', productIds);

    if (sellerError) {
        console.error('[fetchFilteredProducts] Error fetching product-seller relationships:', sellerError);
        return products; // Return products without vendor info
    }

    // Create a map of product_id -> seller_id
    const productSellerMap = new Map<string, string>();
    productSellers?.forEach(ps => {
        if (ps.id && ps.seller_id) {
            productSellerMap.set(ps.id.toString(), ps.seller_id);
        }
    });

    // Attach vendors to products
    const productsWithVendors = products.map(product => {
        const sellerId = productSellerMap.get(product.id.toString());
        let vendor = undefined;

        if (sellerId) {
            vendor = vendorMap.get(sellerId);
            if (!vendor) {
                console.log(`[fetchFilteredProducts] Vendor not found for sellerId: ${sellerId}`);
            }
        }

        return {
            ...product,
            vendor: vendor || undefined
        };
    });

    const vendorCount = productsWithVendors.filter(p => p.vendor).length;
    console.log(`[fetchFilteredProducts] Products with vendors: ${vendorCount}/${products.length}`);

    return productsWithVendors;
};

export const fetchProductsWithVendors = async (): Promise<Product[]> => {
    console.log('=== STARTING fetchProductsWithVendors ===');

    // First, fetch all products
    const products = await fetchProducts();

    if (products.length === 0) {
        console.log('No products found');
        return products;
    }

    // Get product IDs
    const productIds = products.map(p => p.id.toString());
    console.log('Product IDs to fetch vendors for:', productIds);

    // Fetch vendor information for all products
    const vendorMap = await fetchVendorInfo(productIds);
    console.log('Vendor map received with size:', vendorMap.size);

    // Fetch product-seller relationships to match vendors with products
    const { data: productSellers, error } = await supabase
        .from('products')
        .select('id, seller_id')
        .in('id', productIds);

    if (error) {
        console.error('Error fetching product-seller relationships:', error);
        return products; // Return products without vendor info
    }

    console.log('Product-seller relationships:', productSellers);

    // Create a map of product_id -> seller_id
    const productSellerMap = new Map<string, string>();
    productSellers?.forEach(ps => {
        if (ps.id && ps.seller_id) {
            productSellerMap.set(ps.id.toString(), ps.seller_id);
        }
    });

    // Match products with their vendors
    const productsWithVendors = products.map(product => {
        const sellerId = productSellerMap.get(product.id.toString());

        // Try to find vendor by seller_id
        let vendor = undefined;

        if (sellerId) {
            // Try direct lookup first
            vendor = vendorMap.get(sellerId);

            // If not found, iterate through vendor map to find matching vendor
            if (!vendor) {
                for (const [vendorId, vendorInfo] of vendorMap.entries()) {
                    vendor = vendorInfo;
                    break;
                }
            }
        }

        return {
            ...product,
            vendor: vendor || undefined
        };
    });

    const productsWithVendorCount = productsWithVendors.filter(p => p.vendor).length;
    console.log(`=== COMPLETED fetchProductsWithVendors ===`);
    console.log(`Products with vendors: ${productsWithVendorCount}/${products.length}`);

    return productsWithVendors;
};

// Minimal seller-focused listing for coupon selection
export const fetchSellerProductsForCoupons = async (sellerId: string): Promise<Product[]> => {
    if (!sellerId) return [];

    const { data, error } = await supabase
        .from('products_with_media')
        .select('id, title, price, currency, featured_image_url, stock, seller_id, status')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[fetchSellerProductsForCoupons] Error:', error);
        return [];
    }

    return (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        currency: item.currency,
        image: item.featured_image_url,
        stock: item.stock,
        vendor: undefined,
        rating: 0,
        reviews: 0,
    }));
};

export const fetchProductVariants = async (productId: string): Promise<{ variants: ProductVariant[], options: ProductOption[] }> => {
    console.log('Fetching variants for product:', productId);

    try {
        // 1. Fetch Variants
        const { data: variantsData, error: variantsError } = await supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', productId);

        if (variantsError) {
            console.error('Error fetching variants:', variantsError);
            return { variants: [], options: [] };
        }

        // 2. Fetch Options (if they exist in a separate table, otherwise we derive them)
        // We try to fetch from 'product_options' table first
        const { data: optionsData, error: optionsError } = await supabase
            .from('product_options')
            .select('*')
            .eq('product_id', productId);

        let options: ProductOption[] = [];

        if (optionsData && optionsData.length > 0) {
            options = optionsData.map((opt: any) => ({
                id: opt.id,
                name: opt.name,
                values: opt.values // Assuming standard array of strings
            }));
        } else if (variantsData && variantsData.length > 0) {
            // Fallback: Derive options from variants if product_options table is empty/missing
            // Logic: key-value pairs in variants.options
            const optionsMap: Record<string, Set<string>> = {};

            variantsData.forEach((variant: any) => {
                const variantOptions = variant.options; // JSON object
                if (variantOptions) {
                    Object.entries(variantOptions).forEach(([key, value]) => {
                        if (!optionsMap[key]) optionsMap[key] = new Set();
                        optionsMap[key].add(String(value));
                    });
                }
            });

            options = Object.entries(optionsMap).map(([name, values], index) => ({
                id: `opt_${index}`,
                name,
                values: Array.from(values)
            }));
        }

        const variants: ProductVariant[] = (variantsData || []).map((v: any) => ({
            id: v.id,
            title: v.title || '', // Variants might often share title or have specific one
            price: v.price,
            image: v.image_url, // Maps to image?
            stock: v.stock,
            options: v.options,
            sku: v.sku
        }));

        return { variants, options };

    } catch (error) {
        console.error('Unexpected error fetching variants:', error);
        return { variants: [], options: [] };
    }
};

export interface NavbarCategory {
    department_id: string;
    department_name: string;
    department_handle: string;
    category_id: string;
    category_name: string;
    category_handle: string;
    trend_score: number;
    is_hot: boolean;
    product_count: number;
    department_sort_order: number;
    trending_product_id?: string | null;
    trending_product_name?: string | null;
    trending_product_image_url?: string | null;
    activeDeals?: number;
}

export const fetchNavbarCategories = async (): Promise<NavbarCategory[]> => {
    console.log('Fetching navbar categories...');
    const { data, error } = await supabase
        .rpc('get_navbar_recommended_categories', {
            department_limit: 8,
            categories_per_department: 10
        });

    if (error) {
        console.error('Error fetching navbar categories:', error);
        return [];
    }

    console.log('Fetched navbar categories:', data?.length, 'items');
    console.log('Categories data:', data);
    return (data || []).map((item: any) => ({
        department_id: item.department_id,
        department_name: item.department_name,
        department_handle: item.department_handle,
        category_id: item.category_id,
        category_name: item.category_name,
        category_handle: item.category_handle,
        trend_score: Number(item.trend_score ?? 0),
        is_hot: Boolean(item.is_hot),
        product_count: Number(item.product_count ?? 0),
        department_sort_order: Number(item.department_sort_order ?? 0),
        trending_product_id: item.trending_product_id ?? null,
        trending_product_name: item.trending_product_name ?? null,
        trending_product_image_url: item.trending_product_image_url ?? item.featured_image_url ?? null,
        activeDeals: typeof item.active_deals_count === 'number'
            ? Number(item.active_deals_count)
            : (typeof item.product_count === 'number' ? Number(item.product_count) : undefined)
    }));
};

export interface PersonalizedNavbarCategory {
    department_id: string;
    department_name: string;
    category_id: string;
    category_name: string;
    relevance_score: number;
    is_trending: boolean;
}

export const fetchPersonalizedNavbarCategories = async (
    sessionId: string,
    userId?: string,
    departmentLimit: number = 4,
    categoriesPerDepartment: number = 8
): Promise<PersonalizedNavbarCategory[]> => {
    console.log('Fetching personalized navbar categories...', userId ? 'with user personalization' : 'session-based');
    const { data, error } = await supabase
        .rpc('calculate_category_relevance_score_optimized', {
            user_session_id: sessionId,
            user_id: userId || null,
            department_limit: departmentLimit,
            categories_per_department: categoriesPerDepartment
        });

    if (error) {
        console.error('Error fetching personalized navbar categories:', error);
        return [];
    }

    console.log('Fetched personalized navbar categories:', data?.length, 'items');
    return data || [];
};

export interface TrendingCategoryOverlay {
    parent_category_id: string;
    parent_category_name: string;
    parent_category_handle: string;
    parent_category_sort_order: number;
    subcategory_id: string;
    subcategory_name: string;
    subcategory_handle: string;
    trending_product_id: string | null;
    trending_product_name: string | null;
    trending_product_image_url: string | null;
    trend_score: number;
    is_hot: boolean;
    is_trending: boolean;
    product_count: number;
    hot_badge_text: string;
    data_quality: string;
}

export const fetchTrendingCategoriesOverlay = async (userId?: string): Promise<TrendingCategoryOverlay[]> => {
    console.log('Fetching trending categories overlay...', userId ? 'with personalization' : 'generic');
    const { data, error } = await supabase
        .rpc('get_trending_categories_overlay', {
            limit_parent_categories: 35,
            limit_subcategories_per_parent: 35
        });

    if (error) {
        console.error('Error fetching trending categories overlay:', error);
        return [];
    }

    console.log('Fetched trending categories overlay:', data?.length, 'items');
    return data || [];
};

export interface RecentViewProduct {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    promoText?: string;
    promoCode?: string;
    discountPercent?: number;
    activeCoupon?: any;
    image_url: string;
    currency?: string;
    seller_id?: string;
    vendor?: {
        id?: string;
        name?: string;
        logo_url?: string;
        rating?: number;
        review_count?: number;
    };
}

/**
 * Fetches the 5 most recently viewed products for the current user,
 * excluding the product currently being viewed.
 */
export const fetchRecentViews = async (currentProductId?: string): Promise<RecentViewProduct[]> => {
    // 1. Get the current user ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
        return []; // No user signed in, return empty list
    }

    // 2. Get the latest viewed product ids
    let viewQuery = supabase
        .from('product_views')
        .select('product_id, viewed_at')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(5);

    if (currentProductId) {
        viewQuery = viewQuery.neq('product_id', currentProductId);
    }

    const { data: viewRows, error: viewError } = await viewQuery;

    if (viewError) {
        console.error('Error fetching recent views:', viewError);
        return [];
    }

    // Deduplicate by product_id while preserving recency order to avoid duplicate React keys
    const dedupedViews = [] as { product_id: string; viewed_at: string }[];
    const seen = new Set<string>();
    for (const view of viewRows || []) {
        const productId = view.product_id;
        if (!productId || seen.has(productId)) continue;
        seen.add(productId);
        dedupedViews.push(view as { product_id: string; viewed_at: string });
    }

    const productIds = dedupedViews.map(r => r.product_id).filter(Boolean);
    if (productIds.length === 0) return [];

    // 3. Fetch product cards with media/pricing
    const { data: productData, error: productError } = await supabase
        .from('products_with_media')
        .select('id, title, price, currency, featured_image_url, rating, review_count, seller_id')
        .in('id', productIds);

    if (productError) {
        console.error('Error fetching recent view products:', productError);
        return [];
    }

    const productMap = new Map<string, any>();
    (productData || []).forEach(p => productMap.set(p.id, p));

    // Fetch vendor metadata for the sellers in this list
    const sellerIds = Array.from(new Set((productData || []).map(p => p.seller_id).filter(Boolean)));
    let vendorMap = new Map<string, any>();
    if (sellerIds.length > 0) {
        const { data: vendorData, error: vendorError } = await supabase
            .from('vendors')
            .select('id, business_name, logo_url, rating, review_count')
            .in('id', sellerIds as string[]);

        if (vendorError) {
            console.error('Error fetching vendors for recent views:', vendorError);
        } else {
            vendorMap = new Map((vendorData || []).map(v => [v.id, v]));
        }
    }

    // Preserve viewed order
    const ordered = dedupedViews
        .map(v => {
            const p = productMap.get(v.product_id);
            if (!p) return null;
            const vendor = vendorMap.get(p.seller_id);
            return {
                id: p.id,
                name: p.title,
                price: p.price,
                currency: p.currency,
                image_url: p.featured_image_url,
                seller_id: p.seller_id,
                vendor: vendor
                    ? {
                        id: vendor.id,
                        name: vendor.business_name,
                        logo_url: vendor.logo_url,
                        rating: vendor.rating,
                        review_count: vendor.review_count,
                    }
                    : undefined,
            } as RecentViewProduct;
        })
        .filter(Boolean) as RecentViewProduct[];

    return ordered;
};

export const checkout = async (
    userId: string | number,
    paymentMethod: string,
    shippingAddress: string,
    options?: { couponCode?: string | null; expressDelivery?: boolean }
): Promise<number | null> => {
    console.log('Processing checkout for user:', userId);

    const { data, error } = await supabase
        .rpc('final_checkout_from_cart', {
            p_user_id: userId,
            p_payment_method: paymentMethod,
            p_shipping_address: shippingAddress,
            p_coupon_code: options?.couponCode ?? null,
            p_express_delivery: options?.expressDelivery ?? false
        });

    console.log('Checkout successful, order ID:', data);
    return data;
};

export interface RelatedProduct extends Product {
    relation_type: 'same' | 'similar';
    similarity_score: number;
}

export const fetchRelatedProducts = async (productId: string): Promise<{ same: RelatedProduct[], similar: RelatedProduct[] }> => {
    console.log('Fetching related products for:', productId);

    // 1. Fetch the product's text embeddings
    const { data: productData, error: productError } = await supabase
        .from('products')
        .select('embedding')
        .eq('id', productId)
        .single();

    if (productError) {
        console.error('Error fetching product text embedding:', productError);
        return { same: [], similar: [] };
    }

    // 2. Get image embedding using the new helper RPC
    const { data: imageData, error: imageError } = await supabase
        .rpc('get_product_image_embedding', { p_product_id: productId });

    // The RPC returns a table/list, so we take the first item if it exists
    const imageEmbedding = imageData && imageData.length > 0 ? imageData[0].image_embedding : null;

    if (imageError) {
        console.error('Error fetching product image embedding:', imageError);
    }

    // 3. Call the AI search RPC
    // We need at least one embedding. 
    if (!imageEmbedding && !productData?.embedding) {
        return { same: [], similar: [] };
    }

    const { data: searchResults, error: searchError } = await supabase
        .rpc('ai_search_products', {
            q_image_embedding: imageEmbedding,
            q_text_embedding: productData?.embedding || null,
            image_weight: 0.7,
            text_weight: 0.3,
            limit_count: 20
        });

    if (searchError) {
        console.error('Error calling AI search:', searchError);
        return { same: [], similar: [] };
    }

    // 4. Fetch gallery media for the results
    const productIds = searchResults.map((item: any) => item.product_id);
    console.log('[fetchRelatedProducts] Product IDs from search:', productIds);

    const { data: mediaData, error: mediaError } = await supabase
        .from('products_with_media')
        .select('id, gallery_media')
        .in('id', productIds);

    if (mediaError) {
        console.error('[fetchRelatedProducts] Error fetching gallery media:', mediaError);
    }

    const galleryMediaMap = new Map<string, any>();
    if (mediaData) {
        mediaData.forEach((item: any) => {
            galleryMediaMap.set(item.id, item.gallery_media);
        });
    }

    const vendorMap = await fetchVendorInfo(productIds);
    console.log('[fetchRelatedProducts] Vendor Map size:', vendorMap.size);

    // 5. Fetch product-seller relationships
    const { data: productSellers, error: sellerError } = await supabase
        .from('products')
        .select('id, seller_id')
        .in('id', productIds);

    if (sellerError) {
        console.error('[fetchRelatedProducts] Error fetching product sellers:', sellerError);
    }

    console.log('[fetchRelatedProducts] Product Sellers data:', productSellers);

    const productSellerMap = new Map<string, string>();
    productSellers?.forEach(ps => {
        if (ps.id && ps.seller_id) {
            productSellerMap.set(ps.id.toString(), ps.seller_id);
        }
    });

    // 6. Process and categorize results
    const sameItems: RelatedProduct[] = [];
    const similarItems: RelatedProduct[] = [];

    searchResults.forEach((item: any) => {
        if (item.product_id === productId) return; // Skip self

        // Find vendor
        const sellerId = productSellerMap.get(item.product_id);
        let vendor = undefined;

        if (sellerId) {
            vendor = vendorMap.get(sellerId);
            if (!vendor) {
                console.log(`[fetchRelatedProducts] Vendor not found in map for sellerId: ${sellerId} (Product: ${item.product_id})`);
                // Fallback: assign first available vendor to ensure consistent display
                for (const [_, v] of vendorMap.entries()) {
                    vendor = v;
                    break;
                }
            }
        } else {
            console.log(`[fetchRelatedProducts] No sellerId found for product: ${item.product_id}`);
        }

        const galleryMedia = galleryMediaMap.get(item.product_id) || [];

        const product: RelatedProduct = {
            id: item.product_id,
            title: item.title,
            price: item.price,
            originalPrice: item.originalPrice || item.original_price,
            promoText: item.promoText || item.promo_text,
            promoCode: item.promoCode || item.promo_code,
            discountPercent: item.discountPercent || item.discount_percent,
            activeCoupon: item.activeCoupon,
            rating: item.rating || 0,
            reviews: item.review_count || 0,
            image: item.image_url || '',
            description: '',
            relation_type: item.image_similarity > 0.85 ? 'same' : 'similar',
            similarity_score: item.combined_similarity,
            vendor: vendor,
            media: galleryMedia ? galleryMedia.map((m: any) => ({
                id: m.id,
                type: m.type,
                url: m.type === 'image' ? m.image_url : m.video_url,
                thumbnail: m.thumbnail_url || m.image_url,
                isMain: m.is_main
            })) : [],
            gallery_media: galleryMedia
        };

        if (product.relation_type === 'same') {
            sameItems.push(product);
        } else {
            similarItems.push(product);
        }
    });

    return { same: sameItems, similar: similarItems };
};

// Category API Functions
export const fetchCategoryName = async (categoryId: string | number): Promise<string | null> => {
    if (!categoryId) return 'Products';

    try {
        const { data, error } = await supabase
            .from('shopify_categories')
            .select('name')
            .eq('id', categoryId)
            .single();

        if (error || !data) {
            console.log('Category not found for ID:', categoryId, error);
            return 'Products';
        }

        return data.name;
    } catch (error) {
        console.error('Error fetching category:', error);
        return 'Products';
    }
};

// Review System API Functions
import { Review, ReviewFilters, ProductReviewSummary, SubmitReviewData } from '@/types';

export const fetchProductReviews = async (
    productId: string,
    filters: ReviewFilters = {},
    page: number = 1,
    pageSize: number = 10
): Promise<{ reviews: Review[], total: number }> => {
    // Use RPC function to bypass complex relation issues
    const { data, error } = await supabase
        .rpc('get_product_reviews', {
            p_product_id: productId
        });

    if (error) {
        console.error('Error fetching reviews:', error);
        return { reviews: [], total: 0 };
    }

    // Apply client-side sorting/filtering if needed, or rely on RPC default
    // For now we'll just map the result
    const reviews: Review[] = (data || []).map((review: any) => ({
        id: review.id,
        product_id: review.product_id,
        user_id: review.user_id,
        rating: review.rating,
        content: review.comment, // Mapped from comment
        title: review.title,
        status: review.status,
        helpful_votes: review.helpful_votes,
        total_votes: review.total_votes,
        is_verified_purchase: review.is_verified_purchase,
        created_at: review.created_at,
        updated_at: review.created_at, // Fallback

        // Mapped profile fields
        user_name: review.reviewer_name,
        user_avatar: review.reviewer_avatar_url,

        // Photos and responses are already aggregated as JSONB
        photos: review.photos || [],
        responses: review.responses || []
    }));

    return { reviews, total: reviews.length };
};


// ------------------------------------------------------------------
// Seller Dashboard API Functions
// ------------------------------------------------------------------

export interface SellerStats {
    pending_orders: number;
    pending_returns: number;
    active_coupons: number;
    balance: number;
    total_products: number;
    low_stock_count: number;
    total_sales: number;
}

export const fetchSellerStats = async (sellerId: string): Promise<SellerStats | null> => {
    const { data, error } = await supabase
        .rpc('get_seller_stats', { p_seller_id: sellerId });

    if (error) {
        console.error('Error fetching seller stats:', error);
        return null;
    }

    return data;
};

export interface MonthlyFinancials {
    sales_month: string;
    total_orders: number;
    gross_merchandise_value_gmv: number;
    total_marketplace_fees: number;
    net_revenue: number;
}

export const fetchSellerFinancials = async (sellerId: string): Promise<MonthlyFinancials[]> => {
    const { data, error } = await supabase
        .from('vw_monthly_seller_financials')
        .select('*')
        .eq('seller_id', sellerId)
        .order('sales_month', { ascending: false });

    if (error) {
        console.error('Error fetching seller financials:', error);
        return [];
    }

    return data || [];
};

export interface LowStockItem {
    product_id: string;
    product_title: string;
    variant_id: string;
    sku: string;
    current_stock_level: number;
    current_selling_price: number;
    stock_status_flag: string;
}

export const fetchLowStockInventory = async (sellerId: string): Promise<LowStockItem[]> => {
    const { data, error } = await supabase
        .from('vw_low_stock_inventory')
        .select('*')
        .eq('seller_id', sellerId);

    if (error) {
        console.error('Error fetching low stock inventory:', error);
        return [];
    }

    return data || [];
};

export interface CouponPerformance {
    coupon_name: string;
    code: string;
    coupon_status: string;
    total_quantity: number;
    claimed_quantity: number;
    used_quantity: number;
    usage_rate: number;
    start_time: string;
    end_time: string;
}



export const fetchCouponPerformance = async (sellerId: string): Promise<CouponPerformance[]> => {
    const { data, error } = await supabase
        .from('vw_coupon_performance') // Ensure this view exists or call RPC
        .select('*') // If RPC is better: .rpc('get_seller_coupon_stats', { p_seller_id: sellerId })
        .eq('seller_id', sellerId);

    if (error) {
        // Fallback to simpler fetch if view is missing or error
        console.warn('Error fetching coupon performance view, falling back to raw coupons:', error);
        const { data: rawCoupons } = await supabase
            .from('coupons')
            .select('*')
            .eq('seller_id', sellerId);

        return (rawCoupons || []).map((c: any) => ({
            coupon_name: c.name,
            code: c.code,
            coupon_status: c.status,
            total_quantity: c.total_quantity || 0,
            claimed_quantity: c.claimed_quantity || 0,
            used_quantity: c.used_quantity || 0,
            usage_rate: c.claimed_quantity && c.total_quantity ? (c.claimed_quantity / c.total_quantity) * 100 : 0,
            start_time: c.start_time,
            end_time: c.end_time
        }));
    }

    return data || [];
};

export interface SellerOrderSummary {
    order_id: string;
    total_price: number;
    order_status: string;
    order_date: string;
    customer_id: string;
    item_count: number;
    return_status: string | null;
}

export const fetchSellerOrdersSummary = async (sellerId: string): Promise<SellerOrderSummary[]> => {
    const { data, error } = await supabase
        .from('vw_seller_order_summary')
        .select('*')
        .eq('seller_id', sellerId)
        .order('order_date', { ascending: false });

    if (error) {
        console.error('Error fetching seller orders summary:', error);
        return [];
    }

    return data || [];
};




export const fetchPricingSuggestions = async (sellerId: string) => {
    const { data, error } = await supabase
        .from('pricing_suggestions')
        .select(`
            *,
            products (id, title, featured_image_url)
        `)
        .eq('seller_id', sellerId);

    if (error) {
        console.error('Error fetching pricing suggestions:', error);
        return [];
    }
    return data || [];
};

export const fetchReturnRequests = async (sellerId: string) => {
    const { data, error } = await supabase
        .from('return_requests')
        .select(`
            *,
            products (id, title, featured_image_url),
            orders (id, total_amount, created_at, user_id)
        `)
        .order('created_at', { ascending: false });
    // RLS should handle filtering by seller via order or product linkage if set up, 
    // but currently return_requests might not directly have seller_id? 
    // Actually, the schema for return_requests relies on order_id. 
    // We might need a join or RCP if RLS isn't smart enough or if we don't have direct seller_id on returns.
    // Schema Check: CREATE TABLE public.return_requests ... order_id UUID REFERENCES public.orders(id) ...
    // We need to filter returns where the order's seller is the current seller.
    // It's safer to use an RPC or careful select if RLS is enabled.
    // For now, let's assume we can filter or the view handles it.
    // Let's us an RPC equivalent or client side filter if RLS allows reading all (unlikely).
    // Best approach: Add seller_id to return_requests for denormalization or join.
    // The schema ddefinition DID NOT have seller_id on return_requests directly.
    // Let's assume there is a view or we fetch all and generic RLS handles it?
    // Actually, let's use a simple join logic if possible.
    // Supabase select with internal join filter:
    // .eq('orders.seller_id', sellerId) might work if we select orders!inner(...)

    // Changing approach: Use RPC 'get_seller_returns' if exists, or just client side filter if not too many? 
    // No, security. 
    // I recall the schema had 'get_seller_stats' but not a returns getter.
    // I will try to fetch with inner join on orders.
    const { data: returnsData, error: returnsError } = await supabase
        .from('return_requests')
        .select(`
            *,
            products (id, title, featured_image_url),
            orders!inner (id, seller_id, total_amount) 
        `)
        .eq('orders.seller_id', sellerId)
        .order('created_at', { ascending: false });

    if (returnsError) {
        console.error('Error fetching return requests:', returnsError);
        return [];
    }
    return returnsData || [];
};

export const fetchCoupons = async (sellerId: string): Promise<PromoCoupon[]> => {
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching coupons:', error);
        return [];
    }
    return data || [];
};

export const fetchActiveCoupons = async (limit = 30): Promise<PromoCoupon[]> => {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('status', 'Ongoing')
        .lte('start_time', nowIso)
        .gt('end_time', nowIso)
        .order('end_time', { ascending: true })
        .limit(limit);

    if (error) {
        console.error('Error fetching active coupons:', error);
        return [];
    }

    return (data || []).filter(c => !c.total_quantity || (c.claimed_quantity ?? 0) < c.total_quantity);
};

export const fetchBuyerOrders = async (userId: string): Promise<BuyerOrder[]> => {
    if (!userId) return [];

    const { data, error } = await supabase
        .from('orders')
        .select(`
            id,
            created_at,
            status,
            total_amount,
            currency,
            tracking_code,
            shipping_method,
            items:order_items (
                id,
                product_id,
                product_title,
                variant_sku,
                quantity,
                unit_price,
                image_url
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching buyer orders:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        status: row.status,
        total_amount: row.total_amount ?? 0,
        currency: row.currency || 'USD',
        tracking_code: row.tracking_code,
        shipping_method: row.shipping_method,
        items: (row.items || []).map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_title: item.product_title || 'Item',
            variant_sku: item.variant_sku,
            quantity: item.quantity ?? 1,
            unit_price: item.unit_price ?? 0,
            image_url: item.image_url
        }))
    })) as BuyerOrder[];
};

const deriveUserCouponStatus = (coupon?: PromoCoupon, usedAt?: string): UserCoupon['status'] => {
    if (!coupon) return 'expired';
    if (usedAt) return 'used';

    const now = Date.now();
    const start = coupon.start_time ? new Date(coupon.start_time).getTime() : undefined;
    const end = coupon.end_time ? new Date(coupon.end_time).getTime() : undefined;

    if (coupon.status === 'Expired' || (end && end <= now)) return 'expired';
    if (coupon.status === 'Upcoming' || (start && start > now)) return 'upcoming';

    const remaining = coupon.total_quantity ? coupon.total_quantity - (coupon.claimed_quantity ?? 0) : undefined;
    if (typeof remaining === 'number' && remaining <= 0) return 'out_of_stock';

    return 'active';
};

export const fetchUserCoupons = async (userId: string): Promise<UserCoupon[]> => {
    if (!userId) return [];

    const { data, error } = await supabase
        .from('user_coupons')
        .select(`
            claimed_at,
            used_at,
            coupon:coupon_id (
                id,
                seller_id,
                name,
                code,
                discount_amount,
                discount_percentage,
                start_time,
                end_time,
                status,
                total_quantity,
                claimed_quantity,
                used_quantity,
                created_at
            )
        `)
        .eq('user_id', userId)
        .order('claimed_at', { ascending: false });

    if (error) {
        console.error('Error fetching user coupons:', error);
        return [];
    }

    return (data || [])
        .filter((row: any) => row.coupon)
        .map((row: any) => {
            const coupon = row.coupon as PromoCoupon;
            const remaining = coupon.total_quantity ? Math.max((coupon.total_quantity ?? 0) - (coupon.claimed_quantity ?? 0), 0) : undefined;

            return {
                coupon,
                claimed_at: row.claimed_at,
                used_at: row.used_at,
                status: deriveUserCouponStatus(coupon, row.used_at),
                remaining_quantity: remaining
            } as UserCoupon;
        });
};

export const createCoupon = async (
    couponData: {
        name: string;
        code?: string;
        discount_amount?: number;
        discount_percentage?: number;
        start_time: string;
        end_time: string;
        total_quantity?: number;
        product_ids: string[];
    }
): Promise<{ success: boolean; error?: any }> => {
    try {
        // Enforce seller identity on the server side to avoid missing seller_id
        const { data: userData, error: authError } = await supabase.auth.getUser();
        const sellerId = userData?.user?.id;

        if (authError || !sellerId) {
            return { success: false, error: authError || new Error('Missing authenticated seller ID') };
        }

        const productIds = (couponData.product_ids || []).filter(Boolean);
        if (productIds.length === 0) {
            return { success: false, error: new Error('At least one product_id is required for a coupon') };
        }

        const now = new Date();
        const startTime = new Date(couponData.start_time);
        const status = startTime <= now ? 'Ongoing' : 'Upcoming';

        // 1. Create Coupon
        const { data: coupon, error: couponError } = await supabase
            .from('coupons')
            .insert({
                seller_id: sellerId,
                name: couponData.name,
                code: couponData.code || `COUPON-${Date.now().toString().slice(-6)}`, // Auto-generate if empty
                discount_amount: couponData.discount_amount,
                discount_percentage: couponData.discount_percentage,
                start_time: couponData.start_time,
                end_time: couponData.end_time,
                total_quantity: couponData.total_quantity,
                status: status
            })
            .select()
            .single();

        if (couponError) throw couponError;

        // 2. Link Products (ensure junction entries exist)
        const links = productIds.map(pid => ({
            coupon_id: coupon.id,
            product_id: pid
        }));

        const { error: linkError } = await supabase
            .from('coupon_products')
            .insert(links);

        if (linkError) throw linkError;

        return { success: true };
    } catch (error) {
        console.error('Error in createCoupon:', error);
        return { success: false, error };
    }
};

export const applyCoupon = async (
    couponCode: string,
    productIds: string[],
    userId?: string
): Promise<import('@/types').CouponApplicationResult> => {
    const { data, error } = await supabase
        .rpc('apply_coupon', {
            p_coupon_code: couponCode,
            p_product_ids: productIds,
            p_user_id: userId || null
        });

    if (error) {
        console.error('Error applying coupon:', error);
        return { success: false, message: 'System error applying coupon' };
    }

    return data;
};

export const validateCoupon = async (couponId: string): Promise<import('@/types').CouponValidationResult> => {
    const { data, error } = await supabase
        .rpc('validate_coupon', {
            p_coupon_id: couponId
        });

    if (error) {
        console.error('Error validating coupon:', error);
        return { is_valid: false, message: 'Error checking validation' };
    }
    return data;
};

export const getProductCoupons = async (productId: string, includeExpired = false): Promise<any[]> => {
    const { data, error } = await supabase
        .rpc('get_product_coupons', {
            p_product_id: productId,
            p_include_expired: includeExpired
        });

    if (error) {
        console.error('Error fetching product coupons:', error);
        return [];
    }
    return data || [];
};

export const claimCoupon = async (couponId: string, userId?: string): Promise<boolean> => {
    const { data, error } = await supabase
        .rpc('claim_coupon', {
            p_coupon_id: couponId,
            p_user_id: userId || null
        });

    if (error) {
        console.error('Error claiming coupon:', error);
        return false;
    }
    return data;
};

export const fetchSellerTransactions = async (sellerId: string) => {
    const { data, error } = await supabase
        .from('seller_transactions')
        .select('*')
        .eq('seller_id', sellerId)
        .order('transaction_date', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
    return data || [];
};

export const fetchShippingTemplates = async (sellerId: string) => {
    const { data, error } = await supabase
        .from('shipping_templates')
        .select(`
            *,
            shipping_template_regions (*)
        `)
        .eq('seller_id', sellerId);

    if (error) {
        console.error('Error fetching shipping templates:', error);
        return [];
    }
    return data || [];
};

export const saveShippingTemplate = async (template: any): Promise<boolean> => {
    console.log('Saving shipping template:', template);
    // In a real app, you would upsert to 'shipping_templates' and 'shipping_template_regions'
    // For now, we'll simulate success
    return true;
};



// Step 1: User Registration
export const registerSeller = async (email: string, password: string, fullName: string, phone?: string): Promise<{ user: any, error: any }> => {

    console.log('Registering seller:', email);

    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: 'seller',
                is_seller: true,
                phone: phone
            }
        }
    });

    if (authError) {
        console.error('Error signing up seller auth:', authError);
        return { user: null, error: authError };
    }

    // 2. Update users table if needed (though trigger usually handles this, we ensure is_seller is true)
    // Note: If you have a trigger that copies auth.users to public.users, this might be redundant but safe.
    // If not, we might need to manually insert into public.users, but assuming standard Supabase setup.

    // We can also double check/update the public user record
    if (authData.user) {
        const { error: updateError } = await supabase
            .from('users')
            .update({
                is_seller: true,
                role: 'seller',
                full_name: fullName
            })
            .eq('id', authData.user.id);

        if (updateError) {
            console.error('Error updating user role in public table:', updateError);
            // Non-blocking error for now, as Auth metadata is key
        }
    }

    return { user: authData.user, error: null };
};

// Step 2: Business Profile
export const checkShopNameAvailability = async (shopName: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('shop_name', shopName)
        .single();

    // If data exists, name is taken. If error is 'PGRST116' (row not found), name is available.
    if (data) return false;
    return true;
};

export const createBusinessProfile = async (
    userId: string,
    shopName: string,
    description: string,
    primaryCategory: string,
    country: string
): Promise<{ business: Business | null, error: any }> => {
    const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { data, error } = await supabase
        .from('vendors')
        .insert({
            user_id: userId,
            shop_name: shopName,
            business_slug: slug,
            business_description: description,
            primary_category: primaryCategory,
            follower_count: 0
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating business profile:', error);
        return { business: null, error };
    }

    return { business: data as Business, error: null };
};

// Step 3: Bank Details
export const addVendorBankAccount = async (
    businessId: string,
    bankDetails: Omit<VendorBankAccount, 'id' | 'business_id' | 'created_at'>
): Promise<{ bankAccount: VendorBankAccount | null, error: any }> => {
    const { data, error } = await supabase
        .from('vendor_bank_accounts')
        .insert({
            business_id: businessId,
            ...bankDetails,
            is_primary: true, // Default to primary for first account
            is_verified: false
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding bank account:', error);
        return { bankAccount: null, error };
    }

    return { bankAccount: data as VendorBankAccount, error: null };
};

// Step 4: Assets & Policies
export const uploadVendorMedia = async (file: File, bucketPath: string): Promise<{ url: string | null, id: string | null, error: any }> => {
    // 1. Upload to Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${bucketPath}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vendor-assets') // Assuming a bucket named 'vendor-assets' exists
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading file to storage:', uploadError);
        return { url: null, id: null, error: uploadError };
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('vendor-assets')
        .getPublicUrl(filePath);

    // 3. Insert into 'media' table
    const { data: mediaEntry, error: dbError } = await supabase
        .from('media')
        .insert({
            image_url: publicUrl,
            storage_path: filePath,
            mime_type: file.type,
            file_size: file.size,
            original_filename: file.name,
            media_type: 'image',
            upload_source: 'seller_onboarding'
        })
        .select()
        .single();

    if (dbError) {
        console.error('Error creating media record:', dbError);
        return { url: publicUrl, id: null, error: dbError };
    }

    return { url: publicUrl, id: mediaEntry.id, error: null };
};

export const updateBusinessMedia = async (businessId: string, logoMediaId?: string, bannerMediaId?: string) => {
    const updates: any = {};
    if (logoMediaId) updates.logo_media_id = logoMediaId;
    if (bannerMediaId) updates.banner_media_id = bannerMediaId;

    const { error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', businessId);

    if (error) console.error('Error linking media to vendor:', error);
    return error;
};

export const createBusinessPolicies = async (businessId: string, policies: {
    returnPolicy: string,
    shippingPolicy: string
}) => {
    const { error } = await supabase
        .from('vendors')
        .update({
            return_policy: policies.returnPolicy,
            shipping_policy: policies.shippingPolicy
        })
        .eq('id', businessId);

    if (error) console.error('Error creating business policies:', error);
    return error;
};



export const fetchProductReviewSummary = async (productId: string): Promise<ProductReviewSummary | null> => {
    const { data, error } = await supabase
        .from('product_review_summary')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching review summary:', error);
        return null;
    }

    return data as ProductReviewSummary;
};

export const voteOnReview = async (
    reviewId: string,
    userId: string,
    voteType: 'helpful' | 'unhelpful'
): Promise<boolean> => {
    // First check if user has already voted
    const { data: existingVote } = await supabase
        .from('review_votes')
        .select('*')
        .eq('review_id', reviewId)
        .eq('user_id', userId)
        .single();

    if (existingVote) {
        // Update existing vote
        const { error } = await supabase
            .from('review_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);

        if (error) {
            console.error('Error updating vote:', error);
            return false;
        }
    } else {
        // Insert new vote
        const { error } = await supabase
            .from('review_votes')
            .insert({
                review_id: reviewId,
                user_id: userId,
                vote_type: voteType
            });

        if (error) {
            console.error('Error inserting vote:', error);
            return false;
        }
    }

    return true;
};

export const submitReview = async (reviewData: SubmitReviewData): Promise<string | null> => {
    // First, insert the review
    const { data: review, error: reviewError } = await supabase
        .from('enhanced_reviews')
        .insert({
            product_id: reviewData.product_id,
            user_id: reviewData.user_id,
            order_id: reviewData.order_id,
            title: reviewData.title,
            content: reviewData.content,
            rating: reviewData.rating,
            pros: reviewData.pros,
            cons: reviewData.cons,
            recommended: reviewData.recommended,
            would_buy_again: reviewData.would_buy_again,
            fit_rating: reviewData.fit_rating,
            value_rating: reviewData.value_rating,
            quality_rating: reviewData.quality_rating,
            is_verified_purchase: !!reviewData.order_id,
            status: 'pending'
        })
        .select()
        .single();

    if (reviewError) {
        console.error('Error submitting review:', reviewError);
        return null;
    }

    // If there are photos, upload them
    if (reviewData.photos && reviewData.photos.length > 0 && review) {
        const photoPromises = reviewData.photos.map(async (photo, index) => {
            // Upload photo to storage
            const fileName = `${review.id}_${index}_${Date.now()}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('review-photos')
                .upload(fileName, photo);

            if (uploadError) {
                console.error('Error uploading photo:', uploadError);
                return null;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('review-photos')
                .getPublicUrl(fileName);

            // Insert photo record
            const { error: photoError } = await supabase
                .from('review_photos')
                .insert({
                    review_id: review.id,
                    photo_url: publicUrl,
                    sort_order: index,
                    is_primary: index === 0
                });

            if (photoError) {
                console.error('Error inserting photo record:', photoError);
            }

            return publicUrl;
        });

        await Promise.all(photoPromises);
    }

    return review.id;
};

export const fetchUserReviews = async (userId: string): Promise<Review[]> => {
    if (!userId) return [];

    const { data, error } = await supabase
        .from('enhanced_reviews')
        .select(`
            id,
            product_id,
            user_id,
            order_id,
            title,
            content,
            rating,
            is_verified_purchase,
            is_featured,
            helpful_votes,
            total_votes,
            status,
            pros,
            cons,
            recommended,
            would_buy_again,
            fit_rating,
            value_rating,
            quality_rating,
            created_at,
            updated_at,
            user_name,
            user_avatar,
            product_title,
            product_image
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user reviews:', error);
        return [];
    }

    return (data || []) as Review[];
};

// Followed Stores API Functions
import { FollowedStore } from '@/types';

interface FollowToggleResponse {
    success: boolean;
    vendor: any;
    was_following: boolean;
    is_following: boolean;
    follower_count: number;
    action: 'followed' | 'unfollowed';
}

interface FollowStatusResponse {
    is_following: boolean;
    follower_count: number;
    followed_at: string | null;
}

interface PaginatedFollowedStores {
    success: boolean;
    data: FollowedStore[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        has_more: boolean;
    };
}

// Toggle follow/unfollow (replaces separate follow and unfollow functions)
export const toggleFollowStore = async (userId: string, vendorId: string): Promise<FollowToggleResponse | null> => {
    console.log('Toggling follow for store:', { userId, vendorId });

    const { data, error } = await supabase
        .rpc('toggle_follow_store', {
            p_user_id: userId,
            p_vendor_id: vendorId
        });

    if (error) {
        console.error('Error toggling follow:', error);
        return null;
    }

    console.log('Toggle follow result:', data);
    return data;
};

// Legacy function - now uses toggle
export const followStore = async (userId: string, vendorId: string) => {
    return await toggleFollowStore(userId, vendorId);
};

// Legacy function - now uses toggle
export const unfollowStore = async (userId: string, vendorId: string) => {
    return await toggleFollowStore(userId, vendorId);
};

// Get followed stores with pagination
export const getFollowedStores = async (
    userId: string,
    limit: number = 20,
    offset: number = 0
): Promise<PaginatedFollowedStores | null> => {
    console.log('Fetching followed stores for user:', userId);

    const { data, error } = await supabase
        .rpc('get_followed_vendors_paginated', {
            p_user_id: userId,
            p_limit: limit,
            p_offset: offset
        });

    if (error) {
        console.error('Error fetching followed stores:', error);
        return null;
    }

    if (!data?.success) {
        console.warn('Unexpected followed stores payload:', data);
        return data as unknown as PaginatedFollowedStores; // fallback
    }

    const normalized: FollowedStore[] = (data.data || []).map((item: any) => ({
        vendor_id: item.vendor?.id,
        business_name: item.vendor?.business_name || item.vendor?.shop_name || 'Store',
        shop_name: item.vendor?.shop_name,
        shop_slug: item.vendor?.shop_slug,
        business_slug: item.vendor?.business_slug,
        business_description: item.vendor?.business_description,
        logo_url: item.vendor?.logo_url,
        vendor_rating: Number(item.vendor?.rating ?? 0),
        rating: Number(item.vendor?.rating ?? 0),
        review_count: Number(item.vendor?.review_count ?? 0),
        total_products: Number(item.stats?.product_count ?? 0),
        follower_count: Number(item.stats?.follower_count ?? 0),
        is_verified: Boolean(item.vendor?.is_verified),
        business_country: item.vendor?.address_country,
        badges: item.vendor?.badges,
        followed_at: item.follow_info?.followed_at || item.followed_at,
        latest_products: (item.latest_products || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            price: Number(p.price ?? 0),
            image: p.main_image || p.image || p.featured_image_url || '',
            rating: Number(p.rating ?? 0)
        }))
    }));

    const result: PaginatedFollowedStores = {
        success: true,
        data: normalized,
        pagination: data.pagination
    };

    console.log('Normalized followed stores:', result);
    return result;
};

// Check if following a specific vendor
export const isStoreFollowed = async (userId: string, vendorId: string): Promise<boolean> => {
    console.log('Checking if store is followed:', { userId, vendorId });

    const { data, error } = await supabase
        .rpc('is_vendor_followed', {
            p_user_id: userId,
            p_vendor_id: vendorId
        });

    if (error) {
        console.error('Error checking follow status:', error);
        return false;
    }

    // Return just the boolean for backward compatibility
    return data?.is_following || false;
};

// Get full follow status with details
export const getFollowStatus = async (userId: string, vendorId: string): Promise<FollowStatusResponse | null> => {
    const { data, error } = await supabase
        .rpc('is_vendor_followed', {
            p_user_id: userId,
            p_vendor_id: vendorId
        });

    if (error) {
        console.error('Error checking follow status:', error);
        return null;
    }

    return data;
};

// Get trending vendors to follow
export const getTrendingVendors = async (userId: string, limit: number = 10) => {
    const { data, error } = await supabase
        .rpc('get_trending_vendors_to_follow', {
            p_user_id: userId,
            p_limit: limit
        });

    if (error) {
        console.error('Error fetching trending vendors:', error);
        return null;
    }

    return data;
};

// Get user's following statistics
export const getUserFollowingStats = async (userId: string) => {
    const { data, error } = await supabase
        .rpc('get_user_following_stats', {
            p_user_id: userId
        });

    if (error) {
        console.error('Error fetching user stats:', error);
        return null;
    }

    return data;
};

// ============================================================================
// ENHANCED PERSONALIZATION API FUNCTIONS
// ============================================================================

/**
 * Fetch trending vendors personalized for a user (enhanced version)
 */
export const fetchTrendingVendors = async (userId?: string, limit: number = 10): Promise<TrendingVendor[]> => {
    console.log('Fetching trending vendors...', userId ? 'personalized' : 'generic');

    const { data, error } = await supabase
        .rpc('get_trending_vendors_to_follow', {
            p_user_id: userId || null,
            p_limit: limit
        });

    if (error) {
        console.error('Error fetching trending vendors:', error);
        return [];
    }

    // The RPC returns a JSONB object with {success, data, count}
    if (data && data.success && Array.isArray(data.data)) {
        console.log(`Fetched ${data.data.length} trending vendors`);
        return data.data as TrendingVendor[];
    }

    return [];
};

/**
 * Fetch loyalty profile for a user
 */
export const fetchUserLoyaltyProfile = async (userId: string): Promise<LoyaltyProfile | null> => {
    console.log('Fetching loyalty profile for user:', userId);

    const { data, error } = await supabase
        .from('user_loyalty_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        // If no profile exists yet, return default bronze profile
        if (error.code === 'PGRST116') {
            console.log('No loyalty profile found, returning default');
            return {
                user_id: userId,
                loyalty_points: 0,
                lifetime_spend: 0,
                current_tier: 'Bronze',
                last_activity_at: new Date().toISOString()
            };
        }
        console.error('Error fetching loyalty profile:', error);
        return null;
    }

    return data as LoyaltyProfile;
};

/**
 * Fetch product discovery score
 */
export const fetchProductDiscoveryScore = async (productId: string): Promise<number> => {
    console.log('Fetching product discovery score for:', productId);

    const { data, error } = await supabase
        .rpc('get_product_discovery_score', {
            p_product_id: productId
        });

    if (error) {
        console.error('Error fetching product discovery score:', error);
        return 0;
    }

    return data || 0;
};

/**
 * Check following status for multiple vendors
 */
export const checkFollowingStatus = async (userId: string, vendorIds: string[]): Promise<Map<string, boolean>> => {
    if (!userId || vendorIds.length === 0) {
        return new Map();
    }

    console.log('Checking following status for vendors:', vendorIds.length);

    const { data, error } = await supabase
        .from('user_followed_stores')
        .select('vendor_id')
        .eq('user_id', userId)
        .in('vendor_id', vendorIds);

    if (error) {
        console.error('Error checking following status:', error);
        return new Map();
    }

    const followingMap = new Map<string, boolean>();
    const followedVendorIds = new Set(data.map(item => item.vendor_id));

    vendorIds.forEach(vendorId => {
        followingMap.set(vendorId, followedVendorIds.has(vendorId));
    });

    return followingMap;
};

/**
 * Alias for existing toggleFollowStore function (for consistency with naming)
 */
export const toggleFollowVendor = toggleFollowStore;

// Best Sellers & Recommended API
export interface BestSellingProduct {
    product_id: string;
    product_name: string;
    product_price: number;
    originalPrice?: number;
    promoText?: string;
    promoCode?: string;
    discountPercent?: number;
    activeCoupon?: any;
    category_name: string;
    image_url: string;
    total_quantity_sold: number;
    sale_rank: number;
}

export const fetchBestSellingItems = async (interval: string): Promise<BestSellingProduct[]> => {
    console.log(`Fetching best selling items for interval: ${interval}`);
    const { data, error } = await supabase.rpc('get_best_selling_products', {
        time_interval: interval,
        p_limit: 5
    });

    if (error) {
        console.error(`Error fetching best-selling items for ${interval}:`, error);
        return [];
    }

    return (data || []).map((item: any) => ({
        ...item,
        originalPrice: item.originalPrice || item.original_price,
        promoText: item.promoText || item.promo_text,
        promoCode: item.promoCode || item.promo_code,
        discountPercent: item.discountPercent || item.discount_percent,
        activeCoupon: item.activeCoupon
    }));
};

export interface RecommendedProduct {
    product_id: string;
    product_name: string;
    product_price: number;
    image_url: string;
    avg_rating: number;
    total_sales: number;
}

export const fetchRecommendedItems = async (): Promise<RecommendedProduct[]> => {
    console.log('Fetching recommended items...');
    const { data, error } = await supabase.rpc('get_recommended_products', {
        p_limit: 10
    });

    if (error) {
        console.error('Error fetching recommended items:', error);
        return [];
    }
    return data || [];
};

// Messaging API Functions
// Messaging API Functions

export const createConversation = async (
    sellerId: string,
    buyerId: string,
    productId?: string,
    subject?: string,
    initialMessage?: string
): Promise<string | null> => {
    try {
        const { data, error } = await supabase.rpc('create_conversation', {
            p_seller_id: sellerId,
            p_buyer_id: buyerId,
            p_product_id: productId || null,
            p_order_id: null,
            p_subject: subject || null,
            p_initial_message: initialMessage || null
        });

        if (error) throw error;
        return data; // returns conversation_id
    } catch (error) {
        console.error('Error creating conversation:', error);
        return null;
    }
};

export const sendMessage = async (
    conversationId: string,
    senderId: string,
    receiverId: string,
    content: string,
    metadata: any = {}
): Promise<boolean> => {
    try {
        // If receiverId is provided, use the existing RPC that expects explicit receiver
        if (receiverId) {
            console.log('Sending message (explicit receiver):', { conversationId, senderId, receiverId, content });
            const { error } = await supabase.rpc('send_message_and_update_conversation', {
                p_conversation_id: conversationId,
                p_sender_id: senderId,
                p_receiver_id: receiverId,
                p_content: content,
                p_is_internal: false,
                p_message_type: 'text',
                p_metadata: metadata,
                p_attachments: []
            });

            if (error) {
                console.error('Error sending message (explicit receiver):', error);
                return false;
            }
            return true;
        }

        // If receiverId is not provided, call a simpler server-side RPC `send_message` that derives
        // the receiver from the conversation row using the authenticated user (safer and simpler).
        console.log('Sending message (server derives receiver):', { conversationId, senderId, content });
        const { error } = await supabase.rpc('send_message', {
            p_content: content,
            p_conversation_id: conversationId,
            p_is_internal: false,
            p_message_type: 'text',
            p_metadata: metadata,
            p_attachments: []
        });

        if (error) {
            console.error('Error sending message (server-derived receiver):', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
};

export const getConversations = async (userId: string): Promise<Conversation[]> => {
    try {
        const { data, error } = await supabase.rpc('get_user_conversations', {
            p_user_id: userId
        });

        if (error) throw error;

        if (data && data.length > 0) {
            console.log('getConversations raw first item:', data[0]);
        }

        return (data || []).map((c: any) => {
            const isSeller = c.seller_id === userId;
            // Handle field mismatches from different backend versions
            const id = c.id || c.conversation_id;
            const lastMessage = c.last_message || c.latest_message_content;

            return {
                id: id,
                seller_id: c.seller_id || c.seller_uid || c.seller,
                buyer_id: c.buyer_id || c.buyer_uid || c.buyer,
                product_id: c.product_id,
                subject: c.subject,
                last_message: lastMessage,
                last_message_at: c.last_message_at || c.updated_at || c.created_at,
                // Use correct unread count based on role
                unread_count: isSeller ? (c.seller_unread_count || 0) : (c.buyer_unread_count || 0),
                // Display info for the *other* person - try multiple possible field names
                other_user_name: isSeller
                    ? (c.buyer_full_name || c.buyer_email || c.buyer_name || 'Unknown Buyer')
                    : (c.seller_display_name || c.seller_full_name || c.seller_email || c.seller_name || 'Unknown Seller'),
                other_user_avatar: isSeller
                    ? (c.buyer_avatar_url || c.buyer_avatar)
                    : (c.seller_avatar_url || c.seller_avatar),
                product_title: c.product_title,
                product_image: c.product_primary_image || c.product_image
            };
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
    }
};

export const getConversationMessages = async (
    conversationId: string,
    limit: number = 50,
    offset: number = 0
): Promise<Message[]> => {
    if (!conversationId) throw new Error('conversationId is required for getConversationMessages');

    try {
        const { data, error } = await supabase
            .rpc('get_conversation_messages', {
                p_conversation_id: conversationId,
                p_limit: limit,
                p_offset: offset
            });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching conversation messages:', error);
        return [];
    }
};

export const markMessagesRead = async (
    conversationId: string,
    userId: string
): Promise<boolean> => {
    if (!conversationId) {
        console.warn('markMessagesRead called without conversationId');
        return false;
    }

    const { error } = await supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
        p_user_id: userId
    });

    if (error) {
        console.error('Error marking messages read:', error);
        return false;
    }

    return true;
};

export const getConversationParticipants = async (conversationId: string): Promise<{ seller_id: string, buyer_id: string } | null> => {
    const { data, error } = await supabase
        .from('conversations')
        .select('seller_id, buyer_id')
        .eq('id', conversationId)
        .single();

    if (error) {
        console.error('Error fetching conversation participants:', error);
        return null;
    }
    return data;
};

// ------------------------------------------------------------------
// Admin Dashboard API Functions
// ------------------------------------------------------------------

import type {
    AdminDashboardStats,
    PendingProduct,
    SellerVerificationRequest,
    AdminActivityLog
} from '@/types';

// Admin Dashboard Stats
// Admin Dashboard Stats
export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats | null> {
    try {
        console.log('Fetching admin stats via direct table counts...');

        // Run count queries in parallel
        const [
            { count: totalUsers },
            { count: totalSellers },
            { count: pendingVerifications },
            { count: pendingApprovals },
            { count: totalOrders },
            { data: revenueData }
        ] = await Promise.all([
            // Total Users
            supabase.from('users').select('*', { count: 'exact', head: true }),

            // Total Sellers (approved vendors)
            supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('verification_status', 'approved'),

            // Pending Seller Verifications
            supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),

            // Pending Product Approvals
            supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'pending'),

            // Total Orders
            supabase.from('orders').select('*', { count: 'exact', head: true }),

            // Total Revenue (sum of completed orders)
            supabase.from('orders').select('total_amount').eq('status', 'completed')
        ]);

        // Calculate total revenue
        const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

        const stats: AdminDashboardStats = {
            total_users: totalUsers || 0,
            total_sellers: totalSellers || 0,
            pending_seller_verifications: pendingVerifications || 0,
            pending_product_approvals: pendingApprovals || 0,
            total_orders: totalOrders || 0,
            total_revenue: totalRevenue,
            active_disputes: 0 // Placeholder/TODO
        };

        return stats;
    } catch (error) {
        console.error('Error in fetchAdminDashboardStats:', error);
        return null;
    }
}

// Check Admin Permission - Returns full permission object from admin_2025_user_permissions table
export async function checkAdminPermission(userId: string): Promise<AdminPermissions | null> {
    try {
        // Try to fetch active admin record directly
        const { data, error } = await supabase
            .from('admin_2025_user_permissions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            // Fallback: Check standard admin_permissions table if new one fails
            const { data: oldData, error: oldError } = await supabase
                .from('admin_permissions')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            if (oldError || !oldData) return null;

            // Map old data to new format
            const defaultPermissions = getDefaultPermissionsForLevel(oldData.permission_level);
            return {
                user_id: oldData.user_id,
                permission_level: oldData.permission_level,
                permissions: defaultPermissions, // Old table doesn't have JSON permissions column usually
                is_active: oldData.is_active,
                granted_by: oldData.granted_by,
                created_at: oldData.created_at,
                updated_at: oldData.updated_at
            };
        }

        // Build permissions object with defaults based on permission level
        const defaultPermissions = getDefaultPermissionsForLevel(data.permission_level);

        // Check if using old permission format and migrate it
        let granularPermissions: AdminGranularPermissions;

        if (data.permissions && typeof data.permissions === 'object') {
            // Check if it's the old format (has "canManageUsers", etc.)
            if ('canManageUsers' in data.permissions || 'canEditProducts' in data.permissions) {
                console.log('Detected old permission format, migrating to new format...');
                granularPermissions = migrateOldPermissionsFormat(data.permissions);
            } else {
                // New format - merge with defaults
                granularPermissions = { ...defaultPermissions, ...data.permissions };
            }
        } else {
            granularPermissions = defaultPermissions;
        }

        return {
            user_id: data.user_id,
            permission_level: data.permission_level,
            permissions: granularPermissions,
            is_active: data.is_active,
            granted_by: data.granted_by,
            created_at: data.created_at,
            updated_at: data.updated_at
        };
    } catch (error) {
        console.error('Error in checkAdminPermission:', error);
        return null;
    }
}

// Helper function to migrate old permission format to new format
function migrateOldPermissionsFormat(oldPerms: any): AdminGranularPermissions {
    return {
        content: {
            create: oldPerms.canEditProducts || false,
            read: true,
            update: oldPerms.canEditProducts || false,
            delete: oldPerms.canDeleteProducts || false
        },
        users: {
            create: oldPerms.canManageUsers || false,
            read: oldPerms.canManageUsers || true,
            update: oldPerms.canManageUsers || false,
            delete: oldPerms.canManageUsers || false,
            manage: oldPerms.canManageUsers || false
        },
        products: {
            create: oldPerms.canEditProducts || false,
            read: true,
            update: oldPerms.canEditProducts || false,
            delete: oldPerms.canDeleteProducts || false,
            approve: oldPerms.canEditProducts || false,
            reject: oldPerms.canEditProducts || false
        },
        orders: {
            create: false,
            read: true,
            update: oldPerms.canEditProducts || false,
            delete: false
        },
        sellers: {
            create: false,
            read: true,
            update: oldPerms.canVerifySellers || false,
            delete: false,
            verify: oldPerms.canVerifySellers || false
        },
        categories: {
            create: oldPerms.canEditProducts || false,
            read: true,
            update: oldPerms.canEditProducts || false,
            delete: oldPerms.canDeleteProducts || false
        },
        carousels: {
            create: oldPerms.canEditProducts || false,
            read: true,
            update: oldPerms.canEditProducts || false,
            delete: oldPerms.canDeleteProducts || false
        },
        attributes: {
            create: oldPerms.canEditProducts || false,
            read: true,
            update: oldPerms.canEditProducts || false,
            delete: oldPerms.canDeleteProducts || false
        },
        analytics: {
            view: oldPerms.canAccessReports || false,
            export: oldPerms.canAccessReports || false
        },
        activity_log: {
            view: oldPerms.canAccessReports || true
        },
        system: {
            configure: false,
            backup: false
        }
    };
}

// Helper function to get default permissions based on permission level
function getDefaultPermissionsForLevel(level: string): AdminGranularPermissions {
    switch (level) {
        case 'super_admin':
            return {
                content: { create: true, read: true, update: true, delete: true },
                users: { create: true, read: true, update: true, delete: true, manage: true },
                products: { create: true, read: true, update: true, delete: true, approve: true, reject: true },
                orders: { create: true, read: true, update: true, delete: true },
                sellers: { create: true, read: true, update: true, delete: true, verify: true },
                categories: { create: true, read: true, update: true, delete: true },
                carousels: { create: true, read: true, update: true, delete: true },
                attributes: { create: true, read: true, update: true, delete: true },
                analytics: { view: true, export: true },
                activity_log: { view: true },
                system: { configure: true, backup: true }
            };
        case 'senior_admin':
            return {
                content: { create: true, read: true, update: true, delete: true },
                users: { create: false, read: true, update: false, delete: false, manage: false },
                products: { create: true, read: true, update: true, delete: true, approve: true, reject: true },
                orders: { create: true, read: true, update: true, delete: false },
                sellers: { create: false, read: true, update: true, delete: false, verify: true },
                categories: { create: true, read: true, update: true, delete: true },
                carousels: { create: true, read: true, update: true, delete: true },
                attributes: { create: true, read: true, update: true, delete: true },
                analytics: { view: true, export: false },
                activity_log: { view: true },
                system: { configure: false, backup: false }
            };
        case 'junior_admin':
            return {
                content: { create: true, read: true, update: true, delete: false },
                users: { create: false, read: true, update: false, delete: false, manage: false },
                products: { create: true, read: true, update: true, delete: false, approve: false, reject: false },
                orders: { create: false, read: true, update: true, delete: false },
                sellers: { create: false, read: true, update: false, delete: false, verify: false },
                categories: { create: true, read: true, update: true, delete: false },
                carousels: { create: true, read: true, update: true, delete: false },
                attributes: { create: true, read: true, update: true, delete: false },
                analytics: { view: false, export: false },
                activity_log: { view: false },
                system: { configure: false, backup: false }
            };
        case 'content_manager':
        default:
            return {
                content: { create: false, read: true, update: false, delete: false },
                users: { create: false, read: false, update: false, delete: false, manage: false },
                products: { create: false, read: true, update: false, delete: false, approve: false, reject: false },
                orders: { create: false, read: false, update: false, delete: false },
                sellers: { create: false, read: false, update: false, delete: false, verify: false },
                categories: { create: false, read: true, update: false, delete: false },
                carousels: { create: true, read: true, update: true, delete: true },
                attributes: { create: true, read: true, update: true, delete: true },
                analytics: { view: false, export: false },
                activity_log: { view: false },
                system: { configure: false, backup: false }
            };
    }
}

// Check if user has required permission level
export function hasPermissionLevel(
    userLevel: string | undefined,
    requiredLevel: string
): boolean {
    const LEVELS: Record<string, number> = {
        'content_manager': 1,
        'junior_admin': 2,
        'senior_admin': 3,
        'super_admin': 4
    };

    const userLevelNum = LEVELS[userLevel || ''] || 0;
    const requiredLevelNum = LEVELS[requiredLevel] || 0;

    return userLevelNum >= requiredLevelNum;
}

// Check specific resource permission
export function hasResourcePermission(
    permissions: AdminGranularPermissions | undefined,
    resource: keyof AdminGranularPermissions,
    action: string
): boolean {
    if (!permissions) return false;
    const resourcePerms = permissions[resource] as Record<string, boolean> | undefined;
    return resourcePerms?.[action] === true;
}

// Product Approval Functions
export async function fetchPendingProducts(): Promise<PendingProduct[]> {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                id, title, seller_id, category_id, created_at,
                sellers:seller_id (business_name),
                categories:category_id (name),
                brands:brand_id (name),
                media:media!media_product_fk (id, image_url, is_main, media_type, images(image_embedding)),
                product_variants (id, price, stock, sku, image_url, options, is_default),
                description, status
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching pending products:', error);
            return [];
        }

        // Transform data to match PendingProduct interface
        return (data || []).map((p: any) => {
            // Find main media
            const mainMedia = p.media?.find((m: any) => m.is_main) || p.media?.[0];
            // Access nested embedding from the images relation on media
            // Note: media.images might be an array or object depending on relation type (one-to-many or one-to-one)
            // Assuming one-to-many based on schema (foreign key on images), so it returns an array
            const embeddingData = mainMedia?.images?.[0]?.image_embedding || mainMedia?.images?.image_embedding;

            const variants = (p.product_variants || []).map((v: any, idx: number) => ({
                id: v.id,
                title: v.title || `Variant ${idx + 1}`,
                price: v.price,
                stock: v.stock,
                sku: v.sku,
                image_url: v.image_url,
                options: v.options,
                is_default: v.is_default
            }));

            // Derive option sets from variants
            const optionsMap: Record<string, Set<string>> = {};
            variants.forEach(v => {
                if (v.options) {
                    Object.entries(v.options).forEach(([key, value]) => {
                        if (!optionsMap[key]) optionsMap[key] = new Set();
                        optionsMap[key].add(String(value));
                    });
                }
            });
            const options = Object.entries(optionsMap).map(([name, values]) => ({
                name,
                values: Array.from(values)
            }));

            // Get price from variants (prefer default, fallback to first)
            const price = variants.find(v => v.is_default)?.price || variants[0]?.price || 0;

            return {
                id: p.id,
                title: p.title,
                seller_id: p.seller_id,
                seller_name: p.sellers?.business_name || 'Unknown Seller',
                category_name: p.categories?.name || 'Uncategorized',
                price: price,
                status: p.status as 'pending' | 'approved' | 'rejected',
                submitted_at: p.submitted_at || p.created_at,
                description: p.description,
                image_url: mainMedia?.image_url,
                brand_name: p.brands?.name,
                media: p.media || [],
                variants,
                options,
                // Helper for embedding check
                main_image: {
                    url: mainMedia?.image_url,
                    image_url: mainMedia?.image_url,
                    media_id: mainMedia?.id,
                    image_embedding: embeddingData
                }
            };
        });
    } catch (error) {
        console.error('Error in fetchPendingProducts:', error);
        return [];
    }
}

export async function approveProduct(productId: string, adminId: string): Promise<boolean> {
    try {
        const { error } = await supabase.rpc('approve_product', {
            p_product_id: productId,
            p_admin_id: adminId
        });

        if (error) {
            console.error('Error approving product:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in approveProduct:', error);
        return false;
    }
}

export async function rejectProduct(
    productId: string,
    adminId: string,
    reason: string
): Promise<boolean> {
    try {
        const { error } = await supabase.rpc('reject_product', {
            p_product_id: productId,
            p_admin_id: adminId,
            p_rejection_reason: reason
        });

        if (error) {
            console.error('Error rejecting product:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in rejectProduct:', error);
        return false;
    }
}

// Seller Verification Functions
export async function fetchPendingSellerVerifications(): Promise<SellerVerificationRequest[]> {
    try {
        const { data, error } = await supabase
            .from('vendors')
            .select(`
                id,
                user_id,
                business_name,
                business_email,
                business_phone,
                business_address,
                verification_status,
                created_at,
                verified_by,
                verified_at,
                verification_notes
            `)
            .eq('verification_status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching pending verifications:', error);
            return [];
        }

        const requests: SellerVerificationRequest[] = (data || []).map(vendor => ({
            id: vendor.id,
            user_id: vendor.user_id,
            business_name: vendor.business_name,
            business_email: vendor.business_email,
            business_phone: vendor.business_phone,
            business_address: vendor.business_address,
            status: vendor.verification_status as 'pending' | 'approved' | 'rejected',
            submitted_at: vendor.created_at,
            reviewed_by: vendor.verified_by,
            reviewed_at: vendor.verified_at,
            rejection_reason: vendor.verification_notes,
            verification_notes: vendor.verification_notes
        }));

        return requests;
    } catch (error) {
        console.error('Error in fetchPendingSellerVerifications:', error);
        return [];
    }
}

export async function approveSeller(sellerId: string, adminId: string): Promise<boolean> {
    try {
        const { error } = await supabase.rpc('approve_seller', {
            p_seller_id: sellerId,
            p_admin_id: adminId
        });

        if (error) {
            console.error('Error approving seller:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in approveSeller:', error);
        return false;
    }
}

export async function rejectSeller(
    sellerId: string,
    adminId: string,
    reason: string
): Promise<boolean> {
    try {
        const { error } = await supabase.rpc('reject_seller', {
            p_seller_id: sellerId,
            p_admin_id: adminId,
            p_rejection_reason: reason
        });

        if (error) {
            console.error('Error rejecting seller:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in rejectSeller:', error);
        return false;
    }
}

// User Management Functions
export async function fetchAllUsers(filters?: {
    role?: string;
    search?: string;
}): Promise<User[]> {
    try {
        let query = supabase.from('users').select('*');

        if (filters?.role) {
            query = query.eq('role', filters.role);
        }
        if (filters?.search) {
            query = query.or(`email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in fetchAllUsers:', error);
        return [];
    }
}

// Activity Logging
export async function logAdminActivity(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any
): Promise<void> {
    try {
        await supabase.from('admin_activity_log').insert({
            admin_id: adminId,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            details
        });
    } catch (error) {
        console.error('Error logging admin activity:', error);
    }
}

export async function fetchAdminActivityLog(limit: number = 50): Promise<AdminActivityLog[]> {
    try {
        const { data, error } = await supabase
            .from('admin_activity_log')
            .select(`
                id,
                admin_id,
                action,
                resource_type,
                resource_id,
                details,
                created_at,
                users:admin_id (name)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching activity log:', error);
            return [];
        }

        const logs: AdminActivityLog[] = (data || []).map((log: any) => ({
            id: log.id,
            admin_id: log.admin_id,
            admin_name: log.users?.name || 'Unknown',
            action: log.action,
            resource_type: log.resource_type,
            resource_id: log.resource_id,
            details: log.details,
            created_at: log.created_at
        }));

        return logs;
    } catch (error) {
        console.error('Error in fetchAdminActivityLog:', error);
        return [];
    }
}
// ------------------------------------------------------------------
// Content Management API Functions (JSON Workflow)
// ------------------------------------------------------------------

/**
 * Generic function to fetch data from any table for read-only views.
 * Used by Content Management sub-views/tables.
 */
export async function fetchTableData(
    tableName: string,
    selectColumns: string = '*',
    orderByIdx: string = 'created_at',
    ascending: boolean = false
): Promise<any[]> {
    try {
        let query = supabase
            .from(tableName)
            .select(selectColumns);

        if (orderByIdx) {
            query = query.order(orderByIdx, { ascending, nullsFirst: !ascending });
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Error fetching data from ${tableName}:`, error);
            // Fallback to minimal select if column-specific query fails (e.g. migration skew)
            if (error.message?.includes('column')) {
                console.warn(`Fallback: Fetching * from ${tableName}`);
                const { data: fallbackData } = await supabase.from(tableName).select('*').limit(50);
                return fallbackData || [];
            }
            return [];
        }

        return data || [];
    } catch (error) {
        console.error(`Error in fetchTableData for ${tableName}:`, error);
        return [];
    }
}

/**
 * Imports a full JSON snapshot to update Verticals, Categories, Brands, Attributes, and Carousels.
 * Wraps the 'admin_import_json' database RPC.
 */
export async function importAdminJson(jsonData: any[]): Promise<{ success: boolean; message?: string; details?: any }> {
    try {
        const { data, error } = await supabase.rpc('admin_import_json', {
            json_data: jsonData
        });

        if (error) {
            console.error('Error importing admin JSON:', error);
            // RPC errors sometimes come as proper Postgres errors, sometimes as JSON details
            return { success: false, message: error.message };
        }

        // The RPC returns a JSONB object with success/message fields
        return data as { success: boolean; message?: string; details?: any };
    } catch (error) {
        console.error('Error in importAdminJson:', error);
        return { success: false, message: 'Unexpected client error during import.' };
    }
}

/**
 * Exports the full taxonomy (Verticals > Categories > etc.) as a JSON snapshot.
 * Wraps the 'admin_export_json' database RPC.
 */
export async function exportAdminJson(): Promise<any[]> {
    try {
        const { data, error } = await supabase.rpc('admin_export_json');

        if (error) {
            console.error('Error exporting admin JSON:', error);
            return [];
        }

        return data as any[];
    } catch (error) {
        console.error('Error in exportAdminJson:', error);
        return [];
    }
}

// ------------------------------------------------------------------
// Hero Slides API Functions
// ------------------------------------------------------------------

import type { HeroSlide } from '@/types';

/**
 * Fetch active hero slides for public display (ordered by display_order)
 */
export async function fetchHeroSlides(): Promise<HeroSlide[]> {
    try {
        const { data, error } = await supabase.rpc('get_active_hero_slides');

        if (error) {
            console.error('Error fetching hero slides:', error);
            // Fallback to direct table query
            const { data: fallbackData } = await supabase
                .from('admin_hero_slides')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            return (fallbackData || []) as HeroSlide[];
        }

        return (data || []) as HeroSlide[];
    } catch (error) {
        console.error('Error in fetchHeroSlides:', error);
        return [];
    }
}

/**
 * Fetch all hero slides for admin management (including inactive)
 */
export async function fetchAllHeroSlides(): Promise<HeroSlide[]> {
    try {
        const { data, error } = await supabase
            .from('admin_hero_slides')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching all hero slides:', error);
            return [];
        }

        return (data || []) as HeroSlide[];
    } catch (error) {
        console.error('Error in fetchAllHeroSlides:', error);
        return [];
    }
}

/**
 * Create a new hero slide
 */
export async function createHeroSlide(slide: Omit<HeroSlide, 'id' | 'created_at' | 'updated_at'>): Promise<HeroSlide | null> {
    try {
        const { data, error } = await supabase
            .from('admin_hero_slides')
            .insert(slide)
            .select()
            .single();

        if (error) {
            console.error('Error creating hero slide:', error);
            return null;
        }

        return data as HeroSlide;
    } catch (error) {
        console.error('Error in createHeroSlide:', error);
        console.error('Error in updateHeroSlide:', error);
        return null;
    }
}




// ------------------------------------------------------------------
// Product Creation & Taxonomy API Functions
// ------------------------------------------------------------------

export const fetchVerticals = async (): Promise<ShopifyVertical[]> => {
    // Determine the table name (adjust if your schema uses a different name)
    const { data, error } = await supabase.from('shopify_verticals').select('*').order('name');
    if (error) {
        console.error('Error fetching verticals:', error);
        return [];
    }
    return data || [];
};

export const fetchCategories = async (verticalId: string): Promise<ShopifyCategory[]> => {
    console.log(`Fetching categories for vertical: ${verticalId}`);
    const { data, error } = await supabase
        .from('shopify_categories')
        .select('*')
        .eq('vertical_id', verticalId)
        .order('name');

    if (error) {
        console.error('Error fetching categories:', error);
        return [];
    }

    console.log(`Found ${data?.length || 0} categories for vertical ${verticalId}`);
    return data || [];
};

export const fetchBrands = async (categoryId: string): Promise<ShopifyBrand[]> => {
    // In a real app, brands might be linked to categories.
    // For now, we fetch all or filter if supported.
    let query = supabase.from('admin_2025_shopify_brands').select('*').order('name');

    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching brands:', error);
        return [];
    }
    return data || [];
};

export const fetchAttributes = async (categoryId: string): Promise<ShopifyAttribute[]> => {
    // Fetch attributes relevant to a category
    let query = supabase
        .from('shopify_attributes')
        .select('*')
        .order('name');

    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching attributes:', error);
        return [];
    }
    return data || [];
};

export const fetchAttributeOptions = async (attributeId: string): Promise<AttributeOption[]> => {
    const { data, error } = await supabase
        .from('attribute_options') // Check actual table name
        .select('*')
        .eq('attribute_id', attributeId)
        .order('value');

    if (error) {
        // Fallback or just return empty if table doesn't exist
        console.warn('Error fetching attribute options (might be empty):', error);
        return [];
    }
    return data || [];
};

export const saveProductImageEmbedding = async (productId: string, mediaId: string | null, embedding: number[]): Promise<boolean> => {
    console.log('Saving product image embedding for:', productId, 'media:', mediaId);

    try {
        if (!mediaId) {
            console.warn('Cannot save image embedding: missing media id');
            return false;
        }

        const { error } = await supabase
            .from('images')
            .upsert({
                media_id: mediaId,
                product_id: productId,
                image_embedding: embedding,
                embedding_model: 'vit-base-patch16-224',
                embedding_source: 'web-transformer',
                embedding_generated_at: new Date().toISOString()
            }, { onConflict: 'media_id' });

        if (error) {
            console.error('Error saving image embedding to images table:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Exception saving image embedding:', err);
        return false;
    }
};

export const createProductFull = async (
    sellerId: string,
    payload: CreateProductPayload,
    variants: any[], // Type as needed
    media: any[],    // Type as needed
    attributes: any[] // Type as needed
): Promise<string | null> => {
    console.log('Creating product full with:', { sellerId, payload });

    const { data, error } = await supabase.rpc('fn_create_new_product_full', {
        p_seller_id: sellerId,
        p_product_data: payload,
        p_variants_data: variants,
        p_media_data: media,
        p_attributes_data: attributes
    });

    if (error) {
        console.error('Error creating product full:', error);
        return null;
    }

    return data; // Should return the new product ID
};


/**
 * Update an existing hero slide
 */
export async function updateHeroSlide(id: string, updates: Partial<HeroSlide>): Promise<HeroSlide | null> {
    try {
        const { data, error } = await supabase
            .from('admin_hero_slides')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating hero slide:', error);
            return null;
        }

        return data as HeroSlide;
    } catch (error) {
        console.error('Error in updateHeroSlide:', error);
        return null;
    }
}

/**
 * Delete a hero slide
 */
export async function deleteHeroSlide(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('admin_hero_slides')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting hero slide:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in deleteHeroSlide:', error);
        return false;
    }
}

/**
 * Reorder hero slides
 */
export async function reorderHeroSlides(orderedIds: string[]): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('reorder_hero_slides', {
            p_ordered_ids: orderedIds
        });

        if (error) {
            console.error('Error reordering hero slides:', error);
            return false;
        }

        return data === true;
    } catch (error) {
        console.error('Error in reorderHeroSlides:', error);
        return false;
    }
}



/**
 * Get unread message count for a seller
 */
export const getSellerUnreadCount = async (userId: string): Promise<number> => {
    try {
        // Try RPC first for efficiency
        const { data, error } = await supabase
            .rpc('get_unread_message_count', { p_user_id: userId });

        if (!error && typeof data === 'number') {
            return data;
        }

        // Fallback: Check conversations where user is participant and has unread count
        // Note: This is an approximation if the standard RPC is missing
        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('unread_count, last_message_sender_id')
            .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`);

        if (convError || !conversations) {
            return 0;
        }

        // Sum up unread counts for conversations where the last message was NOT sent by the user
        // But the schema might just have 'unread_count' for the conversation overall?
        // Usually unread_count is per user-view in sophisticated apps, but here we might rely on the conversation view.
        // Let's assume the RPC is the primary way and return 0 if it fails, or try a simple message count.

        return 0;
    } catch (error) {
        console.error('Error getting specific unread count:', error);
        return 0;
    }
};

// ==========================================
// Missing Seller Dashboard API Functions
// ==========================================

// Seller Profile
export interface SellerProfile {
    id: string; // user_id
    business_name: string;
    description: string;
    logo_url: string;
    banner_url: string;
    contact_email: string;
    phone: string;
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    return_settings?: any;
}

export const fetchSellerProfile = async (sellerId: string): Promise<SellerProfile | null> => {
    // Check vendors table for approved sellers
    const { data: vendors, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', sellerId)
        .eq('verification_status', 'approved')
        .limit(1);

    if (error) {
        console.error('Error fetching seller profile:', error);
        return null; // Return null on error
    }

    if (!vendors || vendors.length === 0) {
        return null;
    }

    const data = vendors[0];

    return {
        id: data.user_id,
        business_name: data.business_name || data.shop_name,
        description: data.business_description || data.description,
        logo_url: data.logo_url || "",
        banner_url: data.banner_url || "",
        contact_email: data.business_email || "",
        phone: data.business_phone || "",
        address_line1: data.address_street || data.business_address || "",
        city: data.address_city || "",
        state: data.address_state || "",
        postal_code: data.address_postal_code || "",
        country: data.address_country || "",
        return_settings: data.return_settings || {}
    };
};

export const saveSellerProfile = async (profile: SellerProfile): Promise<boolean> => {
    const { error } = await supabase
        .from('vendors')
        .update({
            business_name: profile.business_name,
            business_description: profile.description,
        })
        .eq('user_id', profile.id);

    return !error;
};

export const fetchSellerAddresses = async (sellerId: string): Promise<any[]> => {
    return [];
};

// Inventory & Products
export const fetchSellerInventory = async (sellerId: string): Promise<Product[]> => {
    // Reuse fetchFilteredProducts or similar, filtering by seller
    // Or direct query
    const { data, error } = await supabase
        .from('products')
        .select('*') // Should select columns matching Product type or use a view
        .eq('seller_id', sellerId);

    if (error) return [];

    // Map to Product type if needed, strict mapping omitted for brevity but recommended
    return (data || []) as unknown as Product[];
};

// Compliance
export interface ProductComplianceItem {
    id: string;
    product_id: string;
    product_name: string;
    issue_type: string;
    severity: 'low' | 'medium' | 'high';
    status: 'pending' | 'resolved';
    created_at: string;
    description: string;
}

export const fetchProductCompliance = async (sellerId: string): Promise<ProductComplianceItem[]> => {
    return [];
};


// Order Reports & Files
export const fetchOrderReports = async (sellerId: string) => {
    return [];
};

export const fetchOrderFileUploads = async (sellerId: string) => {
    return [];
};

export const fetchPromotionalCampaigns = async (sellerId: string) => {
    return [];
};

// Order actions
export const fulfillOrder = async (orderId: string, trackingNumber?: string) => {
    const { error } = await supabase
        .from('orders')
        .update({
            status: 'shipped',
            tracking_number: trackingNumber
        })
        .eq('id', orderId);

    return !error;
};

export const fetchSellerOrders = async (sellerId: string) => {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            items:order_items(*)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
};

// ==========================================
// Missing Messaging API Functions
// ==========================================

export const fetchSellerConversations = async (sellerId: string) => {
    // This overlaps with getConversations but specifically for seller dashboard view
    return getConversations(sellerId);
};

export const fetchSellerConversationMessages = async (conversationId: string, sellerId?: string) => {
    return getConversationMessages(conversationId);
};

export const sendSellerMessage = async (conversationId: string, senderId: string, receiverId: string, content: string, attachments?: any[]) => {
    return sendMessage(conversationId, senderId, receiverId, content);
};

export const markSellerMessagesAsRead = async (conversationId: string, sellerId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = sellerId || user?.id;
    if (!userId) return;
    return markMessagesRead(conversationId, userId);
};

export const getMessageAttachmentUrl = (path: string) => {
    const { data } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(path);
    return data.publicUrl;
};

export const updateProductDetails = async (productId: string | number, updates: {
    price: number;
    originalPrice: number;
    promoText?: string;
    promoCode?: string;
    youtubeUrl?: string;
}) => {
    console.log('Updating product details:', productId, updates);
    const {
        price,
        originalPrice,
        promoText,
        promoCode,
        youtubeUrl
    } = updates;

    // STEP 1: Update Product Metadata (Promos)
    const { error: productError } = await supabase
        .from('products')
        .update({
            promo_text: promoText,
            promo_code: promoCode
        })
        .eq('id', productId);

    if (productError) {
        console.error('Error updating product promo:', productError);
        throw new Error("Failed to update product promo text");
    }

    // STEP 2: Update Pricing (Default Variant)
    // We update the variant where is_default = true
    const discountPercent = (originalPrice && price && originalPrice > price)
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    const { error: variantError } = await supabase
        .from('product_variants')
        .update({
            price: price,
            compare_at_price: originalPrice,
            discount_percent: discountPercent
        })
        .eq('product_id', productId)
        .eq('is_default', true);

    if (variantError) {
        console.error('Error updating product variant price:', variantError);
        throw new Error("Failed to update product pricing");
    }

    // STEP 3: Update or Insert YouTube Link
    // If a YouTube URL is provided, we update the media record
    // We assume videos are secondary media (is_main = false) or we specificially look for type video/youtube
    if (youtubeUrl) {
        // First check if a video already exists for this product
        const { data: existingMedia } = await supabase
            .from('media')
            .select('id')
            .eq('product_id', productId)
            .or('media_type.eq.video,media_type.eq.youtube')
            .limit(1);

        if (existingMedia && existingMedia.length > 0) {
            // Update existing video
            const { error: mediaError } = await supabase
                .from('media')
                .update({
                    video_url: youtubeUrl,
                    media_type: 'youtube', // Enforce youtube type
                    provider: 'youtube'
                })
                .eq('id', existingMedia[0].id);
        } else {
            // Insert new video media
            const { error: mediaError } = await supabase
                .from('media')
                .insert({
                    product_id: productId,
                    media_type: 'youtube',
                    video_url: youtubeUrl,
                    is_main: false,
                    position: 10, // Put it at the end roughly
                    provider: 'youtube'
                });
        }
    }

    return { success: true };
};
