-- Consolidated diagnostic: shows all data in one result
SELECT 
    'enhanced_reviews' as table_name,
    COUNT(*) as count,
    MAX(rating::text) as rating_value,
    MAX(status) as status
FROM enhanced_reviews 
WHERE product_id = '3fe46b4f-af5d-4a59-9dbd-e64883b193a4'

UNION ALL

SELECT 
    'product_review_summary' as table_name,
    COUNT(*) as count,
    MAX(average_rating::text) as rating_value,
    MAX(total_reviews::text) as status
FROM product_review_summary 
WHERE product_id = '3fe46b4f-af5d-4a59-9dbd-e64883b193a4'

UNION ALL

SELECT 
    'products' as table_name,
    COUNT(*) as count,
    MAX(rating::text) as rating_value,
    MAX(review_count::text) as status
FROM products 
WHERE id = '3fe46b4f-af5d-4a59-9dbd-e64883b193a4'

UNION ALL

SELECT 
    'products_with_media' as table_name,
    COUNT(*) as count,
    MAX(rating::text) as rating_value,
    MAX(review_count::text) as status
FROM products_with_media 
WHERE id = '3fe46b4f-af5d-4a59-9dbd-e64883b193a4';
