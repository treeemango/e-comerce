-- ==============================================================
-- Enable pgvector (run once)
-- ==============================================================
CREATE EXTENSION IF NOT EXISTS vector;

---
-- ==============================================================
-- Helper Function
-- Get one representative image embedding per product
-- ==============================================================
DROP FUNCTION IF EXISTS get_product_image_embedding(UUID);

CREATE OR REPLACE FUNCTION get_product_image_embedding(p_product_id UUID)
RETURNS TABLE (
  image_embedding VECTOR,
  has_embedding BOOLEAN
)
LANGUAGE SQL
AS $$
  SELECT
    i.image_embedding,
    (i.image_embedding IS NOT NULL) AS has_embedding
  FROM images i
  WHERE i.product_id = p_product_id
    AND i.image_embedding IS NOT NULL
    AND vector_norm(i.image_embedding) > 0.0001
  -- Choose the embedding for the main/first media image when available.
  -- Falls back to stable ordering by image id.
  LEFT JOIN media m ON m.id = i.media_id
  ORDER BY m.is_main DESC NULLS LAST, m.position ASC NULLS LAST, i.id
  LIMIT 1;
$$;

---
-- ==============================================================
-- MAIN SEARCH FUNCTION
-- ==============================================================
DROP FUNCTION IF EXISTS ai_search_products;

-- Note: Postgres requires argument types for DROP FUNCTION when overloads exist.
-- We keep the original drop above for older environments, and add a signature-safe drop.
DROP FUNCTION IF EXISTS ai_search_products(VECTOR, VECTOR, FLOAT, FLOAT, INT);

CREATE OR REPLACE FUNCTION ai_search_products(
  -- Required: image embedding for visual search
  q_image_embedding VECTOR,

  -- Optional: text embedding for hybrid search
  q_text_embedding VECTOR DEFAULT NULL,

  -- Hybrid weights
  image_weight FLOAT DEFAULT 0.7,
  text_weight FLOAT DEFAULT 0.3,

  -- Result length
  limit_count INT DEFAULT 12
)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  price NUMERIC,
  original_price NUMERIC,
  image_url TEXT,

  -- Scores
  image_similarity FLOAT,
  text_similarity FLOAT,
  combined_similarity FLOAT,

  brand TEXT,
  category_name TEXT,
  is_on_sale BOOLEAN,
  is_featured BOOLEAN,
  rating NUMERIC,
  review_count INTEGER,
  view_count INTEGER,
  sales_count INTEGER,

  -- Metadata
  search_type TEXT,
  search_confidence TEXT
)
LANGUAGE SQL
AS $$
  WITH best_product_images AS (
    SELECT
      i.product_id,
      i.image_embedding,

      COALESCE(
        m.image_url,
        '/images/default-product.jpg'
      ) AS image_url,

      -- similarity score (1 - cosine distance)
      1 - (i.image_embedding <=> q_image_embedding) AS image_similarity,

      ROW_NUMBER() OVER (
        PARTITION BY i.product_id
        ORDER BY i.image_embedding <=> q_image_embedding
      ) AS image_rank
    FROM images i
    LEFT JOIN media m ON m.id = i.media_id
    WHERE i.image_embedding IS NOT NULL
      AND vector_norm(q_image_embedding) > 0.0001
      AND vector_norm(i.image_embedding) > 0.0001
      AND (m.media_type = 'image' OR m.media_type IS NULL)
  ),

  product_data AS (
    SELECT
      p.id,
      p.title,
      pv.price,
      pv.compare_at_price AS original_price,
      p.brand,
      p.category_id,
      p.is_on_sale,
      p.is_featured,
      p.rating,
      p.review_count,
      p.view_count,
      p.sales_count,

      p.embedding AS product_text_embedding,

      bpi.image_url,
      bpi.image_similarity,

      sc.name AS category_name,

      -- text similarity (only if embedding exists)
      CASE
        WHEN q_text_embedding IS NOT NULL
             AND p.embedding IS NOT NULL
        THEN 1 - (p.embedding <=> q_text_embedding)
      END AS text_similarity,

      -- search type
      CASE
        WHEN q_text_embedding IS NOT NULL
             AND p.embedding IS NOT NULL
        THEN 'hybrid'
        ELSE 'image_only'
      END AS search_type,

      -- combined similarity
      CASE
        WHEN q_text_embedding IS NOT NULL
             AND p.embedding IS NOT NULL
        THEN (bpi.image_similarity * image_weight)
         + ((1 - (p.embedding <=> q_text_embedding)) * text_weight)
        ELSE bpi.image_similarity
      END AS combined_similarity

    FROM best_product_images bpi
    JOIN products p ON p.id = bpi.product_id
    LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
    LEFT JOIN shopify_categories sc ON sc.id = p.category_id

    WHERE bpi.image_rank = 1
      AND p.status IN ('published','approved')
  ),

  ranked_products AS (
    SELECT
      *,
      CASE
        WHEN combined_similarity > 0.8 THEN 'very_high'
        WHEN combined_similarity > 0.6 THEN 'high'
        WHEN combined_similarity > 0.4 THEN 'medium'
        ELSE 'low'
      END AS search_confidence,

      ROW_NUMBER() OVER (
        ORDER BY
          combined_similarity DESC,
          view_count DESC NULLS LAST,
          sales_count DESC NULLS LAST,
          rating DESC NULLS LAST
      ) AS product_rank
    FROM product_data
  )

  SELECT
    id AS product_id,
    title,
    price,
    original_price,
    image_url,
    image_similarity,
    text_similarity,
    combined_similarity,
    brand,
    category_name,
    is_on_sale,
    is_featured,
    rating,
    review_count,
    view_count,
    sales_count,
    search_type,
    search_confidence
  FROM ranked_products
  WHERE product_rank <= limit_count
  ORDER BY combined_similarity DESC, view_count DESC;
$$;

---
-- ============================================================== 
-- MAIN SEARCH FUNCTION (v2)
-- Adds q_text_query fallback using Postgres full-text ranking when
-- vector embeddings are missing.
-- ============================================================== 
DROP FUNCTION IF EXISTS ai_search_products_v2;
DROP FUNCTION IF EXISTS ai_search_products_v2(VECTOR, VECTOR, TEXT, FLOAT, FLOAT, INT);

CREATE OR REPLACE FUNCTION ai_search_products_v2(
  -- Required: image embedding for visual search
  q_image_embedding VECTOR,

  -- Optional: text embedding for hybrid search
  q_text_embedding VECTOR DEFAULT NULL,

  -- Optional: text query fallback (used when embeddings are missing)
  q_text_query TEXT DEFAULT NULL,

  -- Hybrid weights
  image_weight FLOAT DEFAULT 0.7,
  text_weight FLOAT DEFAULT 0.3,

  -- Result length
  limit_count INT DEFAULT 12
)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  price NUMERIC,
  original_price NUMERIC,
  image_url TEXT,

  -- Scores
  image_similarity FLOAT,
  text_similarity FLOAT,
  combined_similarity FLOAT,

  brand TEXT,
  category_name TEXT,
  is_on_sale BOOLEAN,
  is_featured BOOLEAN,
  rating NUMERIC,
  review_count INTEGER,
  view_count INTEGER,
  sales_count INTEGER,

  -- Metadata
  search_type TEXT,
  search_confidence TEXT
)
LANGUAGE SQL
AS $$
  WITH best_product_images AS (
    SELECT
      i.product_id,
      i.image_embedding,

      COALESCE(
        m.image_url,
        '/images/default-product.jpg'
      ) AS image_url,

      -- similarity score (1 - cosine distance)
      1 - (i.image_embedding <=> q_image_embedding) AS image_similarity,

      ROW_NUMBER() OVER (
        PARTITION BY i.product_id
        ORDER BY i.image_embedding <=> q_image_embedding
      ) AS image_rank
    FROM images i
    LEFT JOIN media m ON m.id = i.media_id
    WHERE i.image_embedding IS NOT NULL
      AND vector_norm(q_image_embedding) > 0.0001
      AND vector_norm(i.image_embedding) > 0.0001
      AND (m.media_type = 'image' OR m.media_type IS NULL)
  ),

  product_data AS (
    SELECT
      p.id,
      p.title,
      pv.price,
      pv.compare_at_price AS original_price,
      p.brand,
      p.category_id,
      p.is_on_sale,
      p.is_featured,
      p.rating,
      p.review_count,
      p.view_count,
      p.sales_count,

      p.embedding AS product_text_embedding,

      bpi.image_url,
      bpi.image_similarity,

      sc.name AS category_name,

      -- text similarity
      CASE
        WHEN q_text_embedding IS NOT NULL
             AND p.embedding IS NOT NULL
        THEN 1 - (p.embedding <=> q_text_embedding)
        WHEN q_text_query IS NOT NULL
             AND btrim(q_text_query) <> ''
        THEN LEAST(
          1.0,
          GREATEST(
            0.0,
            ts_rank_cd(
              setweight(to_tsvector('english', COALESCE(p.title, '')), 'A')
              || setweight(to_tsvector('english', COALESCE(p.description, '')), 'B')
              || setweight(to_tsvector('english', COALESCE(p.brand, '')), 'C'),
              websearch_to_tsquery('english', q_text_query)
            )
          )
        )
      END AS text_similarity,

      -- search type
      CASE
        WHEN q_text_embedding IS NOT NULL
             AND p.embedding IS NOT NULL
        THEN 'hybrid_embedding'
        WHEN q_text_query IS NOT NULL
             AND btrim(q_text_query) <> ''
        THEN 'hybrid_text'
        ELSE 'image_only'
      END AS search_type,

      -- combined similarity
      CASE
        WHEN q_text_embedding IS NOT NULL
             AND p.embedding IS NOT NULL
        THEN (bpi.image_similarity * image_weight)
         + ((1 - (p.embedding <=> q_text_embedding)) * text_weight)
        WHEN q_text_query IS NOT NULL
             AND btrim(q_text_query) <> ''
        THEN (bpi.image_similarity * image_weight)
         + (
            LEAST(
              1.0,
              GREATEST(
                0.0,
                ts_rank_cd(
                  setweight(to_tsvector('english', COALESCE(p.title, '')), 'A')
                  || setweight(to_tsvector('english', COALESCE(p.description, '')), 'B')
                  || setweight(to_tsvector('english', COALESCE(p.brand, '')), 'C'),
                  websearch_to_tsquery('english', q_text_query)
                )
              )
            )
           * text_weight
          )
        ELSE bpi.image_similarity
      END AS combined_similarity

    FROM best_product_images bpi
    JOIN products p ON p.id = bpi.product_id
    LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
    LEFT JOIN shopify_categories sc ON sc.id = p.category_id

    WHERE bpi.image_rank = 1
      AND p.status IN ('published','approved')
  ),

  ranked_products AS (
    SELECT
      *,
      CASE
        WHEN combined_similarity > 0.8 THEN 'very_high'
        WHEN combined_similarity > 0.6 THEN 'high'
        WHEN combined_similarity > 0.4 THEN 'medium'
        ELSE 'low'
      END AS search_confidence,

      ROW_NUMBER() OVER (
        ORDER BY
          combined_similarity DESC,
          view_count DESC NULLS LAST,
          sales_count DESC NULLS LAST,
          rating DESC NULLS LAST
      ) AS product_rank
    FROM product_data
  )

  SELECT
    id AS product_id,
    title,
    price,
    original_price,
    image_url,
    image_similarity,
    text_similarity,
    combined_similarity,
    brand,
    category_name,
    is_on_sale,
    is_featured,
    rating,
    review_count,
    view_count,
    sales_count,
    search_type,
    search_confidence
  FROM ranked_products
  WHERE product_rank <= limit_count
  ORDER BY combined_similarity DESC, view_count DESC;
$$;

---
-- ==============================================================
-- RELATED PRODUCTS FUNCTION
-- ==============================================================
DROP FUNCTION IF EXISTS get_related_products_ai(UUID, INT);

CREATE OR REPLACE FUNCTION get_related_products_ai(
  p_product_id UUID,
  limit_count INT DEFAULT 8
)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  price NUMERIC,
  image_url TEXT,
  similarity FLOAT,
  category_name TEXT,
  view_count INTEGER,
  sales_count INTEGER
)
LANGUAGE SQL
AS $$
  WITH product_embedding AS (
    SELECT image_embedding
    FROM get_product_image_embedding(p_product_id)
    WHERE has_embedding = TRUE
    LIMIT 1
  ),

  related_results AS (
    SELECT
      r.product_id,
      r.title,
      r.price,
      r.image_url,
      r.combined_similarity AS similarity,
      r.category_name,
      r.view_count,
      r.sales_count
    FROM product_embedding pe
    CROSS JOIN LATERAL ai_search_products(
      pe.image_embedding,
      NULL,          -- no text search
      1.0,           -- pure visual (100% image weight)
      0.0,
      limit_count + 1
    ) r
    WHERE r.product_id <> p_product_id
  )

  SELECT *
  FROM related_results
  LIMIT limit_count;
$$;

---
-- ==============================================================
-- Grants for Supabase API
-- ==============================================================
GRANT EXECUTE ON FUNCTION ai_search_products TO anon;
GRANT EXECUTE ON FUNCTION ai_search_products TO authenticated;
GRANT EXECUTE ON FUNCTION ai_search_products TO service_role;

GRANT EXECUTE ON FUNCTION get_related_products_ai TO anon;
GRANT EXECUTE ON FUNCTION get_related_products_ai TO authenticated;
GRANT EXECUTE ON FUNCTION get_related_products_ai TO service_role;