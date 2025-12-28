DROP FUNCTION IF EXISTS get_top_rated_products(integer);
DROP FUNCTION IF EXISTS get_top_rated_products();

CREATE OR REPLACE FUNCTION get_top_rated_products(p_limit int DEFAULT 20)
RETURNS TABLE (
    product_id uuid,
    product_name text,
    product_image_url text,
    price numeric,
    currency text,
    avg_rating numeric,
    review_count int,
    ranking bigint,
    free_delivery boolean,
    is_express_delivery boolean,
    delivery_time_estimate text,
    delivery_locations text[],
    vendor_country text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, 
        p.title,
        COALESCE(
            (SELECT m.image_url FROM media m WHERE m.product_id = p.id AND m.is_main = true LIMIT 1),
            (SELECT m.image_url FROM media m WHERE m.product_id = p.id ORDER BY m.position ASC LIMIT 1),
            '/images/default-product.jpg'
        ) as image_url,
        p.min_price, 
        p.currency, 
        p.rating,
        p.review_count,
        ROW_NUMBER() OVER (
            ORDER BY 
                p.rating DESC, 
                p.review_count DESC,
                p.sales_count DESC
        ) as rnk,
        p.free_delivery,
        p.is_express_delivery,
        p.delivery_time_estimate::text,
        p.delivery_locations,
        v.address_country::text
    FROM products p
    LEFT JOIN vendors v ON v.user_id = p.seller_id
    WHERE p.status IN ('approved', 'published', 'active')
    AND p.rating >= 4.0
    ORDER BY rnk ASC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_rated_products(integer) TO authenticated, anon;
