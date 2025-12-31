-- Allow both guests and registered users to fetch tracking events securely
-- using order_id + email verification.

CREATE OR REPLACE FUNCTION public.get_order_tracking_events_universal(
    p_order_id uuid,
    p_email text
)
RETURNS SETOF public.order_tracking_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_email text;
    v_auth_email text;
BEGIN
    v_email := lower(btrim(coalesce(p_email, '')));

    SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF v_order.user_id IS NOT NULL THEN
        SELECT u.email
        INTO v_auth_email
        FROM auth.users u
        WHERE u.id = v_order.user_id;
    END IF;

    IF (
        (auth.uid() IS NOT NULL AND auth.uid() = v_order.user_id)
        OR
        (v_order.customer_email IS NOT NULL AND lower(btrim(v_order.customer_email)) = v_email)
        OR
        (v_auth_email IS NOT NULL AND lower(btrim(v_auth_email)) = v_email)
    ) THEN
        RETURN QUERY
        SELECT *
        FROM public.order_tracking_events
        WHERE order_id = p_order_id
        ORDER BY created_at ASC;
    ELSE
        RAISE EXCEPTION 'Not authorized to view tracking events';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_tracking_events_universal(uuid, text) TO anon, authenticated;
