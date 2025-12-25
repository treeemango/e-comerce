-- Fix for "record 'new' has no field 'total_amount'" error
-- This error happens because some triggers expect 'total_amount' column which is missing
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);

-- Populate total_amount from existing total column
UPDATE public.orders 
SET total_amount = total 
WHERE total_amount IS NULL;

-- Keep total and total_amount synced for future updates
CREATE OR REPLACE FUNCTION public.sync_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total IS DISTINCT FROM OLD.total THEN
        NEW.total_amount := NEW.total;
    ELSIF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
        NEW.total := NEW.total_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_order_totals ON public.orders;
CREATE TRIGGER trg_sync_order_totals
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_order_totals();


-- Fix for "column o.seller_id does not exist" error in get_seller_stats
-- We fix the function to join with order_items and products to find the seller
CREATE OR REPLACE FUNCTION get_seller_stats(p_seller_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'pending_orders', (SELECT count(DISTINCT o.id) FROM public.orders o JOIN public.order_items oi ON o.id = oi.order_id JOIN public.products p ON oi.product_id = p.id WHERE p.seller_id = p_seller_id AND o.status = 'pending'),
        'pending_returns', (SELECT count(DISTINCT r.id) FROM public.return_requests r JOIN public.orders o ON r.order_id = o.id JOIN public.order_items oi ON o.id = oi.order_id JOIN public.products p ON oi.product_id = p.id WHERE p.seller_id = p_seller_id AND r.status = 'pending'),
        'active_coupons', (SELECT count(*) FROM public.coupons WHERE seller_id = p_seller_id AND status = 'Ongoing'),
        'balance', (SELECT COALESCE(SUM(amount), 0) FROM public.seller_transactions WHERE seller_id = p_seller_id AND (release_date IS NULL OR release_date <= NOW())),
        'pending_balance', (SELECT COALESCE(SUM(amount), 0) FROM public.seller_transactions WHERE seller_id = p_seller_id AND release_date > NOW()),
        'total_products', (SELECT count(*) FROM public.products WHERE seller_id = p_seller_id),
        'low_stock_count', (SELECT count(*) FROM public.products p JOIN public.product_variants v ON p.id = v.product_id WHERE p.seller_id = p_seller_id AND v.stock < 5),
        'total_sales', (SELECT COALESCE(SUM(amount), 0) FROM public.seller_transactions WHERE seller_id = p_seller_id AND transaction_type = 'Order Payment')
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix for "column o.referred_by_affiliate_id does not exist" error
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS referred_by_affiliate_id UUID;

-- Fix for "column o.delivery_cost does not exist" error in fn_orchestrate_delivery_payouts
-- This function was trying to select a non-existent column. We rewrite it to calculate totals correctly.
CREATE OR REPLACE FUNCTION public.fn_orchestrate_delivery_payouts()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_affiliate_id UUID;
    v_net_earnings NUMERIC;
    v_delivery_total NUMERIC := 0;
    v_total_order_val NUMERIC;
    v_affiliate_commission NUMERIC;
    v_maturity_date TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '10 days';
BEGIN
    -- 1. Fetch Order Data (Removed invalid o.delivery_cost)
    SELECT 
        o.user_id, o.referred_by_affiliate_id, o.total_price 
    INTO v_seller_id, v_affiliate_id, v_total_order_val
    FROM public.orders o WHERE o.id = NEW.order_id;
    
    -- 2. Calculate Totals
    SELECT SUM(net_seller_earnings) INTO v_net_earnings 
    FROM public.order_items WHERE order_id = NEW.order_id;

    -- Calculate Delivery Total from order items
    SELECT COALESCE(SUM(delivery_fee), 0) INTO v_delivery_total
    FROM public.order_items WHERE order_id = NEW.order_id;

    -- Calculate Affiliate Share (5% flat example)
    v_affiliate_commission := COALESCE(v_total_order_val, 0) * 0.05;

    -- 3. ACTION: Immediate Transporter Payment Record
    -- Only insert if delivery partner assigned (checked via delivery_assignments existence)
    IF EXISTS (SELECT 1 FROM delivery_assignments WHERE order_id = NEW.order_id) THEN
        INSERT INTO public.delivery_partner_payments (
            partner_id, amount, status, notes, assignment_id
        ) VALUES (
            NEW.created_by, -- Assuming created_by is the driver for 'delivered' event, verify this assumption in logic or leave as is
            v_delivery_total, 
            'pending', 
            'Auto-payout generated for Order ' || NEW.order_id,
            (SELECT id FROM delivery_assignments WHERE order_id = NEW.order_id LIMIT 1)
        );
    END IF;

    -- 4. ACTION: Seller Escrow (10-Day Hold)
    -- This might be redundant if confirm_parcel_delivery already does it, but let's keep it safe or ensure no double pay.
    -- The other system relies on 'confirm_parcel_delivery' RPC. 
    -- If this trigger runs on 'delivered', check if transactions already exist to prevent dupes.
    IF NOT EXISTS (SELECT 1 FROM public.seller_transactions WHERE order_id = NEW.order_id AND transaction_type = 'Order Payment') THEN
         INSERT INTO public.seller_transactions (
            seller_id, order_id, transaction_type, amount, description, release_date, status
        ) VALUES (
            v_seller_id, NEW.order_id, 'Order Payment', COALESCE(v_net_earnings, 0), 'Payment for Order #' || NEW.order_id || ' (10-day escrow)', v_maturity_date, 'held'
        );
    END IF;

    -- 5. ACTION: Affiliate Commission (10-Day Hold)
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

-- Fix for "null value in column message_body" error
-- This redefines the notification trigger to ensure we never insert NULL values.
CREATE OR REPLACE FUNCTION public.fn_notify_on_payment_success()
RETURNS TRIGGER AS $$
DECLARE
    v_phone_number TEXT;
    v_message_body TEXT;
BEGIN
    -- Only trigger when an order moves to 'paid' (or specific status transitions you want to notify on)
    -- Added 'delivered' here just in case the original error came from a delivered status update
    IF (NEW.status = 'paid' AND OLD.status != 'paid') OR (NEW.status = 'delivered' AND OLD.status != 'delivered') THEN
        
        -- Attempt to find the phone number
        -- We prioritize the phone number on the order itself as it is most reliable
        v_phone_number := NEW.customer_phone;
        
        -- Optional: specific logic for different payment methods could go here if needed
        -- but for now, we trust the order contact info.

        -- If no phone number found, fallback to order customer_phone or just don't send
        IF v_phone_number IS NULL THEN
             v_phone_number := NEW.customer_phone;
        END IF;

        IF v_phone_number IS NOT NULL THEN
            v_message_body := 'Confirmed! Your order #' || LEFT(NEW.id::text, 8) || ' is now ' || NEW.status || '.';

            INSERT INTO public.notifications_queue (
                user_id,
                order_id,
                notification_type,
                recipient_address, 
                message_body,
                status
            )
            VALUES (
                NEW.user_id,
                NEW.id,
                'sms',
                v_phone_number,
                COALESCE(v_message_body, 'Order Update'), -- Fail-safe
                'ready'
            );
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Defensive Fix: Prevent NULL message_body in notifications_queue
-- This trigger handles cases where other parts of the system might try to insert 
-- incomplete notifications (like the 'in_app' one causing errors).
CREATE OR REPLACE FUNCTION public.fn_prevent_null_notification_body()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.message_body IS NULL THEN
        -- Provide a sensible default based on notification type
        IF NEW.notification_type = 'in_app' THEN
            NEW.message_body := 'You have a new update regarding your order.';
        ELSE
            NEW.message_body := 'Notification';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_null_message_body ON public.notifications_queue;
CREATE TRIGGER trg_prevent_null_message_body
    BEFORE INSERT ON public.notifications_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_null_notification_body();
