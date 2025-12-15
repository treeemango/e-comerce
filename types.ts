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
    seller_id?: string;
    createdAt?: string | null;
    media?: MediaItem[];
    gallery_media?: GalleryMediaItem[];
    badge?: string;
    deliveryDate?: string;
    deliveryTimeEstimate?: string;
    deliveryTimeDays?: number;
    isExpressDelivery?: boolean;
    deliveryScope?: string;
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
    deal_type?: 'coupon' | 'hot_discount' | 'standard';
    coupon_name?: string;
    coupon_end?: string; // ISO date string for countdown
    coupon_discount_percent?: number;
    score?: number; // Overall product score
    personalization_score?: number; // 0.0-1.0 personalization match
    in_stock?: boolean; // Inventory availability flag
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
    image?: string;
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
}

export interface GalleryMediaItem {
    id: string;
    image_url?: string;
    thumbnail_url?: string;
    is_main?: boolean;
    type: 'image' | 'video' | 'youtube';
    video_url?: string;
    alt_text?: string;
}

export interface VendorInfo {
    vendor_id: string;
    user_id?: string; // The seller_id from products
    business_name: string;
    business_description?: string;
    join_date?: string;
    vendor_rating?: number;
    review_count?: number;
    total_products?: number;
    completed_orders?: number;
    delivery_speed?: string;
    order_completion_rate?: number;
    badges?: VendorBadge[];
    is_verified?: boolean;
    business_country?: string;
    cancellation_rate?: number;
    response_time?: string;
    seller_since?: string;
    follower_count?: number;
    is_following?: boolean;
}

export interface VendorBadge {
    badge_type: string;
    badge_label: string;
    badge_icon?: string;
    badge_color?: string;
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

export interface SearchFilters {
    categories: CategoryFilter[];
    brands: BrandFilter[];
    price_range: PriceRange;
    attributes: Record<string, AttributeValue[]>;
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
    attributes: Record<string, string[]>;
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
    created_at: string;
    updated_at: string;
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
    is_read: boolean;
    created_at: string;
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
    shopName: string;
    businessLocation: string;
    email: string;
    password: string;
    confirmPassword: string;
    // Step 2
    description: string;
    categoryId: string;
    // Step 3
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    routingNumber: string;
    // Step 4
    logoFile: File | null;
    bannerFile: File | null;
    returnPolicy: string;
    shippingPolicy: string;
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
    promo_text?: string;
    promo_code?: string;
    free_delivery?: boolean;
    delivery_scope?: string;
    min_order_value?: number;
    min_order_for_free_delivery?: number;
    is_express_delivery?: boolean;
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
}

export interface SellerOrder {
    id: string;
    created_at: string;
    total_amount: number;
    status: string;
    customer_name: string;
    items: {
        product_title: string;
        variant_sku: string;
        quantity: number;
        price: number;
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
    status: string;
    total_amount: number;
    currency?: string;
    tracking_code?: string;
    shipping_method?: string;
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

export interface CouponApplicationResult {
    success: boolean;
    message: string;
    coupon?: {
        id: string;
        code: string;
        name: string;
        discount_amount?: number;
        discount_percentage?: number;
        type: 'fixed' | 'percentage' | 'none';
    };
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
    { id: 'users', label: 'User Management', icon: 'fas fa-users', requiredLevel: 'senior_admin' },
    { id: 'orders', label: 'Order Management', icon: 'fas fa-shopping-cart', requiredLevel: 'junior_admin' },
    { id: 'content', label: 'Content Management', icon: 'fas fa-folder', requiredLevel: 'content_manager' },
    { id: 'activity', label: 'Activity Log', icon: 'fas fa-history', requiredLevel: 'senior_admin' },
    { id: 'team', label: 'Team Management', icon: 'fas fa-user-shield', requiredLevel: 'super_admin' },
];

// Admin Dashboard Stats
export interface AdminDashboardStats {
    total_users: number;
    total_sellers: number;
    pending_seller_verifications: number;
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
    status: 'pending' | 'approved' | 'rejected';
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
