-- 1. Sync fulfillment_type for any existing parcel orders
UPDATE public.orders 
SET fulfillment_type = 'local_parcel' 
WHERE shipping_method = 'local_parcel' 
AND (fulfillment_type IS NULL OR fulfillment_type = 'official_courier');

-- 2. Ensure delivery_proofs has RLS enabled (best practice)
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy to allow buyers to see their own OTP/Proofs
-- This is critical! Without this, the buyer's query for order details 
-- will return an empty list for delivery_proofs.
DROP POLICY IF EXISTS "Buyers can see their own delivery proofs" ON public.delivery_proofs;
CREATE POLICY "Buyers can see their own delivery proofs" 
ON public.delivery_proofs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = delivery_proofs.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- 4. Create Policy to allow sellers to see proofs for their items
DROP POLICY IF EXISTS "Sellers can see proofs for their orders" ON public.delivery_proofs;
CREATE POLICY "Sellers can see proofs for their orders" 
ON public.delivery_proofs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.order_items oi ON oi.product_id = p.id
    WHERE oi.order_id = delivery_proofs.order_id
    AND p.seller_id = auth.uid()
  )
);
