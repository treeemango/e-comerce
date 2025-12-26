-- FINAL V2 FIX: Robust RPC + Debug Output
-- 1. Updates get_product_reviews to be case-insensitive and ignore whitespace (e.g. 'Approved ')
-- 2. Grants permissions (again, to be safe)
-- 3. Outputs current reviews in the database to help verify Product IDs

BEGIN;

-- ==========================================
-- 1. ROBUST RPC FUNCTION
-- ==========================================
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

-- ==========================================
-- 2. PERMISSIONS
-- ==========================================
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO anon, authenticated, service_role;
GRANT SELECT ON public.enhanced_reviews TO anon, authenticated, service_role;
GRANT SELECT ON public.users TO anon, authenticated, service_role;

COMMIT;

-- ==========================================
-- 3. DEBUG OUTPUT
-- Check these results to ensure your Product ID matches what you expect!
-- ==========================================
SELECT 
    id as review_id, 
    product_id, 
    status, 
    rating, 
    content 
FROM public.enhanced_reviews 
WHERE status ILIKE '%approved%'
LIMIT 10;
