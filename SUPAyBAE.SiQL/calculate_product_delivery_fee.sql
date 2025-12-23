CREATE OR REPLACE FUNCTION public.calculate_product_delivery_fee(
    p_product_id UUID,
    p_quantity BIGINT, -- CHANGED TO BIGINT
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
    -- 1. Fetch relevant product and delivery data
    SELECT
        p.delivery_cost,
        p.free_delivery,
        p.min_order_for_free_delivery,
        p.price
    INTO
        v_delivery_cost,
        v_free_delivery,
        v_min_order_for_free_delivery,
        v_product_price
    FROM
        products p
    WHERE
        p.id = p_product_id;

    -- If the product doesn't exist, return 0
    IF v_delivery_cost IS NULL THEN
        RETURN 0.00;
    END IF;

    -- 2. Calculate the total value of the product being ordered
    -- p_quantity is now BIGINT, safe for multiplication
    v_total_product_value := v_product_price * p_quantity; 
    
    -- 3. Check for free delivery conditions
    IF v_free_delivery = TRUE THEN
        v_final_delivery_fee := 0.00;
    ELSIF v_min_order_for_free_delivery IS NOT NULL AND v_total_product_value >= v_min_order_for_free_delivery THEN
        v_final_delivery_fee := 0.00;
    ELSE
        -- Apply standard delivery cost
        v_final_delivery_fee := v_delivery_cost;
    END IF;
    
    -- 4. Apply express delivery surcharge if requested (if not already free)
    IF p_express_delivery = TRUE AND v_final_delivery_fee > 0.00 THEN
        -- Assuming a simple 20% surcharge for express delivery
        v_final_delivery_fee := v_final_delivery_fee * 1.20; 
    END IF;

    RETURN COALESCE(v_final_delivery_fee, 0.00);

END;
$$ LANGUAGE plpgsql VOLATILE;