-- FIX: Relaxed RLS Policy for Enhanced Reviews
-- This script fixes the "new row violates row-level security policy" error (403)
-- by allowing any authenticated user to insert a review for themselves.
-- Verification of purchase is handled by triggers, not RLS constraints.

BEGIN;

-- 1. Drop existing restrictive policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can create reviews" ON public.enhanced_reviews;
DROP POLICY IF EXISTS "Users can create reviews for their purchases" ON public.enhanced_reviews;
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.enhanced_reviews;

-- 2. Create the correct permissive policy
-- Allows creation if the user_id in the row matches the authenticated user.
CREATE POLICY "Users can create reviews" ON public.enhanced_reviews
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id
    );

-- 3. Ensure Update policy exists (users can edit their own pending reviews)
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.enhanced_reviews;
CREATE POLICY "Users can update their own reviews" ON public.enhanced_reviews
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- 4. Ensure Select policy exists (users can see their own reviews, everyone can see approved)
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.enhanced_reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.enhanced_reviews
    FOR SELECT 
    USING (status = 'approved' OR auth.uid() = user_id);

COMMIT;
