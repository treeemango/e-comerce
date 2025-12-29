-- Assign all orphaned reviews (user_id IS NULL) to a random valid user
-- This is a temporary fix to make existing "Anonymous" reviews show up with a real name/avatar
UPDATE public.enhanced_reviews
SET user_id = (
    SELECT id 
    FROM public.users 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE user_id IS NULL;
