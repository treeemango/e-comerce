CREATE OR REPLACE FUNCTION public.final_checkout_from_cart(
    p_user_id BIGINT,
    p_payment_method TEXT,
    p_shipping_address TEXT,
    p_coupon_code TEXT DEFAULT NULL,
    p_express_delivery BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT AS $$
DECLARE
    v_order_id BIGINT;
    v_total_amount NUMERIC;
    v_delivery_fee NUMERIC;
    v_discount_amount NUMERIC := 0.00;
    v_cart_item RECORD;
    v_coupon_result JSONB;
    v_coupon JSONB;
    v_product_ids UUID[];
    v_final_total NUMERIC;
BEGIN
    -- 1. Calculate Delivery Fee (Uses the updated function)
    v_delivery_fee := public.calculate_cart_delivery_fee(p_user_id, p_express_delivery);

    -- 2. Calculate Total Product Value and Check Stock (Crucial Step for BIGINT)
    SELECT COALESCE(SUM(p.price * ci.quantity::BIGINT), 0.00) -- Ensure calculation uses BIGINT
    INTO v_total_amount
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = p_user_id;

    -- Check if cart is empty
    IF v_total_amount = 0.00 THEN
        RETURN 0; -- Cart is empty
    END IF;

    -- 3. Apply Discount using coupon code when provided
    SELECT array_agg(ci.product_id::UUID)
    INTO v_product_ids
    FROM cart_items ci
    WHERE ci.user_id = p_user_id;

    IF p_coupon_code IS NOT NULL AND v_product_ids IS NOT NULL THEN
        v_coupon_result := apply_coupon(p_coupon_code, v_product_ids, NULL);

        IF COALESCE((v_coupon_result->>'success')::BOOLEAN, FALSE) THEN
            v_coupon := v_coupon_result->'coupon';

            IF v_coupon ? 'type' AND v_coupon->>'type' = 'fixed' THEN
                v_discount_amount := COALESCE((v_coupon->>'discount_amount')::NUMERIC, 0);
            ELSIF v_coupon ? 'type' AND v_coupon->>'type' = 'percentage' THEN
                v_discount_amount := ROUND(v_total_amount * COALESCE((v_coupon->>'discount_percentage')::NUMERIC, 0) / 100, 2);
            END IF;

            v_discount_amount := LEAST(v_discount_amount, v_total_amount);

            UPDATE coupons
            SET used_quantity = COALESCE(used_quantity, 0) + 1,
                claimed_quantity = GREATEST(COALESCE(claimed_quantity, 0), COALESCE(used_quantity, 0) + 1)
            WHERE id = (v_coupon->>'id')::UUID;
        END IF;
    END IF;

    v_final_total := GREATEST(v_total_amount - v_discount_amount, 0) + v_delivery_fee;

    -- 4. Create the main order record
    INSERT INTO orders (user_id, status, total_amount, delivery_fee, discount_amount, payment_method, shipping_address)
    VALUES (p_user_id, 'pending', v_final_total, v_delivery_fee, v_discount_amount, p_payment_method, p_shipping_address)
    RETURNING id INTO v_order_id;

    -- 5. Process Cart Items: Create order details and DEDUCT STOCK
    FOR v_cart_item IN 
        SELECT ci.product_id, ci.quantity::BIGINT AS quantity, p.price, p.stock::BIGINT AS current_stock -- Cast stock to BIGINT for comparison
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = p_user_id
    LOOP
        -- **Stock Check (Using BIGINT)**
        IF v_cart_item.quantity > v_cart_item.current_stock THEN
            -- In a production system, this would rollback the transaction and raise an error.
            RAISE EXCEPTION 'Insufficient stock for product % (Requested: %, Available: %)', v_cart_item.product_id, v_cart_item.quantity, v_cart_item.current_stock;
        END IF;

        -- Create Order Detail
        INSERT INTO order_details (order_id, product_id, quantity, unit_price)
        VALUES (v_order_id, v_cart_item.product_id, v_cart_item.quantity, v_cart_item.price);

        -- **Deduct Stock (Using BIGINT)**
        UPDATE products
        SET stock = stock - v_cart_item.quantity -- stock is now BIGINT
        WHERE id = v_cart_item.product_id;
    END LOOP;

    -- 6. Clear the cart
    DELETE FROM cart_items WHERE user_id = p_user_id;

    -- 7. Return the new order ID
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE;