-- Migration: Add variant_id to cart_items and Fix Order Persistence
-- This script:
-- 1. Adds a variant_id column to cart_items
-- 2. Updates unique constraints to support multiple variants
-- 3. Fixes order_items constraints to use vendors instead of the unused businesses table
-- 4. Provides a robust final_checkout_from_cart RPC that handles variants and fallback logic

-- 1. Add variant_id column
ALTER TABLE public.cart_items 
ADD COLUMN IF NOT EXISTS variant_id UUID;

-- 2. Add foreign key constraint (idempotently)
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_variant_id_fkey;
ALTER TABLE public.cart_items
ADD CONSTRAINT cart_items_variant_id_fkey 
FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) 
ON DELETE CASCADE;

-- 3. Populate variant_id for existing items (using default variant)
UPDATE public.cart_items ci
SET variant_id = pv.id
FROM public.product_variants pv
WHERE ci.product_id = pv.product_id 
  AND pv.is_default = true
  AND ci.variant_id IS NULL;

-- 4. If any still null, just take the first variant
UPDATE public.cart_items ci
SET variant_id = (SELECT id FROM product_variants WHERE product_id = ci.product_id LIMIT 1)
WHERE ci.variant_id IS NULL;

-- 5. Update unique constraint
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS unique_cart_item;
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS unique_cart_item_variant;
ALTER TABLE public.cart_items 
ADD CONSTRAINT unique_cart_item_variant UNIQUE (user_id, product_id, variant_id);

-- 6. Fix order_items table constraints (Moving from the unused businesses table to vendors)
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS fk_items_business;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_seller_id_fkey;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS fk_order_items_vendor;

-- Re-link business_id to vendors table
ALTER TABLE public.order_items
ADD CONSTRAINT fk_order_items_vendor
FOREIGN KEY (business_id) REFERENCES public.vendors(id)
ON DELETE RESTRICT;

-- 7. Update the checkout RPC (Consolidated & Robust)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT n.nspname, p.proname, oidvectortypes(p.proargtypes) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'final_checkout_from_cart'
    ) LOOP
        EXECUTE 'DROP FUNCTION ' || quote_ident(r.nspname) || '.' || quote_ident(r.proname) || '(' || r.args || ')';
    END LOOP;
END $$;

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
BEGIN
    -- 1. Calculate Delivery Fee
    IF p_user_id IS NOT NULL THEN
        v_delivery_fee := public.calculate_cart_delivery_fee(p_user_id, p_express_delivery);
    ELSE
        -- Default guest delivery fee
        v_delivery_fee := CASE WHEN p_express_delivery THEN 15.00 ELSE 10.00 END;
    END IF;

    -- 2. Get Product IDs for Coupon Validation
    SELECT array_agg(ci.product_id)
    INTO v_product_ids
    FROM cart_items ci
    WHERE ci.user_id = p_user_id;

    -- 3. Calculate Raw Total (Robustly resolving variant)
    -- Fallback order: ci.variant_id -> is_default variant -> first variant found
    SELECT COALESCE(SUM(pv.price * ci.quantity), 0.00)
    INTO v_total_products_amount
    FROM cart_items ci
    JOIN product_variants pv ON 
        COALESCE(
            ci.variant_id, 
            (SELECT id FROM product_variants WHERE product_id = ci.product_id AND is_default = true LIMIT 1),
            (SELECT id FROM product_variants WHERE product_id = ci.product_id LIMIT 1)
        ) = pv.id
    WHERE ci.user_id = p_user_id;

    IF v_total_products_amount = 0.00 THEN
        RAISE EXCEPTION 'Cart is empty or items not found for user %', p_user_id;
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
            COALESCE(
                ci.variant_id, 
                (SELECT id FROM product_variants WHERE product_id = ci.product_id AND is_default = true LIMIT 1),
                (SELECT id FROM product_variants WHERE product_id = ci.product_id LIMIT 1)
            ) as resolved_variant_id,
            ci.quantity, 
            p.seller_id
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = p_user_id
    LOOP
        -- Fetch precise price and stock for the resolved variant
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

-- 8. Permissions
GRANT EXECUTE ON FUNCTION public.final_checkout_from_cart TO authenticated, anon;
