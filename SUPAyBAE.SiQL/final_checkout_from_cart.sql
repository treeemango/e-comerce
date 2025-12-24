CREATE OR REPLACE FUNCTION public.final_checkout_from_cart(
    p_user_id UUID DEFAULT NULL,
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
    p_express_delivery BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_total_amount NUMERIC := 0.00;
    v_delivery_fee NUMERIC := 0.00;
    v_discount_amount NUMERIC := 0.00;
    v_tax_amount NUMERIC := 0.00;
    v_tax_rate NUMERIC := 0.00;
    v_cart_item RECORD;
    v_coupon_result JSONB;
    v_coupon JSONB;
    v_product_ids UUID[];
    v_final_total NUMERIC;
    v_shipping_address TEXT;
BEGIN
    -- Construct full shipping address
    v_shipping_address := COALESCE(p_shipping_address_line1, '') || ', ' || 
                          COALESCE(p_shipping_town_city, '') || ', ' || 
                          COALESCE(p_shipping_postcode, '') || ', ' || 
                          COALESCE(p_shipping_country, '');

    -- 1. Calculate Delivery Fee
    IF p_user_id IS NOT NULL THEN
        v_delivery_fee := public.calculate_cart_delivery_fee(p_user_id, p_express_delivery);
    ELSE
        -- Placeholder for guest delivery fee if not passed
        v_delivery_fee := CASE WHEN p_express_delivery THEN 15.00 ELSE 10.00 END; 
    END IF;

    -- 2. Calculate Total Product Value and Check Stock
    SELECT COALESCE(SUM(pv.price * ci.quantity), 0.00)
    INTO v_total_amount
    FROM cart_items ci
    JOIN product_variants pv ON ci.product_id = pv.product_id 
    WHERE ci.user_id = p_user_id;

    -- Check if cart is empty
    IF v_total_amount = 0.00 THEN
        RAISE EXCEPTION 'Cart is empty for user %', p_user_id;
    END IF;

    -- 3. Apply Discount using coupon code when provided
    SELECT array_agg(ci.product_id::UUID)
    INTO v_product_ids
    FROM cart_items ci
    WHERE ci.user_id = p_user_id;

    IF p_coupon_code IS NOT NULL AND v_product_ids IS NOT NULL THEN
        v_coupon_result := apply_coupon(p_coupon_code, v_product_ids, p_user_id);

        IF COALESCE((v_coupon_result->>'success')::BOOLEAN, FALSE) THEN
            v_coupon := v_coupon_result->'coupon';

            IF v_coupon ? 'type' AND v_coupon->>'type' = 'fixed' THEN
                v_discount_amount := COALESCE((v_coupon->>'discount_amount')::NUMERIC, 0);
            ELSIF v_coupon ? 'type' AND v_coupon->>'type' = 'percentage' THEN
                v_discount_amount := ROUND(v_total_amount * COALESCE((v_coupon->>'discount_percentage')::NUMERIC, 0) / 100, 2);
            END IF;

            v_discount_amount := LEAST(v_discount_amount, v_total_amount);

            UPDATE coupons
            SET used_quantity = COALESCE(used_quantity, 0) + 1
            WHERE id = (v_coupon->>'id')::UUID;
        END IF;
    END IF;

    -- 4. Calculate Tax
    v_tax_rate := public.get_tax_rate(p_shipping_country);
    v_tax_amount := public.calculate_order_tax(v_total_amount - v_discount_amount, v_delivery_fee, p_shipping_country);

    v_final_total := GREATEST(v_total_amount - v_discount_amount, 0) + v_delivery_fee + v_tax_amount;

    -- 5. Create the main order record
    INSERT INTO orders (
        user_id, status, total, delivery_fee, discount_amount, tax_amount, tax_rate,
        payment_method_id, shipping_address, first_name, last_name, customer_email, 
        customer_phone, shipping_address_line1, shipping_postcode, shipping_town_city, 
        shipping_county, shipping_country, is_guest
    )
    VALUES (
        p_user_id, 'pending', v_final_total, v_delivery_fee, v_discount_amount, v_tax_amount, v_tax_rate,
        p_payment_method, v_shipping_address, p_first_name, p_last_name, p_customer_email,
        p_customer_phone, p_shipping_address_line1, p_shipping_postcode, p_shipping_town_city,
        p_shipping_county, p_shipping_country, (p_user_id IS NULL)
    )
    RETURNING id INTO v_order_id;

    -- 6. Process Cart Items: Create order details and DEDUCT STOCK
    FOR v_cart_item IN 
        SELECT 
            ci.product_id, 
            ci.quantity, 
            pv.price, 
            pv.stock, 
            pv.id as variant_id,
            public.calculate_product_delivery_fee(ci.product_id, ci.quantity::BIGINT, p_express_delivery) as item_delivery_fee
        FROM cart_items ci
        JOIN product_variants pv ON ci.product_id = pv.product_id
        WHERE ci.user_id = p_user_id
    LOOP
        -- Stock Check
        IF v_cart_item.quantity > v_cart_item.stock THEN
            RAISE EXCEPTION 'Insufficient stock for product % (Requested: %, Available: %)', v_cart_item.product_id, v_cart_item.quantity, v_cart_item.stock;
        END IF;

        -- Create Order Item with delivery_fee
        INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, delivery_fee)
        VALUES (v_order_id, v_cart_item.product_id, v_cart_item.variant_id, v_cart_item.quantity, v_cart_item.price, v_cart_item.item_delivery_fee);

        -- Deduct Stock
        UPDATE product_variants
        SET stock = stock - v_cart_item.quantity
        WHERE id = v_cart_item.variant_id;
    END LOOP;

    -- 7. Clear the cart
    IF p_user_id IS NOT NULL THEN
        DELETE FROM cart_items WHERE user_id = p_user_id;
    END IF;

    -- 8. Return the new order ID
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE;
