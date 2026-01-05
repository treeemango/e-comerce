-- Broadcast platform events (hero banner detected events) to sellers via notifications_queue
-- This lets sellers create coupons/campaigns named after the event, and buyers can filter via the banner "Shop Now".

CREATE TABLE IF NOT EXISTS public.platform_event_broadcast_state (
    country_code text PRIMARY KEY,
    last_event_name text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_event_broadcast_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_platform_event_broadcast_state" ON public.platform_event_broadcast_state;
CREATE POLICY "authenticated_read_platform_event_broadcast_state"
ON public.platform_event_broadcast_state
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.broadcast_platform_event_to_sellers(
    p_country_code text,
    p_event_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_country text;
    v_event text;
    v_prev text;
BEGIN
    v_country := upper(coalesce(nullif(p_country_code, ''), 'GLOBAL'));
    v_event := coalesce(nullif(p_event_name, ''), 'default');

    SELECT last_event_name
      INTO v_prev
      FROM public.platform_event_broadcast_state
     WHERE country_code = v_country;

    IF v_prev IS NOT NULL AND v_prev = v_event THEN
        RETURN false;
    END IF;

    INSERT INTO public.platform_event_broadcast_state(country_code, last_event_name, updated_at)
    VALUES (v_country, v_event, now())
    ON CONFLICT (country_code)
    DO UPDATE SET last_event_name = EXCLUDED.last_event_name, updated_at = now();

    -- In-app broadcast to all active sellers.
    INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body)
    SELECT DISTINCT
        v.user_id,
        NULL::uuid,
        'in_app',
        v.user_id::text,
        'New event detected: ' || v_event || '. Create coupons/campaigns using this event name so buyers can find them under Shop Now.'
    FROM public.vendors v
    WHERE v.user_id IS NOT NULL
      AND COALESCE(v.is_active, true) = true;

    RETURN true;
END;
$$;

-- Lock down RPC so clients can't spam sellers.
REVOKE ALL ON FUNCTION public.broadcast_platform_event_to_sellers(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.broadcast_platform_event_to_sellers(text, text) TO service_role;
