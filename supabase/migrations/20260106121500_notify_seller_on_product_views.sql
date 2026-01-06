-- Notify sellers when their products are viewed (milestone-based)
-- Hooks into the existing track_product_view RPC used by both web and mobile.

CREATE OR REPLACE FUNCTION public.track_product_view(
    p_product_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_session_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product_status TEXT;
    v_product_title TEXT;
    v_seller_id UUID;
    v_view_id UUID;
    v_new_view_count BIGINT;
    v_is_milestone BOOLEAN := FALSE;
BEGIN
    -- 1) Validate product
    SELECT p.status,
           COALESCE(p.title, p.name, 'Product'),
           p.seller_id
    INTO v_product_status, v_product_title, v_seller_id
    FROM public.products p
    WHERE p.id = p_product_id;

    IF v_product_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Product not found.');
    END IF;

    -- Only track views for live/visible products
    IF v_product_status NOT IN ('active', 'approved', 'published') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Product not active/approved.');
    END IF;

    -- 2) Must have at least one identifier
    IF p_user_id IS NULL AND p_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Missing user or session identifier.');
    END IF;

    -- 3) Insert view event
    INSERT INTO public.user_product_views (user_id, product_id, viewed_at, session_id)
    VALUES (p_user_id, p_product_id, NOW(), p_session_id)
    RETURNING id INTO v_view_id;

    -- 4) Increment product view counter (best-effort)
    BEGIN
        UPDATE public.products
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE id = p_product_id
        RETURNING view_count INTO v_new_view_count;
    EXCEPTION WHEN others THEN
        v_new_view_count := NULL;
    END;

    -- 5) Notify seller at milestones (avoid spam)
    -- Skip notifying if the seller is viewing their own product.
    IF v_seller_id IS NOT NULL AND (p_user_id IS NULL OR p_user_id <> v_seller_id) AND v_new_view_count IS NOT NULL THEN
        v_is_milestone := v_new_view_count IN (1, 10, 25, 50, 100, 250, 500, 1000);

        IF v_is_milestone THEN
            BEGIN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    is_read,
                    action_payload
                ) VALUES (
                    v_seller_id,
                    'info',
                    'Product viewed',
                    CASE
                        WHEN v_new_view_count = 1 THEN '👀 Someone just viewed your product "' || v_product_title || '".'
                        ELSE '📈 Your product "' || v_product_title || '" just reached ' || v_new_view_count || ' views.'
                    END,
                    false,
                    jsonb_build_object('target', 'product', 'id', p_product_id::text)
                );
            EXCEPTION WHEN others THEN
                -- Notification is best-effort; do not fail view tracking.
                NULL;
            END;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'View tracked successfully.',
        'view_id', v_view_id,
        'product_id', p_product_id,
        'user_id', p_user_id,
        'session_id', p_session_id,
        'view_count', v_new_view_count,
        'seller_notified', v_is_milestone
    );
END;
$$;
