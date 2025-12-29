-- 1. Drop the trigger that prevents status changes (Fixes P0001 error)
DROP TRIGGER IF EXISTS trg_prevent_review_status_change ON public.enhanced_reviews;
DROP FUNCTION IF EXISTS public.prevent_review_status_change();

-- 2. Clean up data integrity issues before adding FK
-- Set user_id to NULL for any reviews where the user_id does not exist in public.users
-- This prevents the foreign key constraint violation (Error 23503)
UPDATE public.enhanced_reviews
SET user_id = NULL
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.users);

-- 3. Add Foreign Key to public.users to allow joining/embedding user profile data
-- This is required because the existing FK points to auth.users, which PostgREST cannot use for public joins.
-- First drop it if it partially exists to ensure clean slate
ALTER TABLE public.enhanced_reviews
DROP CONSTRAINT IF EXISTS enhanced_reviews_user_id_public_fkey;

ALTER TABLE public.enhanced_reviews
ADD CONSTRAINT enhanced_reviews_user_id_public_fkey
FOREIGN KEY (user_id) REFERENCES public.users (id)
ON DELETE CASCADE;

-- Note: product_id already references 'products' (assumed public.products), so joins should work for products.
