-- check for products with ratings other than 5
SELECT id, title, rating, review_count 
FROM products 
WHERE rating > 0 AND rating < 5;
