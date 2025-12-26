-- 1. Drop the old function (if it was created previously)
DROP FUNCTION IF EXISTS get_product_reviews(uuid);

-- 2. Create the final, corrected RPC function
CREATE OR REPLACE FUNCTION get_product_reviews(p_product_id uuid)
RETURNS TABLE (
    id uuid,
    product_id uuid,
    user_id uuid,
    rating integer,
    comment text,
    created_at timestamptz,
    title text,                 -- Adding key columns from enhanced_reviews
    is_verified_purchase boolean,
    helpful_votes integer,
    total_votes integer,
    status text,
    reviewer_name text,         -- Profile data
    reviewer_avatar_url text,
    
    -- Enhanced fields
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
        
        -- Enhanced fields
        r.fit_rating,
        r.value_rating,
        r.quality_rating,
        r.pros,
        r.cons,
        r.recommended,
        r.would_buy_again,
        
        -- Aggregate photos
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
        
        -- Aggregate responses
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
    -- JOIN to your public.users profile table using the user_id FK
    LEFT JOIN
        public.users u ON u.id = r.user_id
    WHERE
        r.product_id = p_product_id
        AND r.status = 'approved' -- Only show approved reviews
    ORDER BY
        r.created_at DESC;
$$;

-- 3. Grant execution permissions
GRANT EXECUTE ON FUNCTION get_product_reviews(uuid) TO authenticated, anon;
