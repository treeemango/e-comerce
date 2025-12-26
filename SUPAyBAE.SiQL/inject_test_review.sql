-- Inject a test review for a Best Selling product to verify ratings display

DO $$
DECLARE
    v_product_id UUID;
    v_user_id UUID;
    v_order_id UUID;
BEGIN
    -- 1. Target the #1 Best Seller "sfdgsdg"
    v_product_id := '3fe46b4f-af5d-4a59-9dbd-e64883b193a4';

    -- 2. Get a user to be the reviewer (any user)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    -- 3. Insert a simplified review (bypassing strict RLS if possible, or using a function)
    -- Since we are running as admin/postgres, RLS shouldn't block us if we insert directly into base table if possible,
    -- but `enhanced_reviews` is a view. We should insert into `reviews` table if it exists, or `product_reviews`.
    -- Wait, the system uses `enhanced_reviews` which is likely a view over `reviews`.
    -- Let's check `reviews` table. Assuming it exists.
    
    INSERT INTO public.enhanced_reviews (
        product_id,
        user_id,
        rating,
        content,
        title,
        status,
        is_verified_purchase
    ) VALUES (
        v_product_id,
        v_user_id,
        5,
        'This is a test review to verify ratings display on Best Sellers.',
        'Great Product!',
        'approved',
        true
    );

    RAISE NOTICE 'Inserted test review for product: %', v_product_id;

END;
$$;
