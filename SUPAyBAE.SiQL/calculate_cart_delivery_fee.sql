CREATE OR REPLACE FUNCTION public.calculate_cart_delivery_fee(
    p_user_id UUID,
    p_express_delivery BOOLEAN DEFAULT FALSE
)
RETURNS NUMERIC AS $$
DECLARE
    v_total_delivery_fee NUMERIC := 0.00;
BEGIN
    -- Aggregate delivery fees per product in the cart
    SELECT COALESCE(SUM(
        public.calculate_product_delivery_fee(
            ci.product_id,
            ci.quantity::BIGINT, -- Cast ci.quantity to BIGINT here for safety
            p_express_delivery
        )
    ), 0.00)
    INTO v_total_delivery_fee
    FROM 
        cart_items ci
    WHERE 
        ci.user_id = p_user_id;

    RETURN v_total_delivery_fee;
END;
$$ LANGUAGE plpgsql VOLATILE;