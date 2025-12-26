-- RESTRAIN_SELLER_OTP_READ.sql
-- Goal: Hide the OTP (collection code) from sellers while allowing them to insert it and verify it via RPC.

-- 1. Drop existing permissive policies for delivery_proofs
DROP POLICY IF EXISTS "Sellers can manage their own delivery proofs" ON public.delivery_proofs;
DROP POLICY IF EXISTS "Sellers can see their order proofs" ON public.delivery_proofs;
DROP POLICY IF EXISTS "Sellers can update their order proofs" ON public.delivery_proofs;
DROP POLICY IF EXISTS "Sellers can insert delivery proofs" ON public.delivery_proofs;

-- 2. Seller INSERT Policy
-- Sellers can still INSERT proofs (needed for shipment evidence and OTP generation during fulfillment)
CREATE POLICY "Sellers can insert delivery proofs" 
ON public.delivery_proofs 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = delivery_proofs.order_id
    AND p.seller_id = auth.uid()
  )
);

-- 3. Seller SELECT Policy (RESTRICTED)
-- Sellers can see proofs for THEIR orders, BUT NEVER THE SECRETS (OTP)
-- This ensures that even if they know the order ID, they can't query the OTP via the API/Dashboard.
CREATE POLICY "Sellers can see non-secret delivery proofs" 
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
  AND proof_type != 'otp' -- CRITICAL: HIDE THE OTP FROM SELLER READS
);

-- 4. Seller UPDATE Policy (RESTRICTED)
-- Sellers can update their own proofs (e.g. adding notes to evidence), but not the secrets.
CREATE POLICY "Sellers can update their own delivery proofs" 
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
  AND proof_type != 'otp'
);

-- NOTE: Verification via verifyParcelOTP RPC still works because it is defined with SECURITY DEFINER,
-- which bypasses RLS policies to check the p_otp against the database.
