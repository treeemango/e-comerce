CREATE OR REPLACE VIEW public.admin_conversation_overview AS
SELECT 
    c.id,
    c.seller_id,
    c.buyer_id,
    c.last_message,
    c.updated_at AS last_message_at,
    -- Default unread counts to 0 for now
    0 AS buyer_unread_count, 
    0 AS seller_unread_count,
    -- User Names (Robust handling with fallbacks to name and email)
    COALESCE(
        NULLIF(TRIM(u_buyer.full_name), ''), 
        NULLIF(TRIM(u_buyer.name), ''), 
        NULLIF(TRIM(u_buyer.email), ''), 
        'User ' || LEFT(u_buyer.id::text, 5)
    ) AS buyer_full_name,
    COALESCE(
        NULLIF(TRIM(v.business_name), ''),
        NULLIF(TRIM(v.shop_name), ''),
        NULLIF(TRIM(u_seller.full_name), ''),
        NULLIF(TRIM(u_seller.name), ''), 
        NULLIF(TRIM(u_seller.email), ''), 
        'Seller ' || LEFT(u_seller.id::text, 5)
    ) AS seller_display_name,
    -- Avatars
    u_buyer.avatar_url AS buyer_avatar_url,
    v.logo_url AS seller_avatar_url,
    -- Product Context (using .title instead of .name)
    p.title AS product_title
FROM public.conversations c
JOIN public.users u_buyer ON c.buyer_id = u_buyer.id
JOIN public.users u_seller ON c.seller_id = u_seller.id
LEFT JOIN public.vendors v ON v.user_id = u_seller.id
LEFT JOIN public.products p ON c.product_id = p.id;

-- Grant permissions for frontend access
GRANT SELECT ON public.admin_conversation_overview TO authenticated;
GRANT SELECT ON public.admin_conversation_overview TO anon;
