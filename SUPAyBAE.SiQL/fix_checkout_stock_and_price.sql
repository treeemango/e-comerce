-- =============================================================================
-- FIX: STOCK & PRICE SOURCE OF TRUTH (Use product_variants instead of products)
-- =============================================================================

-- 1. UPDATE: calculate_product_delivery_fee
-- Use the default variant's price for delivery fee thresholds
CREATE OR REPLACE FUNCTION public.calculate_product_delivery_fee(
    p_product_id UUID,
    p_quantity BIGINT,
    p_express_delivery BOOLEAN DEFAULT FALSE
)
RETURNS NUMERIC AS $$
DECLARE
    v_delivery_cost NUMERIC;
    v_free_delivery BOOLEAN;
    v_min_order_for_free_delivery NUMERIC;
    v_product_price NUMERIC;
    v_total_product_value NUMERIC;
    v_final_delivery_fee NUMERIC;
BEGIN
    SELECT
        p.delivery_cost, 
        p.free_delivery, 
        p.min_order_for_free_delivery, 
        pv.price -- Use variant price
    INTO
        v_delivery_cost, 
        v_free_delivery, 
        v_min_order_for_free_delivery, 
        v_product_price
    FROM public.products p
    JOIN public.product_variants pv ON p.id = pv.product_id AND pv.is_default = true
    WHERE p.id = p_product_id;

    IF v_delivery_cost IS NULL THEN RETURN 0.00; END IF;

    v_total_product_value := COALESCE(v_product_price, 0.00) * p_quantity; 
    
    IF v_free_delivery = TRUE THEN
        v_final_delivery_fee := 0.00;
    ELSIF v_min_order_for_free_delivery IS NOT NULL AND v_total_product_value >= v_min_order_for_free_delivery THEN
        v_final_delivery_fee := 0.00;
    ELSE
        v_final_delivery_fee := v_delivery_cost;
    END IF;
    
    IF p_express_delivery = TRUE AND v_final_delivery_fee > 0.00 THEN
        v_final_delivery_fee := v_final_delivery_fee * 1.20; 
    END IF;

    RETURN COALESCE(v_final_delivery_fee, 0.00);
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. UPDATE: final_checkout_from_cart
-- Change calculation and stock check to use product_variants
CREATE OR REPLACE FUNCTION public.final_checkout_from_cart(
    p_user_id UUID,
    p_payment_method TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_customer_phone TEXT,
    p_shipping_address_line1 TEXT,
    p_shipping_postcode TEXT,
    p_shipping_town_city TEXT,
    p_shipping_county TEXT,
    p_shipping_country TEXT,
    p_coupon_code TEXT DEFAULT NULL,
    p_express_delivery BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_total_products_amount NUMERIC := 0.00;
    v_delivery_fee NUMERIC;
    v_discount_amount NUMERIC := 0.00;
    v_cart_item RECORD;
    v_coupon_result JSONB;
    v_coupon JSONB;
    v_product_ids UUID[];
    v_final_total NUMERIC;
    v_full_shipping_address TEXT;
BEGIN
    -- 1. Calculate Delivery Fee
    v_delivery_fee := public.calculate_cart_delivery_fee(p_user_id, p_express_delivery);

    -- 2. Get Product IDs for Coupon Validation
    SELECT array_agg(ci.product_id)
    INTO v_product_ids
    FROM cart_items ci
    WHERE ci.user_id = p_user_id;

    -- Calculate Raw Total (Using variant price)
    SELECT COALESCE(SUM(pv.price * ci.quantity), 0.00)
    INTO v_total_products_amount
    FROM cart_items ci
    JOIN product_variants pv ON ci.product_id = pv.product_id AND pv.is_default = true
    WHERE ci.user_id = p_user_id;

    IF v_total_products_amount = 0.00 THEN
        RAISE EXCEPTION 'Cart is empty or products have no default variant price';
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
            SET used_quantity = COALESCE(used_quantity, 0) + 1,
                claimed_quantity = GREATEST(COALESCE(claimed_quantity, 0), COALESCE(used_quantity, 0) + 1)
            WHERE id = (v_coupon->>'id')::UUID;

            UPDATE user_coupons
            SET used_at = CURRENT_TIMESTAMP
            WHERE user_id = p_user_id AND coupon_id = (v_coupon->>'id')::UUID AND used_at IS NULL;
        END IF;
    END IF;

    v_final_total := GREATEST(v_total_products_amount - v_discount_amount, 0) + v_delivery_fee;
    
    v_full_shipping_address := p_shipping_address_line1 || ', ' || p_shipping_town_city || ', ' || p_shipping_county || ', ' || p_shipping_postcode || ', ' || p_shipping_country;

    -- 4. Create Order Record
    INSERT INTO orders (
        user_id, status, total, total_price, shipping_address,
        shipping_address_line1, shipping_postcode, shipping_town_city,
        shipping_county, shipping_country, first_name, last_name,
        customer_name, customer_phone, order_number, payment_method_id
    )
    VALUES (
        p_user_id, 'pending', v_final_total, v_total_products_amount, v_full_shipping_address,
        p_shipping_address_line1, p_shipping_postcode, p_shipping_town_city,
        p_shipping_county, p_shipping_country, p_first_name, p_last_name,
        p_first_name || ' ' || p_last_name, p_customer_phone,
        'ORD-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8)),
        p_payment_method
    )
    RETURNING id INTO v_order_id;

    -- 5. Process Cart Items -> Order Items
    FOR v_cart_item IN 
        SELECT 
            ci.product_id, 
            ci.quantity, 
            pv.price, 
            pv.stock,
            pv.id AS variant_id,
            p.seller_id
        FROM cart_items ci
        JOIN product_variants pv ON ci.product_id = pv.product_id AND pv.is_default = true
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = p_user_id
    LOOP
        -- Stock Check (Using variant stock)
        IF v_cart_item.quantity > v_cart_item.stock THEN
            RAISE EXCEPTION 'Insufficient stock for product % (Current: %, Asked: %)', v_cart_item.product_id, v_cart_item.stock, v_cart_item.quantity;
        END IF;

        -- Create Order Item
        INSERT INTO order_items (
            order_id, product_id, quantity, price, unit_price, business_id, variant_id
        )
        SELECT 
            v_order_id, v_cart_item.product_id, v_cart_item.quantity, 
            v_cart_item.price * v_cart_item.quantity, v_cart_item.price,
            b.id, v_cart_item.variant_id
        FROM businesses b
        WHERE b.user_id = v_cart_item.seller_id
        LIMIT 1;

        -- Deduct Stock from VARIANT
        UPDATE product_variants
        SET stock = stock - v_cart_item.quantity,
            updated_at = NOW()
        WHERE id = v_cart_item.variant_id;
    END LOOP;

    -- 6. Clear Cart
    DELETE FROM cart_items WHERE user_id = p_user_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE;
