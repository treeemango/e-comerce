-- Optimized version of get_personalized_suggestions_v2 with performance improvements
-- Breaks down complex CTEs and adds timeouts/fallbacks

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
SECURITY DEFINER
AS $$
DECLARE
  product_results JSONB;
  department_results JSONB;
  final_result JSONB;
  user_history_count INT;
  user_has_sufficient_history BOOLEAN;
  filtered_category_id UUID;
  actual_departments_limit INT;
  start_time TIMESTAMP := clock_timestamp();
BEGIN
  -- Set statement timeout to 25 seconds (leaving buffer before DB timeout)
  SET LOCAL statement_timeout = '25000ms';

  -- Convert category_filter to UUID if provided
  filtered_category_id := NULLIF(category_filter, '')::UUID;

  -- Handle backward compatibility
  actual_departments_limit := COALESCE(departments_limit, categories_limit);

  -- Check if user has sufficient history for personalization (with timeout protection)
  BEGIN
    SELECT
      COALESCE(
        (SELECT COUNT(*) FROM user_product_views WHERE user_id = p_user_param::UUID AND viewed_at > NOW() - INTERVAL '30 days' ) +
        (SELECT COUNT(*) FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.user_id = p_user_param::UUID AND o.status IN ('completed', 'shipped') AND o.created_at > NOW() - INTERVAL '90 days'),
        0
      ) INTO user_history_count;
    user_has_sufficient_history := (user_history_count >= 3);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: assume no history if query fails
    user_history_count := 0;
    user_has_sufficient_history := false;
    RAISE WARNING 'Failed to check user history, using fallback: %', SQLERRM;
  END;

  -- Get base products with simplified logic
  WITH base_products AS (
    SELECT
      p.id,
      p.title,
      p.description,
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
      -- Simplified discount calculation
      CASE
        WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price THEN
          ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)) * 100
        WHEN v.discount_percent IS NOT NULL THEN v.discount_percent
        ELSE 0
      END as total_discount_percent,
      -- Simplified media (just main image for performance)
      COALESCE(
        (SELECT m.image_url FROM media m WHERE m.product_id = p.id AND m.is_main = true LIMIT 1),
        (SELECT m.image_url FROM media m WHERE m.product_id = p.id ORDER BY m.position ASC LIMIT 1),
        '/images/default-product.jpg'
      ) as product_image_url,
      -- Vendor info
      vd.address_country AS vendor_country,
      -- Deal type (simplified)
      CASE
        WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price
            AND ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)) >= 0.3 THEN 'hot_discount'
        WHEN v.discount_percent IS NOT NULL AND v.discount_percent >= 30 THEN 'hot_discount'
        WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price THEN 'discount'
        WHEN v.discount_percent IS NOT NULL AND v.discount_percent >= 10 THEN 'discount'
        ELSE 'standard'
      END AS deal_type,
      p.has_quantity_discount,
      p.listing_type,
      p.condition,
      p.is_featured,
      p.is_new,
      p.is_on_sale,
      p.slug
    FROM products p
    JOIN product_variants v ON p.id = v.product_id AND v.is_default = true
    LEFT JOIN vendors vd ON p.seller_id = vd.user_id
    WHERE p.status = 'approved'
      AND v.stock >= min_stock
      AND (p.rating IS NULL OR p.rating >= min_rating)
      AND (filtered_category_id IS NULL OR p.category_id = filtered_category_id)
  ),

  -- Simplified user preferences (only if user has history)
  user_preferences AS (
    SELECT
      bp.id as product_id,
      CASE
        WHEN NOT user_has_sufficient_history THEN 0
        WHEN bp.category_id IN (
          SELECT category_id FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          JOIN products p ON oi.product_id = p.id
          WHERE o.user_id = p_user_param::UUID
            AND o.status IN ('completed', 'shipped')
            AND o.created_at > NOW() - INTERVAL '90 days'
          GROUP BY category_id
          ORDER BY COUNT(*) DESC
          LIMIT 5
        ) THEN 1.0
        WHEN bp.vendor_id IN (
          SELECT p.seller_id FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          JOIN products p ON oi.product_id = p.id
          WHERE o.user_id = p_user_param::UUID
            AND o.status IN ('completed', 'shipped')
            AND o.created_at > NOW() - INTERVAL '90 days'
          GROUP BY p.seller_id
          ORDER BY COUNT(*) DESC
          LIMIT 3
        ) THEN 0.8
        ELSE 0
      END as preference_score
    FROM base_products bp
  ),

  -- Simplified scoring
  scored_products AS (
    SELECT
      bp.*,
      COALESCE(up.preference_score, 0) as preference_score,
      -- Simplified scoring algorithm
      CASE
        WHEN NOT user_has_sufficient_history THEN
          -- Non-personalized scoring
          (CASE WHEN bp.rating >= 4.5 THEN 1.0 WHEN bp.rating >= 4.0 THEN 0.8 ELSE 0.6 END) * 40 +  -- Quality
          (CASE WHEN bp.created_at > NOW() - INTERVAL '7 days' THEN 1.0
                WHEN bp.created_at > NOW() - INTERVAL '30 days' THEN 0.7 ELSE 0.3 END) * 30 +  -- Freshness
          (LEAST(bp.total_discount_percent / 100.0, 0.5)) * 30  -- Discount value
        ELSE
          -- Personalized scoring
          (COALESCE(up.preference_score, 0) * 60) +  -- Personal preference
          (CASE WHEN bp.rating >= 4.5 THEN 1.0 WHEN bp.rating >= 4.0 THEN 0.8 ELSE 0.6 END) * 25 +  -- Quality
          (LEAST(bp.total_discount_percent / 100.0, 0.5)) * 15  -- Discount value
      END as calculated_score
    FROM base_products bp
    LEFT JOIN user_preferences up ON bp.id = up.product_id
  ),

  -- Ranked products
  ranked_products AS (
    SELECT *
    FROM scored_products
    WHERE stock >= min_stock
    ORDER BY calculated_score DESC, sales_count DESC, created_at DESC
    LIMIT p_limit
  )

  -- Build final product results
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', rp.id,
      'title', rp.title,
      'slug', rp.slug,
      'description', rp.description,
      'image_url', rp.product_image_url,
      'currency', rp.currency,
      'price', rp.base_price,
      'originalPrice', rp.original_price,
      'discountPercent', CAST(rp.total_discount_percent AS NUMERIC(10,1)),
      'rating', rp.rating,
      'deal_type', rp.deal_type,
      'category_id', rp.category_id,
      'score', ROUND(GREATEST(LEAST(rp.calculated_score, 90), 40)::NUMERIC, 1),
      'personalization_score', ROUND(COALESCE(rp.preference_score, 0)::NUMERIC, 2),
      'in_stock', rp.stock > 0,
      'stock', rp.stock,
      'vendor_country', rp.vendor_country,
      'sales_count', rp.sales_count,
      'listing_type', rp.listing_type,
      'condition', rp.condition,
      'is_featured', rp.is_featured,
      'is_new', rp.is_new,
      'is_on_sale', rp.is_on_sale
    )
  ) INTO product_results
  FROM ranked_products rp;

  -- Simplified department logic (only if categories requested)
  IF include_categories AND filtered_category_id IS NULL THEN
    -- Very basic department query to avoid timeouts
    WITH basic_departments AS (
      SELECT
        sc.id as department_id,
        sc.name as department_name,
        sc.handle as department_handle,
        COUNT(DISTINCT p.id) as total_deals_count,
        AVG(
          CASE
            WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > 0
            THEN ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0) * 100)
            ELSE COALESCE(v.discount_percent, 0)
          END
        ) as avg_discount_percent
      FROM shopify_categories sc
      JOIN products p ON sc.id = p.category_id
      JOIN product_variants v ON p.id = v.product_id AND v.is_default = true
      WHERE sc.is_active = true
        AND sc.show_in_navbar = true
        AND sc.level IN (1,2)
        AND p.status = 'approved'
        AND v.stock > 0
        AND (
          v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price
          OR v.discount_percent IS NOT NULL AND v.discount_percent >= 10
        )
      GROUP BY sc.id, sc.name, sc.handle
      ORDER BY total_deals_count DESC
      LIMIT actual_departments_limit
    )

    SELECT jsonb_agg(
      jsonb_build_object(
        'id', bd.department_id,
        'name', bd.department_name,
        'handle', bd.department_handle,
        'total_deals', bd.total_deals_count,
        'categories', jsonb_build_array()  -- Simplified: no category details for performance
      )
    ) INTO department_results
    FROM basic_departments bd;

  ELSE
    department_results := '[]'::jsonb;
  END IF;

  -- Build final result
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
      'query_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000,
      'timestamp', NOW(),
      'scoring_info', jsonb_build_object(
        'score_range_min', 40,
        'score_range_max', 90,
        'personalization_weight', CASE WHEN user_has_sufficient_history THEN 60 ELSE 0 END
      )
    )
  ) INTO final_result;

  RETURN final_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: return basic products without personalization if query fails
    RAISE WARNING 'get_personalized_suggestions_v2 failed after % ms: %', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000, SQLERRM;

    -- Emergency fallback query
    SELECT jsonb_build_object(
      'products', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'title', p.title,
            'slug', p.slug,
            'image_url', COALESCE(
              (SELECT m.image_url FROM media m WHERE m.product_id = p.id AND m.is_main = true LIMIT 1),
              '/images/default-product.jpg'
            ),
            'currency', p.currency,
            'price', v.price,
            'originalPrice', v.compare_at_price,
            'discountPercent', CASE
              WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price
              THEN ROUND(((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)) * 100, 1)
              ELSE 0
            END,
            'rating', p.rating,
            'deal_type', 'standard',
            'category_id', p.category_id,
            'score', 50,
            'personalization_score', 0,
            'in_stock', v.stock > 0,
            'stock', v.stock,
            'sales_count', COALESCE(p.sales_count, 0),
            'listing_type', p.listing_type,
            'condition', p.condition
          )
        )
        FROM products p
        JOIN product_variants v ON p.id = v.product_id AND v.is_default = true
        WHERE p.status = 'approved'
          AND v.stock >= min_stock
          AND (p.rating IS NULL OR p.rating >= min_rating)
          AND (filtered_category_id IS NULL OR p.category_id = filtered_category_id)
        ORDER BY p.created_at DESC
        LIMIT p_limit
      ),
      'departments', '[]'::jsonb,
      'metadata', jsonb_build_object(
        'user_id', p_user_param,
        'fallback_mode', true,
        'error_message', SQLERRM,
        'query_time_ms', EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000,
        'timestamp', NOW()
      )
    ) INTO final_result;

    RETURN final_result;
END;
$$;
