-- Get vendor performance statistics for buyers
CREATE OR REPLACE FUNCTION get_vendor_performance_stats(
  vendor_uuid UUID
)
RETURNS TABLE (
  total_orders BIGINT,
  completed_orders BIGINT,
  cancellation_rate NUMERIC,
  avg_order_value NUMERIC,
  response_time TEXT,
  seller_since TEXT
)
LANGUAGE SQL
AS $$
  SELECT 
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as completed_orders,
    (COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'cancelled') * 100.0 / 
     NULLIF(COUNT(DISTINCT o.id), 0)) as cancellation_rate,
    AVG(o.total) as avg_order_value,
    CASE 
      WHEN COUNT(DISTINCT o.id) >= 50 THEN 'Usually responds in hours'
      WHEN COUNT(DISTINCT o.id) >= 10 THEN 'Usually responds in a day'
      ELSE 'New seller - response times may vary'
    END as response_time,
    CASE 
      WHEN EXTRACT(YEAR FROM v.created_at) = EXTRACT(YEAR FROM NOW()) THEN 
        'Joined ' || TO_CHAR(v.created_at, 'Month')
      ELSE 
        'Since ' || EXTRACT(YEAR FROM v.created_at)
    END as seller_since
  FROM vendors v
  LEFT JOIN products p ON p.seller_id = v.id
  LEFT JOIN order_items oi ON oi.product_id = p.id
  LEFT JOIN orders o ON o.id = oi.order_id
  WHERE v.id = vendor_uuid
    AND v.is_active = true
  GROUP BY v.id, v.created_at;
$$;