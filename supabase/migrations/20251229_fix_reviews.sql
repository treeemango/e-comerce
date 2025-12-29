-- Drop the trigger that prevents status changes, as it hinders the approval process (P0001 error)
DROP TRIGGER IF EXISTS trg_prevent_review_status_change ON public.enhanced_reviews;

-- Drop the function associated with the trigger
DROP FUNCTION IF EXISTS public.prevent_review_status_change();
