
-- Phase 3: Proximity Alerts and Seller Notifications

-- 1. Extend delivery_assignments for proximity tracking
ALTER TABLE public.delivery_assignments 
ADD COLUMN IF NOT EXISTS destination_coords geometry(Point, 4326),
ADD COLUMN IF NOT EXISTS proximity_notified BOOLEAN DEFAULT FALSE;

-- 2. Enhanced Notification Trigger for Sellers and Review Prompts
CREATE OR REPLACE FUNCTION public.fn_trigger_delivery_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_buyer_id UUID;
    v_buyer_name TEXT;
    v_order_num TEXT;
    v_seller_record RECORD;
BEGIN
    -- Fetch contextual info
    SELECT user_id, customer_name, order_number INTO v_buyer_id, v_buyer_name, v_order_num
    FROM public.orders WHERE id = NEW.order_id;

    -- Notification Logic
    CASE NEW.event_type
        WHEN 'picked_up' THEN
            INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body)
            VALUES (v_buyer_id, NEW.order_id, 'in_app', COALESCE(v_buyer_id::text, ''), 'Your order #' || v_order_num || ' has been picked up and is on its way!');
            
        WHEN 'delivered' THEN
            -- Notify Buyer
            INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body)
            VALUES (v_buyer_id, NEW.order_id, 'in_app', COALESCE(v_buyer_id::text, ''), 'Great news! Your order #' || v_order_num || ' has been delivered.');
            
            -- Notify all unique sellers involved in this order
            FOR v_seller_record IN (
                SELECT DISTINCT v.user_id as seller_user_id
                FROM public.order_items oi
                JOIN public.vendors v ON oi.business_id = v.id
                WHERE oi.order_id = NEW.order_id
            ) LOOP
                INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body)
                VALUES (v_seller_record.seller_user_id, NEW.order_id, 'in_app', v_seller_record.seller_user_id::text, 'Your order #' || v_order_num || ' has been successfully delivered to the customer.');
            END LOOP;

            -- Phase 2: Review Prompt for Buyer
            INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body, metadata)
            VALUES (
                v_buyer_id, 
                NEW.order_id, 
                'review_prompt', 
                COALESCE(v_buyer_id::text, ''), 
                'How was your purchase? Write a review for order #' || v_order_num,
                jsonb_build_object('action', 'open_review_modal', 'order_id', NEW.order_id)
            );
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Proximity Notification Logic
CREATE OR REPLACE FUNCTION public.fn_check_driver_proximity()
RETURNS TRIGGER AS $$
DECLARE
    v_dest_coords geometry(Point, 4326);
    v_prox_notified BOOLEAN;
    v_buyer_id UUID;
    v_order_num TEXT;
BEGIN
    -- Get assignment info for this order
    SELECT destination_coords, proximity_notified INTO v_dest_coords, v_prox_notified
    FROM public.delivery_assignments WHERE order_id = NEW.order_id;

    -- If we have a destination and haven't notified for proximity yet
    IF v_dest_coords IS NOT NULL AND (v_prox_notified IS FALSE OR v_prox_notified IS NULL) THEN
        -- Check distance (800 meters = 0.8km)
        -- Using ST_DWithin on geometry with geography projection for meters
        IF ST_DWithin(NEW.location::geography, v_dest_coords::geography, 800) THEN
            -- Get buyer info
            SELECT user_id, order_number INTO v_buyer_id, v_order_num
            FROM public.orders WHERE id = NEW.order_id;

            -- Notify Buyer
            INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body)
            VALUES (v_buyer_id, NEW.order_id, 'in_app', COALESCE(v_buyer_id::text, ''), 'Your driver is nearby! Order #' || v_order_num || ' will be arriving shortly.');

            -- Mark as notified to avoid spamming
            UPDATE public.delivery_assignments SET proximity_notified = TRUE WHERE order_id = NEW.order_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Proximity Trigger
DROP TRIGGER IF EXISTS trg_check_proximity ON public.realtime_delivery_updates;
CREATE TRIGGER trg_check_proximity
AFTER INSERT ON public.realtime_delivery_updates
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_driver_proximity();
