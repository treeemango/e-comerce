-- Fix for "column reference 'user_id' is ambiguous" error in get_unified_search_filters
-- The issue was caused by JOIN to vendors table where v2.user_id conflicts with RLS policy user_id references.
-- Solution: Use SECURITY DEFINER and carefully alias all table references to avoid ambiguity.
-- Added vendor_countries filter to allow filtering by vendor's country.

DROP FUNCTION IF EXISTS get_unified_search_filters(TEXT, UUID, UUID[], UUID[], NUMERIC, NUMERIC, JSONB, NUMERIC);
DROP FUNCTION IF EXISTS get_unified_search_filters(TEXT, UUID, UUID[], UUID[], NUMERIC, NUMERIC, JSONB, NUMERIC, TEXT[]);

CREATE OR REPLACE FUNCTION get_unified_search_filters(
  search_query TEXT DEFAULT NULL,
  visual_search_image_id UUID DEFAULT NULL,
  category_ids UUID[] DEFAULT NULL,
  brand_ids UUID[] DEFAULT NULL,
  price_min NUMERIC DEFAULT NULL,
  price_max NUMERIC DEFAULT NULL,
  attribute_filters JSONB DEFAULT '{}'::jsonb,
  similarity_threshold NUMERIC DEFAULT 0.65,
  condition_filters TEXT[] DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  visual_embedding vector;
BEGIN
  -- Fetch visual embedding if visual search is requested
  IF visual_search_image_id IS NOT NULL THEN
    SELECT m.image_embedding INTO visual_embedding
    FROM media m
    WHERE m.id = visual_search_image_id;

    IF visual_embedding IS NULL THEN
      SELECT pi.image_embedding INTO visual_embedding
      FROM product_images pi
      WHERE pi.id = visual_search_image_id;
    END IF;
  END IF;

  WITH search_results AS (
    SELECT DISTINCT 
      p.id, 
      p.category_id, 
      p.brand_id,
      p.seller_id,
      p.condition,
      pv.price AS product_price, 
      p.delivery_locations,
      CASE
        WHEN visual_embedding IS NOT NULL AND pei.has_embedding = TRUE THEN 
          1 - (pei.image_embedding <=> visual_embedding)
        ELSE NULL
      END AS visual_similarity
    FROM products p 
    LEFT JOIN LATERAL get_product_image_embedding(p.id) pei ON TRUE
    LEFT JOIN product_variants pv 
      ON pv.product_id = p.id AND pv.is_default = TRUE
    LEFT JOIN shopify_categories c ON p.category_id = c.id
    LEFT JOIN admin_2025_shopify_brands b ON p.brand_id = b.id

    WHERE (LOWER(TRIM(p.status)) IN ('published', 'approved'))
      AND (pv.stock IS NULL OR pv.stock >= 0)
      AND (
        search_query IS NULL OR search_query = ''
        OR to_tsvector('english', p.title) @@ plainto_tsquery('english', search_query)
        OR p.title ILIKE '%' || search_query || '%'
        OR p.description ILIKE '%' || search_query || '%'
        OR p.brand ILIKE '%' || search_query || '%'
        OR c.name ILIKE '%' || search_query || '%'
        OR b.name ILIKE '%' || search_query || '%'
      )
      AND (
        visual_embedding IS NULL
        OR (
          similarity_threshold IS NULL AND pei.has_embedding = TRUE
        )
        OR (
          similarity_threshold IS NOT NULL AND pei.has_embedding = TRUE
          AND 1 - (pei.image_embedding <=> visual_embedding) >= similarity_threshold
        )
      )
      AND (category_ids IS NULL OR p.category_id = ANY(category_ids))
      AND (brand_ids IS NULL OR p.brand_id = ANY(brand_ids))
      AND (condition_filters IS NULL OR p.condition::text = ANY(condition_filters))
      AND (
          (price_min IS NULL OR pv.price IS NULL OR pv.price >= price_min) 
          AND (price_max IS NULL OR pv.price IS NULL OR pv.price <= price_max)
      )
      AND (
        attribute_filters IS NULL
        OR attribute_filters = '{}'::jsonb
        OR NOT EXISTS (
          SELECT 1
          FROM jsonb_each(attribute_filters) filters(attr_name, attr_values)
          WHERE NOT EXISTS (
            SELECT 1
            FROM product_attribute_values pav2
            JOIN shopify_attributes sa2 ON pav2.attribute_id = sa2.id
            WHERE pav2.product_id = p.id 
              AND sa2.name = filters.attr_name
              AND (
                (jsonb_typeof(filters.attr_values) = 'array'
                  AND EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(filters.attr_values) attr_vals(val)
                    WHERE pav2.value_text = attr_vals.val
                  )
                )
                OR (jsonb_typeof(filters.attr_values) <> 'array'
                    AND pav2.value_text = trim(both '"' FROM filters.attr_values::text)
                )
              )
          )
        )
      )
  ),
  attribute_counts_cte AS (
    SELECT
      sa.name AS attribute_name,
      pav.value_text AS attribute_value,
      COUNT(DISTINCT sr.id) AS product_count
    FROM search_results sr
    JOIN product_attribute_values pav ON pav.product_id = sr.id
    JOIN shopify_attributes sa ON sa.id = pav.attribute_id
    WHERE COALESCE(sa.is_filterable, false)
    GROUP BY sa.name, pav.value_text 
  ),
  delivery_location_counts AS (
    SELECT
      loc AS location,
      COUNT(DISTINCT sr.id) AS product_count
    FROM search_results sr,
    unnest(sr.delivery_locations) AS loc
    WHERE loc IS NOT NULL AND loc <> ''
    GROUP BY loc
    ORDER BY COUNT(DISTINCT sr.id) DESC
    LIMIT 50
  ),
  -- Vendor country counts - join vendors table to get country info
  vendor_country_counts AS (
    SELECT
      v.address_country AS country,
      COUNT(DISTINCT sr.id) AS product_count
    FROM search_results sr
    JOIN vendors v ON v.user_id = sr.seller_id
    WHERE v.address_country IS NOT NULL AND v.address_country <> ''
    GROUP BY v.address_country
    ORDER BY COUNT(DISTINCT sr.id) DESC
    LIMIT 50
  ),
  condition_counts AS (
    SELECT
      condition::text AS condition,
      COUNT(DISTINCT sr.id) AS product_count
    FROM search_results sr
    WHERE condition IS NOT NULL
    GROUP BY condition
  ),
  filter_data AS (
    SELECT
      (
        SELECT json_agg(row_to_json(cat))
        FROM (
          SELECT c.id, c.name, c.slug, COUNT(sr.id) AS product_count
          FROM search_results sr
          JOIN shopify_categories c ON sr.category_id = c.id
          GROUP BY c.id, c.name, c.slug
          ORDER BY COUNT(sr.id) DESC, c.name
          LIMIT 50
        ) cat
      ) AS categories,
      (
        SELECT json_agg(row_to_json(brand))
        FROM (
          SELECT b.id, b.name AS brand_name, b.logo_url, COUNT(sr.id) AS product_count
          FROM search_results sr
          JOIN admin_2025_shopify_brands b ON sr.brand_id = b.id
          WHERE COALESCE(b.is_active, true)
          GROUP BY b.id, b.name, b.logo_url
          ORDER BY COUNT(sr.id) DESC, b.name
          LIMIT 50
        ) brand
      ) AS brands,
      (
        SELECT json_build_object(
          'min', COALESCE(MIN(sr.product_price), 0), 
          'max', COALESCE(MAX(sr.product_price), 0), 
          'avg', COALESCE(AVG(sr.product_price), 0), 
          'product_count', COUNT(sr.id) 
        )
        FROM search_results sr
      ) AS price_range,
      (
        SELECT COALESCE(json_object_agg(attribute_name, attribute_values), '{}'::json)
        FROM (
          SELECT
            attribute_name,
            json_agg(
              json_build_object(
                'value', attribute_value,
                'product_count', product_count
              )
              ORDER BY product_count DESC, attribute_value
            ) AS attribute_values
          FROM attribute_counts_cte
          GROUP BY attribute_name 
        ) attr_data
      ) AS attributes,
      (
        SELECT COALESCE(json_agg(row_to_json(dl)), '[]'::json)
        FROM (
           SELECT location, product_count
           FROM delivery_location_counts
        ) dl
      ) AS delivery_locations,
      -- Vendor countries output
      (
        SELECT COALESCE(json_agg(row_to_json(vc)), '[]'::json)
        FROM (
           SELECT country, product_count
           FROM vendor_country_counts
        ) vc
      ) AS vendor_countries,
      (
        SELECT COALESCE(json_agg(row_to_json(cd)), '[]'::json)
        FROM (
           SELECT condition, product_count
           FROM condition_counts
           ORDER BY product_count DESC
        ) cd
      ) AS conditions,
      (
        SELECT COUNT(*)
        FROM search_results
        WHERE visual_similarity IS NOT NULL
          AND (similarity_threshold IS NULL OR visual_similarity >= similarity_threshold)
      ) AS visual_match_count,
      (SELECT COUNT(*) FROM search_results) AS total_products,
      (SELECT visual_embedding IS NOT NULL) AS has_visual_search,
      (SELECT search_query IS NOT NULL AND search_query <> '') AS has_text_search,
      (SELECT similarity_threshold) AS visual_similarity_threshold
  )
  SELECT row_to_json(filter_data) INTO result FROM filter_data;

  RETURN COALESCE(result, json_build_object(
    'categories', json_build_array(),
    'brands', json_build_array(),
    'price_range', json_build_object('min', 0, 'max', 0, 'avg', 0, 'product_count', 0),
    'attributes', json_build_object(),
    'delivery_locations', json_build_array(),
    'vendor_countries', json_build_array(),
    'conditions', json_build_array(),
    'visual_match_count', 0,
    'total_products', 0,
    'has_visual_search', false,
    'has_text_search', false,
    'visual_similarity_threshold', similarity_threshold
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_unified_search_filters(TEXT, UUID, UUID[], UUID[], NUMERIC, NUMERIC, JSONB, NUMERIC, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unified_search_filters(TEXT, UUID, UUID[], UUID[], NUMERIC, NUMERIC, JSONB, NUMERIC, TEXT[]) TO anon;

COMMENT ON FUNCTION get_unified_search_filters(TEXT, UUID, UUID[], UUID[], NUMERIC, NUMERIC, JSONB, NUMERIC, TEXT[]) IS 'Return search filter metadata for current combined text and visual search context, including product conditions.';