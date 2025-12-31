-- Fix get_product_coupons to only return active (Ongoing) coupons by default
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
      AND (p_include_expired OR c.status = 'Ongoing') -- Fixed: only return Ongoing status if expired not included
    ORDER BY 
        CASE 
            WHEN c.discount_amount IS NOT NULL THEN 1
            WHEN c.discount_percentage IS NOT NULL THEN 2
            ELSE 3
        END,
        COALESCE(c.discount_amount, 0) DESC;
END;
$$;
