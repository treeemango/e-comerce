export type ProductStatus =
    | 'approved'
    | 'active'
    | 'inactive'
    | 'archived'
    | 'incomplete'
    | 'draft'
    | 'deleted'
    | 'pending'
    | 'rejected'
    | 'suspended';

export type ProductCondition = 'new' | 'used' | 'refurbished' | 'open_box' | 'digital';

export interface Product {
    id: string | number;
    title: string;
    price: number;
    originalPrice?: number;
    rrp?: number;
    discountPercent?: number;
    promoText?: string;
    promoCode?: string;
    currency?: string;
    rating: number;
    reviews: number;
    image: string;
    stock?: number; // Optional vendor stock for buyer-side availability messaging
    status?: ProductStatus;
    seller_id?: string;
    createdAt?: string | null;
    media?: MediaItem[];
    gallery_media?: GalleryMediaItem[];
    video?: string; // Primary video url if present
    badge?: string;
    badges?: string[]; // Additional badges for cards (e.g. coupon, flash_sale)
    deliveryDate?: string;
    deliveryTimeEstimate?: string;
    deliveryTimeDays?: number;
    isExpressDelivery?: boolean;
    delayCredit?: number;          // Credit amount for delivery delays
    deliveryScope?: string;
    deliveryText?: string;
    delivery_locations?: string[]; // New: Listing specific locations 
    delivery_cost?: number;        // New: Explicit cost
    min_order_value?: number;      // New: Min order for delivery/checkout
    min_order_for_free_delivery?: number; // New: Threshold for free delivery
    sale_unit?: string;            // New: Unit of measurement (e.g., "piece", "kg", "L")
    shippingInfo?: string;
    tags?: string[];              // New: Discovery tags
    use_case_tags?: string[];     // New: AI use case tags
    occasion_tags?: string[];     // New: AI occasion tags
    seo_title?: string;           // New: SEO Title override
    meta_description?: string;    // New: Meta description override
    url_slug?: string;            // New: Custom URL slug
    canonical_url?: string;       // New: Canonical URL
    seo_keywords?: string[];      // New: SEO Keywords
    description?: string;
    vendor?: VendorInfo;
    categoryId?: string;
    categoryName?: string;
    category?: string;
    options?: ProductOption[];
    variants?: ProductVariant[];
    lower_than_similar?: boolean;
    price_gap?: number;
    similar_avg_price?: number;
    activeCoupon?: {
        id: string;
        label: string;
        code: string;
        amount?: number;
        percent?: number;
        endsAt: string;
        finalPrice: number;
        savings: number;
    };
    // Deal-specific fields
    deal_type?: 'coupon' | 'hot_discount' | 'flash_sale' | 'lightning_deal' | 'standard';
    coupon_name?: string;
    coupon_end?: string; // ISO date string for countdown
    coupon_discount_percent?: number;
    is_lightning_deal?: boolean;
    lightning_ends_at?: string;
    is_flash_sale?: boolean;
    flash_sale_start?: string;
    flash_sale_end?: string;
    score?: number; // Overall product score
    personalization_score?: number; // 0.0-1.0 personalization match
    in_stock?: boolean; // Inventory availability flag

    // Modern card features
    is_new?: boolean;
    is_featured?: boolean;
    brand_name?: string;
    free_delivery?: boolean;
    delivery_time_estimate?: string;
    seller_rating?: number;
    has_quantity_discount?: boolean;
    listing_type?: 'direct_purchase' | 'inquiry' | 'reservation';
    quantity_discounts?: QuantityDiscountTier[];
    auto_discount_type?: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
    auto_discount_value?: number;
    auto_discount_buy_qty?: number;
    auto_discount_get_qty?: number;
    auto_discount_min_requirement?: number;
    auto_discount_name?: string;
    condition?: ProductCondition;

    // Mobile UI specific (migrated from legacy)
    soldCount?: number;
    features?: string[];
    bestSellingText?: string;
    cartOverlay?: boolean;
    variant_id?: string; // Track specific variation if selected
    attributes?: ProductAttributeData[];
}


// Product interface that includes similarity score
export interface RelatedProduct extends Product {
    relation_type: 'same' | 'similar';
    similarity_score: number;
}

export interface ProductOption {
    id: string;
    name: string;
    values: string[];
}

export interface ProductVariant {
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    compare_at_price?: number;
    discountPercent?: number;
    image?: string;
    image_url?: string; // New: matches database column name
    sku?: string;
    stock?: number;
    options: Record<string, string>; // e.g. { "Color": "Red", "Size": "L" }
}

export interface MediaItem {
    id: string;
    type: 'image' | 'video' | 'youtube';
    url: string;
    thumbnail?: string;
    isMain?: boolean;
    name?: string; // For document names
    // Optimized image variants
    url_thumb?: string;
    url_grid?: string;
    url_detail?: string;
    url_zoom?: string;
    blurhash?: string;
}

export interface GalleryMediaItem {
    id: string;
    image_url?: string;
    thumbnail_url?: string;
    is_main?: boolean;
    type: 'image' | 'video' | 'youtube';
    video_url?: string;
    alt_text?: string;
    // Optimized image variants
    url_thumb?: string;
    url_grid?: string;
    url_detail?: string;
    url_zoom?: string;
    blurhash?: string;
}

export interface VendorInfo {
    vendor_id: string;
    user_id?: string; // The seller_id from products
    business_name: string;
    business_description?: string;
    logo_url?: string;
    join_date?: string;
    vendor_rating?: number;
    review_count?: number;
    total_products?: number;
    completed_orders?: number;
    delivery_speed?: string;
    order_completion_rate?: number;
    badges?: VendorBadge[];
    is_verified?: boolean;
    verification_level?: 'unverified' | 'basic' | 'premium' | 'enterprise';
    business_country?: string;
    cancellation_rate?: number;
    response_time?: string;
    seller_since?: string;
    follower_count?: number;
    is_following?: boolean;
    banner_url?: string;
    certificates?: MediaItem[];
    return_policy?: string;
    shipping_policy?: string;
}

export interface VendorBadge {
    // Core identifiers
    badge_type?: string;        // Internal slug: speed_dove, new_seller, trusted_shipper, etc.
    badge_name?: string;        // User-friendly display name

    // Description (both field names supported)
    description?: string;
    badge_description?: string;

    // Badge metadata
    badge_tier?: number;        // Level 1-5
    badge_rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    badge_category?: string;    // Category grouping

    // Points & scoring
    score_earned?: number;      // Reputation points from this badge

    // Timestamps (both field names supported)
    earned_at?: string;
    earned_date?: string;       // Alias for earned_at

    // Visual assets
    badge_icon_url?: string;    // Path to badge image asset (e.g., /badges/speed_dove.png)
    badge_icon?: string;        // Material icon name (legacy)
    badge_color?: string;       // Hex code for UI styling (e.g., #4CAF50)

    // Legacy/alias fields
    badge_label?: string;
    tier_level?: number;        // Alias for badge_tier
}

// Output from get_vendor_badge_stats RPC function
export interface VendorBadgeStats {
    total_badges: number;           // Count of all active badges
    total_reputation_score: number; // Sum of all score_earned values
    highest_rarity: string | null;  // Highest rarity rank held
    newest_badge: VendorBadge | null; // Most recently earned badge
    badge_history_count: number;    // Total historical milestones
}

export interface Category {
    id: string;
    name: string;
    hasSubmenu?: boolean;
}

export interface FeaturedCategory {
    id: string;
    name: string;
    image: string;
    isHot?: boolean;
}

export interface VisualCategory {
    id: string;
    name: string;
    image: string;
}

export interface CategoryFilter {
    id: string;
    name: string;
    slug?: string;
    product_count: number;
}

export interface BrandFilter {
    id: string;
    brand_name: string;
    logo_url?: string;
    product_count: number;
}

export interface PriceRange {
    min_price: number;
    max_price: number;
    avg_price: number;
    product_count: number;
}

export interface AttributeValue {
    value: string;
    product_count: number;
}

export interface DeliveryLocationFilter {
    location: string;
    product_count: number;
}

export interface VendorCountryFilter {
    country: string;
    product_count: number;
}

export interface ConditionFilter {
    condition: string;
    product_count: number;
}

export interface SearchFilters {
    categories: CategoryFilter[];
    brands: BrandFilter[];
    price_range: PriceRange;
    attributes: Record<string, AttributeValue[]>;
    delivery_locations: DeliveryLocationFilter[];
    vendor_countries: VendorCountryFilter[];
    conditions: ConditionFilter[];
    visual_match_count: number;
    total_products: number;
    has_visual_search: boolean;
    has_text_search: boolean;
    visual_similarity_threshold: number;
}

export interface AppliedFilters {
    category_ids: string[];
    brand_ids: string[];
    price_min: number | null;
    price_max: number | null;
    attributes?: Record<string, string[]>;
    delivery_locations?: string[];
    vendor_countries?: string[];
    conditions?: string[];
    rating_min?: number | null;
}

// Review System Types
export interface Review {
    id: string;
    product_id: string;
    user_id: string;
    order_id?: string;
    parent_review_id?: string;
    title?: string;
    content: string;
    rating: number;
    is_verified_purchase: boolean;
    is_featured: boolean;
    helpful_votes: number;
    total_votes: number;
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    pros?: string[];
    cons?: string[];
    recommended?: boolean;
    would_buy_again?: boolean;
    fit_rating?: number;
    value_rating?: number;
    quality_rating?: number;
    platform_rating?: number;
    platform_feedback?: string;
    created_at: string;
    updated_at: string;
    // Display fields from joins
    user_name?: string;
    user_avatar?: string;
    product_title?: string;
    product_image?: string;
    photos?: ReviewPhoto[];
    responses?: ReviewResponse[];
    user_vote?: 'helpful' | 'unhelpful';
}

export interface ReviewPhoto {
    id: string;
    review_id: string;
    photo_url: string;
    caption?: string;
    sort_order: number;
    is_primary: boolean;
    uploaded_at: string;
}

export interface ReviewVote {
    id: string;
    review_id: string;
    user_id: string;
    vote_type: 'helpful' | 'unhelpful';
    created_at: string;
}

export interface ReviewResponse {
    id: string;
    review_id: string;
    responder_id: string;
    responder_type: 'vendor' | 'admin' | 'customer_service';
    response_text: string;
    is_official: boolean;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    responder_name?: string;
}

export interface ProductReviewSummary {
    id: string;
    product_id: string;
    total_reviews: number;
    average_rating: number;
    rating_distribution: {
        '1': number;
        '2': number;
        '3': number;
        '4': number;
        '5': number;
    };
    verified_reviews_count: number;
    featured_reviews_count: number;
    recommended_percentage: number;
    would_buy_again_percentage: number;
    average_fit_rating: number;
    average_value_rating: number;
    average_quality_rating: number;
    top_pros: string[];
    top_cons: string[];
    last_updated: string;
}

export interface ReviewFilters {
    rating?: number;
    verified_only?: boolean;
    with_photos?: boolean;
    sort_by?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
}

export interface SubmitReviewData {
    product_id: string;
    user_id: string;
    order_id?: string;
    title?: string;
    content: string;
    rating: number;
    pros?: string[];
    cons?: string[];
    recommended?: boolean;
    would_buy_again?: boolean;
    fit_rating?: number;
    value_rating?: number;
    quality_rating?: number;
    platform_rating?: number;
    platform_feedback?: string;
    photos?: File[];
}

// Followed Stores Types
export interface FollowedStore {
    vendor_id: string;
    business_name: string;
    shop_name?: string;
    shop_slug?: string;
    business_slug?: string;
    business_description?: string;
    logo_url?: string;
    vendor_rating: number;
    rating?: number;
    review_count: number;
    total_products: number;
    follower_count: number;
    is_verified: boolean;
    business_country?: string;
    badges?: VendorBadge[];
    followed_at: string;
    latest_products?: {
        id: string;
        title: string;
        price: number;
        image: string;
        rating: number;
    }[];
}

// Authentication Types
export interface User {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    role?: 'buyer' | 'seller' | 'admin';
    created_at?: string;
    account_status?: string;
    banned_until?: string;
    last_seen_at?: string;
}

export interface AuthError {
    message: string;
    status?: number;
}

// Loyalty System Types
export interface LoyaltyProfile {
    user_id: string;
    loyalty_points: number;
    lifetime_spend: number;
    current_tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    last_activity_at: string;
}

// Vendor Discovery Types
export interface TrendingVendor {
    vendor: {
        id: string;
        business_name: string;
        shop_name: string;
        business_description?: string;
        logo_url?: string;
        rating: number;
        review_count: number;
        is_verified: boolean;
        is_active: boolean;
        created_at: string;
        address_country: string;
    };
    stats: {
        follower_count: number;
        total_sales: number;
        personal_view_score: number;
        product_count: number;
    };
    is_following: boolean;
    reason: string;
}

export interface Breadcrumb {
    label: string;
    type: 'home' | 'category' | 'subcategory';
    id?: string;
    data?: {
        title?: string;
        categoryIds?: string[];
        visualCategories?: VisualCategory[];
    };
}

// Messaging Types
export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    metadata?: any;
    is_read: boolean;
    created_at: string;
    attachments?: MessageAttachment[];
}

export interface Conversation {
    id: string;
    seller_id: string;
    buyer_id: string;
    product_id?: string;
    subject?: string;
    last_message?: string;
    last_message_at?: string;
    unread_count?: number;
    // Joined fields from views
    other_user_name?: string;
    other_user_avatar?: string;
    product_title?: string;
    product_image?: string;
}

// Seller Messaging Types (based on seller_conversation_overview view)
export interface SellerConversation {
    id: string;
    seller_id: string;
    buyer_id: string;
    product_id?: string;
    order_id?: string;
    subject?: string;
    last_message?: string;
    last_message_sender?: string;
    updated_at: string;
    created_at: string;
    is_active: boolean;
    seller_deleted: boolean;
    buyer_deleted: boolean;

    // Buyer profile
    buyer_display_name: string;
    buyer_full_name?: string;
    buyer_business_name?: string;
    buyer_email: string;
    buyer_phone?: string;
    buyer_avatar_url?: string;
    buyer_business_address?: string;

    // Seller profile
    seller_display_name: string;
    seller_full_name?: string;
    seller_business_name?: string;
    seller_avatar_url?: string;
    seller_phone?: string;
    seller_business_address?: string;

    // Product context
    product_title?: string;
    product_price?: number;
    product_primary_image?: string;

    // Order context
    order_number?: string;
    order_status?: string;
    order_total?: number;

    // Metadata
    unread_count: number;
    last_message_at?: string;
    last_sender_id?: string;
    last_sender_name?: string;
}

export interface SellerMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    message_type: 'text' | 'image' | 'system';
    metadata?: any;
    is_read: boolean;
    read_at?: string;
    created_at: string;
    sender_deleted: boolean;
    receiver_deleted: boolean;
    is_internal: boolean;
    attachments: MessageAttachment[];
}

export interface MessageAttachment {
    id: string;
    message_id?: string;
    file_name: string;
    storage_path: string;
    file_type?: string;
    file_size?: number;
    created_at: string;
}

// Seller Onboarding Types
export interface Business {
    id: string;
    user_id: string;
    shop_name: string;
    slug: string;
    description?: string;
    primary_category?: string;
    logo_media_id?: string;
    banner_media_id?: string;
    commission_rate?: number;
    follower_count?: number;
    created_at?: string;
    bank_details?: any; // Kept for legacy/jsonb compatibility if needed, but we use separate table now
}

export interface VendorBankAccount {
    id: string;
    business_id: string;
    bank_name: string;
    account_holder_name: string;
    account_number: string;
    routing_number?: string;
    swift_code?: string;
    currency?: string;
    is_primary?: boolean;
    is_verified?: boolean;
}

export interface PayoutMethod {
    id: string;
    user_id: string;
    user_role: 'vendor' | 'driver' | 'affiliate';
    method_type: 'mpesa' | 'bank_transfer' | 'paypal';
    account_name: string;
    account_number: string;
    bank_name?: string;
    bank_branch_code?: string;
    is_default?: boolean;
    is_verified?: boolean;
    created_at?: string;
}

export interface BusinessContent {
    id: string;
    business_id: string;
    content_type: 'RETURN_POLICY' | 'SHIPPING_POLICY';
    title: string;
    content_body: string;
    is_active?: boolean;
    sort_order?: number;
}

export interface OnboardingState {
    step: number;
    userId?: string;
    businessId?: string;
    // Step 1: Authentication
    email: string;
    password: string;
    confirmPassword: string;
    // Step 2: Basic Business Info
    shopName: string;
    businessName?: string;
    businessLocation: string;
    businessType?: string;
    businessEmail?: string;
    businessPhone?: string;
    website?: string;
    description: string;
    categoryId: string;
    categoryDescription?: string;
    yearsInBusiness?: number | string;
    // Step 3: Legal & Compliance
    taxId?: string;
    registrationNumber?: string;
    businessLicenseNumber?: string;
    // Step 4: Address
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressCountry?: string;
    addressPostalCode?: string;
    // Step 5: Financial Details
    monthlyRevenue?: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    routingNumber: string;
    // Step 6: Assets & Policies
    logoFile: File | null;
    bannerFile: File | null;
    businessLicenseFile?: File | null;
    otherDocumentsFiles?: File[];
    returnPolicy: string;
    shippingPolicy: string;
    // Status
    isLoading: boolean;
    error: string | null;
}

// Seller Dashboard Types

export interface SellerInventoryItem {
    business_id: string;
    product_id: string;
    product_title: string;
    variant_id: string;
    sku: string;
    current_stock: number;
    total_sales_to_date: number;
    current_price: number;
    last_updated: string;
}

export interface ProductAttributeData {
    attribute_id: string;
    value_option_id?: string;
    value_text?: string;
    name: string; // for UI display
    value: string; // for UI display
    is_custom?: boolean;
}

export interface ProductVariantData {
    sku: string;
    price: number;
    stock: number;
    options: Record<string, string>;
    compare_at_price?: number;
    original_price?: number;
    rrp?: number;
    discount_percent?: number;
    is_default: boolean;
    image_url?: string;
}

export interface MediaUploadData {
    url: string;
    storage_path: string;
    media_type: 'image' | 'video' | 'youtube';
    is_main: boolean;
    alt_text?: string;
    position: number;
}

export interface CreateProductPayload {
    title: string;
    description: string;
    category_id: string;
    brand_id?: string;
    currency: string;
    /** @deprecated Use coupons table instead. Create coupon via Promotions dashboard and link to product. */
    promo_text?: string;
    /** @deprecated Use coupons table instead. Create coupon via Promotions dashboard and link to product. */
    promo_code?: string;
    free_delivery?: boolean;
    delivery_scope?: string;
    min_order_value?: number;
    min_order_for_free_delivery?: number;
    is_express_delivery?: boolean;
    delay_credit?: number;
    seo_title?: string;
    meta_description?: string;
    url_slug?: string;
    canonical_url?: string;
    seo_keywords?: string;
    delivery_cost?: number;
    delivery_time_estimate?: string;
    delivery_time_days?: number;
    tags?: string[];
    use_case_tags?: string[];
    occasion_tags?: string[];
    attributes: ProductAttributeData[];
    variants: ProductVariantData[];
    media: MediaUploadData[];
    listing_type?: 'direct_purchase' | 'inquiry' | 'reservation';
    condition?: ProductCondition;
    quantity_discounts?: QuantityDiscountTier[];
}

export interface QuantityDiscountTier {
    min_quantity: number;
    unit_price: number;
}

export interface SellerOrder {
    id: string;
    order_number?: string | null;
    created_at: string;
    total_amount: number;
    status: string;
    customer_name: string;
    customer_email?: string | null;
    shipping_address?: string | null;
    tax_amount?: number;
    tax_rate?: number;
    delivery_fee?: number;
    fulfillment_type?: 'official_courier' | 'local_parcel';
    tracking_number?: string | null;
    carrier?: string | null;
    shipped_at?: string | null;
    shipment_proof_url?: string | null;
    parcel_details?: {
        company: string;
        waybill_number: string;
        collection_point?: string;
        phone?: string;
    } | null;
    delivery_otp?: string | null;
    logistics_meta?: {
        provider: string;
        service_id: string;
        rate_id: string;
        cost: number;
    } | null;
    items: {
        product_title: string;
        variant_sku: string | null;
        quantity: number;
        price: number;
        image_url?: string | null;
        currency?: string;
    }[];
}

export interface BuyerOrderItem {
    id: string;
    product_id?: string;
    product_title: string;
    variant_sku?: string;
    quantity: number;
    unit_price: number;
    image_url?: string;
}

export interface BuyerOrder {
    id: string;
    created_at: string;
    updated_at?: string;
    status: string;
    total_amount: number;
    currency?: string;
    customer_email?: string | null;
    tracking_code?: string; // legacy or used for trackings
    tracking_number?: string;
    carrier?: string;
    shipping_method?: string;
    shipping_additional_info?: string;
    fulfillment_type?: 'official_courier' | 'local_parcel';
    shipped_at?: string | null;
    shipment_proof_url?: string | null;
    parcel_details?: {
        company: string;
        waybill_number: string;
        collection_point?: string;
        phone?: string;
    } | null;
    delivery_otp?: string | null;
    logistics_meta?: {
        provider: string;
        service_id: string;
        rate_id: string;
        cost: number;
        confirmed_transport_fee?: number;
        payment_details?: string;
    } | null;
    items: BuyerOrderItem[];
}

export interface PromoCoupon {
    id: string;
    seller_id: string;
    name: string;
    code: string;
    discount_amount?: number;
    discount_percentage?: number;
    start_time: string;
    end_time: string;
    status: 'Ongoing' | 'Upcoming' | 'Expired' | 'Deactivated';
    total_quantity?: number;
    claimed_quantity: number;
    used_quantity: number;
    created_at: string;
    products?: any[]; // Simplified for list view, full details fetched separately
}

export interface AutomaticDiscount {
    id: string;
    seller_id: string;
    name: string;
    discount_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
    discount_value?: number;
    buy_qty?: number;
    get_qty?: number;
    min_requirement_value: number;
    starts_at: string;
    ends_at: string;
    status: 'active' | 'scheduled' | 'expired' | 'deactivated';
    created_at: string;
}

export interface QuantityDiscountTier {
    id?: string;
    product_id: string;
    variant_id?: string;
    min_quantity: number;
    unit_price: number;
    created_at?: string;
}

export interface UserCoupon {
    coupon: PromoCoupon;
    claimed_at?: string;
    used_at?: string;
    status: 'active' | 'upcoming' | 'expired' | 'used' | 'out_of_stock';
    remaining_quantity?: number;
}


export interface CouponValidationResult {
    is_valid: boolean;
    message: string;
    coupon?: {
        id: string;
        name: string;
        code: string;
        discount_amount?: number;
        discount_percentage?: number;
        end_time: string;
        remaining_quantity?: number;
    };
}

export interface AppliedCoupon {
    id: string;
    code: string;
    name: string;
    discount_amount?: number;
    discount_percentage?: number;
    type: 'fixed' | 'percentage' | 'none';
}

export interface CouponApplicationResult {
    success: boolean;
    message: string;
    coupon?: AppliedCoupon;
}

export interface ReturnRequest {
    id: string;
    order_id: string;
    user_id: string;
    product_id: string;
    return_reason: string;
    quantity: number;
    buyer_comment: string;
    status: string;
    is_auto_authorized: boolean;
    refund_amount: number;
    created_at: string;
    orders?: any;
    products?: any;
}

export interface SellerTransaction {
    id: string;
    seller_id: string;
    order_id?: string;
    batch_id?: string;
    transaction_type: string;
    amount: number;
    product_charges: number;
    other_charges: number;
    description?: string;
    transaction_date: string;
    created_at?: string;
}

export interface ShippingTemplate {
    id: string;
    seller_id: string;
    name: string;
    is_free_shipping_enabled: boolean;
    free_shipping_threshold?: number;
    created_at: string;
    regions?: ShippingTemplateRegion[];
}

export interface ShippingTemplateRegion {
    id: string;
    template_id: string;
    region_names: string[];
    address_types: any;
    transit_time_min: number;
    transit_time_max: number;
    shipping_fee: number;
}

export interface SellerAddress {
    id: string;
    seller_id: string;
    address_name: string;
    contact_person?: string;
    phone_number?: string;
    street_address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    is_default: boolean;
    created_at: string;
}

export interface PromotionalCampaign {
    id: string;
    seller_id: string;
    name: string;
    type: string;
    start_time: string;
    end_time: string;
    status: 'Draft' | 'Scheduled' | 'Active' | 'Ended';
    created_at: string;
}

export interface OrderReport {
    id: string;
    seller_id: string;
    report_type: string;
    batch_id: string;
    status: 'Processing' | 'Ready' | 'Failed';
    download_url?: string;
    created_at: string;
}

export interface OrderFileUpload {
    id: string;
    seller_id: string;
    file_name: string;
    file_type: string;
    records_processed: number;
    status: 'Uploaded' | 'Processing' | 'Success' | 'Failed';
    error_log?: string;
    created_at: string;
}

export interface SellerProfileExtended {
    seller_id: string;
    legal_business_name?: string;
    tax_id?: string;
    business_address?: any; // JSONB
    notification_preferences?: any;
    return_settings?: any;
    updated_at: string;
}

// Product Posting Types
export interface ShopifyVertical {
    id: string;
    name: string;
}

export interface ShopifyCategory {
    id: string;
    name: string;
    vertical_id?: string;
    parent_id?: string;
}

export interface ShopifyBrand {
    id: string;
    name: string;
    category_id?: string;
}

export interface ShopifyAttribute {
    id: string;
    name: string;
    category_id?: string;
}

export interface AttributeOption {
    id: string;
    attribute_id: string;
    value: string;
}

// =====================================================
// Admin Dashboard Types
// =====================================================

// Admin User & Permissions
export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'senior_admin' | 'junior_admin' | 'content_manager';
    is_active: boolean;
    created_at: string;
    last_login?: string;
}

export interface AdminPermissions {
    user_id: string;
    permission_level: 'super_admin' | 'senior_admin' | 'junior_admin' | 'content_manager';
    permissions: AdminGranularPermissions;
    is_active: boolean;
    granted_by?: string;
    created_at?: string;
    updated_at?: string;
}

// Granular JSON permissions matching database schema
export interface AdminGranularPermissions {
    content?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    users?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean; manage?: boolean };
    products?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean; approve?: boolean; reject?: boolean };
    orders?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    sellers?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean; verify?: boolean };
    categories?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    brands?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    verticals?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    carousels?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    attributes?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    analytics?: { view?: boolean; export?: boolean };
    activity_log?: { view?: boolean };
    system?: { configure?: boolean; backup?: boolean };
}

// Permission level hierarchy for access control
export const PERMISSION_LEVELS: Record<string, number> = {
    'content_manager': 1,
    'junior_admin': 2,
    'senior_admin': 3,
    'super_admin': 4
};

// Admin tab configuration with required permission levels
export interface AdminTabConfig {
    id: string;
    label: string;
    icon: string;
    requiredLevel: 'content_manager' | 'junior_admin' | 'senior_admin' | 'super_admin';
    badge?: number;
}

export const ADMIN_TABS: AdminTabConfig[] = [
    { id: 'overview', label: 'Dashboard', icon: 'fas fa-chart-line', requiredLevel: 'content_manager' },
    { id: 'products', label: 'Product Approval', icon: 'fas fa-check-circle', requiredLevel: 'junior_admin' },
    { id: 'sellers', label: 'Seller Verification', icon: 'fas fa-store', requiredLevel: 'senior_admin' },
    { id: 'drivers', label: 'Driver Verification', icon: 'fas fa-truck', requiredLevel: 'senior_admin' },
    { id: 'users', label: 'User Management', icon: 'fas fa-users', requiredLevel: 'senior_admin' },
    { id: 'orders', label: 'Order Management', icon: 'fas fa-shopping-cart', requiredLevel: 'junior_admin' },
    { id: 'disputes', label: 'Delivery Disputes', icon: 'fas fa-gavel', requiredLevel: 'senior_admin' },
    { id: 'moderation', label: 'Content Moderation', icon: 'fas fa-flag', requiredLevel: 'junior_admin' },
    { id: 'finances', label: 'Payout Approvals', icon: 'fas fa-wallet', requiredLevel: 'senior_admin' },
    { id: 'content', label: 'Content Management', icon: 'fas fa-folder', requiredLevel: 'content_manager' },
    { id: 'activity', label: 'Activity Log', icon: 'fas fa-history', requiredLevel: 'senior_admin' },
    { id: 'team', label: 'Team Management', icon: 'fas fa-user-shield', requiredLevel: 'super_admin' },
    { id: 'ai', label: 'AI Controls', icon: 'fas fa-robot', requiredLevel: 'super_admin' },
    { id: 'messages', label: 'Messages', icon: 'fas fa-comments', requiredLevel: 'junior_admin' },
    { id: 'feedback', label: 'Feedback & Support', icon: 'fas fa-bug', requiredLevel: 'content_manager' },
];

// Admin Dashboard Stats
export interface AdminDashboardStats {
    total_users: number;
    total_sellers: number;
    total_drivers: number;
    pending_seller_verifications: number;
    pending_driver_verifications: number;
    pending_product_approvals: number;
    total_orders: number;
    total_revenue: number;
    active_disputes: number;
}

// Product Approval
export interface PendingProductMedia {
    id: string;
    image_url?: string;
    media_type?: string;
    is_main?: boolean;
}

export interface PendingProductVariant {
    id: string;
    title?: string;
    price?: number;
    stock?: number;
    sku?: string;
    image_url?: string;
    options?: Record<string, string> | null;
    is_default?: boolean;
}

export interface PendingProductOption {
    name: string;
    values: string[];
}

export interface PendingProduct {
    id: string;
    title: string;
    seller_id: string;
    seller_name: string;
    category_name: string;
    price: number;
    currency?: string;
    status: 'pending' | 'approved' | 'rejected';
    condition?: ProductCondition;
    submitted_at: string;
    image_url?: string;
    description?: string;
    brand_name?: string;
    media?: PendingProductMedia[];
    variants?: PendingProductVariant[];
    options?: PendingProductOption[];
    main_image?: {
        url?: string;
        image_url?: string;
        media_id?: string;
        image_embedding?: number[];
    };
    // New seller-configurable fields
    listing_type?: 'direct_purchase' | 'inquiry' | 'reservation';
    has_quantity_discount?: boolean;
    quantity_discounts?: { min_quantity: number; unit_price: number }[];
    delivery_locations?: string[];
    free_delivery?: boolean;
    is_express_delivery?: boolean;
    delay_credit?: number;
    sale_unit?: string;
    // Additional seller fields
    tags?: string[];
    seo_title?: string;
    seo_description?: string;
    use_case_tags?: string[];
    occasion_tags?: string[];
    min_order_quantity?: number;
    delivery_scope?: string;
    stock?: number;
    sku?: string;
}

// Seller Verification
export interface SellerVerificationRequest {
    id: string;
    user_id: string;
    business_name: string;
    business_email: string;
    business_phone?: string;
    business_address?: string;
    tax_id?: string;
    business_license?: string;
    years_in_business?: number;
    monthly_revenue?: string;
    bank_details?: any; // Displayed securely
    documents?: MediaItem[];
    status: 'pending' | 'approved' | 'rejected';
    submitted_at: string;
    reviewed_by?: string;
    reviewed_at?: string;
    rejection_reason?: string;
    verification_notes?: string;
}

// Activity Log
export interface AdminActivityLog {
    id: string;
    admin_id: string;
    admin_name: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    details?: any;
    created_at: string;
}

// Hero Slides
export interface HeroSlide {
    id: string;
    title: string;
    subtitle?: string;
    cta_text: string;
    cta_link?: string;
    image_url: string;
    theme: 'red' | 'blue' | 'purple' | 'orange' | 'green' | 'black' | 'gold';
    text_color?: string;
    subtitle_color?: string;
    display_order: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface SellerStats {
    seller_id?: string;
    total_sales: number;
    sales_7d?: number;
    sales_30d?: number;
    total_orders?: number;
    pending_orders: number;
    pending_returns?: number;
    active_coupons?: number;
    balance?: number;
    total_products: number;
    low_stock_count: number;
    last_updated?: string;
}

export interface SellerOrderSummary {
    order_id: string;
    total_price: number;
    order_status: string;
    order_date: string;
    customer_id: string;
    item_count: number;
    return_status: string | null;
}

// ==========================================
// NEW TYPES FROM FINAL ORDER.SQL
// ==========================================

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

export interface PersonalizedNavbarCategory {
    department_id: string;
    department_name: string;
    category_id: string;
    category_name: string;
    relevance_score: number;
    is_trending: boolean;
}


export interface AffiliateCommission {
    id: string;
    affiliate_id: string;
    order_id: string;
    amount: number;
    status: 'pending' | 'available' | 'paid' | 'cancelled';
    available_at?: string;
    created_at: string;
}

export interface OrderTrackingEvent {
    id: string;
    order_id?: string;
    event_type: 'order_placed' | 'payment_confirmed' | 'order_confirmed' | 'preparing' | 'ready_for_pickup' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed_delivery' | 'returned' | 'cancelled' | 'refunded';
    event_description: string;
    location?: any; // geometry
    location_name?: string;
    estimated_delivery_time?: string;
    actual_delivery_time?: string;
    carrier_name?: string;
    tracking_number?: string;
    driver_name?: string;
    driver_phone?: string;
    driver_photo_url?: string;
    vehicle_info?: string;
    weather_conditions?: string;
    traffic_conditions?: string;
    delay_reason?: string;
    delay_duration?: any; // interval
    customer_notified?: boolean;
    internal_notes?: string;
    event_data?: any; // jsonb
    created_by?: string;
    created_at: string;
}

export interface OrderIssue {
    id: string;
    order_id?: string;
    user_id?: string;
    issue_type: 'wrong_item' | 'damaged_item' | 'missing_item' | 'late_delivery' | 'wrong_address' | 'payment_issue' | 'other';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    reported_by?: string;
    assigned_to?: string;
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    resolution?: string;
    resolution_date?: string;
    refund_amount?: number;
    replacement_order_id?: string;
    priority?: number;
    tags?: string[];
    internal_notes?: string;
    admin_notes?: string;
    customer_visible?: boolean;
    created_at: string;
    updated_at: string;
    // Joined data
    order_number?: string;
    customer_name?: string;
    shipment_proof_url?: string;
    shipped_at?: string;
}

export interface OrderDeliverySchedule {
    id: string;
    order_id?: string;
    scheduled_date: string;
    scheduled_time_slot: string; // e.g., "09:00-11:00"
    delivery_window_start?: string;
    delivery_window_end?: string;
    is_flexible?: boolean;
    alternative_dates?: string[];
    customer_instructions?: string;
    delivery_address?: any; // jsonb
    contact_person?: string;
    contact_phone?: string;
    requires_signature?: boolean;
    special_handling?: string[];
    created_at: string;
    updated_at: string;
}

export interface OrderDeliveryPreferences {
    id: string;
    user_id?: string;
    preferred_delivery_times?: string[];
    preferred_days?: string[];
    avoid_dates?: string[];
    delivery_instructions?: string;
    contactless_delivery?: boolean;
    signature_required?: boolean;
    allow_substitutions?: boolean;
    notification_preferences?: { sms: boolean; push: boolean; email: boolean };
    saved_addresses?: any; // jsonb
    created_at: string;
    updated_at: string;
}

export interface SellerPaymentMethod {
    id: string;
    seller_id: string;
    type: string;
    last4?: string;
    details?: any; // jsonb
    is_default?: boolean;
    created_at: string;
}

export interface PaymentTransaction {
    id: string;
    order_id: string;
    stripe_payment_intent_id?: string;
    amount: number;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface DeliveryPartnerPayment {
    id: string;
    partner_id?: string;
    assignment_id?: string;
    amount: number;
    currency?: string;
    payment_date?: string;
    payment_method?: 'bank_transfer' | 'mobile_money' | 'cash';
    reference_number?: string;
    status?: 'pending' | 'processed' | 'failed';
    processed_at?: string;
    notes?: string;
}

export interface AffiliatePayout {
    id: string;
    affiliate_id?: string;
    amount: number;
    currency?: string;
    payment_method: 'bank_transfer' | 'mobile_money' | 'paypal';
    payment_details?: any; // jsonb
    status?: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
    requested_at?: string;
    processed_at?: string;
    paid_at?: string;
    transaction_id?: string;
    failure_reason?: string;
    created_at: string;
    updated_at: string;
}

export interface AffiliatePayoutItem {
    id: string;
    payout_id?: string;
    commission_id?: string;
    amount: number;
    created_at: string;
}

// Financial & Delivery Dashboard Types

export interface SellerBalanceSummary {
    seller_id: string;
    total_available: number;
    total_escrow: number;
    pending_clearance: number;
    last_updated: string;
}

export interface SellerPayout {
    id: string;
    seller_id: string;
    order_id: string;
    amount: number;
    status: 'escrow' | 'available' | 'processing' | 'paid' | 'cancelled';
    available_at: string;
    order_number?: string;
    created_at: string;
    updated_at?: string;
}

export interface PayoutRequest {
    id: string;
    seller_id: string;
    amount: number;
    payment_method: 'bank_transfer' | 'mobile_money';
    status: 'pending' | 'approved' | 'rejected' | 'processed';
    requested_at: string;
    processed_at?: string;
    admin_notes?: string;
}

export interface DeliveryAssignment {
    id: string;
    order_id: string;
    partner_id: string;
    driver_name?: string;
    driver_phone?: string;
    status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';
    assigned_at: string;
    delivered_at?: string;
    delivery_fee: number;
    tracking_number: string;
}

export interface DeliveryZone {
    id: string;
    partner_id: string;
    zone_name: string;
    zone_boundary: any; // GeoJSON or similar
    is_active: boolean;
}

export interface PlatformRevenueAnalytics {
    id: string;
    total_revenue: number;
    platform_commission: number;
    seller_payouts: number;
    transaction_date: string;
}

export interface VerificationQueueItem {
    id: string;
    type: 'vendor' | 'driver';
    name: string;
    submitted_at: string;
    status: 'pending' | 'in_review' | 'approved' | 'rejected';
    documents: string[];
}

export interface DeliveryPartnerVehicle {
    id: string;
    partner_id: string;
    vehicle_type: string;
    license_plate: string;
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    capacity_kg?: number;
    max_package_size?: 'small' | 'medium' | 'large' | 'extra_large';
    insurance_number?: string;
    registration_expiry?: string;
    created_at: string;
}

export interface DeliveryPartner {
    id: string;
    user_id: string;
    company_name: string;
    company_description?: string;
    contact_email: string;
    contact_phone: string;
    license_number: string;
    license_expiry_date?: string;
    insurance_policy_number?: string;
    insurance_expiry_date?: string;
    delivery_radius_km?: number;
    base_delivery_fee?: number;
    per_km_fee?: number;
    service_areas?: string[];
    verification_status: 'pending' | 'verified' | 'rejected';
    is_verified: boolean;
    created_at: string;
    vehicles?: DeliveryPartnerVehicle[];
}
export interface BuyerNotificationPreferences {
    user_id: string;
    orders: boolean;
    deals: boolean;
    price_drops: boolean;
    messages: boolean;
    recommendations: boolean;
    updated_at?: string;
}

// Analytics Interfaces
export interface DailyMetric {
    date: string;
    total_sales: number;
    total_orders: number;
    visitors: number;
    conversion_rate: number;
    aov: number;
}

export interface TrafficSource {
    source: string;
    total_visits: number;
}

export interface RegionalSales {
    region: string;
    total_orders: number;
    total_sales: number;
}

export interface SellerAnalyticsSummary {
    summary: {
        total_sales: number;
        total_orders: number;
        total_visitors: number;
        avg_conversion_rate: number;
        avg_aov: number;
    };
    daily_trend: DailyMetric[];
    traffic_sources: TrafficSource[];
    regional_sales: RegionalSales[];
}

// Analytics Interfaces
export interface DailyMetric {
    date: string;
    total_sales: number;
    total_orders: number;
    visitors: number;
    conversion_rate: number;
    aov: number;
}

export interface TrafficSource {
    source: string;
    total_visits: number;
}

export interface RegionalSales {
    region: string;
    total_orders: number;
    total_sales: number;
}

export interface SellerAnalyticsSummary {
    summary: {
        total_sales: number;
        total_orders: number;
        total_visitors: number;
        avg_conversion_rate: number;
        avg_aov: number;
    };
    daily_trend: DailyMetric[];
    traffic_sources: TrafficSource[];
    regional_sales: RegionalSales[];
}

// Delivery Verification
export interface DeliveryProof {
    id: string;
    order_id: string;
    driver_id: string;
    proof_type: 'photo' | 'signature';
    proof_url: string;
    created_at: string;
}

