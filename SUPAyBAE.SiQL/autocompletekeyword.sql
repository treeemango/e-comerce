-- 1. Create keywords_index table
CREATE TABLE keywords_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL UNIQUE,
  normalized_keyword TEXT NOT NULL,
  search_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX idx_keywords_keyword_trgm ON keywords_index USING GIN (keyword gin_trgm_ops);
CREATE INDEX idx_keywords_normalized_trgm ON keywords_index USING GIN (normalized_keyword gin_trgm_ops);
CREATE INDEX idx_keywords_search_count ON keywords_index (search_count DESC);

-- 3. Create trigger function for normalization
CREATE OR REPLACE FUNCTION update_normalized_keyword()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_keyword = LOWER(unaccent(NEW.keyword));
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger
CREATE TRIGGER trigger_update_normalized_keyword
  BEFORE INSERT OR UPDATE ON keywords_index
  FOR EACH ROW
  EXECUTE FUNCTION update_normalized_keyword();
  -- Function for hybrid keyword suggestions
CREATE OR REPLACE FUNCTION get_keyword_suggestions(
  search_query TEXT,
  max_results INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  keyword TEXT,
  normalized_keyword TEXT,
  similarity_score FLOAT,
  search_count INTEGER,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ki.keyword,
    ki.normalized_keyword,
    similarity(LOWER(unaccent(search_query)), ki.normalized_keyword) as similarity_score,
    ki.search_count,
    (0.6 * similarity(LOWER(unaccent(search_query)), ki.normalized_keyword) +
     0.4 * (ki.search_count::FLOAT / NULLIF((SELECT MAX(search_count) FROM keywords_index), 0))) as combined_score
  FROM keywords_index ki
  WHERE similarity(LOWER(unaccent(search_query)), ki.normalized_keyword) > similarity_threshold
  ORDER BY combined_score DESC, similarity_score DESC
  LIMIT max_results;
END;
$$;
  -- Option 1: No stop words at all for autocomplete
CREATE OR REPLACE FUNCTION rebuild_keywords_index()
RETURNS void AS $$
BEGIN
    TRUNCATE keywords_index;

    WITH all_keywords AS (
        -- Products
        SELECT DISTINCT word
        FROM (
            SELECT unnest(regexp_split_to_array(LOWER(unaccent(COALESCE(title, '') || ' ' || COALESCE(description, ''))), '\s+')) AS word
            FROM products
            WHERE status IN ('approved', 'published')
        ) AS words
        WHERE length(word) > 2  -- Only filter by length
        
        UNION
        
        -- Categories
        SELECT DISTINCT word
        FROM (
            SELECT unnest(regexp_split_to_array(LOWER(unaccent(COALESCE(name, ''))), '\s+')) AS word
            FROM shopify_categories
        ) AS words
        WHERE length(word) > 2
        
        UNION
        
        -- Brands
        SELECT DISTINCT word
        FROM (
            SELECT unnest(regexp_split_to_array(LOWER(unaccent(COALESCE(name, ''))), '\s+')) AS word
            FROM admin_2025_shopify_brands
        ) AS words
        WHERE length(word) > 2
    )
    INSERT INTO keywords_index (keyword)
    SELECT word FROM all_keywords;

    UPDATE keywords_index SET search_count = 1;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to track search usage
CREATE OR REPLACE FUNCTION track_search_usage(search_term TEXT)
RETURNS void AS $$
BEGIN
  UPDATE keywords_index 
  SET search_count = search_count + 1,
      updated_at = NOW()
  WHERE normalized_keyword = LOWER(unaccent(search_term));
END;
$$ LANGUAGE plpgsql;