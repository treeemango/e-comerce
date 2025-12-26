-- Inspect RPC definitions to see if they select 'rating' and 'review_count'
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname IN ('get_personalized_suggestions_v2', 'get_best_selling_products');
