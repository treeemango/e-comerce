-- Drop the broken trigger that is causing the "record new has no field seller_id" error
DROP TRIGGER IF EXISTS trigger_create_shipment_on_order_confirm ON public.orders;

-- Drop the function associated with it (if it exists)
DROP FUNCTION IF EXISTS public.trigger_create_shipment_on_order();

-- Also drop other potential problematic triggers on orders that might reference seller_id erroneously
-- (Based on common patterns, but relying on the specific error for now)
