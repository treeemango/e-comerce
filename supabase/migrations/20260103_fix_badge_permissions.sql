-- Fix permissions for badge_2030_seller_badges table to resolve 406 Not Acceptable error

-- 1. Ensure RLS is enabled (good practice)
ALTER TABLE IF EXISTS public.badge_2030_seller_badges ENABLE ROW LEVEL SECURITY;

-- 2. Grant SELECT permission to anonymous and authenticated users (API access)
GRANT SELECT ON public.badge_2030_seller_badges TO anon, authenticated;

-- 3. Create RLS policy to allow everyone to view badges
-- Drop existing policy if it exists to avoid conflict
DROP POLICY IF EXISTS "Badges are viewable by everyone" ON public.badge_2030_seller_badges;

CREATE POLICY "Badges are viewable by everyone"
ON public.badge_2030_seller_badges
FOR SELECT
USING (true);
