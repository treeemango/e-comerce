-- Fix 400s when inserting tracking events and calling release_transport_fees
--
-- This migration makes the database schema match what the frontend expects:
-- - order_tracking_events.event_type allows 'shipped'
-- - order_items has delivery_fee + fulfillment_status (used by release_transport_fees)
-- - seller_transactions has release_date + status (used by payout/escrow flows)

-- 1) Ensure required columns exist
ALTER TABLE public.seller_transactions
ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending';

-- 2) Allow 'shipped' in tracking events
DO $$
BEGIN
  ALTER TABLE public.order_tracking_events
    DROP CONSTRAINT IF EXISTS order_tracking_events_event_type_check;

  ALTER TABLE public.order_tracking_events
    ADD CONSTRAINT order_tracking_events_event_type_check
    CHECK (event_type = ANY (ARRAY[
      'order_placed'::text,
      'payment_confirmed'::text,
      'order_confirmed'::text,
      'preparing'::text,
      'shipped'::text,
      'ready_for_pickup'::text,
      'picked_up'::text,
      'in_transit'::text,
      'out_for_delivery'::text,
      'delivered'::text,
      'failed_delivery'::text,
      'returned'::text,
      'cancelled'::text,
      'refunded'::text
    ]));
EXCEPTION
  WHEN undefined_table THEN
    -- Fresh databases may not have this table yet.
    RAISE NOTICE 'order_tracking_events not found; skipping constraint update';
END $$;

-- 3) Ensure the RPC exists and matches frontend parameter names
CREATE OR REPLACE FUNCTION public.release_transport_fees(
  p_order_id UUID,
  p_seller_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_total NUMERIC := 0;
  v_order_number TEXT;
BEGIN
  SELECT o.order_number
    INTO v_order_number
  FROM public.orders o
  WHERE o.id = p_order_id;

  SELECT COALESCE(SUM(oi.delivery_fee), 0)
    INTO v_delivery_total
  FROM public.order_items oi
  JOIN public.products p ON oi.product_id = p.id
  WHERE oi.order_id = p_order_id
    AND p.seller_id = p_seller_id;

  IF v_delivery_total > 0 THEN
    INSERT INTO public.seller_transactions (
      seller_id,
      order_id,
      transaction_type,
      amount,
      description,
      release_date,
      status
    )
    VALUES (
      p_seller_id,
      p_order_id,
      'Transport Fee',
      v_delivery_total,
      'Transport fee for Order #' || COALESCE(v_order_number, p_order_id::text) || ' (Released on shipping)',
      NOW(),
      'available'
    );
  END IF;
END;
$$;

-- 4) Explicit permissions (RLS still applies)
GRANT EXECUTE ON FUNCTION public.release_transport_fees(UUID, UUID) TO authenticated;
GRANT SELECT, INSERT ON public.order_tracking_events TO authenticated;
