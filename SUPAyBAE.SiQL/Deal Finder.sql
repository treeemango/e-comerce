CREATE OR REPLACE FUNCTION get_cheaper_alternatives(
  target UUID,
  limit_count INT DEFAULT 6
)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  price NUMERIC,
  image_url TEXT,
  similarity FLOAT
)
LANGUAGE SQL
AS $$
WITH ref AS (
  SELECT p.price, i.image_embedding
  FROM products p
  JOIN images i ON i.product_id = p.id
  WHERE p.id = target
  LIMIT 1
)
SELECT
  p.id,
  p.title,
  p.price,
  m.image_url,
  1 - (i.image_embedding <-> r.image_embedding) AS similarity
FROM products p
JOIN images i ON i.product_id = p.id
LEFT JOIN media m ON m.product_id = p.id AND m.is_main = true
CROSS JOIN ref r

WHERE p.price < r.price
  AND p.status = 'active'

ORDER BY similarity DESC
LIMIT limit_count;
$$;