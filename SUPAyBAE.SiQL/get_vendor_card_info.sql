-- =====================================================
-- FUNCTION: get_vendor_card_info
-- Fetch vendor information for multiple products at once
-- Used for displaying vendor badges and info on product cards
-- =====================================================

-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_vendor_card_info(TEXT[]);

CREATE OR REPLACE FUNCTION get_vendor_card_info(product_ids TEXT[])
RETURNS TABLE (
    vendor_id UUID,
    user_id UUID,
    seller_id UUID,
    business_name TEXT,
    business_description TEXT,
    join_date TIMESTAMPTZ,
    vendor_rating NUMERIC,
    review_count INTEGER,
    total_products INTEGER,
    completed_orders BIGINT,
    delivery_speed TEXT,
    order_completion_rate NUMERIC,
    badges JSONB,
    is_verified BOOLEAN,
    business_country TEXT,
    cancellation_rate NUMERIC,
    response_time TEXT,
    seller_since TIMESTAMPTZ,
    follower_count INTEGER
)
LANGUAGE SQL
AS $$
    -- Get vendor info for all products by joining through seller_id
    SELECT DISTINCT ON (v.id)
        v.id as vendor_id,
        v.user_id,
        p.seller_id,
        v.business_name,
        v.business_description,
        v.created_at as join_date,
        COALESCE(v.rating, 0) as vendor_rating,
        COALESCE(v.review_count, 0) as review_count,
        COUNT(DISTINCT p2.id) as total_products,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as completed_orders,
        CASE 
            WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 20 THEN 'Fast & Reliable'
            WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 10 THEN 'Standard Delivery'
            WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 1 THEN 'New Seller'
            ELSE 'Just Joined'
        END as delivery_speed,
        ROUND((COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') * 100.0 / 
            NULLIF(COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('delivered', 'cancelled')), 0))::numeric, 2) as order_completion_rate,
        COALESCE(sb.badges, '[]'::jsonb) as badges,
        COALESCE(v.verification_status = 'approved', false) as is_verified,
        COALESCE(v.address_country, 'Kenya') as business_country,
        ROUND((COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'cancelled') * 100.0 / 
            NULLIF(COUNT(DISTINCT o.id), 0))::numeric, 2) as cancellation_rate,
        CASE
            WHEN v.created_at > NOW() - INTERVAL '30 days' THEN 'New'
            WHEN AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600) < 24 THEN '< 24 hours'
            WHEN AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600) < 48 THEN '< 48 hours'
            ELSE '> 48 hours'
        END as response_time,
        v.created_at as seller_since,
        COALESCE(v.follower_count, 0) as follower_count
    FROM products p
    INNER JOIN vendors v ON v.user_id = p.seller_id
    LEFT JOIN products p2 ON p2.seller_id = v.user_id AND p2.status = 'approved'
    LEFT JOIN order_items oi ON oi.product_id = p2.id
    LEFT JOIN orders o ON o.id = oi.order_id
    LEFT JOIN badge_2030_seller_badges sb ON sb.seller_id = v.user_id
    WHERE p.id::text = ANY(product_ids)
        AND COALESCE(v.is_active, true) = true
    GROUP BY v.id, v.user_id, p.seller_id, v.business_name, v.business_description, 
             v.created_at, v.rating, v.review_count, v.verification_status, 
             v.address_country, sb.badges, v.follower_count
    ORDER BY v.id;
$$;

-- Test the function (comment out in production)
-- SELECT * FROM get_vendor_card_info(ARRAY['product-uuid-1', 'product-uuid-2']);
