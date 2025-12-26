-- FIX: Correcting Product Review Summary Trigger Function
-- The previous version had a syntax error in the ON CONFLICT clause:
-- "ON CONFLICT (target_product_id)" -> "ON CONFLICT (product_id)"
-- This caused error 42P10 during review submission.

CREATE OR REPLACE FUNCTION public.update_product_review_summary()
RETURNS TRIGGER AS $$
DECLARE
    target_product_id UUID;
    review_stats RECORD;
BEGIN
    -- Determine which product_id to update based on the operation
    IF TG_OP = 'DELETE' THEN
        target_product_id := OLD.product_id;
    ELSE
        target_product_id := NEW.product_id;
    END IF;

    -- If no product_id, skip
    IF target_product_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate stats for the product
    SELECT
        COUNT(*) as total_reviews,
        AVG(rating)::DECIMAL(3,2) as avg_rating,
        COUNT(*) FILTER (WHERE is_verified_purchase = TRUE) as verified_count,
        COUNT(*) FILTER (WHERE is_featured = TRUE) as featured_count,
        COALESCE((COUNT(*) FILTER (WHERE recommended = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 0) as recommended_pct,
        COALESCE((COUNT(*) FILTER (WHERE would_buy_again = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 0) as buy_again_pct,
        AVG(fit_rating)::DECIMAL(3,2) as avg_fit,
        AVG(value_rating)::DECIMAL(3,2) as avg_value,
        AVG(quality_rating)::DECIMAL(3,2) as avg_quality,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as star_1,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as star_2,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as star_3,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as star_4,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as star_5
    INTO review_stats
    FROM public.enhanced_reviews
    WHERE enhanced_reviews.product_id = target_product_id
    AND status = 'approved';

    -- Insert or Update summary
    INSERT INTO public.product_review_summary (
        product_id, 
        total_reviews, 
        average_rating, 
        rating_distribution,
        verified_reviews_count,
        featured_reviews_count, 
        recommended_percentage, 
        would_buy_again_percentage,
        average_fit_rating, 
        average_value_rating, 
        average_quality_rating, 
        last_updated
    ) VALUES (
        target_product_id, 
        COALESCE(review_stats.total_reviews, 0), 
        COALESCE(review_stats.avg_rating, 0),
        jsonb_build_object(
            '1', COALESCE(review_stats.star_1, 0),
            '2', COALESCE(review_stats.star_2, 0),
            '3', COALESCE(review_stats.star_3, 0),
            '4', COALESCE(review_stats.star_4, 0),
            '5', COALESCE(review_stats.star_5, 0)
        ),
        COALESCE(review_stats.verified_count, 0), 
        COALESCE(review_stats.featured_count, 0),
        COALESCE(review_stats.recommended_pct, 0), 
        COALESCE(review_stats.buy_again_pct, 0),
        COALESCE(review_stats.avg_fit, 0), 
        COALESCE(review_stats.avg_value, 0), 
        COALESCE(review_stats.avg_quality, 0), 
        NOW()
    )
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

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
