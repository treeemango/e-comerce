DROP FUNCTION IF EXISTS get_recommended_products(p_limit integer);

CREATE OR REPLACE FUNCTION get_recommended_products(p_limit integer DEFAULT 10)
RETURNS TABLE (
    product_id uuid,
    product_name text,
    product_price numeric,
    image_url text,
    avg_rating numeric,
    total_sales numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.price AS product_price,
        
        -- FIX: Subquery to fetch the main image URL from the media table
        (
            SELECT m.image_url 
            FROM public.media m
            WHERE m.product_id = p.id
            AND m.is_main = TRUE 
            LIMIT 1
        ) AS image_url,

        COALESCE(AVG(r.rating), 0)::numeric(10, 2) AS avg_rating,
        COALESCE(SUM(oi.quantity), 0) AS total_sales 
    FROM
        public.products p
    -- Join to order items for sales data
    LEFT JOIN
        public.order_items oi ON oi.product_id = p.id
    -- Join to enhanced_reviews for ratings data
    LEFT JOIN
        public.enhanced_reviews r ON r.product_id = p.id
    GROUP BY
        p.id, p.name, p.price
    HAVING
        -- Filter out products with insufficient data (requires at least 10 reviews OR some sales history)
        COUNT(r.id) >= 10 OR COALESCE(SUM(oi.quantity), 0) > 0
    ORDER BY
        total_sales DESC,   -- Prioritize high-selling items
        avg_rating DESC     -- Then prioritize high-rated items
    LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_recommended_products(integer) TO authenticated, anon;