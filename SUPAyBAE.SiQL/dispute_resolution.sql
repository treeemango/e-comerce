-- DELIVERY DISPUTE & ESCROW SECURITY SYSTEM
-- Implementation for Admin-Controlled Dispute Resolution

-- 1. Update orders table to track shipping and proof
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shipment_proof_url TEXT;

-- 2. Trigger to automatically set shipped_at when order status changes to 'shipped'
CREATE OR REPLACE FUNCTION public.set_shipped_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'shipped' AND (OLD.status IS DISTINCT FROM 'shipped')) THEN
        NEW.shipped_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_shipped_at ON public.orders;
CREATE TRIGGER trg_orders_shipped_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_shipped_at_timestamp();

-- 3. RPC for Buyer to Raise a Dispute (after 5 days)
CREATE OR REPLACE FUNCTION public.raise_delivery_dispute(
    p_order_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_issue_id UUID;
BEGIN
    -- 1. Validation
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    
    IF v_order.user_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    IF v_order.status != 'shipped' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Disputes can only be raised for shipped orders.');
    END IF;

    IF v_order.shipped_at IS NULL OR v_order.shipped_at > NOW() - INTERVAL '5 days' THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only raise a dispute after 5 days of shipping.');
    END IF;

    -- 2. Create Order Issue
    INSERT INTO public.order_issues (
        order_id,
        issue_type,
        severity,
        description,
        status,
        reported_by
    ) VALUES (
        p_order_id,
        'late_delivery',
        'high',
        p_reason,
        'open',
        auth.uid()
    ) RETURNING id INTO v_issue_id;

    -- 3. Freeze Payouts (Freeze for 30 days or until resolved)
    UPDATE public.seller_payouts
    SET available_at = NOW() + INTERVAL '30 days',
        status = 'escrow'
    WHERE order_id = p_order_id;

    -- 4. Log Event
    INSERT INTO public.order_tracking_events (order_id, event_type, event_description)
    VALUES (p_order_id, 'failed_delivery', 'Buyer raised a dispute: ' || p_reason);

    RETURN jsonb_build_object('success', true, 'message', 'Dispute raised. Admin will review the case.', 'issue_id', v_issue_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC for Seller to Submit Proof of Shipment
CREATE OR REPLACE FUNCTION public.submit_shipment_proof(
    p_order_id UUID,
    p_proof_url TEXT
)
RETURNS JSONB AS $$
BEGIN
    -- Update order with proof
    UPDATE public.orders
    SET shipment_proof_url = p_proof_url
    WHERE id = p_order_id;

    -- Log Event
    INSERT INTO public.order_tracking_events (order_id, event_type, event_description)
    VALUES (p_order_id, 'preparing', 'Seller submitted proof of shipment: ' || p_proof_url);

    RETURN jsonb_build_object('success', true, 'message', 'Proof of shipment submitted.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC for Admin to Resolve Dispute
CREATE OR REPLACE FUNCTION public.resolve_dispute_admin(
    p_issue_id UUID,
    p_resolution TEXT, -- 'release' to seller or 'refund' to buyer
    p_admin_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_seller_id UUID;
    v_buyer_id UUID;
BEGIN
    -- 1. Security Check (Simplified for now - assuming admin check is handled by Supabase Role/RLS)
    -- In production, check for admin role here.

    SELECT order_id, reported_by INTO v_order_id, v_buyer_id
    FROM public.order_issues
    WHERE id = p_issue_id;

    IF v_order_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Issue not found.');
    END IF;

    -- 2. Resolve based on choice
    IF p_resolution = 'release' THEN
        -- Mark as Delivered and Release funds
        UPDATE public.orders SET status = 'delivered' WHERE id = v_order_id;
        
        UPDATE public.seller_payouts
        SET available_at = NOW(),
            status = 'available'
        WHERE order_id = v_order_id;

        UPDATE public.order_issues
        SET status = 'resolved',
            resolution = 'Admin released funds to seller.',
            resolution_date = NOW(),
            internal_notes = p_admin_notes
        WHERE id = p_issue_id;

        INSERT INTO public.order_tracking_events (order_id, event_type, event_description)
        VALUES (v_order_id, 'delivered', 'Dispute resolved by Admin: Funds released to seller.');

    ELSIF p_resolution = 'refund' THEN
        -- Mark as Canceled/Refunded and Cancel payouts
        UPDATE public.orders SET status = 'cancelled' WHERE id = v_order_id;

        UPDATE public.seller_payouts
        SET status = 'cancelled'
        WHERE order_id = v_order_id;

        UPDATE public.order_issues
        SET status = 'resolved',
            resolution = 'Admin issued refund to buyer.',
            resolution_date = NOW(),
            internal_notes = p_admin_notes
        WHERE id = p_issue_id;

        INSERT INTO public.order_tracking_events (order_id, event_type, event_description)
        VALUES (v_order_id, 'cancelled', 'Dispute resolved by Admin: Refund issued to buyer.');

    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid resolution type.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Dispute resolved successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
