-- FINAL SOLUTION: Move reviews to the correct Product ID and update summary
-- 1. Move reviews from '45a82a82-8322-4596-8d53-6f9c9b5cfc95' to '5c47a5fc-2edb-4966-907d-0902bd2ea147'
-- 2. Recalculate summary for the active product '5c47a5fc-2edb-4966-907d-0902bd2ea147'

BEGIN;

-- 1. Move reviews to the correct product
UPDATE public.enhanced_reviews
SET product_id = '5c47a5fc-2edb-4966-907d-0902bd2ea147'
WHERE product_id = '45a82a82-8322-4596-8d53-6f9c9b5cfc95';

-- 2. Recalculate summary for the NEW product ID
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
WHERE product_id = '5c47a5fc-2edb-4966-907d-0902bd2ea147'
AND status = 'approved'
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
