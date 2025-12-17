1. Apply Coupon Function
Validates and applies a coupon to an order/cart:

sql
CREATE OR REPLACE FUNCTION apply_coupon(
    p_coupon_code TEXT,
    p_product_ids UUID[],
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coupon RECORD;
    v_discount_amount NUMERIC := 0;
    v_discount_percentage INTEGER := NULL;
    v_is_valid BOOLEAN := FALSE;
    v_message TEXT;
    v_result JSONB;
BEGIN
    -- Get coupon details
    SELECT * INTO v_coupon
    FROM coupons c
    WHERE c.code = p_coupon_code
      AND c.status = 'Ongoing'
      AND c.start_time <= CURRENT_TIMESTAMP
      AND c.end_time > CURRENT_TIMESTAMP
      AND (c.total_quantity IS NULL OR c.total_quantity > COALESCE(c.claimed_quantity, 0));
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid or expired coupon code'
        );
    END IF;
    
    -- Check if coupon applies to any of the products
    IF EXISTS (
        SELECT 1 
        FROM coupon_products cp 
        WHERE cp.coupon_id = v_coupon.id 
          AND cp.product_id = ANY(p_product_ids)
    ) THEN
        v_is_valid := TRUE;
        
        -- Calculate discount
        IF v_coupon.discount_amount IS NOT NULL THEN
            v_discount_amount := v_coupon.discount_amount;
        ELSIF v_coupon.discount_percentage IS NOT NULL THEN
            v_discount_percentage := v_coupon.discount_percentage;
        END IF;
        
        v_message := 'Coupon applied successfully';
    ELSE
        v_message := 'Coupon not valid for selected products';
    END IF;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', v_is_valid,
        'message', v_message,
        'coupon', CASE WHEN v_is_valid THEN 
            jsonb_build_object(
                'id', v_coupon.id,
                'code', v_coupon.code,
                'name', v_coupon.name,
                'discount_amount', v_discount_amount,
                'discount_percentage', v_discount_percentage,
                'type', CASE 
                    WHEN v_discount_amount > 0 THEN 'fixed'
                    WHEN v_discount_percentage IS NOT NULL THEN 'percentage'
                    ELSE 'none'
                END
            )
        ELSE NULL END
    );
    
    RETURN v_result;
END;
$$;
2. Claim Coupon Function
Marks a coupon as claimed (when user applies it):

sql
CREATE OR REPLACE FUNCTION claim_coupon(
    p_coupon_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Increment claimed quantity
    UPDATE coupons 
    SET claimed_quantity = COALESCE(claimed_quantity, 0) + 1
    WHERE id = p_coupon_id
      AND (total_quantity IS NULL OR total_quantity > COALESCE(claimed_quantity, 0))
    RETURNING TRUE INTO result;
    
    RETURN COALESCE(result, FALSE);
    
    -- Optionally track user-coupon relationship
    IF p_user_id IS NOT NULL THEN
        INSERT INTO user_coupons (user_id, coupon_id, claimed_at)
        VALUES (p_user_id, p_coupon_id, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN COALESCE(result, FALSE);
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;
3. Calculate Final Price Function
Calculates final price after coupon discount:

sql
CREATE OR REPLACE FUNCTION calculate_price_with_coupon(
    p_original_price NUMERIC,
    p_coupon_data JSONB
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_final_price NUMERIC;
BEGIN
    v_final_price := p_original_price;
    
    IF p_coupon_data IS NOT NULL THEN
        -- Apply fixed amount discount
        IF (p_coupon_data->>'discount_amount')::NUMERIC > 0 THEN
            v_final_price := GREATEST(
                p_original_price - (p_coupon_data->>'discount_amount')::NUMERIC,
                0
            );
        
        -- Apply percentage discount
        ELSIF (p_coupon_data->>'discount_percentage')::INTEGER > 0 THEN
            v_final_price := ROUND(
                p_original_price * (1 - (p_coupon_data->>'discount_percentage')::NUMERIC / 100),
                2
            );
        END IF;
    END IF;
    
    RETURN v_final_price;
END;
$$;
4. Validate Coupon Function
Validates if a coupon is still valid:

sql
CREATE OR REPLACE FUNCTION validate_coupon(
    p_coupon_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coupon RECORD;
    v_result JSONB;
BEGIN
    SELECT 
        c.*,
        CASE 
            WHEN c.status != 'Ongoing' THEN 'Coupon is not active'
            WHEN c.start_time > CURRENT_TIMESTAMP THEN 'Coupon has not started yet'
            WHEN c.end_time <= CURRENT_TIMESTAMP THEN 'Coupon has expired'
            WHEN c.total_quantity IS NOT NULL AND c.total_quantity <= COALESCE(c.claimed_quantity, 0) THEN 'Coupon limit reached'
            ELSE 'Valid'
        END as validation_message,
        CASE 
            WHEN c.status != 'Ongoing' THEN false
            WHEN c.start_time > CURRENT_TIMESTAMP THEN false
            WHEN c.end_time <= CURRENT_TIMESTAMP THEN false
            WHEN c.total_quantity IS NOT NULL AND c.total_quantity <= COALESCE(c.claimed_quantity, 0) THEN false
            ELSE true
        END as is_valid
    INTO v_coupon
    FROM coupons c
    WHERE c.id = p_coupon_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'is_valid', false,
            'message', 'Coupon not found'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'is_valid', v_coupon.is_valid,
        'message', v_coupon.validation_message,
        'coupon', jsonb_build_object(
            'id', v_coupon.id,
            'name', v_coupon.name,
            'code', v_coupon.code,
            'discount_amount', v_coupon.discount_amount,
            'discount_percentage', v_coupon.discount_percentage,
            'end_time', v_coupon.end_time,
            'remaining_quantity', 
                CASE 
                    WHEN v_coupon.total_quantity IS NULL THEN NULL
                    ELSE GREATEST(v_coupon.total_quantity - COALESCE(v_coupon.claimed_quantity, 0), 0)
                END
        )
    );
END;
$$;
5. Get Product Coupons Function
Gets all valid coupons for a product:

sql
CREATE OR REPLACE FUNCTION get_product_coupons(
    p_product_id UUID,
    p_include_expired BOOLEAN DEFAULT false
)
RETURNS TABLE (
    coupon_id UUID,
    coupon_name TEXT,
    coupon_code TEXT,
    discount_amount NUMERIC,
    discount_percentage INTEGER,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status TEXT,
    remaining_quantity INTEGER,
    is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as coupon_id,
        c.name as coupon_name,
        c.code as coupon_code,
        c.discount_amount,
        c.discount_percentage,
        c.start_time,
        c.end_time,
        c.status,
        CASE 
            WHEN c.total_quantity IS NULL THEN NULL
            ELSE GREATEST(c.total_quantity - COALESCE(c.claimed_quantity, 0), 0)
        END as remaining_quantity,
        CASE
            WHEN c.status = 'Ongoing' 
                AND c.start_time <= CURRENT_TIMESTAMP
                AND c.end_time > CURRENT_TIMESTAMP
                AND (c.total_quantity IS NULL OR c.total_quantity > COALESCE(c.claimed_quantity, 0))
            THEN true
            ELSE false
        END as is_valid
    FROM coupons c
    JOIN coupon_products cp ON c.id = cp.coupon_id
    WHERE cp.product_id = p_product_id
      AND (p_include_expired OR c.status != 'Expired')
    ORDER BY 
        CASE 
            WHEN c.discount_amount IS NOT NULL THEN 1
            WHEN c.discount_percentage IS NOT NULL THEN 2
            ELSE 3
        END,
        COALESCE(c.discount_amount, 0) DESC;
END;
$$;
6. Auto-expire Coupons Function (for cron jobs)
sql
CREATE OR REPLACE FUNCTION auto_expire_coupons()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    -- Expire past coupons
    WITH expired AS (
        UPDATE coupons 
        SET status = 'Expired'
        WHERE end_time < CURRENT_TIMESTAMP 
          AND status IN ('Ongoing', 'Upcoming')
        RETURNING id
    )
    SELECT COUNT(*) INTO v_expired_count FROM expired;
    
    -- Activate upcoming coupons
    UPDATE coupons 
    SET status = 'Ongoing'
    WHERE start_time <= CURRENT_TIMESTAMP 
      AND end_time > CURRENT_TIMESTAMP
      AND status = 'Upcoming';
    
    RETURN v_expired_count;
END;
$$;
Usage Examples:
sql
-- Apply a coupon
SELECT * FROM apply_coupon('SUMMER25', ARRAY['product-uuid-1', 'product-uuid-2']);

-- Validate a coupon
SELECT * FROM validate_coupon('coupon-uuid');

-- Get all coupons for a product
SELECT * FROM get_product_coupons('product-uuid');

-- Calculate price with coupon
SELECT calculate_price_with_coupon(100.00, '{"discount_amount": 20}'::jsonb);
-- Returns: 80.00

SELECT calculate_price_with_coupon(100.00, '{"discount_percentage": 25}'::jsonb);
-- Returns: 75.00
Why Functions Are Essential:
Data Integrity - Centralized validation logic

Security - Can use SECURITY DEFINER for proper permissions

Performance - Reduced round trips to database

Consistency - Same logic everywhere

Maintainability - One place to update logic

Transaction Safety - Can wrap multiple operations

Additional Table You Might Want:
sql
-- Track which users have used which coupons
CREATE TABLE IF NOT EXISTS user_coupons (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    claimed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, coupon_id)
);

-- Index for performance
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
These functions will make your coupon system robust, secure, and easy to use from both your backend application and frontend API calls.