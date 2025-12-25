-- ESCROW AND TRANSPORT FEE RELEASE SYSTEM
-- Implementation for Mutual Protection with 10-day escrow and initial transport fee release.

-- 1. Update seller_transactions to support delayed releases
ALTER TABLE public.seller_transactions 
ADD COLUMN IF NOT EXISTS release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

-- 2. Update order_items to track per-item delivery fees and status
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending';

-- 3. Update get_seller_stats to only show "available" balance
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

-- 4. Unified RPC for OTP Verification and Fund Release
CREATE OR REPLACE FUNCTION public.confirm_parcel_delivery(
    p_order_id UUID,
    p_otp TEXT,
    p_seller_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_proof_id UUID;
    v_item_total NUMERIC := 0;
    v_delivery_total NUMERIC := 0;
    v_order_number TEXT;
BEGIN
    -- 1. Verify OTP
    SELECT id INTO v_proof_id
    FROM public.delivery_proofs
    WHERE order_id = p_order_id
      AND proof_type = 'otp'
      AND proof_data = p_otp
      AND verification_status = 'pending';

    IF v_proof_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or already verified collection code.');
    END IF;

    -- 2. Mark proof as verified
    UPDATE public.delivery_proofs
    SET verification_status = 'verified',
        verified_at = NOW()
    WHERE id = v_proof_id;

    -- 3. Calculate earnings for this seller's part of the order (excluding delivery fee which was released on ship)
    -- We assume delivery_fee was already handled during ship.
    SELECT SUM(price * quantity), o.order_number
    INTO v_item_total, v_order_number
    FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.order_id = p_order_id AND p.seller_id = p_seller_id
    GROUP BY o.order_number;

    -- 4. Create Transaction with 10-day release date (Escrow)
    INSERT INTO public.seller_transactions (
        seller_id, 
        order_id, 
        transaction_type, 
        amount, 
        description, 
        release_date,
        status
    )
    VALUES (
        p_seller_id,
        p_order_id,
        'Order Payment',
        v_item_total,
        'Payment for Order #' || COALESCE(v_order_number, p_order_id::text) || ' (10-day escrow)',
        NOW() + INTERVAL '10 days',
        'held'
    );

    -- 5. Update item status
    UPDATE public.order_items oi
    SET fulfillment_status = 'delivered'
    FROM public.products p
    WHERE oi.product_id = p.id 
      AND oi.order_id = p_order_id 
      AND p.seller_id = p_seller_id;

    -- 6. Check if entire order is delivered to update main order status
    IF NOT EXISTS (
        SELECT 1 FROM public.order_items 
        WHERE order_id = p_order_id AND fulfillment_status != 'delivered'
    ) THEN
        UPDATE public.orders SET status = 'delivered' WHERE id = p_order_id;
    END IF;

    -- 7. Log Event
    INSERT INTO public.order_tracking_events (order_id, event_type, event_description)
    VALUES (p_order_id, 'delivered', 'Order items delivered and payment released to escrow.');

    RETURN jsonb_build_object('success', true, 'message', 'Code verified! Funds will be available in 10 days.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC for Buyer to confirm receipt (Hybrid Flow)
CREATE OR REPLACE FUNCTION public.confirm_order_receipt_buyer(
    p_order_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
    v_order_number TEXT;
    v_item_total NUMERIC;
    v_seller_record RECORD;
BEGIN
    -- 1. Security Check: Only the buyer of this order can call this
    SELECT user_id, order_number INTO v_buyer_id, v_order_number
    FROM public.orders
    WHERE id = p_order_id;

    IF v_buyer_id IS NULL OR v_buyer_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Only the buyer can confirm receipt.');
    END IF;

    -- 2. Process for each seller involved in the order that has undelivered items
    FOR v_seller_record IN 
        SELECT DISTINCT p.seller_id
        FROM public.order_items oi
        JOIN public.products p ON oi.product_id = p.id
        WHERE oi.order_id = p_order_id AND oi.fulfillment_status != 'delivered'
    LOOP
        v_seller_id := v_seller_record.seller_id;
        
        -- Calculate total for this seller's items
        SELECT SUM(price * quantity) INTO v_item_total
        FROM public.order_items oi
        JOIN public.products p ON oi.product_id = p.id
        WHERE oi.order_id = p_order_id AND p.seller_id = v_seller_id AND oi.fulfillment_status != 'delivered';

        IF v_item_total > 0 THEN
            -- Create Transaction with 10-day release date (Escrow)
            INSERT INTO public.seller_transactions (
                seller_id, order_id, transaction_type, amount, description, release_date, status
            )
            VALUES (
                v_seller_id,
                p_order_id,
                'Order Payment',
                v_item_total,
                'Payment for Order #' || COALESCE(v_order_number, p_order_id::text) || ' (Buyer confirmed receipt)',
                NOW() + INTERVAL '10 days',
                'held'
            );

            -- Update item status for this seller
            UPDATE public.order_items oi
            SET fulfillment_status = 'delivered'
            FROM public.products p
            WHERE oi.product_id = p.id 
              AND oi.order_id = p_order_id 
              AND p.seller_id = v_seller_id;
        END IF;

        -- Mark any pending OTP delivery proofs for this order/seller as verified
        UPDATE public.delivery_proofs
        SET verification_status = 'verified',
            verified_at = NOW(),
            notes = COALESCE(notes, '') || ' (Confirmed by buyer via UI)'
        WHERE order_id = p_order_id 
          AND proof_type = 'otp' 
          AND verification_status = 'pending';
    END LOOP;

    -- 3. Update main order status
    UPDATE public.orders SET status = 'delivered' WHERE id = p_order_id;

    -- 4. Log Event
    INSERT INTO public.order_tracking_events (order_id, event_type, event_description)
    VALUES (p_order_id, 'delivered', 'Buyer confirmed receipt of the order through the application.');

    RETURN jsonb_build_object('success', true, 'message', 'Receipt confirmed! Thank you for shopping with us.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC for Transport Fee Release (to be called when shipping)

CREATE OR REPLACE FUNCTION public.release_transport_fees(
    p_order_id UUID,
    p_seller_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_delivery_total NUMERIC := 0;
    v_order_number TEXT;
BEGIN
    -- Calculate delivery fees for this seller's items in the order
    SELECT SUM(delivery_fee), o.order_number
    INTO v_delivery_total, v_order_number
    FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.order_id = p_order_id AND p.seller_id = p_seller_id
    GROUP BY o.order_number;

    IF v_delivery_total > 0 THEN
        INSERT INTO public.seller_transactions (
            seller_id, 
            order_id, 
            transaction_type, 
            amount, 
            description, 
            release_date,
            status
        )
        VALUES (
            p_seller_id,
            p_order_id,
            'Transport Fee',
            v_delivery_total,
            'Transport fee for Order #' || COALESCE(v_order_number, p_order_id::text) || ' (Released on shipping)',
            NOW(),
            'available'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
