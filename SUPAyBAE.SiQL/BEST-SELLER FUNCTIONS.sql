-- Best Sellers - Last 7 Days (with revenue)
CREATE OR REPLACE FUNCTION get_best_sellers_7days(
  limit_count INT DEFAULT 12
)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  image_url TEXT,
  total_sold BIGINT,
  revenue NUMERIC,
  time_period TEXT
)
LANGUAGE SQL
AS $$
  SELECT 
    p.id as product_id,
    p.title,
    m.image_url,
    SUM(oi.quantity) as total_sold,
    SUM(oi.quantity * oi.unit_price) as revenue,
    '7_days' as time_period
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  LEFT JOIN media m ON m.product_id = p.id AND m.is_main = true
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at > NOW() - INTERVAL '7 days'
    AND p.status = 'active'
  GROUP BY p.id, p.title, m.image_url
  ORDER BY total_sold DESC
  LIMIT limit_count;
$$;

-- Best Sellers - Last 14 Days (with revenue)
CREATE OR REPLACE FUNCTION get_best_sellers_14days(
  limit_count INT DEFAULT 12
)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  image_url TEXT,
  total_sold BIGINT,
  revenue NUMERIC,
  time_period TEXT
)
LANGUAGE SQL
AS $$
  SELECT 
    p.id as product_id,
    p.title,
    m.image_url,
    SUM(oi.quantity) as total_sold,
    SUM(oi.quantity * oi.unit_price) as revenue,
    '14_days' as time_period
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  LEFT JOIN media m ON m.product_id = p.id AND m.is_main = true
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at > NOW() - INTERVAL '14 days'
    AND p.status = 'active'
  GROUP BY p.id, p.title, m.image_url
  ORDER BY total_sold DESC
  LIMIT limit_count;
$$;

-- Best Sellers - Last 30 Days (with revenue)
CREATE OR REPLACE FUNCTION get_best_sellers_30days(
  limit_count INT DEFAULT 12
)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  image_url TEXT,
  total_sold BIGINT,
  revenue NUMERIC,
  time_period TEXT
)
LANGUAGE SQL
AS $$
  SELECT 
    p.id as product_id,
    p.title,
    m.image_url,
    SUM(oi.quantity) as total_sold,
    SUM(oi.quantity * oi.unit_price) as revenue,
    '30_days' as time_period
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  LEFT JOIN media m ON m.product_id = p.id AND m.is_main = true
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at > NOW() - INTERVAL '30 days'
    AND p.status = 'active'
  GROUP BY p.id, p.title, m.image_url
  ORDER BY total_sold DESC
  LIMIT limit_count;
$$;


-- Top revenue products (might be different from top quantity)
CREATE OR REPLACE FUNCTION get_top_revenue_products(
  days_range INT DEFAULT 30,
  limit_count INT DEFAULT 12
)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  image_url TEXT,
  total_sold BIGINT,
  revenue NUMERIC
)
LANGUAGE SQL
AS $$
  SELECT 
    p.id as product_id,
    p.title,
    m.image_url,
    SUM(oi.quantity) as total_sold,
    SUM(oi.quantity * oi.unit_price) as revenue
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  LEFT JOIN media m ON m.product_id = p.id AND m.is_main = true
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at > NOW() - (days_range || ' days')::INTERVAL
    AND p.status = 'active'
  GROUP BY p.id, p.title, m.image_url
  ORDER BY revenue DESC  -- Key difference: order by revenue instead of quantity
  LIMIT limit_count;
$$;