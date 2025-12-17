-- Function to track search usage (Fixes 404 error)
CREATE OR REPLACE FUNCTION track_search_usage(search_term TEXT)
RETURNS void AS $$
BEGIN
  -- Ensure the table exists appropriately (optional, but safe)
  -- The update logic assumes keywords_index exists and populate by triggers/rebuilds
  
  UPDATE keywords_index 
  SET search_count = search_count + 1,
      updated_at = NOW()
  WHERE normalized_keyword = LOWER(unaccent(search_term));
  
  -- If you want to insert new search terms that don't exist yet:
  -- INSERT INTO keywords_index (keyword, search_count)
  -- SELECT search_term, 1
  -- WHERE NOT EXISTS (SELECT 1 FROM keywords_index WHERE normalized_keyword = LOWER(unaccent(search_term)));
  
END;
$$ LANGUAGE plpgsql;
