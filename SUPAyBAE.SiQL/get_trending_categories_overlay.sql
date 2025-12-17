DROP FUNCTION IF EXISTS get_trending_categories_overlay;

CREATE OR REPLACE FUNCTION get_trending_categories_overlay(
  limit_parent_categories INT DEFAULT 35,
  limit_subcategories_per_parent INT DEFAULT 35
)
RETURNS TABLE (
  parent_category_id UUID,
  parent_category_name TEXT,
  subcategory_id UUID,
  subcategory_name TEXT,
  subcategory_handle TEXT,
  trending_product_id UUID,
  trending_product_name TEXT,
  trending_product_image_url TEXT,
  trend_score NUMERIC,
  is_hot BOOLEAN,
  is_trending BOOLEAN,
  product_count BIGINT,
  hot_badge_text TEXT,
  parent_category_sort_order INT,
  data_quality TEXT
)
LANGUAGE SQL
AS $$
WITH RECENT_WINDOW AS (
    -- Define the common time window for all trend calculations (7 days)
    SELECT NOW() - INTERVAL '7 days' AS cutoff
),
parent_categories AS (
    -- Get top-level categories (level 1 or 2) that have active subcategories with products
    SELECT DISTINCT
      pc.id,
      pc.name,
      pc.handle,
      COALESCE(pc.sort_order, 0) as sort_order
    FROM shopify_categories pc
    JOIN shopify_categories sc ON sc.parent_id = pc.id AND sc.is_active = true
    JOIN products p ON p.category_id = sc.id AND p.status IN ('active', 'approved')
    WHERE pc.level IN (1, 2) 
      AND pc.is_active = true
    ORDER BY 
      COALESCE(pc.sort_order, 0) NULLS LAST, 
      pc.name
    LIMIT limit_parent_categories
),
subcategory_trends AS (
    -- Calculate trend scores using ONLY recent (7-day) activity
    SELECT 
      sc.id as subcategory_id,
      sc.name as subcategory_name,
      sc.handle as subcategory_handle,
      sc.parent_id,
      pc.name as parent_category_name,
      pc.id as parent_category_id,
      pc.sort_order as parent_category_sort_order,
      COUNT(DISTINCT p.id) as product_count,
      COUNT(DISTINCT upv.id) as view_count,
      COUNT(DISTINCT oi.id) as sales_count,
      
      -- Smart trend scoring that adapts to data availability (using 7-day counts)
      CASE 
        WHEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 THEN
          (COUNT(DISTINCT upv.id) * 0.5) + 
          (COUNT(DISTINCT oi.id) * 0.3) +
          (LOG(GREATEST(COUNT(DISTINCT p.id), 1)) * 0.2)
        WHEN COUNT(DISTINCT upv.id) > 10 OR COUNT(DISTINCT oi.id) > 5 THEN
          (COUNT(DISTINCT upv.id) * 0.4) + 
          (COUNT(DISTINCT oi.id) * 0.2) +
          (COUNT(DISTINCT p.id) * 0.4)
        ELSE
          (COUNT(DISTINCT p.id) * 0.8) +
          (LOG(GREATEST(COUNT(DISTINCT upv.id), 1)) * 0.15) +
          (LOG(GREATEST(COUNT(DISTINCT oi.id), 1)) * 0.05)
      END as trend_score,
      
      -- Data quality indicator
      CASE 
        WHEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 THEN 'high'
        WHEN COUNT(DISTINCT upv.id) > 10 OR COUNT(DISTINCT oi.id) > 5 THEN 'medium'
        ELSE 'basic'
      END as data_quality,
      
      -- Dynamic thresholds that scale with data quality
      CASE 
        WHEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 THEN
          COUNT(DISTINCT upv.id) > 100 OR COUNT(DISTINCT oi.id) > 40
        WHEN COUNT(DISTINCT upv.id) > 10 OR COUNT(DISTINCT oi.id) > 5 THEN
          COUNT(DISTINCT upv.id) > 25 OR COUNT(DISTINCT oi.id) > 10 OR COUNT(DISTINCT p.id) > 15
        ELSE
          COUNT(DISTINCT p.id) >= 8
      END as is_hot,
      
      CASE 
        WHEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 THEN
          COUNT(DISTINCT upv.id) > 200 OR COUNT(DISTINCT oi.id) > 80
        WHEN COUNT(DISTINCT upv.id) > 10 OR COUNT(DISTINCT oi.id) > 5 THEN
          COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 OR COUNT(DISTINCT p.id) > 25
        ELSE
          COUNT(DISTINCT p.id) >= 15
      END as is_trending,
      
      -- Smart badge text that reflects data quality
      CASE 
        WHEN COUNT(DISTINCT upv.id) > 200 OR COUNT(DISTINCT oi.id) > 80 THEN '🔥 HOT'
        WHEN COUNT(DISTINCT upv.id) > 100 OR COUNT(DISTINCT oi.id) > 40 THEN '🚀 TRENDING'
        WHEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 THEN '↑ POPULAR'
        WHEN COUNT(DISTINCT upv.id) > 25 OR COUNT(DISTINCT oi.id) > 10 THEN '📈 RISING'
        WHEN COUNT(DISTINCT p.id) >= 15 THEN '🆕 NEW'
        WHEN COUNT(DISTINCT p.id) >= 8 THEN '✨ FRESH'
        ELSE ''
      END as hot_badge_text
      
    FROM shopify_categories sc
    JOIN parent_categories pc ON sc.parent_id = pc.id
    JOIN RECENT_WINDOW rw ON TRUE 
    LEFT JOIN products p ON p.category_id = sc.id AND p.status IN ('active', 'approved')
    
    -- Filter views by 7-day window
    LEFT JOIN user_product_views upv 
      ON upv.product_id = p.id AND upv.viewed_at > rw.cutoff
      
    -- Filter sales by 7-day window
    LEFT JOIN order_items oi 
      ON oi.product_id = p.id
    LEFT JOIN orders o 
      ON o.id = oi.order_id AND o.created_at > rw.cutoff
      
    WHERE sc.level IN (2, 3, 4, 5)
      AND sc.is_active = true
    GROUP BY sc.id, sc.name, sc.handle, sc.parent_id, pc.name, pc.id, pc.sort_order
    HAVING COUNT(DISTINCT p.id) > 0
),
trending_products AS (
    -- Get the most trending product from each subcategory with its main image
    SELECT 
      p.category_id,
      p.id as product_id,
      p.title as product_name,  -- Changed from p.name to p.title
      -- Get the main product image from media table (subqueries are not filtered by time here, which is standard)
      COALESCE(
        -- First: Main image (is_main = true)
        (SELECT m.image_url FROM media m WHERE m.product_id = p.id AND m.is_main = true LIMIT 1),
        -- Second: Any image ordered by position
        (SELECT m.image_url FROM media m WHERE m.product_id = p.id ORDER BY m.position ASC LIMIT 1),
        -- Fallback: Default image
        '/images/default-product.jpg'
      ) as product_image_url,
      
      -- *** FIX APPLIED HERE: Use 7-day data for product engagement score and ranking ***
      (
        (COUNT(DISTINCT upv.id) * 0.6) + 
        (COUNT(DISTINCT oi.id) * 0.4) 
      ) as product_engagement_score,
      ROW_NUMBER() OVER (
        PARTITION BY p.category_id 
        ORDER BY 
          -- Primary: Product engagement (views + sales)
          (COUNT(DISTINCT upv.id) * 0.6 + COUNT(DISTINCT oi.id) * 0.4) DESC,
          -- Secondary: Use product's built-in popularity/view_count if available (non-recent data is a good tie-breaker)
          p.view_count DESC,
          p.created_at DESC
      ) as rank_within_category
    FROM products p
    -- Bring cutoff into scope
    JOIN RECENT_WINDOW rw ON TRUE
    
    -- Filter views by 7-day window
    LEFT JOIN user_product_views upv 
        ON upv.product_id = p.id AND upv.viewed_at > rw.cutoff
        
    -- Filter sales by 7-day window
    LEFT JOIN order_items oi 
        ON oi.product_id = p.id
    LEFT JOIN orders o 
        ON o.id = oi.order_id AND o.created_at > rw.cutoff
        
    WHERE p.status IN ('active', 'approved')
      AND p.category_id IN (SELECT subcategory_id FROM subcategory_trends)
    GROUP BY 
      p.category_id, 
      p.id, 
      p.title,  -- Changed from p.name to p.title
      p.view_count,
      p.created_at
),
ranked_subcategories AS (
    -- Rank subcategories within each parent category
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY parent_category_id 
        ORDER BY 
          trend_score DESC,
          product_count DESC,
          subcategory_name
      ) as subcategory_rank
    FROM subcategory_trends
)
SELECT 
    rs.parent_category_id,
    rs.parent_category_name,
    rs.subcategory_id,
    rs.subcategory_name,
    rs.subcategory_handle,
    tp.product_id as trending_product_id,
    tp.product_name as trending_product_name,
    tp.product_image_url as trending_product_image_url,
    rs.trend_score,
    rs.is_hot,
    rs.is_trending,
    rs.product_count,
    rs.hot_badge_text,
    rs.parent_category_sort_order,
    rs.data_quality
FROM ranked_subcategories rs
LEFT JOIN trending_products tp ON 
    tp.category_id = rs.subcategory_id AND 
    tp.rank_within_category = 1 
WHERE rs.subcategory_rank <= limit_subcategories_per_parent
ORDER BY 
    rs.parent_category_sort_order,
    rs.parent_category_name,
    rs.trend_score DESC,
    rs.product_count DESC;
$$;