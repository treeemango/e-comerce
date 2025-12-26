-- Diagnose the entire ratings data chain for the #1 Best Seller product
-- Product ID: 3fe46b4f-af5d-4a59-9dbd-e64883b193a4

SELECT 'Step 1: Check enhanced_reviews for this product' as step;
SELECT id, product_id, rating, status, created_at 
FROM enhanced_reviews 
WHERE product_id = '3fe46b4f-af5d-4a59-9dbd-e64883b193a4';

SELECT 'Step 2: Check product_review_summary for this product' as step;
SELECT * FROM product_review_summary 
WHERE product_id = '3fe46b4f-af5d-4a59-9dbd-e64883b193a4';

SELECT 'Step 3: Check products table rating columns for this product' as step;
SELECT id, title, rating, review_count 
FROM products 
WHERE id = '3fe46b4f-af5d-4a59-9dbd-e64883b193a4';

SELECT 'Step 4: Check products_with_media view for this product' as step;
SELECT id, title, rating, review_count 
FROM products_with_media 
WHERE id = '3fe46b4f-af5d-4a59-9dbd-e64883b193a4';

SELECT 'Step 5: Check trigger exists for syncing reviews to products' as step;
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%sync%' OR trigger_name LIKE '%review%';
