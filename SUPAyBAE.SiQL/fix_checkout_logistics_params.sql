-- =============================================================================
-- FIX: FINAL_CHECKOUT_FROM_CART - ORDER ITEMS INSERT FIX (v3)
-- =============================================================================
-- Fixed: Order items were not being inserted when business lookup failed
-- =============================================================================

-- Drop ALL existing overloads
DO $$
DECLARE
    func_oid OID;
BEGIN
    FOR func_oid IN 
        SELECT p.oid 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'final_checkout_from_cart'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', func_oid::regprocedure);
    END LOOP;
END $$;

-- Add logistics_meta column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'logistics_meta'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN logistics_meta JSONB DEFAULT NULL;
    END IF;
END $$;

-- Add guest_session_id column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'guest_session_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN guest_session_id TEXT DEFAULT NULL;
    END IF;
END $$;

-- Ensure cart_items has guest_session_id for guest carts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cart_items'
        AND column_name = 'guest_session_id'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN guest_session_id TEXT DEFAULT NULL;
    END IF;
END $$;

-- Create the fixed function
CREATE OR REPLACE FUNCTION public.final_checkout_from_cart(
    p_user_id UUID DEFAULT NULL,
    p_guest_session_id TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'Card',
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_customer_email TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_shipping_address_line1 TEXT DEFAULT NULL,
    p_shipping_postcode TEXT DEFAULT NULL,
    p_shipping_town_city TEXT DEFAULT NULL,
    p_shipping_county TEXT DEFAULT NULL,
    p_shipping_country TEXT DEFAULT 'Kenya',
    p_coupon_code TEXT DEFAULT NULL,
    p_express_delivery BOOLEAN DEFAULT FALSE,
    p_logistics_meta JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_total_products_amount NUMERIC := 0.00;
    v_delivery_fee NUMERIC := 0.00;
    v_discount_amount NUMERIC := 0.00;
    v_cart_item RECORD;
    v_coupon_result JSONB;
    v_coupon JSONB;
    v_product_ids UUID[];
    v_final_total NUMERIC;
    v_full_shipping_address TEXT;
    v_business_id UUID;
BEGIN
    -- Allow either authenticated user checkout OR guest checkout.
    IF p_user_id IS NULL AND (p_guest_session_id IS NULL OR btrim(p_guest_session_id) = '') THEN
        RAISE EXCEPTION 'User ID or guest session ID is required for checkout';
    END IF;

    -- 1. Calculate Delivery Fee
    IF p_logistics_meta IS NOT NULL AND (p_logistics_meta->>'cost')::NUMERIC > 0 THEN
        IF p_logistics_meta->>'provider' = 'local_parcel' THEN
            v_delivery_fee := 0.00;
        ELSE
            v_delivery_fee := (p_logistics_meta->>'cost')::NUMERIC;
        END IF;
    ELSE
        v_delivery_fee := public.calculate_cart_delivery_fee(p_user_id, p_express_delivery);
    END IF;

    -- 2. Get Product IDs for Coupon Validation
    SELECT array_agg(ci.product_id)
    INTO v_product_ids
    FROM cart_items ci
    WHERE (
        (p_user_id IS NOT NULL AND ci.user_id = p_user_id)
        OR
        (p_user_id IS NULL AND p_guest_session_id IS NOT NULL AND ci.guest_session_id = p_guest_session_id)
    );

    -- Calculate Raw Total
    SELECT COALESCE(SUM(
        COALESCE(
            (SELECT pv.price FROM product_variants pv WHERE pv.id = ci.variant_id),
            (SELECT pv.price FROM product_variants pv WHERE pv.product_id = ci.product_id AND pv.is_default = true LIMIT 1)
        ) * ci.quantity
    ), 0.00)
    INTO v_total_products_amount
    FROM cart_items ci
    WHERE (
        (p_user_id IS NOT NULL AND ci.user_id = p_user_id)
        OR
        (p_user_id IS NULL AND p_guest_session_id IS NOT NULL AND ci.guest_session_id = p_guest_session_id)
    );

    IF v_total_products_amount = 0.00 THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    -- 3. Apply Coupon
    IF p_coupon_code IS NOT NULL AND v_product_ids IS NOT NULL THEN
        v_coupon_result := apply_coupon(p_coupon_code, v_product_ids, p_user_id);

        IF COALESCE((v_coupon_result->>'success')::BOOLEAN, FALSE) THEN
            v_coupon := v_coupon_result->'coupon';

            IF v_coupon ? 'discount_amount' AND (v_coupon->>'discount_amount')::NUMERIC > 0 THEN
                v_discount_amount := (v_coupon->>'discount_amount')::NUMERIC;
            ELSIF v_coupon ? 'discount_percentage' AND (v_coupon->>'discount_percentage')::NUMERIC > 0 THEN
                v_discount_amount := ROUND(v_total_products_amount * (v_coupon->>'discount_percentage')::NUMERIC / 100, 2);
            END IF;

            v_discount_amount := LEAST(v_discount_amount, v_total_products_amount);

            UPDATE coupons
            SET used_quantity = COALESCE(used_quantity, 0) + 1
            WHERE id = (v_coupon->>'id')::UUID;

            UPDATE user_coupons
            SET used_at = CURRENT_TIMESTAMP
                        WHERE p_user_id IS NOT NULL
                            AND user_id = p_user_id
                            AND coupon_id = (v_coupon->>'id')::UUID
                            AND used_at IS NULL;
        END IF;
    END IF;

    v_final_total := GREATEST(v_total_products_amount - v_discount_amount, 0) + v_delivery_fee;
    
    v_full_shipping_address := COALESCE(p_shipping_address_line1, '') || ', ' || 
                               COALESCE(p_shipping_town_city, '') || ', ' || 
                               COALESCE(p_shipping_postcode, '') || ', ' || 
                               COALESCE(p_shipping_country, '');

    -- 4. Create Order Record
    INSERT INTO orders (
        user_id, guest_session_id, status, total, total_price, shipping_address,
        shipping_address_line1, shipping_postcode, shipping_town_city,
        shipping_county, shipping_country, first_name, last_name,
        customer_name, customer_email, customer_phone, order_number, 
        payment_method_id, logistics_meta, is_guest
    )
    VALUES (
        p_user_id, p_guest_session_id, 'pending', v_final_total, v_total_products_amount, v_full_shipping_address,
        p_shipping_address_line1, p_shipping_postcode, p_shipping_town_city,
        p_shipping_county, p_shipping_country, p_first_name, p_last_name,
        p_first_name || ' ' || p_last_name, p_customer_email, p_customer_phone,
        'ORD-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8)),
        p_payment_method, p_logistics_meta, (p_user_id IS NULL)
    )
    RETURNING id INTO v_order_id;

    -- 5. Process Cart Items -> Order Items (FIXED: Direct INSERT, not INSERT...SELECT)
    FOR v_cart_item IN 
        SELECT 
            ci.product_id, 
            ci.quantity,
            COALESCE(
                (SELECT pv.price FROM product_variants pv WHERE pv.id = ci.variant_id),
                (SELECT pv.price FROM product_variants pv WHERE pv.product_id = ci.product_id AND pv.is_default = true LIMIT 1)
            ) AS price,
            COALESCE(
                (SELECT pv.stock FROM product_variants pv WHERE pv.id = ci.variant_id),
                (SELECT pv.stock FROM product_variants pv WHERE pv.product_id = ci.product_id AND pv.is_default = true LIMIT 1)
            ) AS stock,
            COALESCE(
                ci.variant_id,
                (SELECT pv.id FROM product_variants pv WHERE pv.product_id = ci.product_id AND pv.is_default = true LIMIT 1)
            ) AS variant_id,
            p.seller_id
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE (
            (p_user_id IS NOT NULL AND ci.user_id = p_user_id)
            OR
            (p_user_id IS NULL AND p_guest_session_id IS NOT NULL AND ci.guest_session_id = p_guest_session_id)
        )
    LOOP
        IF v_cart_item.quantity > v_cart_item.stock THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_cart_item.product_id;
        END IF;

        -- Get business_id (can be NULL if seller has no business record)
        SELECT b.id INTO v_business_id
        FROM businesses b
        WHERE b.user_id = v_cart_item.seller_id
        LIMIT 1;

        -- FIXED: Direct INSERT that always runs (business_id can be NULL)
        INSERT INTO order_items (order_id, product_id, quantity, price, unit_price, business_id, variant_id)
        VALUES (
            v_order_id, 
            v_cart_item.product_id, 
            v_cart_item.quantity, 
            v_cart_item.price * v_cart_item.quantity, 
            v_cart_item.price,
            v_business_id,  -- Can be NULL
            v_cart_item.variant_id
        );

        -- Deduct stock
        UPDATE product_variants
        SET stock = stock - v_cart_item.quantity, updated_at = NOW()
        WHERE id = v_cart_item.variant_id;
    END LOOP;

    IF p_user_id IS NOT NULL THEN
        DELETE FROM cart_items WHERE user_id = p_user_id;
    ELSE
        DELETE FROM cart_items WHERE guest_session_id = p_guest_session_id;
    END IF;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.final_checkout_from_cart TO authenticated, anon;
