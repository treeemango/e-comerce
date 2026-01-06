-- ============================================================================
-- OPTIMIZED VERSION: get_personalized_suggestions_v2
-- Migration: 20260106005229_optimize_personalized_suggestions_v2.sql
-- ============================================================================
-- 
-- SCALABILITY FIXES APPLIED:
-- 1. Fixed cross-join bug in product_preferences (was ON 1=1, now properly filtered)
-- 2. Replaced N+1 image subqueries with CTE-based approach
-- 3. Added early-exit for anonymous users (skip user behavior queries)
-- 4. Limited user behavior queries with row caps
-- 5. Pre-computed main product images in a CTE
-- 6. Added LIMIT to trending products for performance
-- ============================================================================

-- Create recommended indexes first
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upv_user_time 
    ON user_product_views(user_id, viewed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status 
    ON orders(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pv_product_default 
    ON product_variants(product_id) WHERE is_default = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_product_main 
    ON media(product_id) WHERE is_main = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_approved_category 
    ON products(status, category_id) WHERE status = 'approved';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_active 
    ON coupons(status, start_time, end_time) WHERE status = 'Ongoing';

-- Drop and recreate the function
DROP FUNCTION IF EXISTS get_personalized_suggestions_v2;

CREATE OR REPLACE FUNCTION get_personalized_suggestions_v2(
  p_user_param TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  min_rating NUMERIC DEFAULT 3.0,
  min_stock INT DEFAULT 5,
  include_categories BOOLEAN DEFAULT true,
  categories_limit INT DEFAULT 6,
  min_deals_per_category INT DEFAULT 0,
  category_filter TEXT DEFAULT NULL,
  departments_limit INT DEFAULT NULL,
  categories_per_department INT DEFAULT 6
)
RETURNS JSONB
LANGUAGE PLPGSQL
AS $$
DECLARE
  product_results JSONB;
  department_results JSONB;
  final_result JSONB;
  user_history_count INT;
  user_has_sufficient_history BOOLEAN;
  filtered_category_id UUID;
  actual_departments_limit INT;
  v_user_uuid UUID;
BEGIN
  
  -- Convert category_filter to UUID if provided
  filtered_category_id := NULLIF(category_filter, '')::UUID;
  
  -- Handle backward compatibility
  actual_departments_limit := COALESCE(departments_limit, categories_limit);
  
  -- OPTIMIZATION: Convert user param once, handle NULL gracefully
  BEGIN
    v_user_uuid := p_user_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_user_uuid := NULL;
  END;
  
  -- OPTIMIZATION: Early-exit check for user history (skip if no user)
  IF v_user_uuid IS NULL THEN
    user_history_count := 0;
    user_has_sufficient_history := FALSE;
  ELSE
    SELECT 
      LEAST(
        (SELECT COUNT(*) FROM user_product_views 
         WHERE user_id = v_user_uuid 
           AND viewed_at > NOW() - INTERVAL '30 days'
         LIMIT 50) +
        (SELECT COUNT(*) FROM orders o 
         JOIN order_items oi ON o.id = oi.order_id 
         WHERE o.user_id = v_user_uuid 
           AND o.status IN ('completed', 'shipped') 
           AND o.created_at > NOW() - INTERVAL '90 days'
         LIMIT 50),
        100
      ) INTO user_history_count;
    
    user_has_sufficient_history := (user_history_count >= 3);
  END IF;
  
  -- Main product query
  WITH 
  -- OPTIMIZATION: Pre-compute main images in a single CTE scan
  main_images AS (
      SELECT DISTINCT ON (product_id)
          product_id,
          image_url
      FROM media
      WHERE is_main = true OR position = 1
      ORDER BY product_id, is_main DESC NULLS LAST, position ASC
  ),
  
  media_gallery AS (
      SELECT 
          product_id,
          jsonb_agg(
              jsonb_build_object(
                  'id', id,
                  'image_url', image_url,
                  'thumbnail_url', thumbnail_url,
                  'is_main', is_main,
                  'type', CASE
                      WHEN (media_type IN ('video', 'youtube') OR video_url IS NOT NULL) 
                           AND (COALESCE(video_url, image_url) LIKE '%youtube.com%' OR COALESCE(video_url, image_url) LIKE '%youtu.be%') 
                      THEN 'youtube'
                      ELSE COALESCE(media_type, 'image')
                  END,
                  'media_type', COALESCE(media_type, 'image'),
                  'video_embed_url', CASE
                      WHEN COALESCE(video_url, image_url) LIKE '%youtube.com/watch?v=%' 
                          THEN 'https://www.youtube.com/embed/' || split_part(split_part(COALESCE(video_url, image_url), 'v=', 2), '&', 1)
                      WHEN COALESCE(video_url, image_url) LIKE '%youtu.be/%' 
                          THEN 'https://www.youtube.com/embed/' || split_part(split_part(COALESCE(video_url, image_url), '/', -1), '?', 1)
                      ELSE NULL
                  END,
                  'video_url', CASE
                      WHEN COALESCE(video_url, image_url) LIKE '%youtube.com/watch?v=%' 
                          THEN 'https://www.youtube.com/embed/' || split_part(split_part(COALESCE(video_url, image_url), 'v=', 2), '&', 1)
                      WHEN COALESCE(video_url, image_url) LIKE '%youtu.be/%' 
                          THEN 'https://www.youtube.com/embed/' || split_part(split_part(COALESCE(video_url, image_url), '/', -1), '?', 1)
                      ELSE video_url
                  END,
                  'url', COALESCE(
                      CASE
                          WHEN COALESCE(video_url, image_url) LIKE '%youtube.com/watch?v=%' 
                              THEN 'https://www.youtube.com/embed/' || split_part(split_part(COALESCE(video_url, image_url), 'v=', 2), '&', 1)
                          WHEN COALESCE(video_url, image_url) LIKE '%youtu.be/%' 
                              THEN 'https://www.youtube.com/embed/' || split_part(split_part(COALESCE(video_url, image_url), '/', -1), '?', 1)
                          ELSE NULL
                      END,
                      video_url,
                      image_url
                  ),
                  'alt_text', alt_text
              ) ORDER BY position ASC, created_at DESC
          ) FILTER (WHERE id IS NOT NULL) AS gallery
      FROM media
      GROUP BY product_id
  ),
  
  active_coupons AS (
      SELECT DISTINCT ON (cp.product_id)
          cp.product_id,
          c.id AS coupon_id,
          c.seller_id as vendor_id,
          c.discount_percentage,
          c.discount_amount,
          c.start_time,
          c.end_time,
          c.name as coupon_name,
          c.code as coupon_code
      FROM coupons c
      JOIN coupon_products cp ON c.id = cp.coupon_id
      WHERE c.status = 'Ongoing'
        AND c.start_time <= NOW()
        AND c.end_time > NOW()
        AND (c.total_quantity IS NULL OR c.total_quantity > COALESCE(c.claimed_quantity, 0))
      ORDER BY cp.product_id, 
               c.discount_percentage DESC NULLS LAST,
               c.discount_amount DESC NULLS LAST,
               c.end_time DESC
  ),

  active_automatic_discounts AS (
      SELECT DISTINCT ON (seller_id)
          id,
          seller_id,
          name,
          discount_type,
          discount_value,
          min_requirement_value,
          buy_qty,
          get_qty
      FROM automatic_discounts
      WHERE status = 'active'
        AND starts_at <= NOW()
        AND ends_at > NOW()
      ORDER BY seller_id, created_at DESC
  ),
  
  variant_agg AS (
      SELECT 
          product_id,
          jsonb_agg(jsonb_build_object(
              'id', id,
              'sku', sku,
              'price', price,
              'compare_at_price', compare_at_price,
              'stock', stock,
              'quantity', quantity,
              'options', options,
              'is_default', is_default,
              'image', image_url
          )) as variants_json
      FROM product_variants
      GROUP BY product_id
  ),
  
  -- OPTIMIZATION: Only compute user behavior if user exists and has history
  user_behavior AS (
      SELECT 
          p.category_id,
          p.seller_id AS vendor_id,
          COUNT(*) * 0.7 AS weight,
          MAX(o.created_at) AS last_interaction
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE v_user_uuid IS NOT NULL
          AND user_has_sufficient_history
          AND o.user_id = v_user_uuid
          AND o.status IN ('completed', 'shipped')
          AND o.created_at > NOW() - INTERVAL '90 days'
      GROUP BY p.category_id, p.seller_id
      
      UNION ALL
      
      SELECT 
          p.category_id,
          p.seller_id AS vendor_id,
          COUNT(*) * 0.3 AS weight,
          MAX(upv.viewed_at) AS last_interaction
      FROM user_product_views upv
      JOIN products p ON upv.product_id = p.id
      WHERE v_user_uuid IS NOT NULL
          AND user_has_sufficient_history
          AND upv.user_id = v_user_uuid
          AND upv.viewed_at > NOW() - INTERVAL '30 days'
      GROUP BY p.category_id, p.seller_id
  ),
  
  user_preferences AS (
      SELECT 
          category_id,
          vendor_id,
          SUM(weight) AS preference_score,
          CASE 
              WHEN MAX(last_interaction) > NOW() - INTERVAL '7 days' THEN 1.2
              WHEN MAX(last_interaction) > NOW() - INTERVAL '30 days' THEN 1.0
              ELSE 0.8
          END AS recency_boost
      FROM user_behavior
      GROUP BY category_id, vendor_id
  ),
  
  base_products AS (
      SELECT
          p.id,
          p.title,
          p.description,
          p.meta_description,
          p.category_id,
          p.seller_id AS vendor_id,
          p.rating,
          p.created_at,
          p.currency,
          p.delivery_time_estimate,
          p.delivery_time_days,
          p.is_express_delivery,
          p.delivery_scope,
          p.delivery_locations,
          p.sale_unit,
          COALESCE(p.sales_count, 0) as sales_count,
          v.stock,
          v.price as base_price,
          v.compare_at_price as original_price,
          v.discount_percent as base_discount_percent,
          CASE 
              WHEN ac.discount_percentage IS NOT NULL THEN
                  v.price * (1 - ac.discount_percentage / 100.0)
              WHEN ac.discount_amount IS NOT NULL THEN
                  GREATEST(v.price - ac.discount_amount, 0)
              WHEN ad.discount_type = 'percentage' AND ad.min_requirement_value <= v.price THEN
                  v.price * (1 - ad.discount_value / 100.0)
              WHEN ad.discount_type = 'fixed_amount' AND ad.min_requirement_value <= v.price THEN
                  GREATEST(v.price - ad.discount_value, 0)
              ELSE v.price
          END as final_price,
          COALESCE(ac.coupon_name, ad.name) as coupon_name,
          COALESCE(ac.discount_percentage, CASE WHEN ad.discount_type = 'percentage' THEN ad.discount_value ELSE NULL END) as coupon_discount_percent,
          COALESCE(ac.discount_amount, CASE WHEN ad.discount_type = 'fixed_amount' THEN ad.discount_value ELSE NULL END) as coupon_discount_amount,
          ac.end_time as coupon_end,
          CASE 
              WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > 0 AND ac.discount_percentage IS NOT NULL THEN
                  ((v.compare_at_price - (v.price * (1 - ac.discount_percentage / 100.0))) / NULLIF(v.compare_at_price, 0)) * 100
              WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > 0 AND ad.discount_type = 'percentage' THEN
                  ((v.compare_at_price - (v.price * (1 - ad.discount_value / 100.0))) / NULLIF(v.compare_at_price, 0)) * 100
              WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > 0 THEN
                  ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)) * 100
              WHEN v.discount_percent IS NOT NULL AND ac.discount_percentage IS NOT NULL THEN
                  (1 - ((1 - v.discount_percent / 100.0) * (1 - ac.discount_percentage / 100.0))) * 100
              WHEN v.discount_percent IS NOT NULL AND ad.discount_type = 'percentage' THEN
                  (1 - ((1 - v.discount_percent / 100.0) * (1 - ad.discount_value / 100.0))) * 100
              WHEN v.discount_percent IS NOT NULL THEN
                  v.discount_percent
              ELSE 0
          END as total_discount_percent,
          LEAST(
              COALESCE(
                  CASE 
                      WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > 0 THEN
                          CASE 
                              WHEN ac.discount_percentage IS NOT NULL THEN
                                  (v.compare_at_price - (v.price * (1 - ac.discount_percentage / 100.0))) / NULLIF(v.compare_at_price, 0)
                              WHEN ad.discount_type = 'percentage' THEN
                                  (v.compare_at_price - (v.price * (1 - ad.discount_value / 100.0))) / NULLIF(v.compare_at_price, 0)
                              ELSE
                                  (v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)
                          END
                      WHEN v.discount_percent IS NOT NULL THEN
                          CASE 
                              WHEN ac.discount_percentage IS NOT NULL THEN
                                  1 - ((1 - v.discount_percent / 100.0) * (1 - ac.discount_percentage / 100.0))
                              WHEN ad.discount_type = 'percentage' THEN
                                  1 - ((1 - v.discount_percent / 100.0) * (1 - ad.discount_value / 100.0))
                              ELSE
                                  v.discount_percent / 100.0
                          END
                      WHEN ac.discount_percentage IS NOT NULL THEN
                          ac.discount_percentage / 100.0
                      WHEN ad.discount_type = 'percentage' THEN
                          ad.discount_value / 100.0
                      ELSE 0
                  END,
                  0
              ),
              0.9
          ) as enhanced_value_score,
          LEAST(COALESCE(p.rating, 3.0) / 5.0, 1.0) AS quality_score,
          CASE 
              WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 1.0
              WHEN p.created_at > NOW() - INTERVAL '30 days' THEN 0.7
              WHEN p.created_at > NOW() - INTERVAL '90 days' THEN 0.3
              ELSE 0.1
          END AS freshness_score,
          -- OPTIMIZATION: Use pre-computed main_images CTE instead of subqueries
          COALESCE(mi.image_url, '/images/default-product.jpg') as product_image_url,
          COALESCE(mg.gallery, '[]'::jsonb) AS gallery,
          vd.address_country AS vendor_country,
          CASE 
              WHEN ac.product_id IS NOT NULL THEN 'coupon'
              WHEN ad.id IS NOT NULL THEN 'hot_discount'
              WHEN p.is_flash_sale = true AND p.flash_sale_end > NOW() THEN 'flash_sale'
              WHEN p.is_lightning_deal = true AND p.lightning_ends_at > NOW() THEN 'lightning_deal'
              WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price 
                  AND ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)) >= 0.3 THEN 'hot_discount'
              WHEN v.discount_percent IS NOT NULL AND v.discount_percent >= 30 THEN 'hot_discount'
              WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price THEN 'discount'
              WHEN v.discount_percent IS NOT NULL AND v.discount_percent >= 10 THEN 'discount'
              ELSE 'standard'
          END AS deal_type,
          p.has_quantity_discount,
          ad.discount_type as auto_discount_type,
          ad.discount_value as auto_discount_value,
          ad.buy_qty as auto_discount_buy_qty,
          ad.get_qty as auto_discount_get_qty,
          ad.min_requirement_value as auto_discount_min_requirement,
          ad.name as auto_discount_name,
          p.listing_type,
          p.condition,
          p.is_flash_sale,
          p.flash_sale_start,
          p.flash_sale_end,
          p.is_lightning_deal,
          p.lightning_ends_at,
          p.is_choice,
          p.promo_text,
          p.promo_code,
          p.free_delivery,
          p.delivery_cost,
          p.min_order_value,
          p.min_order_for_free_delivery,
          p.eco_friendly,
          p.tags,
          p.review_count,
          p.is_featured,
          p.is_new,
          p.is_on_sale,
          p.slug,
          ac.coupon_id,
          ac.coupon_code,
          COALESCE(va.variants_json, '[]'::jsonb) AS variants
      FROM products p
      JOIN product_variants v ON p.id = v.product_id AND v.is_default = true
      LEFT JOIN active_coupons ac ON p.id = ac.product_id
      LEFT JOIN active_automatic_discounts ad ON p.seller_id = ad.seller_id
      LEFT JOIN vendors vd ON p.seller_id = vd.user_id
      LEFT JOIN media_gallery mg ON p.id = mg.product_id
      LEFT JOIN variant_agg va ON p.id = va.product_id
      LEFT JOIN main_images mi ON p.id = mi.product_id
      WHERE p.status = 'approved' 
        AND v.stock >= min_stock
        AND (p.rating IS NULL OR p.rating >= min_rating)
        AND (filtered_category_id IS NULL OR p.category_id = filtered_category_id)
  ),
  
  -- OPTIMIZATION: Limit trending products scan
  trending_products AS (
      SELECT 
          oi.product_id,
          COUNT(*) AS recent_sales,
          LEAST(LOG(GREATEST(COUNT(*), 1)), 3.0) as log_sales_score
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at > NOW() - INTERVAL '7 days'
          AND o.status IN ('completed', 'shipped')
      GROUP BY oi.product_id
      HAVING COUNT(*) >= 1
      LIMIT 5000
  ),
  
  -- CRITICAL FIX: Removed cross-join (ON 1=1) - now properly matched
  product_preferences AS (
      SELECT 
          bp.id as product_id,
          COALESCE(
              MAX(
                  CASE 
                      WHEN up.category_id = bp.category_id AND up.vendor_id = bp.vendor_id THEN up.preference_score * up.recency_boost * 1.5
                      WHEN up.category_id = bp.category_id THEN up.preference_score * up.recency_boost * 1.2
                      WHEN up.vendor_id = bp.vendor_id THEN up.preference_score * up.recency_boost
                      ELSE 0
                  END
              ),
              0
          ) as raw_preference_score
      FROM base_products bp
      LEFT JOIN user_preferences up 
          ON up.category_id = bp.category_id
          OR up.vendor_id = bp.vendor_id
      GROUP BY bp.id
  ),
  
  max_pref_score AS (
      SELECT GREATEST(MAX(raw_preference_score), 0.001) as max_score
      FROM product_preferences
  ),
  
  filtered_products AS (
      SELECT DISTINCT ON (bp.id)
          bp.*,
          COALESCE(tp.recent_sales, 0) as recent_sales,
          COALESCE(tp.log_sales_score, 0) as log_sales_score,
          CASE 
              WHEN mps.max_score > 0 THEN pp.raw_preference_score / mps.max_score
              ELSE 0
          END as preference_score_normalized
      FROM base_products bp
      CROSS JOIN max_pref_score mps
      LEFT JOIN trending_products tp ON bp.id = tp.product_id
      LEFT JOIN product_preferences pp ON bp.id = pp.product_id
      WHERE (v_user_uuid IS NULL OR bp.id NOT IN (
          SELECT DISTINCT oi.product_id
          FROM orders o 
          JOIN order_items oi ON o.id = oi.order_id
          WHERE o.user_id = v_user_uuid 
              AND o.status IN ('completed', 'shipped')
          LIMIT 500
      ))
      -- FIX: Only include products with ACTUAL discounts (not standard products without deals)
      AND bp.deal_type != 'standard'
      ORDER BY bp.id
  ),
  
  product_scores AS (
      SELECT 
          fp.id as product_id,
          fp.title as product_title,
          fp.description as product_description,
          fp.meta_description as product_meta_description,
          fp.product_image_url,
          fp.gallery,
          fp.currency,
          fp.delivery_time_estimate,
          fp.delivery_time_days,
          fp.is_express_delivery,
          fp.delivery_scope,
          fp.delivery_locations,
          fp.sale_unit,
          fp.vendor_country,
          fp.final_price as current_price,
          fp.base_price,
          fp.original_price,
          CAST(fp.total_discount_percent AS NUMERIC(10,1)) as total_discount_percent,
          fp.rating,
          fp.deal_type,
          fp.coupon_name,
          fp.coupon_discount_percent,
          fp.coupon_discount_amount,
          fp.coupon_end,
          fp.preference_score_normalized,
          fp.category_id,
          CASE 
              WHEN v_user_uuid IS NULL OR NOT user_has_sufficient_history THEN
                  (fp.enhanced_value_score * 70) +           
                  (fp.quality_score * 15) +                  
                  (fp.log_sales_score * 10) +                
                  (fp.freshness_score * 5)                   
              ELSE
                  (POWER(GREATEST(fp.preference_score_normalized, 0.05), 0.7) * 55) +  
                  (fp.enhanced_value_score * 25) +           
                  (fp.quality_score * 12) +                  
                  (fp.log_sales_score * 8)                   
          END as calculated_score,
          fp.stock > 0 as is_in_stock,
          fp.stock as stock_quantity,
          fp.has_quantity_discount,
          fp.auto_discount_type,
          fp.auto_discount_value,
          fp.auto_discount_buy_qty,
          fp.auto_discount_get_qty,
          fp.auto_discount_min_requirement,
          fp.auto_discount_name,
          fp.sales_count,
          fp.listing_type,
          fp.condition,
          fp.is_flash_sale,
          fp.flash_sale_start,
          fp.flash_sale_end,
          fp.is_lightning_deal,
          fp.lightning_ends_at,
          fp.is_choice,
          fp.promo_text,
          fp.promo_code,
          fp.free_delivery,
          fp.delivery_cost,
          fp.min_order_value,
          fp.min_order_for_free_delivery,
          fp.eco_friendly,
          fp.tags,
          fp.review_count,
          fp.is_featured,
          fp.is_new,
          fp.is_on_sale,
          fp.slug,
          fp.coupon_id,
          fp.coupon_code,
          fp.variants
      FROM filtered_products fp
      WHERE fp.stock >= min_stock
        AND (fp.rating IS NULL OR fp.rating >= min_rating)
  ),
  
  product_recommendations AS (
      SELECT DISTINCT ON (ps.product_id)
          ps.product_id,
          ps.product_title,
          ps.product_description,
          ps.product_meta_description,
          ps.product_image_url,
          ps.gallery,
          ps.currency,
          ps.delivery_time_estimate,
          ps.delivery_time_days,
          ps.is_express_delivery,
          ps.delivery_scope,
          ps.delivery_locations,
          ps.sale_unit,
          ps.vendor_country,
          ps.current_price,
          ps.base_price,
          ps.original_price,
          ps.total_discount_percent,
          ps.rating,
          ps.deal_type,
          ps.coupon_name,
          ps.coupon_discount_percent,
          ps.coupon_discount_amount,
          ps.coupon_end,
          ps.preference_score_normalized,
          ps.category_id,
          40 + (ps.calculated_score * 0.5) as final_score,
          ps.is_in_stock,
          ps.stock_quantity,
          ps.has_quantity_discount,
          ps.auto_discount_type,
          ps.auto_discount_value,
          ps.auto_discount_buy_qty,
          ps.auto_discount_get_qty,
          ps.auto_discount_min_requirement,
          ps.auto_discount_name,
          ps.sales_count,
          ps.listing_type,
          ps.condition,
          ps.is_flash_sale,
          ps.flash_sale_start,
          ps.flash_sale_end,
          ps.is_lightning_deal,
          ps.lightning_ends_at,
          ps.is_choice,
          ps.promo_text,
          ps.promo_code,
          ps.free_delivery,
          ps.delivery_cost,
          ps.min_order_value,
          ps.min_order_for_free_delivery,
          ps.eco_friendly,
          ps.tags,
          ps.review_count,
          ps.is_featured,
          ps.is_new,
          ps.is_on_sale,
          ps.slug,
          ps.coupon_id,
          ps.coupon_code,
          ps.variants
      FROM product_scores ps
      ORDER BY ps.product_id, ps.calculated_score DESC
  ),
  
  ranked_products AS (
      SELECT *
      FROM product_recommendations
      ORDER BY final_score DESC
      LIMIT p_limit
  )
  
  SELECT jsonb_agg(
      jsonb_build_object(
          'id', rp.product_id,
          'title', rp.product_title,
          'slug', rp.slug,
          'description', rp.product_description,
          'image_url', rp.product_image_url,
          'gallery', rp.gallery,
          'media', rp.gallery,
          'gallery_media', rp.gallery,
          'currency', rp.currency,
          'price', rp.current_price,
          'originalPrice', rp.original_price,
          'discountPercent', rp.total_discount_percent,
          'rating', rp.rating,
          'review_count', rp.review_count,
          'deal_type', rp.deal_type,
          'promoText', rp.promo_text,
          'promoCode', rp.promo_code,
          'category_id', rp.category_id,
          'score', ROUND(GREATEST(LEAST(rp.final_score, 90), 40)::NUMERIC, 1),
          'personalization_score', ROUND(rp.preference_score_normalized::NUMERIC, 2)
      )
      || jsonb_build_object(
          'coupon_name', rp.coupon_name,
          'coupon_discount_percent', rp.coupon_discount_percent,
          'coupon_discount_amount', rp.coupon_discount_amount,
          'coupon_end', rp.coupon_end,
          'coupon_expires_at', rp.coupon_end,
          'activeCoupon', CASE 
              WHEN rp.coupon_id IS NOT NULL THEN jsonb_build_object(
                  'id', rp.coupon_id,
                  'label', rp.coupon_name,
                  'code', rp.coupon_code,
                  'amount', rp.coupon_discount_amount,
                  'percent', rp.coupon_discount_percent,
                  'endsAt', rp.coupon_end,
                  'finalPrice', rp.current_price,
                  'savings', CASE
                      WHEN rp.coupon_discount_amount IS NOT NULL THEN rp.coupon_discount_amount
                      WHEN rp.coupon_discount_percent IS NOT NULL THEN ROUND(rp.base_price * (rp.coupon_discount_percent / 100), 2)
                      ELSE 0
                  END
              )
              ELSE NULL 
          END,
          'is_flash_sale', rp.is_flash_sale,
          'flash_sale_start', rp.flash_sale_start,
          'flash_sale_end', rp.flash_sale_end,
          'is_lightning_deal', rp.is_lightning_deal,
          'lightning_ends_at', rp.lightning_ends_at,
          'is_choice', rp.is_choice,
          'has_quantity_discount', rp.has_quantity_discount,
          'auto_discount_type', rp.auto_discount_type,
          'auto_discount_value', rp.auto_discount_value,
          'auto_discount_buy_qty', rp.auto_discount_buy_qty,
          'auto_discount_get_qty', rp.auto_discount_get_qty,
          'auto_discount_min_requirement', rp.auto_discount_min_requirement,
          'auto_discount_name', rp.auto_discount_name
      )
      || jsonb_build_object(
          'delivery_time_estimate', rp.delivery_time_estimate,
          'delivery_time_days', rp.delivery_time_days,
          'is_express_delivery', rp.is_express_delivery,
          'delivery_scope', rp.delivery_scope,
          'delivery_locations', rp.delivery_locations,
          'sale_unit', rp.sale_unit,
          'free_delivery', rp.free_delivery,
          'delivery_cost', rp.delivery_cost,
          'min_order_value', rp.min_order_value,
          'min_order_for_free_delivery', rp.min_order_for_free_delivery,
          'vendor_country', rp.vendor_country,
          'in_stock', rp.is_in_stock,
          'stock', rp.stock_quantity,
          'is_featured', rp.is_featured,
          'is_new', rp.is_new,
          'is_on_sale', rp.is_on_sale,
          'eco_friendly', rp.eco_friendly,
          'tags', rp.tags,
          'variants', rp.variants,
          'sales_count', rp.sales_count,
          'listing_type', rp.listing_type,
          'condition', rp.condition
      )
  ) INTO product_results
  FROM ranked_products rp;

  
  -- 2. GET DEPARTMENTS WITH DEALS FOR NAVBAR
  IF include_categories AND filtered_category_id IS NULL THEN
    WITH 
    deals_active_coupons AS (
        SELECT DISTINCT cp.product_id
        FROM coupons c
        JOIN coupon_products cp ON c.id = cp.coupon_id
        WHERE c.status = 'Ongoing'
          AND c.start_time <= NOW()
          AND c.end_time > NOW()
          AND c.claimed_quantity < c.total_quantity
    ),
    
    dept_main_images AS (
        SELECT DISTINCT ON (child.parent_id)
            child.parent_id as department_id,
            m.image_url
        FROM shopify_categories child
        JOIN products p ON child.id = p.category_id AND p.status = 'approved'
        JOIN product_variants v ON p.id = v.product_id AND v.is_default = true AND v.stock > 0
        JOIN media m ON p.id = m.product_id AND m.is_main = true
        WHERE child.is_active = true
          AND (
              (p.is_flash_sale = true AND p.flash_sale_end > NOW())
              OR (p.is_lightning_deal = true AND p.lightning_ends_at > NOW())
              OR (v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price)
              OR (v.discount_percent IS NOT NULL AND v.discount_percent >= 10)
          )
        ORDER BY child.parent_id, 
            CASE WHEN p.is_flash_sale = true THEN 1 WHEN p.is_lightning_deal = true THEN 2 ELSE 3 END,
            v.discount_percent DESC NULLS LAST
    ),
    
    departments_with_deals AS (
        SELECT 
            parent.id as department_id,
            parent.name as department_name,
            parent.handle as department_handle,
            COALESCE(parent.sort_order, 0) as department_sort_order,
            CASE 
                WHEN parent.sort_order IS NOT NULL THEN parent.sort_order
                ELSE 999
            END as sort_expr,
            COALESCE(dmi.image_url, '/images/default-department.jpg') as department_image_url,
            (
                SELECT COUNT(DISTINCT p3.id)
                FROM products p3
                JOIN product_variants v3 ON p3.id = v3.product_id AND v3.is_default = true
                JOIN shopify_categories child3 ON p3.category_id = child3.id
                WHERE child3.parent_id = parent.id
                  AND p3.status = 'approved'
                  AND v3.stock > 0
                  AND (
                      (p3.is_flash_sale = true AND p3.flash_sale_end > NOW())
                      OR (p3.is_lightning_deal = true AND p3.lightning_ends_at > NOW())
                      OR (v3.compare_at_price IS NOT NULL AND v3.compare_at_price > v3.price)
                      OR (v3.discount_percent IS NOT NULL AND v3.discount_percent >= 10)
                      OR EXISTS (SELECT 1 FROM deals_active_coupons dac WHERE dac.product_id = p3.id)
                  )
            ) as total_deals_count,
            0 as trending_count
        FROM shopify_categories parent
        LEFT JOIN dept_main_images dmi ON parent.id = dmi.department_id
        WHERE parent.is_active = true
          AND parent.show_in_navbar = true
          AND parent.level IN (1,2)
          AND EXISTS (
              SELECT 1
              FROM shopify_categories child
              JOIN products p ON child.id = p.category_id
              JOIN product_variants v ON p.id = v.product_id AND v.is_default = true
              WHERE child.parent_id = parent.id
                AND child.is_active = true
                AND p.status = 'approved'
                AND v.stock > 0
                AND (
                    (p.is_flash_sale = true AND p.flash_sale_end > NOW())
                    OR (p.is_lightning_deal = true AND p.lightning_ends_at > NOW())
                    OR (v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price)
                    OR (v.discount_percent IS NOT NULL AND v.discount_percent >= 10)
                    OR EXISTS (SELECT 1 FROM deals_active_coupons dac WHERE dac.product_id = p.id)
                )
          )
        ORDER BY sort_expr, total_deals_count DESC
        LIMIT actual_departments_limit
    ),
    
    categories_with_deals AS (
        SELECT 
            dwd.department_id,
            dwd.department_name,
            dwd.department_handle,
            dwd.department_image_url,
            dwd.department_sort_order,
            sc.id as category_id,
            sc.name as category_name,
            sc.handle as category_handle,
            COUNT(DISTINCT p.id) as category_deals_count,
            AVG(
                CASE 
                    WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > 0 
                    THEN ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0) * 100)
                    ELSE COALESCE(v.discount_percent, 0)
                END
            ) as avg_discount_percent,
            BOOL_OR(
                CASE 
                    WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > 0 
                    THEN ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0) * 100)
                    ELSE COALESCE(v.discount_percent, 0)
                END >= 30
            ) as has_hot_deal,
            FIRST_VALUE(p.id) OVER (
                PARTITION BY sc.id 
                ORDER BY 
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM deals_active_coupons dac WHERE dac.product_id = p.id) THEN 1
                        WHEN p.is_flash_sale = true THEN 2
                        WHEN p.is_lightning_deal = true THEN 3
                        WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price 
                            AND ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)) >= 0.3 THEN 4
                        ELSE 5
                    END,
                    CASE 
                        WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > 0 
                        THEN ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0))
                        ELSE COALESCE(v.discount_percent, 0) / 100.0
                    END DESC,
                    p.rating DESC NULLS LAST
            ) as featured_product_id,
            ROW_NUMBER() OVER (
                PARTITION BY dwd.department_id, sc.id
                ORDER BY 
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM deals_active_coupons dac WHERE dac.product_id = p.id) THEN 1
                        WHEN p.is_flash_sale = true THEN 2
                        WHEN p.is_lightning_deal = true THEN 3
                        WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price 
                            AND ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)) >= 0.3 THEN 4
                        ELSE 5
                    END,
                    CASE 
                        WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > 0 
                        THEN ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0))
                        ELSE COALESCE(v.discount_percent, 0) / 100.0
                    END DESC
            ) as rn
        FROM departments_with_deals dwd
        JOIN shopify_categories sc ON sc.parent_id = dwd.department_id AND sc.is_active = true
        JOIN products p ON p.category_id = sc.id AND p.status = 'approved'
        JOIN product_variants v ON p.id = v.product_id AND v.is_default = true
        WHERE v.stock > 0
          AND (
              (p.is_flash_sale = true AND p.flash_sale_end > NOW())
              OR (p.is_lightning_deal = true AND p.lightning_ends_at > NOW())
              OR (v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price)
              OR (v.discount_percent IS NOT NULL AND v.discount_percent >= 10)
              OR EXISTS (SELECT 1 FROM deals_active_coupons dac WHERE dac.product_id = p.id)
          )
        GROUP BY 
            dwd.department_id, dwd.department_name, dwd.department_handle, 
            dwd.department_image_url, dwd.department_sort_order,
            sc.id, sc.name, sc.handle, p.id, v.compare_at_price, v.price, v.discount_percent
    ),
    
    featured_images AS (
        SELECT DISTINCT ON (product_id)
            product_id,
            image_url
        FROM media
        WHERE is_main = true OR position = 1
        ORDER BY product_id, is_main DESC NULLS LAST, position ASC
    ),
    
    featured_product_details AS (
        SELECT DISTINCT ON (cwd.category_id)
            cwd.category_id,
            p.id as product_id,
            p.title as product_title,
            v.price,
            v.compare_at_price as original_price,
            CASE 
                WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > 0 
                THEN ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0) * 100)
                ELSE COALESCE(v.discount_percent, 0)
            END as discount_percent,
            COALESCE(fi.image_url, '/images/default-product.jpg') as image_url,
            CASE 
                WHEN EXISTS (SELECT 1 FROM deals_active_coupons dac WHERE dac.product_id = p.id) THEN 'coupon'
                WHEN p.is_flash_sale = true THEN 'flash_sale'
                WHEN p.is_lightning_deal = true THEN 'lightning_deal'
                WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price 
                    AND ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)) >= 0.3 THEN 'hot_discount'
                ELSE 'discount'
            END as deal_type
        FROM categories_with_deals cwd
        JOIN products p ON p.id = cwd.featured_product_id
        JOIN product_variants v ON p.id = v.product_id AND v.is_default = true
        LEFT JOIN featured_images fi ON p.id = fi.product_id
        WHERE cwd.rn = 1
        ORDER BY cwd.category_id
    ),
    
    ranked_categories AS (
        SELECT 
            cwd.department_id,
            cwd.department_name,
            cwd.department_handle,
            cwd.department_image_url,
            cwd.department_sort_order,
            cwd.category_id,
            cwd.category_name,
            cwd.category_handle,
            cwd.category_deals_count,
            CAST(COALESCE(cwd.avg_discount_percent, 0) AS NUMERIC(10,1)) as avg_discount_percent,
            COALESCE(cwd.has_hot_deal, false) as has_hot_deal,
            fpd.product_id as featured_product_id,
            fpd.product_title as featured_product_title,
            fpd.image_url as featured_product_image,
            fpd.price as featured_product_price,
            fpd.original_price as featured_product_original_price,
            fpd.discount_percent as featured_product_discount,
            fpd.deal_type as featured_product_deal_type,
            (LOG(GREATEST(cwd.category_deals_count * 2 + 1, 1)) * 0.6 + 
             LEAST(cwd.avg_discount_percent / 100.0, 0.4) * 0.4) as category_score,
            ROW_NUMBER() OVER (
                PARTITION BY cwd.department_id
                ORDER BY 
                    (LOG(GREATEST(cwd.category_deals_count * 2 + 1, 1)) * 0.6 + 
                     LEAST(cwd.avg_discount_percent / 100.0, 0.4) * 0.4) DESC,
                    cwd.category_deals_count DESC
            ) as rank_in_department
        FROM categories_with_deals cwd
        LEFT JOIN featured_product_details fpd ON cwd.category_id = fpd.category_id
        WHERE cwd.rn = 1
    ),
    
    final_departments AS (
        SELECT 
            rc.department_id,
            rc.department_name,
            rc.department_handle,
            rc.department_image_url,
            rc.department_sort_order,
            jsonb_agg(
                jsonb_build_object(
                    'id', rc.category_id,
                    'name', rc.category_name,
                    'handle', rc.category_handle,
                    'deals_count', rc.category_deals_count,
                    'avg_discount', rc.avg_discount_percent,
                    'has_hot_deal', rc.has_hot_deal,
                    'score', rc.category_score,
                    'featured_product', CASE WHEN rc.featured_product_id IS NOT NULL THEN
                        jsonb_build_object(
                            'id', rc.featured_product_id,
                            'title', rc.featured_product_title,
                            'image_url', rc.featured_product_image,
                            'price', rc.featured_product_price,
                            'original_price', rc.featured_product_original_price,
                            'discount_percent', rc.featured_product_discount,
                            'deal_type', rc.featured_product_deal_type,
                            'category_id', rc.category_id
                        )
                    ELSE NULL END
                )
                ORDER BY rc.category_score DESC
            ) as categories,
            COUNT(*) as total_categories,
            SUM(rc.category_deals_count) as total_department_deals,
            MAX(rc.category_score) as top_category_score
        FROM ranked_categories rc
        WHERE rc.rank_in_department <= categories_per_department
          AND rc.category_deals_count >= min_deals_per_category
        GROUP BY 
            rc.department_id, rc.department_name, rc.department_handle,
            rc.department_image_url, rc.department_sort_order
        ORDER BY rc.department_sort_order, top_category_score DESC
    )
    
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', fd.department_id,
            'name', fd.department_name,
            'handle', fd.department_handle,
            'image_url', fd.department_image_url,
            'sort_order', fd.department_sort_order,
            'total_deals', fd.total_department_deals,
            'category_count', fd.total_categories,
            'categories', fd.categories
        )
    ) INTO department_results
    FROM final_departments fd;
    
  ELSE
    department_results := '[]'::jsonb;
  END IF;
  
  -- 3. COMBINE RESULTS
  SELECT jsonb_build_object(
      'products', COALESCE(product_results, '[]'::jsonb),
      'departments', COALESCE(department_results, '[]'::jsonb),
      'metadata', jsonb_build_object(
          'user_id', p_user_param,
          'product_count', jsonb_array_length(COALESCE(product_results, '[]'::jsonb)),
          'department_count', jsonb_array_length(COALESCE(department_results, '[]'::jsonb)),
          'has_sufficient_history', user_has_sufficient_history,
          'history_count', user_history_count,
          'filtered_category', filtered_category_id,
          'is_category_filtered', (filtered_category_id IS NOT NULL),
          'timestamp', NOW(),
          'scoring_info', jsonb_build_object(
              'score_range_min', 40,
              'score_range_max', 90,
              'personalization_weight', CASE WHEN user_has_sufficient_history THEN 55 ELSE 0 END
          )
      )
  ) INTO final_result;
  
  RETURN final_result;
END;
$$;
