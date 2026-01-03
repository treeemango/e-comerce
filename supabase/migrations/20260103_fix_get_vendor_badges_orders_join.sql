-- Fix get_vendor_badges to match current orders schema
-- Orders are linked to vendors via order_items.business_id -> vendors.id
-- Delivery timestamp is derived from order_tracking_events (event_type = 'delivered')

CREATE OR REPLACE FUNCTION public.get_vendor_badges(p_vendor_id UUID)
RETURNS JSONB AS $$
DECLARE
    vendor_data RECORD;
    badges_array JSONB := '[]'::jsonb;
    current_timestamp TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    WITH vendor_orders AS (
        SELECT
            oi.business_id AS vendor_id,
            o.id AS order_id,
            o.created_at,
            COALESCE(o.total_amount, o.total_price, o.total, 0) AS total_amount,
            o.status,
            (
                SELECT ote.created_at
                FROM public.order_tracking_events ote
                WHERE ote.order_id = o.id
                  AND ote.event_type = 'delivered'
                ORDER BY ote.created_at DESC
                LIMIT 1
            ) AS delivered_at
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.business_id IS NOT NULL
        GROUP BY
            oi.business_id,
            o.id,
            o.created_at,
            o.total_amount,
            o.total_price,
            o.total,
            o.status
    )
    SELECT
        v.id,
        v.user_id,
        COALESCE(v.rating, 0) AS shipping_rating,
        EXISTS (
            SELECT 1
            FROM public.products p
            WHERE p.seller_id = v.user_id
              AND p.free_delivery = true
              AND p.status IN ('approved', 'published')
            LIMIT 1
        ) AS offers_free_delivery,
        v.created_at,
        -- Calculate activity metrics
        COUNT(
            CASE
                WHEN (vo.status = 'delivered' OR vo.delivered_at IS NOT NULL)
                 AND vo.created_at >= current_timestamp - INTERVAL '6 months'
                THEN 1
            END
        ) AS orders_last_6_months,
        COUNT(
            CASE
                WHEN (vo.status = 'delivered' OR vo.delivered_at IS NOT NULL)
                 AND vo.created_at >= current_timestamp - INTERVAL '3 months'
                THEN 1
            END
        ) AS orders_last_3_months,
        AVG(
            CASE
                WHEN vo.delivered_at IS NOT NULL
                THEN EXTRACT(EPOCH FROM (vo.delivered_at - vo.created_at)) / 86400
            END
        ) AS avg_delivery_days,
        COALESCE(
            SUM(
                CASE
                    WHEN (vo.status = 'delivered' OR vo.delivered_at IS NOT NULL)
                     AND vo.created_at >= current_timestamp - INTERVAL '6 months'
                    THEN vo.total_amount
                    ELSE 0
                END
            ),
            0
        ) AS total_value_shipped_6_months
    INTO vendor_data
    FROM public.vendors v
    LEFT JOIN vendor_orders vo ON vo.vendor_id = v.id
    WHERE v.id = p_vendor_id
    GROUP BY v.id, v.user_id, v.rating, v.created_at;

    IF vendor_data.id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Speed Dove
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

    -- Trusted Shipper
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

    -- New Seller (joined within 30 days)
    IF vendor_data.created_at >= current_timestamp - INTERVAL '30 days' THEN
        badges_array := badges_array || jsonb_build_array(jsonb_build_object(
            'badge_type', 'new_seller',
            'badge_name', 'New Seller',
            'badge_tier', 1,
            'earned_at', current_timestamp
        ));
    END IF;

    -- Free Delivery
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
