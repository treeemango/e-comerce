DROP FUNCTION IF EXISTS track_product_view(UUID, UUID);
DROP FUNCTION IF EXISTS track_product_view(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION track_product_view(
    p_product_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_session_id UUID DEFAULT NULL  -- NEW: Accept session ID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_exists BOOLEAN;
    v_product_status TEXT;
    v_product_title TEXT;
    v_view_id UUID;
BEGIN
    -- 1. Check if product exists and is active/approved
    SELECT EXISTS(SELECT 1 FROM products WHERE id = p_product_id), status, COALESCE(title, 'Product')
    INTO v_product_exists, v_product_status, v_product_title
    FROM products WHERE id = p_product_id;
    
    IF NOT v_product_exists OR v_product_status NOT IN ('active', 'approved') THEN
      RETURN jsonb_build_object('success', false, 'message', 'Product invalid or not found.');
    END IF;

    -- 2. Validate tracking identifiers
    -- Must have at least one identifier to log the view
    IF p_user_id IS NULL AND p_session_id IS NULL THEN
        RAISE WARNING 'Cannot track view: Both user_id and session_id are NULL.';
        RETURN jsonb_build_object('success', false, 'message', 'Missing user or session identifier.');
    END IF;

    -- 3. Insert the view using user_id (NULL for guest) and session_id (for all tracking)
    INSERT INTO user_product_views (user_id, product_id, viewed_at, session_id)
    VALUES (p_user_id, p_product_id, NOW(), p_session_id) -- Inserts actual IDs/NULLs
    RETURNING id
    INTO v_view_id;
    
    -- 4. Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'View tracked successfully for: ' || v_product_title,
        'view_id', v_view_id,
        'user_id', p_user_id,
        'session_id', p_session_id,
        'user_type', CASE WHEN p_user_id IS NOT NULL THEN 'authenticated' ELSE 'anonymous' END
    );
    
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unexpected error: ' || SQLERRM);
END;
$$;