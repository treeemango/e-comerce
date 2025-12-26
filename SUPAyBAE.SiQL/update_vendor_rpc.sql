DROP FUNCTION IF EXISTS public.get_vendor_card_info(text[]);

CREATE OR REPLACE FUNCTION public.get_vendor_card_info(product_ids text[])
 RETURNS TABLE(vendor_id uuid, user_id uuid, seller_id uuid, business_name text, business_description text, join_date timestamp with time zone, vendor_rating numeric, review_count integer, total_products integer, completed_orders bigint, delivery_speed text, order_completion_rate numeric, badges jsonb, is_verified boolean, business_country text, cancellation_rate numeric, response_time text, seller_since timestamp with time zone, logo_url text)
 LANGUAGE sql
AS $function$
    SELECT DISTINCT ON (v.id)
        v.id as vendor_id,
        v.user_id,
        p.seller_id,
        v.business_name,
        v.business_description,
        v.created_at as join_date,
        COALESCE(v.rating, 0) as vendor_rating,
        COALESCE(v.review_count, 0) as review_count,
        COUNT(DISTINCT p2.id) as total_products,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as completed_orders,
        CASE 
            WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 20 THEN 'Fast & Reliable'
            WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 10 THEN 'Standard Delivery'
            WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 1 THEN 'New Seller'
            ELSE 'Just Joined'
        END as delivery_speed,
        ROUND((COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') * 100.0 / 
            NULLIF(COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('delivered', 'cancelled')), 0))::numeric, 2) as order_completion_rate,
        COALESCE(sb.badges, '[]'::jsonb) as badges,
        COALESCE(v.verification_status = 'approved', false) as is_verified,
        COALESCE(v.address_country, 'Kenya') as business_country,
        ROUND((COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'cancelled') * 100.0 / 
            NULLIF(COUNT(DISTINCT o.id), 0))::numeric, 2) as cancellation_rate,
        CASE
            WHEN v.created_at > NOW() - INTERVAL '30 days' THEN 'New'
            WHEN AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600) < 24 THEN '< 24 hours'
            WHEN AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600) < 48 THEN '< 48 hours'
            ELSE '> 48 hours'
        END as response_time,
        v.created_at as seller_since,
        v.logo_url
    FROM products p
    INNER JOIN vendors v ON v.user_id = p.seller_id
    LEFT JOIN products p2 ON p2.seller_id = v.user_id AND p2.status = 'approved'
    LEFT JOIN order_items oi ON oi.product_id = p2.id
    LEFT JOIN orders o ON o.id = oi.order_id
    LEFT JOIN badge_2030_seller_badges sb ON sb.seller_id = v.user_id
    WHERE p.id::text = ANY(product_ids)
        AND COALESCE(v.is_active, true) = true
    GROUP BY v.id, v.user_id, p.seller_id, v.business_name, v.business_description, 
             v.created_at, v.rating, v.review_count, v.verification_status, 
             v.address_country, sb.badges, v.logo_url
    ORDER BY v.id;
$function$;
