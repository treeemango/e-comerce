-- Phase 2: Post-Delivery Review Automation

-- 1. Add metadata column to notifications_queue if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications_queue' AND column_name = 'metadata') THEN
        ALTER TABLE public.notifications_queue ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- 2. Enhance Delivery Milestone Notifications for Review Prompts
-- This function triggers in-app alerts based on the milestones logged in order_tracking_events.
CREATE OR REPLACE FUNCTION public.fn_trigger_delivery_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_buyer_id UUID;
    v_buyer_name TEXT;
    v_order_num TEXT;
BEGIN
    -- Fetch contextual info from the parent order
    SELECT user_id, customer_name, order_number INTO v_buyer_id, v_buyer_name, v_order_num
    FROM public.orders WHERE id = NEW.order_id;

    -- Notification Logic based on the tracking event type
    CASE NEW.event_type
        WHEN 'picked_up' THEN
            -- Notify Buyer: Order Picked Up
            INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body)
            VALUES (v_buyer_id, NEW.order_id, 'in_app', COALESCE(v_buyer_id::text, ''), 'Your order #' || v_order_num || ' has been picked up and is on its way!');
            
        WHEN 'delivered' THEN
            -- Notify Buyer: Delivery Confirmation
            INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body)
            VALUES (v_buyer_id, NEW.order_id, 'in_app', COALESCE(v_buyer_id::text, ''), 'Great news! Your order #' || v_order_num || ' has been delivered.');
            
            -- Notify Buyer: Review Prompt (Phase 2 Enhancement)
            -- We use notification_type = 'review_prompt' so the frontend can intercept and show an actionable prompt.
            INSERT INTO public.notifications_queue (user_id, order_id, notification_type, recipient_address, message_body, metadata)
            VALUES (
                v_buyer_id, 
                NEW.order_id, 
                'review_prompt', 
                COALESCE(v_buyer_id::text, ''), 
                'How was your purchase? Leave a review for your items in order #' || v_order_num,
                jsonb_build_object(
                    'action', 'open_review_modal', 
                    'order_id', NEW.order_id,
                    'prompt_type', 'post_delivery'
                )
            );
            
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
