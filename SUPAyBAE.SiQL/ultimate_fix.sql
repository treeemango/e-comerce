-- =============================================================================
-- ULTIMATE FIX V2 (ROBUST SELLER LOOKUP)
-- Reason: "seller_id" column does not exist on orders OR order_items in some environments.
-- Solution: Always join via products table to get seller_id.
-- =============================================================================

-- 1. FIX: handle_order_completion_automation
CREATE OR REPLACE FUNCTION public.handle_order_completion_automation()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
BEGIN
    -- Only trigger when an order status changes to 'delivered'
    IF (NEW.status = 'delivered' AND OLD.status != 'delivered') THEN
        
        -- Resolve Seller ID correctly from products join (Safest Method)
        SELECT p.seller_id INTO v_seller_id
        FROM public.order_items oi
        JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = NEW.id
        LIMIT 1;

        -- If seller found, proceed with automation
        IF v_seller_id IS NOT NULL THEN
            PERFORM public.refresh_vendor_badges(v_seller_id);
            
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

-- 2. FIX: get_seller_stats (Fixing ambiguous seller_id references)
CREATE OR REPLACE FUNCTION get_seller_stats(p_seller_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'pending_orders', (
            SELECT count(DISTINCT oi.order_id) 
            FROM public.order_items oi 
            JOIN public.products p ON p.id = oi.product_id
            JOIN public.orders o ON o.id = oi.order_id 
            WHERE p.seller_id = p_seller_id AND o.status = 'pending'
        ),
        'pending_returns', (
            SELECT count(*) 
            FROM public.return_requests r 
            JOIN public.products p ON r.product_id = p.id
            WHERE p.seller_id = p_seller_id AND r.status = 'pending'
        ),
        'active_coupons', (
            SELECT count(*) FROM public.coupons WHERE seller_id = p_seller_id AND status = 'Ongoing'
        ),
        'balance', (
            SELECT COALESCE(SUM(amount), 0) FROM public.seller_transactions WHERE seller_id = p_seller_id
        ),
        'total_products', (
            SELECT count(*) FROM public.products WHERE seller_id = p_seller_id
        ),
        'low_stock_count', (
            SELECT count(*) FROM public.products p 
            JOIN public.product_variants v ON p.id = v.product_id 
            WHERE p.seller_id = p_seller_id AND v.stock < 5
        ),
        'total_sales', (
            SELECT COALESCE(SUM(oi.price * oi.quantity), 0) 
            FROM public.order_items oi
            JOIN public.products p ON p.id = oi.product_id
            JOIN public.orders o ON o.id = oi.order_id
            WHERE p.seller_id = p_seller_id AND o.status = 'completed'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FIX: confirm_order_receipt_buyer (Matches signature)
DROP FUNCTION IF EXISTS public.confirm_order_receipt_buyer(uuid);

CREATE OR REPLACE FUNCTION public.confirm_order_receipt_buyer(p_order_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_order_status TEXT;
BEGIN
    SELECT status INTO v_order_status FROM orders WHERE id = p_order_id;

    IF v_order_status IN ('shipped', 'out_for_delivery', 'ready_for_pickup') THEN
        UPDATE orders 
        SET status = 'delivered', updated_at = NOW()
        WHERE id = p_order_id;

        INSERT INTO order_tracking_events (order_id, event_type, event_description)
        VALUES (p_order_id, 'delivered', 'Buyer confirmed receipt of order');
        
        RETURN TRUE;
    ELSE
        IF v_order_status = 'delivered' THEN RETURN TRUE; END IF;
        RAISE EXCEPTION 'Order cannot be confirmed (current status: %)', v_order_status;
    END IF;
END;
$$;

-- 4. FIX: fn_orchestrate_delivery_payouts (Join products for seller_id)
CREATE OR REPLACE FUNCTION public.fn_orchestrate_delivery_payouts()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_affiliate_id UUID;
    v_net_earnings NUMERIC;
    v_delivery_cost NUMERIC;
    v_total_order_val NUMERIC;
    v_affiliate_commission NUMERIC;
    v_maturity_date TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '10 days';
BEGIN
    SELECT 
        o.delivery_cost, o.referred_by_affiliate_id, o.total_price 
    INTO 
        v_delivery_cost, v_affiliate_id, v_total_order_val
    FROM public.orders o WHERE o.id = NEW.order_id;
    
    -- Robust Lookup via Products
    SELECT p.seller_id INTO v_seller_id
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = NEW.order_id
    LIMIT 1;
    
    SELECT SUM(net_seller_earnings) INTO v_net_earnings 
    FROM public.order_items WHERE order_id = NEW.order_id;

    v_affiliate_commission := COALESCE(v_total_order_val, 0) * 0.05;

    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.delivery_partner_payments (
            partner_id, amount, status, notes, assignment_id
        ) VALUES (
            NEW.created_by, 
            COALESCE(v_delivery_cost, 0), 
            'pending', 
            'Auto-payout generated for Order ' || NEW.order_id,
            (SELECT id FROM delivery_assignments WHERE order_id = NEW.order_id LIMIT 1)
        );
    END IF;

    IF v_seller_id IS NOT NULL THEN
        INSERT INTO public.seller_payouts (
            seller_id, order_id, amount, available_at, status
        ) VALUES (
            v_seller_id, NEW.order_id, COALESCE(v_net_earnings, 0), v_maturity_date, 'escrow'
        );
    END IF;

    IF v_affiliate_id IS NOT NULL THEN
        INSERT INTO public.affiliate_commissions (
            affiliate_id, order_id, amount, available_at, status
        ) VALUES (
            v_affiliate_id, NEW.order_id, v_affiliate_commission, v_maturity_date, 'pending'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
