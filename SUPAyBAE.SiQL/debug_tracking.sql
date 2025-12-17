-- Create the track_product_view function (debug version)
CREATE OR REPLACE FUNCTION track_product_view(
  p_product_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  view_id UUID,
  user_id UUID,
  product_id UUID,
  viewed_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate product exists and is active
  -- Removed EXCEPTION block to let the error propagate to the client
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND status = 'active') THEN
    RAISE EXCEPTION 'Product not found or not active (ID: %)', p_product_id;
  END IF;

  -- Insert the view
  RETURN QUERY
  INSERT INTO user_product_views (user_id, product_id, viewed_at)
  VALUES (p_user_id, p_product_id, NOW())
  RETURNING id, user_id, product_id, viewed_at;
END;
$$;

-- Grant permissions to Supabase roles
GRANT EXECUTE ON FUNCTION track_product_view TO anon;
GRANT EXECUTE ON FUNCTION track_product_view TO authenticated;
GRANT EXECUTE ON FUNCTION track_product_view TO service_role;
