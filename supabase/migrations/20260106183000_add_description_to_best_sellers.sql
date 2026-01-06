-- ==============================================================================
-- Migration: Add description field to best selling and top rated products RPCs
-- This ensures product cards show descriptions on hover in all sections
-- ==============================================================================

-- A. UPDATE BEST SELLING PRODUCTS
DROP FUNCTION IF EXISTS get_best_selling_products(text, uuid, int);

CREATE OR REPLACE FUNCTION get_best_selling_products(
  time_interval text DEFAULT 'week',
  p_user_id uuid DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  product_image_url text,
  price numeric,
  currency text,
  total_sold bigint,
  revenue numeric,
  trend_score numeric,
  category_id uuid,
  category_name text,
  is_personalized boolean,
  ranking bigint,
  rating numeric,
  review_count int,
  free_delivery boolean,
  is_express_delivery boolean,
  delivery_time_estimate text,
  delivery_locations text[],
  vendor_country text,
  description text,
  meta_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_interval interval;
  v_cutoff timestamptz;
BEGIN
  IF time_interval = 'month' OR time_interval ILIKE '%30 days%' THEN 
    v_interval := '30 days'::interval;
  ELSIF time_interval = 'week' OR time_interval ILIKE '%7 days%' THEN
    v_interval := '7 days'::interval;
  ELSE
    BEGIN
      v_interval := time_interval::interval;
    EXCEPTION WHEN OTHERS THEN
      v_interval := '7 days'::interval;
    END;
  END IF;
  
  v_cutoff := NOW() - v_interval;

  RETURN QUERY
  WITH user_categories AS (
    SELECT DISTINCT sub_t.cat_id FROM (
      SELECT p.category_id as cat_id FROM user_product_views upv JOIN products p ON p.id = upv.product_id WHERE upv.user_id = p_user_id AND upv.viewed_at > (NOW() - '30 days'::interval)
      UNION ALL
      SELECT p.category_id as cat_id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id WHERE o.user_id = p_user_id AND o.created_at > (NOW() - '90 days'::interval)
    ) sub_t WHERE p_user_id IS NOT NULL
  ),
  product_stats AS (
    SELECT p.id as pid, SUM(oi.quantity) as sold_cnt, SUM(oi.quantity * oi.unit_price) as total_revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id
    WHERE o.created_at > v_cutoff AND p.status IN ('approved', 'published', 'active')
    GROUP BY p.id HAVING SUM(oi.quantity) > 0
  ),
  scored_products AS (
    SELECT 
      p.id as out_id, 
      p.title as out_title,
      COALESCE(
        (SELECT m.image_url FROM media m WHERE m.product_id = p.id AND m.is_main = true LIMIT 1),
        (SELECT m.image_url FROM media m WHERE m.product_id = p.id ORDER BY m.position ASC LIMIT 1),
        '/images/default-product.jpg'
      ) as out_image,
      p.min_price as out_price, 
      p.currency as out_currency, 
      ps.sold_cnt, 
      ps.total_revenue, 
      p.category_id as out_cat_id, 
      sc.name as out_cat_name,
      p.rating as out_rating,
      p.review_count as out_review_count,
      p.free_delivery as out_free_delivery,
      p.is_express_delivery as out_is_express,
      p.delivery_time_estimate::text as out_delivery_est,
      p.delivery_locations as out_delivery_locs,
      v.address_country::text as out_vendor_country,
      (ps.sold_cnt * 2.0 + LOG(GREATEST(ps.total_revenue, 1))) as out_raw_score,
      CASE WHEN uc.cat_id IS NOT NULL THEN true ELSE false END as out_personalized,
      p.description as out_description,
      p.meta_description as out_meta_description
    FROM product_stats ps JOIN products p ON p.id = ps.pid
    LEFT JOIN shopify_categories sc ON sc.id = p.category_id
    LEFT JOIN user_categories uc ON uc.cat_id = p.category_id
    LEFT JOIN vendors v ON v.user_id = p.seller_id
  )
  SELECT 
    sp.out_id, 
    sp.out_title, 
    sp.out_image, 
    sp.out_price, 
    sp.out_currency, 
    sp.sold_cnt, 
    sp.total_revenue, 
    sp.out_raw_score, 
    sp.out_cat_id, 
    sp.out_cat_name, 
    sp.out_personalized,
    ROW_NUMBER() OVER (ORDER BY (CASE WHEN sp.out_personalized THEN 1.2 ELSE 1.0 END * sp.out_raw_score) DESC) as out_rnk,
    sp.out_rating,
    sp.out_review_count,
    sp.out_free_delivery,
    sp.out_is_express,
    sp.out_delivery_est,
    sp.out_delivery_locs,
    sp.out_vendor_country,
    sp.out_description,
    sp.out_meta_description
  FROM scored_products sp ORDER BY out_rnk ASC LIMIT p_limit;
END;
$$;

-- B. UPDATE TOP RATED PRODUCTS
DROP FUNCTION IF EXISTS get_top_rated_products(int);

CREATE OR REPLACE FUNCTION get_top_rated_products(p_limit int DEFAULT 20)
RETURNS TABLE (
    product_id uuid,
    product_name text,
    product_image_url text,
    price numeric,
    currency text,
    avg_rating numeric,
    review_count int,
    ranking bigint,
    free_delivery boolean,
    is_express_delivery boolean,
    delivery_time_estimate text,
    delivery_locations text[],
    vendor_country text,
    description text,
    meta_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, 
        p.title,
        COALESCE(
            (SELECT m.image_url FROM media m WHERE m.product_id = p.id AND m.is_main = true LIMIT 1),
            (SELECT m.image_url FROM media m WHERE m.product_id = p.id ORDER BY m.position ASC LIMIT 1),
            '/images/default-product.jpg'
        ) as image_url,
        p.min_price, 
        p.currency, 
        p.rating,
        p.review_count,
        ROW_NUMBER() OVER (
            ORDER BY 
                p.rating DESC, 
                p.review_count DESC,
                p.sales_count DESC
        ) as rnk,
        p.free_delivery,
        p.is_express_delivery,
        p.delivery_time_estimate::text,
        p.delivery_locations,
        v.address_country::text,
        p.description,
        p.meta_description
    FROM products p
    LEFT JOIN vendors v ON v.user_id = p.seller_id
    WHERE p.status IN ('approved', 'published', 'active')
    AND p.rating >= 4.0
    ORDER BY rnk ASC
    LIMIT p_limit;
END;
$$;

-- PERMISSIONS
GRANT EXECUTE ON FUNCTION get_best_selling_products(text, uuid, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_top_rated_products(int) TO authenticated, anon;
