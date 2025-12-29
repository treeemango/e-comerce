-- Creates a per-user conversation sidebar view that returns exactly the "other" participant
-- for each conversation, with a safe display name fallback.

CREATE OR REPLACE VIEW public.view_chat_participants AS
SELECT 
    c.id AS conversation_id,
    c.last_message,
    c.updated_at,
    COALESCE(
        NULLIF(TRIM(v.business_name), ''),
        NULLIF(TRIM(u.full_name), ''),
        'User ' || LEFT(u.id::text, 5)
    ) AS participant_name,
    u.id AS participant_id,
    u.avatar_url
FROM public.conversations c
JOIN public.users u ON (u.id = c.seller_id OR u.id = c.buyer_id)
-- Vendors table uses user_id/seller_id as the FK to users (not vendors.id)
LEFT JOIN public.vendors v ON v.user_id = u.id
WHERE u.id != auth.uid();
