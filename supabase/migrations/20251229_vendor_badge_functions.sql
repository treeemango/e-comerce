-- Vendor Badge System Functions
-- Corrected to use vendors table instead of sellers

-- ============================================================================
-- 1. Core Logic: get_vendor_badges
-- Calculates which badges a vendor qualifies for based on real-time data
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_vendor_badges(p_vendor_id UUID)
RETURNS JSONB AS $$
DECLARE
    vendor_data RECORD;
    badges_array JSONB := '[]'::jsonb;
    current_timestamp TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- 1. Get vendor data from the correct 'vendors' table
    SELECT
        v.id,
        v.offers_free_delivery,
        v.delivery_scope,
        v.shipping_rating,
        v.shipping_value_sent,
        v.last_delivery_at,
        v.created_at,
        -- Calculate activity metrics
        COUNT(CASE WHEN o.created_at >= current_timestamp - INTERVAL '6 months' THEN 1 END) as orders_last_6_months,
        COUNT(CASE WHEN o.created_at >= current_timestamp - INTERVAL '3 months' THEN 1 END) as orders_last_3_months,
        AVG(EXTRACT(DAY FROM (o.delivered_at - o.created_at))) as avg_delivery_days,
        COALESCE(SUM(o.total_amount), 0) as total_value_shipped_6_months
    INTO vendor_data
    FROM public.vendors v
    LEFT JOIN public.orders o ON v.user_id = o.seller_id AND o.status = 'delivered'
    WHERE v.id = p_vendor_id
    GROUP BY v.id, v.offers_free_delivery, v.delivery_scope, v.shipping_rating,
             v.shipping_value_sent, v.last_delivery_at, v.created_at;

    IF vendor_data.id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    -- 2. Logic: Speed Dove (Formerly Speed Demon)
    -- Requires: Avg delivery <= 3 days and at least 3 orders in 6 months
    IF vendor_data.avg_delivery_days <= 3 AND vendor_data.orders_last_6_months >= 3 THEN
        badges_array := badges_array || jsonb_build_array(
            (SELECT jsonb_build_object(
                'badge_type', 'speed_dove',
                'badge_name', 'Speed Dove',
                'badge_description', description,
                'badge_tier', badge_tier,
                'earned_at', current_timestamp,
                'score_earned', base_score
            ) FROM public.Badge_2030_badge_scores WHERE badge_type = 'speed_dove' LIMIT 1)
        );
    END IF;

    -- 3. Logic: Trusted Shipper
    IF vendor_data.shipping_rating >= 4.5 AND vendor_data.orders_last_6_months >= 10 THEN
        badges_array := badges_array || jsonb_build_array(
            (SELECT jsonb_build_object(
                'badge_type', 'trusted_shipper',
                'badge_name', 'Trusted Shipper',
                'badge_description', description,
                'badge_tier', badge_tier,
                'earned_at', current_timestamp,
                'score_earned', base_score
            ) FROM public.Badge_2030_badge_scores WHERE badge_type = 'trusted_shipper' LIMIT 1)
        );
    END IF;

    -- 4. Logic: New Seller (joined within 30 days)
    IF vendor_data.created_at >= current_timestamp - INTERVAL '30 days' THEN
        badges_array := badges_array || jsonb_build_array(jsonb_build_object(
            'badge_type', 'new_seller',
            'badge_name', 'New Seller',
            'badge_tier', 1,
            'earned_at', current_timestamp
        ));
    END IF;

    -- 5. Logic: Free Delivery
    IF vendor_data.offers_free_delivery = TRUE THEN
        badges_array := badges_array || jsonb_build_array(jsonb_build_object(
            'badge_type', 'free_delivery',
            'badge_name', 'Free Delivery',
            'badge_tier', 1,
            'earned_at', current_timestamp
        ));
    END IF;

    RETURN badges_array;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Management: refresh_vendor_badges
-- Synchronizes calculated badges into badge_2030_seller_badges and vendors table
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_vendor_badges(p_vendor_id UUID)
RETURNS JSONB AS $$
DECLARE
    new_badges JSONB;
BEGIN
    new_badges := public.get_vendor_badges(p_vendor_id);

    -- Update 2030 Badge Table
    INSERT INTO public.badge_2030_seller_badges (seller_id, badges, total_badges_earned, last_calculation_at)
    VALUES (p_vendor_id, new_badges, jsonb_array_length(new_badges), NOW())
    ON CONFLICT (seller_id) DO UPDATE SET
        badges = EXCLUDED.badges,
        total_badges_earned = EXCLUDED.total_badges_earned,
        last_calculation_at = NOW();

    -- Sync back to Vendors table
    UPDATE public.vendors
    SET badges = new_badges
    WHERE id = p_vendor_id;

    RETURN new_badges;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Analytics: get_vendor_badge_stats
-- Provides a summary for the Admin Dashboard or Vendor Profile
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_vendor_badge_stats(p_vendor_id UUID)
RETURNS TABLE (
    total_badges INTEGER,
    total_reputation_score NUMERIC,
    highest_rarity VARCHAR(20),
    newest_badge JSONB,
    badge_history_count BIGINT
) AS $$
DECLARE
    badge_data JSONB;
    badge_rarities TEXT[] := ARRAY['common', 'uncommon', 'rare', 'epic', 'legendary'];
BEGIN
    -- 1. Get current badges from the aligned 2030 table
    SELECT badges INTO badge_data
    FROM public.badge_2030_seller_badges
    WHERE seller_id = p_vendor_id;

    RETURN QUERY
    SELECT
        -- Count of earned badges
        jsonb_array_length(badge_data),
        
        -- Calculate Total Score by summing 'score_earned' inside the JSONB array
        COALESCE((
            SELECT SUM((elem->>'score_earned')::NUMERIC)
            FROM jsonb_array_elements(badge_data) AS elem
        ), 0),

        -- Find the highest rarity currently held
        (
            SELECT elem->>'badge_rarity'
            FROM jsonb_array_elements(badge_data) AS elem
            ORDER BY array_position(badge_rarities, elem->>'badge_rarity') DESC
            LIMIT 1
        )::VARCHAR(20),

        -- Get the most recently earned badge object
        (
            SELECT elem
            FROM jsonb_array_elements(badge_data) AS elem
            ORDER BY (elem->>'earned_at')::TIMESTAMP WITH TIME ZONE DESC
            LIMIT 1
        ),

        -- Count historical events (earned, lost, etc.)
        (
            SELECT COUNT(*)
            FROM public.badge_2030_badge_history
            WHERE seller_id = p_vendor_id
        );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. Rewards: apply_vendor_badge_rewards
-- Processes active_benefits (like commission discounts) based on badges earned
-- ============================================================================
CREATE OR REPLACE FUNCTION public.apply_vendor_badge_rewards(p_vendor_id UUID)
RETURNS TABLE(success BOOLEAN, applied_data JSONB, expiry_data JSONB) AS $$
DECLARE
    v_badges JSONB;
    badge_record RECORD;
    r_applied JSONB := '[]'::jsonb;
    r_expiry JSONB := '[]'::jsonb;
BEGIN
    SELECT badges INTO v_badges FROM public.badge_2030_seller_badges WHERE seller_id = p_vendor_id;

    IF v_badges IS NULL OR jsonb_array_length(v_badges) = 0 THEN
        RETURN QUERY SELECT false, '[]'::jsonb, '[]'::jsonb;
        RETURN;
    END IF;

    -- Reward Application Logic
    FOR badge_record IN SELECT badge FROM jsonb_array_elements(v_badges) AS badge LOOP
        -- (Inserts into Badge_2030_reward_expiry and updates active_benefits)
        NULL; -- Placeholder for actual reward application logic
    END LOOP;

    RETURN QUERY SELECT true, r_applied, r_expiry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Notification: handle_badge_earned_notification
-- Creates notifications when badges are earned
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_badge_earned_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_business_name TEXT;
BEGIN
    -- Check if 'speed_dove' was just added to the badges array
    IF (NEW.badges @> '[{"badge_type": "speed_dove"}]') AND 
       NOT (COALESCE(OLD.badges, '[]'::jsonb) @> '[{"badge_type": "speed_dove"}]') THEN
        
        -- Get the Shop Name for the message
        SELECT business_name INTO v_business_name FROM public.vendors WHERE id = NEW.seller_id;

        -- Insert into the 2030 Notification Queue
        INSERT INTO public.Badge_2030_notification_queue (
            seller_id,
            notification_type,
            title,
            message,
            data,
            priority,
            scheduled_for
        ) VALUES (
            NEW.seller_id,
            'badge_earned',
            '🕊️ New Badge: Speed Dove!',
            'Congratulations ' || v_business_name || '! You have been awarded the Speed Dove badge for your exceptional delivery speed.',
            jsonb_build_object(
                'badge_type', 'speed_dove',
                'achievement_category', 'delivery',
                'points_awarded', 25
            ),
            10, -- High priority
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the Trigger for badge notifications
DROP TRIGGER IF EXISTS trg_badge_earned_notification ON public.badge_2030_seller_badges;
CREATE TRIGGER trg_badge_earned_notification
    AFTER UPDATE ON public.badge_2030_seller_badges
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_badge_earned_notification();
