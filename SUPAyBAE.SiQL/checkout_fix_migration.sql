-- CHECKOUT SYSTEM FIX MIGRATION
-- This script standardizes ID types and fixes missing dependencies for the checkout process.

-- 1. Ensure Tax Calculation System
CREATE TABLE IF NOT EXISTS public.tax_rates (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    country_code text NOT NULL, -- ISO 3166-1 alpha-2 (GB, KE, US, etc.)
    country_name text NOT NULL,
    tax_rate numeric(5,4) NOT NULL DEFAULT 0.0000, -- Tax rate as decimal (0.2000 = 20%)
    tax_name text NOT NULL DEFAULT 'VAT', -- VAT, GST, Sales Tax, etc.
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tax_rates_pkey PRIMARY KEY (id),
    CONSTRAINT tax_rates_country_code_key UNIQUE (country_code)
);

INSERT INTO public.tax_rates (country_code, country_name, tax_rate, tax_name) VALUES
('DZ', 'Algeria', 0.1900, 'VAT'),
('AO', 'Angola', 0.1400, 'VAT'),
('BJ', 'Benin', 0.1800, 'VAT'),
('BW', 'Botswana', 0.1400, 'VAT'),
('BF', 'Burkina Faso', 0.1800, 'VAT'),
('BI', 'Burundi', 0.1800, 'VAT'),
('CV', 'Cabo Verde', 0.1500, 'VAT'),
('CM', 'Cameroon', 0.1925, 'VAT'),
('CF', 'Central African Republic', 0.1900, 'VAT'),
('TD', 'Chad', 0.1800, 'VAT'),
('KM', 'Comoros', 0.1000, 'VAT'),
('CG', 'Congo-Brazzaville', 0.1890, 'VAT'),
('CD', 'Congo-Kinshasa', 0.1600, 'VAT'),
('DJ', 'Djibouti', 0.1000, 'VAT'),
('EG', 'Egypt', 0.1400, 'VAT'),
('GQ', 'Equatorial Guinea', 0.1500, 'VAT'),
('ER', 'Eritrea', 0.0500, 'Sales Tax'),
('SZ', 'Eswatini', 0.1500, 'VAT'),
('ET', 'Ethiopia', 0.1500, 'VAT'),
('GA', 'Gabon', 0.1800, 'VAT'),
('GM', 'Gambia', 0.1500, 'VAT'),
('GH', 'Ghana', 0.1500, 'VAT'),
('GN', 'Guinea', 0.1800, 'VAT'),
('GW', 'Guinea-Bissau', 0.1500, 'VAT'),
('CI', 'Ivory Coast', 0.1800, 'VAT'),
('KE', 'Kenya', 0.1600, 'VAT'),
('LS', 'Lesotho', 0.1500, 'VAT'),
('LR', 'Liberia', 0.0750, 'GST'),
('LY', 'Libya', 0.0000, 'Tax'),
('MG', 'Madagascar', 0.2000, 'VAT'),
('MW', 'Malawi', 0.1650, 'VAT'),
('ML', 'Mali', 0.1800, 'VAT'),
('MR', 'Mauritania', 0.1600, 'VAT'),
('MU', 'Mauritius', 0.1500, 'VAT'),
('MA', 'Morocco', 0.2000, 'VAT'),
('MZ', 'Mozambique', 0.1600, 'VAT'),
('NA', 'Namibia', 0.1500, 'VAT'),
('NE', 'Niger', 0.1900, 'VAT'),
('NG', 'Nigeria', 0.0750, 'VAT'),
('RW', 'Rwanda', 0.1800, 'VAT'),
('ST', 'Sao Tome and Principe', 0.1500, 'VAT'),
('SN', 'Senegal', 0.1800, 'VAT'),
('SC', 'Seychelles', 0.1500, 'VAT'),
('SL', 'Sierra Leone', 0.1500, 'VAT'),
('SO', 'Somalia', 0.0500, 'Sales Tax'),
('ZA', 'South Africa', 0.1500, 'VAT'),
('SS', 'South Sudan', 0.1500, 'VAT'),
('SD', 'Sudan', 0.1700, 'VAT'),
('TZ', 'Tanzania', 0.1800, 'VAT'),
('TG', 'Togo', 0.1800, 'VAT'),
('TN', 'Tunisia', 0.1900, 'VAT'),
('UG', 'Uganda', 0.1800, 'VAT'),
('ZM', 'Zambia', 0.1600, 'VAT'),
('ZW', 'Zimbabwe', 0.1500, 'VAT'),
('GB', 'United Kingdom', 0.2000, 'VAT'),
('US', 'United States', 0.0000, 'Sales Tax'),
('DEFAULT', 'Default', 0.0000, 'Tax')
ON CONFLICT (country_code) DO UPDATE 
SET tax_rate = EXCLUDED.tax_rate, 
    tax_name = EXCLUDED.tax_name;

CREATE OR REPLACE FUNCTION public.get_tax_rate(p_country text DEFAULT 'DEFAULT')
RETURNS numeric AS $$
DECLARE
    v_tax_rate numeric := NULL;
BEGIN
    -- Try matching by country code (2-letter)
    SELECT tax_rate INTO v_tax_rate
    FROM public.tax_rates
    WHERE (country_code = UPPER(p_country) OR UPPER(country_name) = UPPER(p_country))
      AND is_active = true
    LIMIT 1;

    -- Return default rate if country not found
    IF v_tax_rate IS NULL THEN
        SELECT tax_rate INTO v_tax_rate
        FROM public.tax_rates
        WHERE country_code = 'DEFAULT';
    END IF;

    RETURN COALESCE(v_tax_rate, 0.0000);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.calculate_order_tax(
    p_subtotal numeric,
    p_delivery_fee numeric DEFAULT 0,
    p_country text DEFAULT 'DEFAULT'
)
RETURNS numeric AS $$
DECLARE
    v_tax_rate numeric;
BEGIN
    v_tax_rate := public.get_tax_rate(p_country);
    RETURN ROUND((p_subtotal + p_delivery_fee) * v_tax_rate, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Standardize Delivery Functions (Using UUID for ID types)
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
    v_final_delivery_fee NUMERIC;
BEGIN
    SELECT p.delivery_cost, p.free_delivery, p.min_order_for_free_delivery, pv.price
    INTO v_delivery_cost, v_free_delivery, v_min_order_for_free_delivery, v_product_price
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_default = true
    WHERE p.id = p_product_id
    LIMIT 1;

    IF v_delivery_cost IS NULL THEN RETURN 0.00; END IF;

    -- Use default price if no variant price found (shouldn't happen with default variant)
    v_product_price := COALESCE(v_product_price, 0.00);

    IF v_free_delivery = TRUE OR (v_min_order_for_free_delivery IS NOT NULL AND (v_product_price * p_quantity) >= v_min_order_for_free_delivery) THEN
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

CREATE OR REPLACE FUNCTION public.calculate_cart_delivery_fee(
    p_user_id UUID,
    p_express_delivery BOOLEAN DEFAULT FALSE
)
RETURNS NUMERIC AS $$
DECLARE
    v_total_delivery_fee NUMERIC := 0.00;
BEGIN
    SELECT COALESCE(SUM(
        public.calculate_product_delivery_fee(ci.product_id, ci.quantity::BIGINT, p_express_delivery)
    ), 0.00)
    INTO v_total_delivery_fee
    FROM cart_items ci
    WHERE ci.user_id = p_user_id;

    RETURN v_total_delivery_fee;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 3. Update Main Checkout RPC
-- Use a DO block to drop all existing overloads to avoid "function name is not unique" errors
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
    v_total_amount NUMERIC := 0.00;
    v_delivery_fee NUMERIC := 0.00;
    v_discount_amount NUMERIC := 0.00;
    v_tax_amount NUMERIC := 0.00;
    v_tax_rate NUMERIC := 0.00;
    v_product_ids UUID[];
    v_final_total NUMERIC;
    v_shipping_address TEXT;
BEGIN
    v_shipping_address := COALESCE(p_shipping_address_line1, '') || ', ' || 
                          COALESCE(p_shipping_town_city, '') || ', ' || 
                          COALESCE(p_shipping_postcode, '') || ', ' || 
                          COALESCE(p_shipping_country, '');

    -- 1. Delivery Fee
    IF p_user_id IS NOT NULL THEN
        v_delivery_fee := public.calculate_cart_delivery_fee(p_user_id, p_express_delivery);
    ELSE
        v_delivery_fee := CASE WHEN p_express_delivery THEN 15.00 ELSE 10.00 END; 
    END IF;

    -- 2. Validate Cart and Stock
    SELECT COALESCE(SUM(pv.price * ci.quantity), 0.00), array_agg(ci.product_id)
    INTO v_total_amount, v_product_ids
    FROM cart_items ci
    JOIN product_variants pv ON ci.product_id = pv.product_id AND pv.is_default = true
    WHERE ci.user_id = p_user_id;

    IF v_total_amount = 0.00 OR v_total_amount IS NULL THEN
        RAISE EXCEPTION 'Cart is empty or items out of stock.';
    END IF;

    -- 3. Coupons
    IF p_coupon_code IS NOT NULL AND v_product_ids IS NOT NULL THEN
        DECLARE
            v_res JSONB := apply_coupon(p_coupon_code, v_product_ids, p_user_id);
            v_cp JSONB := v_res->'coupon';
        BEGIN
            IF COALESCE((v_res->>'success')::BOOLEAN, FALSE) THEN
                IF v_cp->>'type' = 'fixed' THEN
                    v_discount_amount := (v_cp->>'discount_amount')::NUMERIC;
                ELSE
                    v_discount_amount := ROUND(v_total_amount * (v_cp->>'discount_percentage')::NUMERIC / 100, 2);
                END IF;
                v_discount_amount := LEAST(v_discount_amount, v_total_amount);
                UPDATE coupons SET used_quantity = COALESCE(used_quantity, 0) + 1 WHERE id = (v_cp->>'id')::UUID;
            END IF;
        END;
    END IF;

    -- 4. Taxes
    v_tax_rate := public.get_tax_rate(p_shipping_country);
    v_tax_amount := public.calculate_order_tax(v_total_amount - v_discount_amount, v_delivery_fee, p_shipping_country);
    v_final_total := (v_total_amount - v_discount_amount) + v_delivery_fee + v_tax_amount;

    -- 5. Create Order
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

    -- 6. Order Items and Stock Management
    INSERT INTO order_items (order_id, product_id, quantity, price, variant_id)
    SELECT v_order_id, ci.product_id, ci.quantity, pv.price, pv.id
    FROM cart_items ci
    JOIN product_variants pv ON ci.product_id = pv.product_id AND pv.is_default = true
    WHERE ci.user_id = p_user_id;

    -- Deduct stock
    UPDATE product_variants pv
    SET stock = pv.stock - ci.quantity
    FROM cart_items ci
    WHERE ci.product_id = pv.product_id 
      AND pv.is_default = true
      AND ci.user_id = p_user_id;

    -- 7. Clear Cart
    DELETE FROM cart_items WHERE user_id = p_user_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 4. Permissions
GRANT EXECUTE ON FUNCTION public.final_checkout_from_cart TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_tax_rate TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.calculate_order_tax TO authenticated, anon;
