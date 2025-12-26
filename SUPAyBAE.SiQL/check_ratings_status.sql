-- Diagnostic: Check if ratings exist and are synced
-- 1. Check a few rows from product_review_summary
SELECT product_id, total_reviews, average_rating 
FROM product_review_summary 
LIMIT 5;

-- 2. Check the corresponding rows in the products table
SELECT id, title, rating, review_count 
FROM products 
WHERE id IN (SELECT product_id FROM product_review_summary LIMIT 5);

-- 3. Check specific count of products with non-zero ratings
SELECT 
    (SELECT COUNT(*) FROM product_review_summary WHERE total_reviews > 0) as summary_rows_with_reviews,
    (SELECT COUNT(*) FROM products WHERE review_count > 0) as product_rows_with_reviews;
