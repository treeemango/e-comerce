-- =============================================================================
-- FIX 1: Robust 'confirm_order_receipt_buyer' function
-- =============================================================================
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

        -- Log event
        INSERT INTO order_tracking_events (order_id, event_type, event_description)
        VALUES (p_order_id, 'delivered', 'Buyer confirmed receipt of order');
        
        RETURN TRUE;
    ELSE
        RAISE EXCEPTION 'Order cannot be confirmed (current status: %)', v_order_status;
    END IF;
END;
$$;

-- =============================================================================
-- FIX 2: Repair 'fn_orchestrate_delivery_payouts' to NOT use orders.seller_id
-- =============================================================================
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
    -- 1. Fetch Order Data (Fixed: Removed non-existent seller_id reference)
    SELECT 
        o.delivery_cost, o.referred_by_affiliate_id, o.total_price 
    INTO 
        v_delivery_cost, v_affiliate_id, v_total_order_val
    FROM public.orders o WHERE o.id = NEW.order_id;
    
    -- 2. Determine Seller ID from Order Items (The correct way)
    SELECT seller_id INTO v_seller_id 
    FROM public.order_items 
    WHERE order_id = NEW.order_id 
    LIMIT 1;

    -- If no seller found (e.g. legacy data), try to use product owner
    IF v_seller_id IS NULL THEN
        SELECT p.seller_id INTO v_seller_id
        FROM public.order_items oi
        JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = NEW.order_id
        LIMIT 1;
    END IF;

    -- 3. Calculate Totals
    SELECT SUM(net_seller_earnings) INTO v_net_earnings 
    FROM public.order_items WHERE order_id = NEW.order_id;

    -- Calculate Affiliate Share (5% flat example)
    v_affiliate_commission := COALESCE(v_total_order_val, 0) * 0.05;

    -- 4. ACTION: Immediate Transporter Payment Record
    -- (Assuming 'created_by' in tracking event is the driver/partner)
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

    -- 5. ACTION: Seller Escrow (10-Day Hold)
    IF v_seller_id IS NOT NULL THEN
        INSERT INTO public.seller_payouts (
            seller_id, order_id, amount, available_at, status
        ) VALUES (
            v_seller_id, NEW.order_id, COALESCE(v_net_earnings, 0), v_maturity_date, 'escrow'
        );
    END IF;

    -- 6. ACTION: Affiliate Commission (10-Day Hold)
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
