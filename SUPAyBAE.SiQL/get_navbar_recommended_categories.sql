DROP FUNCTION IF EXISTS get_navbar_recommended_categories;

CREATE OR REPLACE FUNCTION get_navbar_recommended_categories(
  department_limit INT DEFAULT 4,
  categories_per_department INT DEFAULT 8
)
RETURNS TABLE (
  department_id UUID,
  department_name TEXT,
  department_handle TEXT,
  category_id UUID,
  category_name TEXT,
  category_handle TEXT,
  trending_product_id UUID,
  trending_product_name TEXT,
  trending_product_image_url TEXT,
  trend_score NUMERIC,
  is_hot BOOLEAN,
  product_count BIGINT,
  department_sort_order INT
)
LANGUAGE SQL
AS $$
WITH RECENT_WINDOW AS (
    -- Define the common time window for all trend calculations (7 days)
    SELECT NOW() - INTERVAL '7 days' AS cutoff
),
department_candidates AS (
    SELECT DISTINCT 
        parent.id,
        parent.name,
        parent.handle,
        COALESCE(parent.sort_order,0) AS sort_order
    FROM shopify_categories parent
    JOIN shopify_categories child
      ON child.parent_id = parent.id AND child.is_active = true
    JOIN products p
      ON p.category_id = child.id AND p.status IN ('active','approved')
    WHERE parent.is_active = true 
      AND parent.show_in_navbar = true
      AND parent.level IN (1,2)
),
popular_departments AS (
    SELECT
        dc.id,
        dc.name AS department_name,
        dc.handle AS department_handle,
        dc.sort_order AS department_sort_order,
        COUNT(DISTINCT p.id) AS total_products,
        COUNT(DISTINCT upv.id) AS total_views,
        COUNT(DISTINCT oi.id) AS total_sales,
        (
            COALESCE(COUNT(DISTINCT upv.id),0) * 0.6 +
            COALESCE(COUNT(DISTINCT oi.id),0) * 0.4
        ) AS department_popularity
    FROM department_candidates dc
    LEFT JOIN shopify_categories child
           ON child.parent_id = dc.id AND child.is_active = true
    LEFT JOIN products p
           ON p.category_id = child.id AND p.status IN ('active','approved')
    LEFT JOIN RECENT_WINDOW rw ON TRUE
    LEFT JOIN user_product_views upv
           ON upv.product_id = p.id AND upv.viewed_at > rw.cutoff
    LEFT JOIN order_items oi
           ON oi.product_id = p.id
    LEFT JOIN orders o
           ON o.id = oi.order_id AND o.created_at > rw.cutoff
    GROUP BY dc.id, dc.name, dc.handle, dc.sort_order
    HAVING COUNT(DISTINCT p.id) > 0  -- ensures real posted products
    ORDER BY department_popularity DESC
    LIMIT department_limit
),
subcategory_trends AS (
    SELECT
        pd.id AS department_id,
        pd.department_name,
        pd.department_handle,
        pd.department_sort_order,
        sc.id AS category_id,
        sc.name AS category_name,
        sc.handle AS category_handle,
        COUNT(DISTINCT p.id) AS product_count,
        (
            COALESCE(COUNT(DISTINCT upv.id),0) * 0.5 +
            COALESCE(COUNT(DISTINCT oi.id),0) * 0.3 +
            (LOG(GREATEST(COUNT(DISTINCT p.id),1)) * 0.2)
        ) AS trend_score,
        (
            COUNT(DISTINCT upv.id) >= 20
            OR COUNT(DISTINCT oi.id) >= 10
        ) AS is_hot
    FROM popular_departments pd
    JOIN shopify_categories sc
          ON sc.parent_id = pd.id
         AND sc.is_active = true
    LEFT JOIN RECENT_WINDOW rw ON TRUE
    LEFT JOIN products p
          ON p.category_id = sc.id AND p.status IN ('active','approved')
    LEFT JOIN user_product_views upv
          ON upv.product_id = p.id AND upv.viewed_at > rw.cutoff
    LEFT JOIN order_items oi
          ON oi.product_id = p.id
    LEFT JOIN orders o
          ON o.id = oi.order_id AND o.created_at > rw.cutoff
    GROUP BY pd.id, pd.department_name, pd.department_handle, pd.department_sort_order,
             sc.id, sc.name, sc.handle
    HAVING COUNT(DISTINCT p.id) > 0  -- ensures only categories with real products
),
trending_products AS (
    -- Get the most trending product from each subcategory with its main image
    SELECT 
      p.category_id,
      p.id as product_id,
      p.title as product_name,  -- Changed from p.name to p.title
      -- Get the main product image from media table
      COALESCE(
        -- First: Main image (is_main = true)
        (SELECT m.image_url FROM media m WHERE m.product_id = p.id AND m.is_main = true LIMIT 1),
        -- Second: Any image ordered by position
        (SELECT m.image_url FROM media m WHERE m.product_id = p.id ORDER BY m.position ASC LIMIT 1),
        -- Fallback: Default image
        '/images/default-product.jpg'
      ) as product_image_url,
      
      -- Calculate product engagement score using 7-day data
      (
        (COUNT(DISTINCT upv.id) * 0.6) + 
        (COUNT(DISTINCT oi.id) * 0.4) 
      ) as product_engagement_score,
      ROW_NUMBER() OVER (
        PARTITION BY p.category_id 
        ORDER BY 
          -- Primary: Product engagement (views + sales)
          (COUNT(DISTINCT upv.id) * 0.6 + COUNT(DISTINCT oi.id) * 0.4) DESC,
          -- Secondary: Use product's built-in popularity/view_count if available
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
      AND p.category_id IN (SELECT category_id FROM subcategory_trends)
    GROUP BY 
      p.category_id, 
      p.id, 
      p.title,  -- Changed from p.name to p.title
      p.view_count,
      p.created_at
),
ranked_categories AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY department_id
            ORDER BY trend_score DESC, product_count DESC
        ) AS rank_in_department
    FROM subcategory_trends
)
SELECT
    rc.department_id,
    rc.department_name,
    rc.department_handle,
    rc.category_id,
    rc.category_name,
    rc.category_handle,
    tp.product_id as trending_product_id,
    tp.product_name as trending_product_name,
    tp.product_image_url as trending_product_image_url,
    rc.trend_score,
    rc.is_hot,
    rc.product_count,
    rc.department_sort_order
FROM ranked_categories rc
LEFT JOIN trending_products tp ON 
    tp.category_id = rc.category_id AND 
    tp.rank_within_category = 1 
WHERE rc.rank_in_department <= categories_per_department
ORDER BY rc.department_sort_order, rc.trend_score DESC;
$$;