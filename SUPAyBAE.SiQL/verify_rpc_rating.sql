-- Verify the Best Selling RPC is returning rating data correctly
SELECT 
    product_id,
    product_name,
    rating,
    review_count
FROM public.get_best_selling_products('week', NULL, 5)
WHERE product_id = '3fe46b4f-af5d-4a59-9dbd-e64883b193a4';
