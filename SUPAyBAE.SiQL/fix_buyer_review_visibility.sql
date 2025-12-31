-- Fix RLS policy for viewing reviews
-- Currently, users might only be able to see "approved" reviews via public policy.
-- We need to ensure users can see THEIR OWN reviews regardless of status.

DROP POLICY IF EXISTS "Users can view their own reviews" ON public.enhanced_reviews;

CREATE POLICY "Users can view their own reviews"
ON public.enhanced_reviews FOR SELECT
USING (
    -- User can see reviews if they are the author
    auth.uid() = user_id 
    OR 
    -- OR if the review is approved (public access)
    status = 'approved'
);

-- Note: If there is a conflicting "public view" policy, Supabase combines them with OR, so adding this specific one is safe.
-- Existing policy might be "Anyone can view approved reviews". This new one adds "or if it's your own".
