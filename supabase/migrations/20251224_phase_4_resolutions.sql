-- Migration: Phase 4 Dispute Resolution & Financial Payouts
-- Description: Adds functions for handling returns, refunds, and payout approvals.

-- 1. Function to authorize a return request
CREATE OR REPLACE FUNCTION public.fn_authorize_return(p_return_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.return_requests
    SET status = 'approved',
        updated_at = NOW()
    WHERE id = p_return_id;
    
    INSERT INTO public.return_history (return_id, action, performed_by)
    VALUES (p_return_id, 'Approved', auth.uid());
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to process a refund
CREATE OR REPLACE FUNCTION public.fn_process_refund(p_order_id UUID, p_refund_amount NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
    v_seller_id UUID;
    v_return_id UUID;
BEGIN
    -- 1. Get the seller ID and associated return request (if any)
    SELECT seller_id INTO v_seller_id FROM public.orders WHERE id = p_order_id;
    SELECT id INTO v_return_id FROM public.return_requests WHERE order_id = p_order_id AND (status = 'approved' OR status = 'pending') LIMIT 1;

    -- 2. Update order status
    UPDATE public.orders SET status = 'refunded' WHERE id = p_order_id;

    -- 3. Update return request status if exists
    IF v_return_id IS NOT NULL THEN
        UPDATE public.return_requests 
        SET status = 'refunded', refund_amount = p_refund_amount, updated_at = NOW() 
        WHERE id = v_return_id;
        
        INSERT INTO public.return_history (return_id, action, performed_by)
        VALUES (v_return_id, 'Refunded', auth.uid());
    END IF;

    -- 4. Create a negative transaction for the seller
    INSERT INTO public.seller_transactions (
        seller_id, order_id, transaction_type, amount, description
    ) VALUES (
        v_seller_id, p_order_id, 'Refund', -p_refund_amount, 'Refund processed for order #' || p_order_id
    );

    -- 5. Add to tracking events
    INSERT INTO public.order_tracking_events (order_id, event_type, event_description)
    VALUES (p_order_id, 'refunded', 'A refund of ' || p_refund_amount || ' has been processed.');

    -- 6. Cancel the seller payout if it's still in escrow or available but not paid
    UPDATE public.seller_payouts 
    SET status = 'cancelled', updated_at = NOW()
    WHERE order_id = p_order_id AND status IN ('escrow', 'available');

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to fully process a payout request (Admin)
CREATE OR REPLACE FUNCTION public.fn_fully_approve_payout(p_request_id UUID, p_admin_notes TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_seller_id UUID;
    v_amount NUMERIC;
BEGIN
    -- 1. Get request details
    SELECT seller_id, amount INTO v_seller_id, v_amount 
    FROM public.payout_requests WHERE id = p_request_id AND status = 'pending';
    
    IF v_seller_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 2. Update request status
    UPDATE public.payout_requests 
    SET status = 'approved', admin_notes = p_admin_notes, processed_at = NOW() 
    WHERE id = p_request_id;

    -- 3. Mark all 'available' payouts for this seller as 'paid'
    UPDATE public.seller_payouts
    SET status = 'paid', updated_at = NOW()
    WHERE seller_id = v_seller_id AND status = 'available';

    -- 4. Record the payout in seller_transactions
    INSERT INTO public.seller_transactions (
        seller_id, transaction_type, amount, description
    ) VALUES (
        v_seller_id, 'Payout', -v_amount, 'Withdrawal request approved.'
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Notification trigger for payout status changes
CREATE OR REPLACE FUNCTION public.fn_notify_payout_status()
RETURNS TRIGGER AS $$
DECLARE
    v_order_number TEXT;
BEGIN
    SELECT order_number INTO v_order_number FROM public.orders WHERE id = NEW.order_id;

    IF (TG_OP = 'UPDATE' AND OLD.status = 'escrow' AND NEW.status = 'available') THEN
        INSERT INTO public.notifications_queue (
            user_id, title, message, type
        ) VALUES (
            NEW.seller_id,
            'Funds Released',
            'Your funds' || COALESCE(' for order #' || v_order_number, '') || ' are now available for withdrawal.',
            'payout_available'
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'available' AND NEW.status = 'paid') THEN
         INSERT INTO public.notifications_queue (
            user_id, title, message, type
        ) VALUES (
            NEW.seller_id,
            'Payout Processed',
            'The payout' || COALESCE(' for order #' || v_order_number, '') || ' has been paid to your account.',
            'payout_paid'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_payout_status ON public.seller_payouts;
CREATE TRIGGER trg_notify_payout_status
AFTER UPDATE ON public.seller_payouts
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_payout_status();
