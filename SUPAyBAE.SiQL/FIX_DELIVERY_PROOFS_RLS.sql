-- FIX: delivery_proofs RLS policies
-- The table exists but is EMPTY because sellers can't INSERT due to RLS blocking.

-- Step 1: Enable RLS (if not already)
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any conflicting policies
DROP POLICY IF EXISTS "Buyers can see their own delivery proofs" ON public.delivery_proofs;
DROP POLICY IF EXISTS "Sellers can manage their own delivery proofs" ON public.delivery_proofs;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.delivery_proofs;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.delivery_proofs;

-- Step 3: Create a SIMPLE INSERT policy for any authenticated user
-- This allows the seller to insert the OTP when they ship
CREATE POLICY "Allow authenticated insert" 
ON public.delivery_proofs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Step 4: Create a SELECT policy for buyers to see their own OTPs
CREATE POLICY "Buyers can see their own delivery proofs" 
ON public.delivery_proofs 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = delivery_proofs.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Step 5: Create a SELECT policy for sellers to see proofs for their orders
CREATE POLICY "Sellers can see their order proofs" 
ON public.delivery_proofs 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = delivery_proofs.order_id
    AND p.seller_id = auth.uid()
  )
);

-- Step 6: Create an UPDATE policy for sellers to verify OTPs
CREATE POLICY "Sellers can update their order proofs" 
ON public.delivery_proofs 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = delivery_proofs.order_id
    AND p.seller_id = auth.uid()
  )
);

-- VERIFY: Run this to check the policies are created
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'delivery_proofs';
