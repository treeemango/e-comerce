-- FIX: Review Voting Triggers
-- 1. Drop the incorrect trigger that tries to update a non-existent 'updated_at' column on review_votes
DROP TRIGGER IF EXISTS update_review_helpful_votes_trigger ON public.review_votes;

-- 2. Create a function to calculate and update vote counts on the review
CREATE OR REPLACE FUNCTION public.update_review_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    target_review_id UUID;
    v_helpful_count INTEGER;
    v_total_count INTEGER;
BEGIN
    -- Determine which review_id to update
    IF TG_OP = 'DELETE' THEN
        target_review_id := OLD.review_id;
    ELSE
        target_review_id := NEW.review_id;
    END IF;

    -- Calculate helpful votes
    SELECT COUNT(*) INTO v_helpful_count
    FROM public.review_votes
    WHERE review_id = target_review_id
    AND vote_type = 'helpful';

    -- Calculate total votes
    SELECT COUNT(*) INTO v_total_count
    FROM public.review_votes
    WHERE review_id = target_review_id;

    -- Update the enhanced_reviews table
    UPDATE public.enhanced_reviews
    SET 
        helpful_votes = v_helpful_count,
        total_votes = v_total_count
    WHERE id = target_review_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the correct trigger to update counts on vote changes
CREATE TRIGGER update_review_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_review_vote_counts();

-- 4. Grant permissions just in case
GRANT EXECUTE ON FUNCTION public.update_review_vote_counts() TO anon, authenticated, service_role;
