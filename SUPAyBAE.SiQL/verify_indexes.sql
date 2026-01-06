-- ============================================================================
-- VERIFY INDEXES FOR get_personalized_suggestions_v2
-- Run this in Supabase SQL Editor to confirm all indexes are in place
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname IN (
    'idx_upv_user_time',
    'idx_orders_user_status', 
    'idx_pv_product_default',
    'idx_media_product_main',
    'idx_products_approved_category',
    'idx_coupons_active'
)
ORDER BY tablename, indexname;

-- Expected output should show 6 indexes:
-- | tablename          | indexname                     |
-- |--------------------|-------------------------------|
-- | coupons            | idx_coupons_active            |
-- | media              | idx_media_product_main        |
-- | orders             | idx_orders_user_status        |
-- | product_variants   | idx_pv_product_default        |
-- | products           | idx_products_approved_category|
-- | user_product_views | idx_upv_user_time             |

-- ============================================================================
-- If any indexes are MISSING, run these commands individually:
-- ============================================================================

-- 1. User product views (for personalization history lookup)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upv_user_time 
--     ON user_product_views(user_id, viewed_at DESC);

-- 2. Orders (for user purchase history)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status 
--     ON orders(user_id, status, created_at DESC);

-- 3. Product variants (for default variant lookup)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pv_product_default 
--     ON product_variants(product_id) WHERE is_default = true;

-- 4. Media (for main image lookup)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_product_main 
--     ON media(product_id) WHERE is_main = true;

-- 5. Products (for approved product filtering)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_approved_category 
--     ON products(status, category_id) WHERE status = 'approved';

-- 6. Coupons (for active coupon lookup)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_active 
--     ON coupons(status, start_time, end_time) WHERE status = 'Ongoing';

-- ============================================================================
-- VERIFY FUNCTION EXISTS
-- ============================================================================

SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'get_personalized_suggestions_v2'
  AND routine_schema = 'public';

-- Expected: 1 row showing the function exists with JSONB return type
