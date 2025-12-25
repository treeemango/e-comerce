-- 1. Status Synchronization Logic
-- This function ensures that when a driver updates their assignment, the parent order reflects it.
CREATE OR REPLACE FUNCTION public.fn_sync_delivery_assignment_to_order()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status TEXT;
    v_tracking_event TEXT;
    v_event_desc TEXT;
BEGIN
    -- Determine the target order status and tracking event type
    CASE NEW.status
        WHEN 'picked_up' THEN
            v_order_status := 'shipped';
            v_tracking_event := 'picked_up';
            v_event_desc := 'Order picked up by driver: ' || COALESCE(NEW.driver_name, 'Courier');
        WHEN 'in_transit' THEN
            v_order_status := 'shipped';
            v_tracking_event := 'in_transit';
            v_event_desc := 'Order is in transit to destination';
        WHEN 'delivered' THEN
            v_order_status := 'delivered';
            v_tracking_event := 'delivered';
            v_event_desc := 'Order delivered successfully';
        WHEN 'failed' THEN
            v_order_status := 'failed_delivery';
            v_tracking_event := 'failed_delivery';
            v_event_desc := 'Delivery attempt failed: ' || COALESCE(NEW.notes, 'Reason not specified');
        WHEN 'cancelled' THEN
            v_order_status := 'cancelled';
            v_tracking_event := 'cancelled';
            v_event_desc := 'Delivery assignment was cancelled';
        ELSE
            RETURN NEW;
    END CASE;

    -- 1. Update the parent order status
    IF v_order_status IS NOT NULL THEN
        UPDATE public.orders
        SET status = v_order_status,
            updated_at = NOW()
        WHERE id = NEW.order_id;
    END IF;

    -- 2. Log the milestone in order_tracking_events
    IF v_tracking_event IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.order_tracking_events (
            order_id,
            event_type,
            event_description,
            created_at,
            created_by
        ) VALUES (
            NEW.order_id,
            v_tracking_event,
            v_event_desc,
            NOW(),
            NEW.partner_id -- Assuming the partner (company/driver) is the creator
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Link the trigger to assignments
DROP TRIGGER IF EXISTS trg_on_delivery_assignment_sync ON public.delivery_assignments;
CREATE TRIGGER trg_on_delivery_assignment_sync
AFTER UPDATE OF status ON public.delivery_assignments
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_delivery_assignment_to_order();


-- 2. Delivery Milestone Notifications
-- This function triggers in-app/push alerts based on the milestones logged.
CREATE OR REPLACE FUNCTION public.fn_trigger_delivery_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
    v_buyer_name TEXT;
    v_order_num TEXT;
BEGIN
    -- Fetch contextual info
    SELECT user_id, customer_name, order_number INTO v_buyer_id, v_buyer_name, v_order_num
    FROM public.orders WHERE id = NEW.order_id;

    -- Note: v_seller_id would need a join through order_items -> products, 
    -- but for now we focus on alerting the buyer.

    -- Notification Logic
    CASE NEW.event_type
        WHEN 'picked_up' THEN
            INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body)
            VALUES (v_buyer_id, NEW.order_id, 'in_app', COALESCE(v_buyer_id::text, ''), 'Your order #' || v_order_num || ' has been picked up and is on its way!');
            
        WHEN 'delivered' THEN
            -- Notify Buyer
            INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body)
            VALUES (v_buyer_id, NEW.order_id, 'in_app', COALESCE(v_buyer_id::text, ''), 'Great news! Your order #' || v_order_num || ' has been delivered.');
            
            -- Also notify seller (we'd need seller_id here)
            -- This could be added later when seller_id is clarified in this context.
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Link the trigger to tracking events
DROP TRIGGER IF EXISTS trg_on_tracking_event_notify ON public.order_tracking_events;
CREATE TRIGGER trg_on_tracking_event_notify
AFTER INSERT ON public.order_tracking_events
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_delivery_notifications();
