-- Fix RLS policy for reviews to prevent 403 Forbidden errors
-- The previous policy required 'delivered' status which was too strict.
-- Verification is now handled by the 'set_is_verified_purchase' trigger.

-- Drop the old validation-heavy policy if it exists (using the old name)
DROP POLICY IF EXISTS "Users can create reviews for their purchases" ON public.enhanced_reviews;

-- Drop the new name policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can create reviews" ON public.enhanced_reviews;

-- Create the new permissive policy (checks auth only)
CREATE POLICY "Users can create reviews" ON public.enhanced_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );
