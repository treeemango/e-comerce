-- Comprehensive permission fix for Review System
-- Usage: Run this in the Supabase SQL Editor

-- 1. Ensure public schema usage
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 2. Grant table access permissions (RLS will still filter rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enhanced_reviews TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_photos TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_responses TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_votes TO anon, authenticated, service_role;
GRANT SELECT ON public.users TO anon, authenticated, service_role; -- Needed to join reviewer profile
GRANT SELECT ON public.product_review_summary TO anon, authenticated, service_role;

-- 3. Explicitly Grant EXECUTE on the RPC function
-- Re-applying this confirms the signature match
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO postgres;

-- 4. Also grant permissions for the helper functions just in case
GRANT EXECUTE ON FUNCTION public.update_product_review_summary() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_review_helpfulness(uuid) TO anon, authenticated, service_role;

-- 5. Verify the function exists (will error if not found, confirming if name is wrong)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'get_product_reviews'
    ) THEN
        RAISE EXCEPTION 'Function get_product_reviews does not exist!';
    END IF;
END
$$;
