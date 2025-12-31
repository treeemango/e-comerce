CREATE OR REPLACE FUNCTION public.handle_order_completion_automation()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
BEGIN
    -- Only trigger when an order status changes to 'delivered'
    IF (NEW.status = 'delivered' AND OLD.status != 'delivered') THEN
        
        -- 1. Resolve Seller ID correctly (since it's not on the orders table)
        -- We fetch the seller from the products associated with the order items
        SELECT p.seller_id INTO v_seller_id
        FROM public.order_items oi
        JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = NEW.id
        LIMIT 1;

        -- If seller found, proceed with automation
        IF v_seller_id IS NOT NULL THEN
            
            -- A. Re-calculate Badges (Safe call using confirmed seller_id)
            PERFORM public.refresh_vendor_badges(v_seller_id);
            
            -- B. Update Shipping History for Analytics
            INSERT INTO public.Badge_2030_shipment_history (
                seller_id, order_id, tracking_number, carrier, 
                shipment_method, status, delivered_at
            )
            VALUES (
                v_seller_id, NEW.id, 'AUTO-' || NEW.id, 'JuaExpress', 
                'standard', 'delivered', NOW()
            )
            ON CONFLICT (order_id, seller_id) DO UPDATE SET
                status = 'delivered',
                delivered_at = NOW();

            -- C. Log the event for ROI Tracking
            INSERT INTO public.Badge_2030_reward_usage (
                seller_id, badge_type, reward_type, usage_count, period_start
            )
            VALUES (
                v_seller_id, 'speed_dove', 'platform_fee_discount', 1, CURRENT_DATE
            )
            ON CONFLICT (seller_id, badge_type, reward_type, period_start) 
            DO UPDATE SET usage_count = public.Badge_2030_reward_usage.usage_count + 1;
            
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
