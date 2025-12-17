DROP FUNCTION IF EXISTS get_best_selling_products(text, integer);

CREATE OR REPLACE FUNCTION get_best_selling_products(
    time_interval text DEFAULT '30 days',
    p_limit integer DEFAULT 5
)
RETURNS TABLE (
    product_id uuid,
    product_name text,
    product_price numeric,
    category_name text,
    image_url text,           -- This now correctly comes from the media table
    total_quantity_sold numeric,
    sale_rank integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH ranked_sales AS (
        SELECT
            p.id AS product_id,
            p.name AS product_name,
            p.price AS product_price,
            p.category AS category_name, -- Fix: Using the correct 'category' column
            
            -- FIX: Subquery to fetch the main image URL from the media table
            (
                SELECT m.image_url -- Select the correct URL column name
                FROM public.media m
                WHERE m.product_id = p.id
                AND m.is_main = TRUE -- Use the correct main indicator column
                LIMIT 1
            ) AS image_url,

            SUM(oi.quantity) AS total_quantity_sold,
            
            -- PARTITION BY the correct category column
            RANK() OVER (PARTITION BY p.category ORDER BY SUM(oi.quantity) DESC) AS sale_rank 
        FROM
            public.order_items oi
        JOIN
            public.orders o ON o.id = oi.order_id
        JOIN
            public.products p ON p.id = oi.product_id
        WHERE
            o.created_at >= NOW() - (time_interval::interval)
        GROUP BY
            p.id, p.name, p.price, p.category
    )
    SELECT
        product_id,
        product_name,
        product_price,
        category_name,
        image_url,
        total_quantity_sold,
        sale_rank
    FROM
        ranked_sales
    WHERE
        sale_rank <= p_limit
    ORDER BY
        total_quantity_sold DESC; 
$$;

GRANT EXECUTE ON FUNCTION get_best_selling_products(text, integer) TO authenticated, anon;