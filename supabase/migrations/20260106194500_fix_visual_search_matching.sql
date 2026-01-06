
-- Visual + hybrid search functions (pgvector + full-text fallback)
CREATE EXTENSION IF NOT EXISTS vector;

-- Representative image embedding per product
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
	LEFT JOIN media m ON m.id = i.media_id
	WHERE i.product_id = p_product_id
		AND i.image_embedding IS NOT NULL
	ORDER BY m.is_main DESC NULLS LAST, m.position ASC NULLS LAST, i.id
	LIMIT 1;
$$;

-- Backwards-compatible v1 (embedding-only hybrid)
-- v2 (adds q_text_query fallback via full-text ranking)
DROP FUNCTION IF EXISTS ai_search_products_v2;
DROP FUNCTION IF EXISTS ai_search_products_v2(VECTOR, VECTOR, TEXT, FLOAT, FLOAT, INT);

CREATE OR REPLACE FUNCTION ai_search_products_v2(
	q_image_embedding VECTOR,
	q_text_embedding VECTOR DEFAULT NULL,
	q_text_query TEXT DEFAULT NULL,
	image_weight FLOAT DEFAULT 0.7,
	text_weight FLOAT DEFAULT 0.3,
	limit_count INT DEFAULT 12
)
RETURNS TABLE (
	product_id UUID,
	title TEXT,
	price NUMERIC,
	original_price NUMERIC,
	image_url TEXT,
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
	search_type TEXT,
	search_confidence TEXT
)
LANGUAGE SQL
AS $$
	WITH best_product_images AS (
		SELECT
			i.product_id,
			i.image_embedding,
			COALESCE(m.image_url, '/images/default-product.jpg') AS image_url,
			1 - (i.image_embedding <=> q_image_embedding) AS image_similarity,
			ROW_NUMBER() OVER (
				PARTITION BY i.product_id
				ORDER BY i.image_embedding <=> q_image_embedding
			) AS image_rank
		FROM images i
		LEFT JOIN media m ON m.id = i.media_id
		WHERE i.image_embedding IS NOT NULL
			AND (m.media_type = 'image' OR m.media_type IS NULL)
	),

	product_data AS (
		SELECT
			p.id,
			p.title,
			pv.price,
			pv.compare_at_price AS original_price,
			p.brand,
			p.is_on_sale,
			p.is_featured,
			p.rating,
			p.review_count,
			p.view_count,
			p.sales_count,
			sc.name AS category_name,
			bpi.image_url,
			bpi.image_similarity,
			p.embedding AS product_text_embedding,

			CASE
				WHEN q_text_embedding IS NOT NULL AND p.embedding IS NOT NULL
				THEN 1 - (p.embedding <=> q_text_embedding)
				WHEN q_text_query IS NOT NULL AND btrim(q_text_query) <> ''
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

			CASE
				WHEN q_text_embedding IS NOT NULL AND p.embedding IS NOT NULL
				THEN 'hybrid_embedding'
				WHEN q_text_query IS NOT NULL AND btrim(q_text_query) <> ''
				THEN 'hybrid_text'
				ELSE 'image_only'
			END AS search_type,

			CASE
				WHEN q_text_embedding IS NOT NULL AND p.embedding IS NOT NULL
				THEN (bpi.image_similarity * image_weight)
					+ ((1 - (p.embedding <=> q_text_embedding)) * text_weight)
				WHEN q_text_query IS NOT NULL AND btrim(q_text_query) <> ''
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
				ORDER BY combined_similarity DESC,
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

-- Backwards-compatible v1 (embedding-only hybrid)
DROP FUNCTION IF EXISTS ai_search_products;
DROP FUNCTION IF EXISTS ai_search_products(VECTOR, VECTOR, FLOAT, FLOAT, INT);

CREATE OR REPLACE FUNCTION ai_search_products(
	q_image_embedding VECTOR,
	q_text_embedding VECTOR DEFAULT NULL,
	image_weight FLOAT DEFAULT 0.7,
	text_weight FLOAT DEFAULT 0.3,
	limit_count INT DEFAULT 12
)
RETURNS TABLE (
	product_id UUID,
	title TEXT,
	price NUMERIC,
	original_price NUMERIC,
	image_url TEXT,
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
	search_type TEXT,
	search_confidence TEXT
)
LANGUAGE SQL
AS $$
	SELECT *
	FROM ai_search_products_v2(
		q_image_embedding,
		q_text_embedding,
		NULL::text,
		image_weight,
		text_weight,
		limit_count
	);
$$;

GRANT EXECUTE ON FUNCTION get_product_image_embedding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ai_search_products(VECTOR, VECTOR, FLOAT, FLOAT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION ai_search_products_v2(VECTOR, VECTOR, TEXT, FLOAT, FLOAT, INT) TO authenticated;

 