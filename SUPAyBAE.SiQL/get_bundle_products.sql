CREATE OR REPLACE FUNCTION get_bundle_products(
  target_product UUID,
  limit_count INT DEFAULT 5
)
RETURNS TABLE (
  bundled_product UUID,
  title TEXT,
  image_url TEXT,
  quantity BIGINT
)
LANGUAGE SQL
AS $$
SELECT
  oi2.product_id,
  p.title,
  m.image_url,
  COUNT(*) AS together_count
FROM order_items oi1
JOIN order_items oi2
  ON oi1.order_id = oi2.order_id
 AND oi2.product_id != oi1.product_id

JOIN products p ON p.id = oi2.product_id
LEFT JOIN media m ON m.product_id = p.id AND m.is_main = true

WHERE oi1.product_id = target_product
  AND p.status = 'active'

GROUP BY oi2.product_id, p.title, m.image_url

ORDER BY together_count DESC
LIMIT limit_count;
$$;