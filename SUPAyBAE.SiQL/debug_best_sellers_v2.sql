-- Debug Best Sellers Data Flow (Table Output Version)
-- This will show you exactly what the API is seeing.

WITH rpc_data AS (
    SELECT * FROM public.get_best_selling_products('week', NULL, 10)
)
SELECT 
    r.product_name,
    r.product_id,
    'RPC Result' as source,
    r.rating as rpc_rating,
    r.review_count as rpc_reviews,
    v.rating as view_rating,
    v.review_count as view_reviews,
    CASE WHEN v.rating IS NULL THEN 'MISSING IN VIEW' ELSE 'OK' END as status
FROM rpc_data r
LEFT JOIN public.products_with_media v ON v.id = r.product_id;
