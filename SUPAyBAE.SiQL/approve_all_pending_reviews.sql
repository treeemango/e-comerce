-- Approve all pending reviews to make them visible on the frontend
-- This matches the 'approved' filter in the get_product_reviews RPC

BEGIN;

-- 1. Show pre-update counts
DO $$
DECLARE
    pending_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pending_count FROM public.enhanced_reviews WHERE status = 'pending';
    RAISE NOTICE 'Found % pending reviews to approve.', pending_count;
END $$;

-- 2. Approve all pending reviews
UPDATE public.enhanced_reviews
SET status = 'approved',
    moderated_at = NOW(),
    moderation_reason = 'Auto-approved for testing'
WHERE status = 'pending';

-- 3. Force update the summary table again just to be 100% sure
INSERT INTO public.product_review_summary (
    product_id, total_reviews, average_rating, rating_distribution,
    verified_reviews_count, featured_reviews_count, recommended_percentage,
    would_buy_again_percentage, average_fit_rating, average_value_rating,
    average_quality_rating, last_updated
)
SELECT
    product_id,
    COUNT(*) as total_reviews,
    COALESCE(AVG(rating)::DECIMAL(3,2), 0) as average_rating,
    jsonb_build_object(
        '1', COUNT(*) FILTER (WHERE rating = 1),
        '2', COUNT(*) FILTER (WHERE rating = 2),
        '3', COUNT(*) FILTER (WHERE rating = 3),
        '4', COUNT(*) FILTER (WHERE rating = 4),
        '5', COUNT(*) FILTER (WHERE rating = 5)
    ) as rating_distribution,
    COUNT(*) FILTER (WHERE is_verified_purchase = TRUE) as verified_reviews_count,
    COUNT(*) FILTER (WHERE is_featured = TRUE) as featured_reviews_count,
    COALESCE((COUNT(*) FILTER (WHERE recommended = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 0) as recommended_percentage,
    COALESCE((COUNT(*) FILTER (WHERE would_buy_again = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 0) as would_buy_again_percentage,
    COALESCE(AVG(fit_rating)::DECIMAL(3,2), 0) as average_fit_rating,
    COALESCE(AVG(value_rating)::DECIMAL(3,2), 0) as average_value_rating,
    COALESCE(AVG(quality_rating)::DECIMAL(3,2), 0) as average_quality_rating,
    NOW()
FROM public.enhanced_reviews
WHERE status = 'approved'
GROUP BY product_id
ON CONFLICT (product_id) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    rating_distribution = EXCLUDED.rating_distribution,
    verified_reviews_count = EXCLUDED.verified_reviews_count,
    featured_reviews_count = EXCLUDED.featured_reviews_count,
    recommended_percentage = EXCLUDED.recommended_percentage,
    would_buy_again_percentage = EXCLUDED.would_buy_again_percentage,
    average_fit_rating = EXCLUDED.average_fit_rating,
    average_value_rating = EXCLUDED.average_value_rating,
    average_quality_rating = EXCLUDED.average_quality_rating,
    last_updated = NOW();

COMMIT;
