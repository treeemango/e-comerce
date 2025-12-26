-- UNIVERSAL REVIEW SYSTEM FIX
-- This script proactively fixes the entire Review System structure and data.
-- It works for ANY product by ensuring the underlying logic (Functions, Triggers, Permissions) is correct.

BEGIN;

-- ==============================================================================
-- 1. SECURITY & PERMISSIONS (Prevents 401 Errors)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enhanced_reviews TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_photos TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_votes TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_responses TO anon, authenticated, service_role;
GRANT SELECT ON public.product_review_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.users TO anon, authenticated, service_role;


-- ==============================================================================
-- 2. ROBUST DATA FETCHING (RPC) (Prevents Empty Data / Case Sensitivity Issues)
-- ==============================================================================
DROP FUNCTION IF EXISTS public.get_product_reviews(uuid);

CREATE OR REPLACE FUNCTION public.get_product_reviews(p_product_id uuid)
RETURNS TABLE (
    id uuid,
    product_id uuid,
    user_id uuid,
    rating integer,
    comment text,
    created_at timestamptz,
    title text,
    is_verified_purchase boolean,
    helpful_votes integer,
    total_votes integer,
    status text,
    reviewer_name text,
    reviewer_avatar_url text,
    fit_rating integer,
    value_rating integer,
    quality_rating integer,
    pros text[],
    cons text[],
    recommended boolean,
    would_buy_again boolean,
    photos jsonb,
    responses jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT
        r.id,
        r.product_id,
        r.user_id,
        r.rating,
        r.content AS comment,
        r.created_at,
        r.title,
        r.is_verified_purchase,
        r.helpful_votes,
        r.total_votes,
        r.status,
        u.name AS reviewer_name,
        u.avatar_url AS reviewer_avatar_url,
        r.fit_rating,
        r.value_rating,
        r.quality_rating,
        r.pros,
        r.cons,
        r.recommended,
        r.would_buy_again,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', rp.id,
                        'photo_url', rp.photo_url,
                        'is_primary', rp.is_primary
                    ) ORDER BY rp.sort_order
                )
                FROM review_photos rp
                WHERE rp.review_id = r.id
            ),
            '[]'::jsonb
        ) AS photos,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', rr.id,
                        'response_text', rr.response_text,
                        'responder_type', rr.responder_type,
                        'is_official', rr.is_official,
                        'created_at', rr.created_at,
                        'responder_name', ru.name
                    ) ORDER BY rr.created_at
                )
                FROM review_responses rr
                LEFT JOIN users ru ON ru.id = rr.responder_id
                WHERE rr.review_id = r.id
            ),
            '[]'::jsonb
        ) AS responses
    FROM
        public.enhanced_reviews r 
    LEFT JOIN
        public.users u ON u.id = r.user_id
    WHERE
        r.product_id = p_product_id
        -- ROBUST CHECK: Matches 'approved', 'Approved', 'APPROVED ' (with spaces)
        AND TRIM(BOTH FROM LOWER(r.status)) = 'approved'
    ORDER BY
        r.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO anon, authenticated, service_role;


-- ==============================================================================
-- 3. VOTING SYSTEM FIX (Prevents 400 Bad Request Errors)
-- ==============================================================================
-- Drop the old/broken trigger
DROP TRIGGER IF EXISTS update_review_helpful_votes_trigger ON public.review_votes;

-- Create correct vote calculation function
CREATE OR REPLACE FUNCTION public.update_review_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    target_review_id UUID;
    v_helpful_count INTEGER;
    v_total_count INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_review_id := OLD.review_id;
    ELSE
        target_review_id := NEW.review_id;
    END IF;

    SELECT COUNT(*) INTO v_helpful_count
    FROM public.review_votes
    WHERE review_id = target_review_id AND vote_type = 'helpful';

    SELECT COUNT(*) INTO v_total_count
    FROM public.review_votes
    WHERE review_id = target_review_id;

    UPDATE public.enhanced_reviews
    SET helpful_votes = v_helpful_count, total_votes = v_total_count
    WHERE id = target_review_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS update_review_vote_counts_trigger ON public.review_votes;
CREATE TRIGGER update_review_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_review_vote_counts();


-- ==============================================================================
-- 4. SUMMARY STATISTICS RECALCULATION (Fixes "No Reviews" & Star Counts)
-- ==============================================================================
-- Ensure the Summary Trigger is correct for FUTURE reviews
CREATE OR REPLACE FUNCTION public.update_product_review_summary()
RETURNS TRIGGER AS $$
DECLARE
    target_product_id UUID;
    review_stats RECORD;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_product_id := OLD.product_id;
    ELSE
        target_product_id := NEW.product_id;
    END IF;

    IF target_product_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    SELECT
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating)::DECIMAL(3,2), 0) as avg_rating,
        -- Rating Distribution Logic
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as star_1,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as star_2,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as star_3,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as star_4,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as star_5,
        -- Other stats
        COUNT(*) FILTER (WHERE is_verified_purchase = TRUE) as verified_count,
        COUNT(*) FILTER (WHERE is_featured = TRUE) as featured_count,
        COALESCE((COUNT(*) FILTER (WHERE recommended = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 0) as recommended_pct,
        COALESCE((COUNT(*) FILTER (WHERE would_buy_again = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 0) as buy_again_pct,
        COALESCE(AVG(fit_rating)::DECIMAL(3,2), 0) as avg_fit,
        COALESCE(AVG(value_rating)::DECIMAL(3,2), 0) as avg_value,
        COALESCE(AVG(quality_rating)::DECIMAL(3,2), 0) as avg_quality
    INTO review_stats
    FROM public.enhanced_reviews
    WHERE enhanced_reviews.product_id = target_product_id
    AND TRIM(BOTH FROM LOWER(status)) = 'approved';

    INSERT INTO public.product_review_summary (
        product_id, total_reviews, average_rating, rating_distribution,
        verified_reviews_count, featured_reviews_count, recommended_percentage,
        would_buy_again_percentage, average_fit_rating, average_value_rating,
        average_quality_rating, last_updated
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

-- Re-attach Summary Trigger
DROP TRIGGER IF EXISTS update_product_review_summary_trigger ON public.enhanced_reviews;
CREATE TRIGGER update_product_review_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.enhanced_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_product_review_summary();


-- 5. Force RECALCULATE for ALL products currently in the database
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
WHERE TRIM(BOTH FROM LOWER(status)) = 'approved'
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
