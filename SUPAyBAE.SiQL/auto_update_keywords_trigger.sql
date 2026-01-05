-- =============================================================================
-- AUTO-UPDATE KEYWORDS INDEX TRIGGER
-- Automatically extracts and indexes keywords when products are added/updated
-- =============================================================================

-- Function to extract keywords from a product and add to keywords_index
CREATE OR REPLACE FUNCTION extract_product_keywords()
RETURNS TRIGGER AS $$
DECLARE
    word_record RECORD;
BEGIN
    -- Only process approved/published products
    IF NEW.status NOT IN ('approved', 'published') THEN
        RETURN NEW;
    END IF;

    -- Extract words from title and description, insert into keywords_index
    FOR word_record IN
        SELECT DISTINCT unnest(
            regexp_split_to_array(
                LOWER(unaccent(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''))),
                '\s+'
            )
        ) AS word
    LOOP
        -- Only insert words with length > 2
        IF length(word_record.word) > 2 THEN
            INSERT INTO keywords_index (keyword, normalized_keyword, search_count)
            VALUES (word_record.word, LOWER(unaccent(word_record.word)), 1)
            ON CONFLICT (keyword) DO NOTHING;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on products table
DROP TRIGGER IF EXISTS trigger_extract_product_keywords ON products;
CREATE TRIGGER trigger_extract_product_keywords
    AFTER INSERT OR UPDATE OF title, description, status ON products
    FOR EACH ROW
    EXECUTE FUNCTION extract_product_keywords();

-- =============================================================================
-- INITIAL REBUILD: Run this once to index all existing products
-- =============================================================================
-- SELECT rebuild_keywords_index();

-- Verify the trigger is working (optional check)
-- SELECT * FROM pg_trigger WHERE tgname = 'trigger_extract_product_keywords';
