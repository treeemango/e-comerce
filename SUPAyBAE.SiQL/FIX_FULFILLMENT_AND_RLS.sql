-- FIX FULFILLMENT ERRORS (403 and 400)
-- This script fixes the 403 Forbidden error on order_tracking_events and ensures sellers can update order status.

-- 1. FIX CHECK CONSTRAINT ON order_tracking_events
-- Adding 'shipped' to the allowed event types
ALTER TABLE public.order_tracking_events 
DROP CONSTRAINT IF EXISTS order_tracking_events_event_type_check;

ALTER TABLE public.order_tracking_events 
ADD CONSTRAINT order_tracking_events_event_type_check 
CHECK (event_type = ANY (ARRAY[
    'order_placed'::text, 
    'payment_confirmed'::text, 
    'order_confirmed'::text, 
    'preparing'::text, 
    'shipped'::text,             -- Added
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

-- 2. ENABLE RLS AND ADD POLICIES FOR order_tracking_events
ALTER TABLE public.order_tracking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can insert tracking events for their orders" ON public.order_tracking_events;
CREATE POLICY "Sellers can insert tracking events for their orders" 
ON public.order_tracking_events 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.order_items oi ON oi.product_id = p.id
    WHERE oi.order_id = order_tracking_events.order_id
    AND p.seller_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view tracking events for their orders" ON public.order_tracking_events;
CREATE POLICY "Users can view tracking events for their orders" 
ON public.order_tracking_events 
FOR SELECT 
USING (
  -- Either the buyer
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_tracking_events.order_id AND o.user_id = auth.uid())
  OR 
  -- Or the seller
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.order_items oi ON oi.product_id = p.id
    WHERE oi.order_id = order_tracking_events.order_id
    AND p.seller_id = auth.uid()
  )
);

-- 3. ALLOW SELLERS TO UPDATE ORDER STATUS
DROP POLICY IF EXISTS "Sellers can update their orders" ON public.orders;
CREATE POLICY "Sellers can update their orders" 
ON public.orders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.order_items oi ON oi.product_id = p.id
    WHERE oi.order_id = orders.id
    AND p.seller_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.order_items oi ON oi.product_id = p.id
    WHERE oi.order_id = orders.id
    AND p.seller_id = auth.uid()
  )
);

-- 4. ROBUSTIFY TRANSPORT FEE RELEASE
-- Ensure the function is SECURITY DEFINER so it can bypass RLS on transactions if needed
CREATE OR REPLACE FUNCTION public.release_transport_fees(
    p_order_id UUID,
    p_seller_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_delivery_total NUMERIC := 0;
    v_order_number TEXT;
BEGIN
    -- Calculate delivery fees for this seller's items in the order
    SELECT COALESCE(SUM(delivery_fee), 0), o.order_number
    INTO v_delivery_total, v_order_number
    FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.order_id = p_order_id AND p.seller_id = p_seller_id
    GROUP BY o.order_number;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. GRANT PERMISSIONS
GRANT SELECT, INSERT ON public.order_tracking_events TO authenticated;
GRANT ALL ON public.orders TO authenticated;
