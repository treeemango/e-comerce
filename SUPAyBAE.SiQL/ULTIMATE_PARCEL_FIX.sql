-- ULTIMATE PARCEL FIX SCRIPT

-- 1. ENSURE COLUMN EXISTS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_type text DEFAULT 'official_courier';

-- 2. MARK ALL PARCEL ORDERS FOR VISIBILITY
-- This ensures the UI picks them up
UPDATE public.orders 
SET fulfillment_type = 'local_parcel' 
WHERE shipping_method = 'local_parcel';

-- 3. UNBLOCK DELIVERY PROOFS (RLS)
-- Enable RLS so policies take effect
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;

-- CLEAN UP OLD POLICIES
DROP POLICY IF EXISTS "Buyers can see their own delivery proofs" ON public.delivery_proofs;
DROP POLICY IF EXISTS "Sellers can manage their own delivery proofs" ON public.delivery_proofs;
DROP POLICY IF EXISTS "Sellers can insert delivery proofs" ON public.delivery_proofs;

-- BUYER POLICY: Can see proofs (OTP) for their own orders
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

-- SELLER POLICY: Can INSERT and SELECT proofs for their orders
-- This is critical for the "Ship" button to work
CREATE POLICY "Sellers can manage their own delivery proofs" 
ON public.delivery_proofs 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.order_items oi ON oi.order_id = delivery_proofs.order_id
    WHERE p.id = oi.product_id
    AND p.seller_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.order_items oi ON oi.order_id = delivery_proofs.order_id
    WHERE p.id = oi.product_id
    AND p.seller_id = auth.uid()
  )
);

-- 4. GRANT PERMISSIONS just in case
GRANT SELECT, INSERT, UPDATE ON public.delivery_proofs TO authenticated;
GRANT ALL ON public.orders TO authenticated;

-- 5. VERIFY DATA (Run these separately if needed to see results)
-- SELECT id, fulfillment_type, shipping_method FROM public.orders WHERE shipping_method = 'local_parcel';
-- SELECT * FROM public.delivery_proofs LIMIT 5;
