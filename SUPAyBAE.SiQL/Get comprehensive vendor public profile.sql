-- Get comprehensive vendor public profile (using available data)
CREATE OR REPLACE FUNCTION get_vendor_public_profile(
  vendor_uuid UUID
)
RETURNS TABLE (
  vendor_id UUID,
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
  business_country TEXT
)
LANGUAGE SQL
AS $$
  SELECT 
    v.id as vendor_id,
    v.business_name,
    v.business_description,
    v.created_at as join_date,
    v.rating as vendor_rating,
    v.review_count,
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as completed_orders,
    CASE 
      WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 20 THEN 'Fast & Reliable'
      WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 10 THEN 'Standard Delivery'
      WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 1 THEN 'New Seller'
      ELSE 'Just Joined'
    END as delivery_speed,
    (COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') * 100.0 / 
     NULLIF(COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('delivered', 'cancelled')), 0)) as order_completion_rate,
    COALESCE(sb.badges, '[]'::jsonb) as badges,
    v.verification_status = 'approved' as is_verified,
    v.address_country as business_country
  FROM vendors v
  LEFT JOIN products p ON p.seller_id = v.id AND p.status = 'active'
  LEFT JOIN order_items oi ON oi.product_id = p.id
  LEFT JOIN orders o ON o.id = oi.order_id
  LEFT JOIN badge_2030_seller_badges sb ON sb.seller_id = v.id
  WHERE v.id = vendor_uuid
    AND v.is_active = true
  GROUP BY v.id, v.business_name, v.business_description, v.created_at, v.rating, 
           v.review_count, v.verification_status, v.address_country, sb.badges;
$$;