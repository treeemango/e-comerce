CREATE OR REPLACE FUNCTION get_personalized_ai_recommendations(
  p_user UUID,
  limit_count INT DEFAULT 12
)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  image_url TEXT,
  personalization FLOAT,
  trending FLOAT,
  sales FLOAT,
  final_score FLOAT
)
LANGUAGE SQL
AS $$
WITH

-- User taste profile = average of embeddings from recent views
user_profile AS (
  SELECT
    AVG(i.image_embedding) AS taste_vector
  FROM user_product_views v
  JOIN images i ON i.product_id = v.product_id
  WHERE v.user_id = p_user
),

-- Compare catalog to user taste
similarity AS (
  SELECT
    p.id,
    1 - (i.image_embedding <-> u.taste_vector) AS sim
  FROM images i
  JOIN products p ON p.id = i.product_id
  CROSS JOIN user_profile u
),

-- Use existing view_count from products table
trending AS (
  SELECT
    id as product_id,
    view_count as trending_score
  FROM products
),

-- Use existing sales_count from products table  
sales AS (
  SELECT
    id as product_id,
    sales_count as sales_score
  FROM products
)

SELECT
  p.id,
  p.title,
  m.image_url,
  COALESCE(sim.sim, 0) AS personalization,
  COALESCE(t.trending_score, 0) AS trending,
  COALESCE(s.sales_score, 0) AS sales,
  (
    (0.6 * COALESCE(sim.sim, 0)) +
    (0.25 * LEAST(COALESCE(t.trending_score, 0), 100) / 100.0) +
    (0.15 * LEAST(COALESCE(s.sales_score, 0), 50) / 50.0)
  ) AS final_score

FROM products p

LEFT JOIN similarity sim ON sim.id = p.id
LEFT JOIN trending t ON t.product_id = p.id
LEFT JOIN sales s ON s.product_id = p.id

-- Use media table for main image (has is_main flag)
LEFT JOIN media m ON m.product_id = p.id AND m.is_main = true

WHERE p.status = 'active'  -- Use your actual status column

ORDER BY final_score DESC
LIMIT limit_count;
$$;