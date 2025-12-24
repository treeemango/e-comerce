-- Enable RLS on cart_items and create policies for checkout to work
-- ===================================================================

-- 1. Enable RLS on the table
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_user_policy" ON public.cart_items;
DROP POLICY IF EXISTS "Enable all for users based on user_id" ON public.cart_items;

-- 3. Create policy so authenticated users can manage their own cart items
CREATE POLICY "Users can manage their own cart items" 
ON public.cart_items 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. IMPORTANT: The final_checkout_from_cart function is SECURITY DEFINER
-- This means it runs with the privileges of the function owner (usually postgres)
-- So RLS won't block it. However, if the function doesn't have SECURITY DEFINER,
-- we need to grant the function access. Let's verify and fix:

-- Ensure the checkout function has SECURITY DEFINER (idempotent check)
-- This allows the RPC to read cart_items regardless of RLS
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
    v_total_products_amount NUMERIC := 0.00;
    v_delivery_fee NUMERIC := 0.00;
    v_discount_amount NUMERIC := 0.00;
    v_tax_amount NUMERIC := 0.00;
    v_tax_rate NUMERIC := 0.00;
    v_cart_item RECORD;
    v_coupon_result JSONB;
    v_coupon JSONB;
    v_product_ids UUID[];
    v_final_total NUMERIC;
    v_full_shipping_address TEXT;
    v_cart_count INTEGER;
BEGIN
    -- Debug: Count cart items first
    SELECT COUNT(*) INTO v_cart_count FROM cart_items WHERE user_id = p_user_id;
    IF v_cart_count = 0 THEN
        RAISE EXCEPTION 'Cart is empty for user %. No items found in cart_items table.', p_user_id;
    END IF;

    -- 1. Calculate Delivery Fee
    IF p_user_id IS NOT NULL THEN
        v_delivery_fee := public.calculate_cart_delivery_fee(p_user_id, p_express_delivery);
    ELSE
        v_delivery_fee := CASE WHEN p_express_delivery THEN 15.00 ELSE 10.00 END;
    END IF;

    -- 2. Get Product IDs for Coupon Validation
    SELECT array_agg(ci.product_id)
    INTO v_product_ids
    FROM cart_items ci
    WHERE ci.user_id = p_user_id;

    -- 3. Calculate Raw Total (Robustly resolving variant)
    SELECT COALESCE(SUM(pv.price * ci.quantity), 0.00)
    INTO v_total_products_amount
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    WHERE ci.user_id = p_user_id;

    IF v_total_products_amount = 0.00 THEN
        RAISE EXCEPTION 'Cart items found (%) but total is zero. Check variant_id validity for user %', v_cart_count, p_user_id;
    END IF;

    -- 4. Apply Coupon
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

    -- 5. Calculate Final Totals and Taxes
    v_tax_rate := public.get_tax_rate(p_shipping_country);
    v_tax_amount := public.calculate_order_tax(v_total_products_amount - v_discount_amount, v_delivery_fee, p_shipping_country);
    
    v_final_total := GREATEST(v_total_products_amount - v_discount_amount, 0) + v_delivery_fee + v_tax_amount;
    v_full_shipping_address := COALESCE(p_shipping_address_line1, '') || ', ' || COALESCE(p_shipping_town_city, '') || ', ' || COALESCE(p_shipping_county, '') || ', ' || COALESCE(p_shipping_postcode, '') || ', ' || COALESCE(p_shipping_country, '');

    -- 6. Create Order Record
    INSERT INTO orders (
        user_id, status, total, total_price, tax_amount, tax_rate, delivery_fee, discount_amount,
        shipping_address, shipping_address_line1, shipping_postcode, shipping_town_city,
        shipping_county, shipping_country, first_name, last_name,
        customer_name, customer_email, customer_phone, order_number, payment_method_id, is_guest
    )
    VALUES (
        p_user_id, 'pending', v_final_total, v_total_products_amount, v_tax_amount, v_tax_rate, v_delivery_fee, v_discount_amount,
        v_full_shipping_address, p_shipping_address_line1, p_shipping_postcode, p_shipping_town_city,
        p_shipping_county, p_shipping_country, p_first_name, p_last_name,
        p_first_name || ' ' || p_last_name, p_customer_email, p_customer_phone,
        'ORD-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8)),
        p_payment_method, (p_user_id IS NULL)
    )
    RETURNING id INTO v_order_id;

    -- 7. Process Cart Items -> Order Items
    FOR v_cart_item IN 
        SELECT 
            ci.product_id, 
            ci.variant_id as resolved_variant_id,
            ci.quantity, 
            p.seller_id
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = p_user_id
    LOOP
        DECLARE
            v_p_price NUMERIC;
            v_p_stock INTEGER;
        BEGIN
            SELECT price, stock INTO v_p_price, v_p_stock
            FROM product_variants
            WHERE id = v_cart_item.resolved_variant_id;

            -- Stock Check
            IF v_cart_item.quantity > v_p_stock THEN
                RAISE EXCEPTION 'Insufficient stock for product % (variant %)', v_cart_item.product_id, v_cart_item.resolved_variant_id;
            END IF;

            -- Create Order Item (Using vendors table to resolve business_id/vendor_id)
            INSERT INTO order_items (
                order_id, product_id, variant_id, quantity, price, unit_price, business_id
            )
            SELECT 
                v_order_id, v_cart_item.product_id, v_cart_item.resolved_variant_id, v_cart_item.quantity, 
                v_p_price * v_cart_item.quantity, v_p_price, v.id
            FROM vendors v
            WHERE v.user_id = v_cart_item.seller_id
            LIMIT 1;

            -- Deduct Stock from Variant
            UPDATE product_variants
            SET stock = stock - v_cart_item.quantity
            WHERE id = v_cart_item.resolved_variant_id;
            
            -- Also update total product stock for legacy views
            UPDATE products
            SET stock = (SELECT SUM(stock) FROM product_variants WHERE product_id = v_cart_item.product_id)
            WHERE id = v_cart_item.product_id;
        END;
    END LOOP;

    -- 8. Clear Cart
    IF p_user_id IS NOT NULL THEN
        DELETE FROM cart_items WHERE user_id = p_user_id;
    END IF;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.final_checkout_from_cart TO authenticated, anon;

-- 6. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
