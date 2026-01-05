-- Performance indexes for get_personalized_suggestions_v2 function
-- Addresses timeout issues by optimizing frequently queried columns

-- User behavior analysis indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_product_views_user_viewed_at
ON user_product_views(user_id, viewed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_product_views_product_user
ON user_product_views(product_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status_created_at
ON orders(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_order
ON order_items(product_id, order_id);

-- Product and variant indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status_approved
ON products(status) WHERE status = 'approved';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_status
ON products(seller_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_status
ON products(category_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_product_default
ON product_variants(product_id, is_default) WHERE is_default = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_product_stock
ON product_variants(product_id, stock DESC) WHERE stock > 0;

-- Vendor indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_user_id
ON vendors(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_verification_status
ON vendors(verification_status);

-- Media indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_product_main
ON media(product_id, is_main DESC, position ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_product_type
ON media(product_id, media_type);

-- Coupon indexes for active deals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_status_dates
ON coupons(status, start_time, end_time) WHERE status = 'Ongoing';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_products_product
ON coupon_products(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_products_coupon
ON coupon_products(coupon_id);

-- Automatic discounts indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automatic_discounts_seller_status
ON automatic_discounts(seller_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automatic_discounts_dates
ON automatic_discounts(starts_at, ends_at) WHERE status = 'active';

-- Category indexes for department queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shopify_categories_parent_active
ON shopify_categories(parent_id, is_active, show_in_navbar);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shopify_categories_level_active
ON shopify_categories(level, is_active);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_category_status
ON products(seller_id, category_id, status) WHERE status = 'approved';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_price_discount
ON product_variants(product_id, price, discount_percent, compare_at_price);

-- Indexes for trending products calculation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_recent_sales
ON order_items(product_id) WHERE created_at >= NOW() - INTERVAL '7 days';
