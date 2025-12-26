-- Debug Best Sellers Data Flow
DO $$
DECLARE
    rpc_result RECORD;
    view_result RECORD;
BEGIN
    RAISE NOTICE '--- DEBUG START ---';

    -- 1. Call RPC and verify output for first 5 items
    FOR rpc_result IN SELECT * FROM public.get_best_selling_products('week', NULL, 5) LOOP
        RAISE NOTICE 'RPC Item: ID=%, Title=%, Rating=%, Reviews=%', 
            rpc_result.product_id, 
            rpc_result.product_name, 
            rpc_result.rating, 
            rpc_result.review_count;
            
        -- 2. Check the View for this specific ID
        SELECT id, title, rating, review_count INTO view_result 
        FROM public.products_with_media 
        WHERE id = rpc_result.product_id;
        
        RAISE NOTICE 'VIEW Item: ID=%, Title=%, Rating=%, Reviews=%', 
            view_result.id, 
            view_result.title, 
            view_result.rating, 
            view_result.review_count;
            
        RAISE NOTICE '----------------';
    END LOOP;

    RAISE NOTICE '--- DEBUG END ---';
END;
$$;
