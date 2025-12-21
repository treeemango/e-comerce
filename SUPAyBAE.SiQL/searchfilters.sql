
DECLARE
  result JSON;
  visual_embedding vector;
BEGIN
  IF visual_search_image_id IS NOT NULL THEN
    -- Try to fetch embedding from the media table
    SELECT image_embedding INTO visual_embedding
    FROM media 
    WHERE id = visual_search_image_id;

    IF visual_embedding IS NULL THEN
      -- Fallback to product_images table
      SELECT image_embedding INTO visual_embedding
      FROM product_images 
      WHERE id = visual_search_image_id;
    END IF;
  END IF;

  WITH search_results AS (
    SELECT DISTINCT 
      p.id, 
      p.category_id, 
      p.brand_id, 
      pv.price AS product_price, 
      -- The vendors' user ID is explicitly named seller_user_id
      v2.user_id AS seller_user_id,
      CASE
        WHEN visual_embedding IS NOT NULL AND p.embedding IS NOT NULL THEN 
          1 - (p.embedding <=> visual_embedding)
        ELSE NULL
      END AS visual_similarity
    FROM products p 
    LEFT JOIN product_variants pv 
      ON pv.product_id = p.id AND pv.is_default = TRUE
    -- JOIN to vendors, aliased as v2, to get the vendor's user ID
    LEFT JOIN vendors v2
      ON v2.id = p.seller_id
    
    WHERE p.status IN ('published', 'approved') 
      -- FIX 2: Check stock on the product_variants table (pv)
      AND pv.stock > 0
      
      AND (
        search_query IS NULL OR search_query = ''
        OR to_tsvector('english', p.title) @@ plainto_tsquery('english', search_query)
        OR p.title ILIKE '%' || search_query || '%'
        OR p.description ILIKE '%' || search_query || '%'
        OR p.brand ILIKE '%' || search_query || '%'
      )
      AND (
        visual_embedding IS NULL
        OR (
          similarity_threshold IS NULL AND p.embedding IS NOT NULL
        )
        OR (
          similarity_threshold IS NOT NULL AND p.embedding IS NOT NULL
          AND 1 - (p.embedding <=> visual_embedding) >= similarity_threshold
        )
      )
      AND (category_ids IS NULL OR p.category_id = ANY(category_ids))
      AND (brand_ids IS NULL OR p.brand_id = ANY(brand_ids))
      -- Price filtering must check if pv.price exists before comparison (or handle NULL gracefully)
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
                    AND pav2.value_text = trim(both '\"' FROM filters.attr_values::text)
                )
              )
          )
        )
      )
  ),
  -- New CTE to count product attributes for filtering metadata
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
    'visual_match_count', 0,
    'total_products', 0,
    'has_visual_search', false,
    'has_text_search', false,
    'visual_similarity_threshold', similarity_threshold
  ));
END;
