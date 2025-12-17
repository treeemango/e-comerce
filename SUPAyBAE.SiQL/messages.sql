-- Migration: Complete E-commerce Messaging System Implementation
-- FINAL VERSION (Guaranteed Dependency Order Fix)

---
-- ---------------------------------------------------------------------------
-- 1. EXTENSIONS (create in public schema)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public;

---
---
-- ---------------------------------------------------------------------------
-- 6A. CRITICAL DEPENDENCY CLEANUP (Must execute before Section 5)
-- ---------------------------------------------------------------------------

-- 🔥 CRITICAL FIX: Use CASCADE to drop all policies that depend on is_admin_user
DROP POLICY IF EXISTS conversation_members_select_policy ON public.conversations CASCADE;
DROP POLICY IF EXISTS conversation_members_select_messages ON public.messages CASCADE;
DROP POLICY IF EXISTS support_admins_manage_participants ON public.conversation_support_participants CASCADE;
DROP POLICY IF EXISTS user_blocks_all_access ON public.user_blocks CASCADE;
DROP POLICY IF EXISTS message_attachments_select_policy ON public.message_attachments CASCADE;
DROP POLICY IF EXISTS message_attachments_insert_policy ON public.message_attachments CASCADE;
DROP POLICY IF EXISTS message_attachments_delete_policy ON public.message_attachments CASCADE;

-- 🔥 Explicitly drop the policy named in the error detail, if it exists:
DROP POLICY IF EXISTS admin_messages_select_policy ON public.messages;

---
---
-- ---------------------------------------------------------------------------
-- 2. DDL: SCHEMA SETUP AND COLUMN CORRECTIONS
-- ---------------------------------------------------------------------------

-- Corrective DDL for Missing User Profile Columns (Referenced by views)
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS business_name TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS business_address TEXT;

-- Drop the incorrect 'images' array column from products if a prior failed run added it
ALTER TABLE public.products
    DROP COLUMN IF EXISTS images;

-- FIX: Add required columns to the public.orders table for the views to function.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS order_number TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2) DEFAULT 0.00;


-- Normalized Media Tables (Required for corrected view logic)
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_path TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_media_link (
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (product_id, media_id)
);

-- CONVERSATIONS TABLE (reference public.users instead of auth.users)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    subject TEXT,
    last_message TEXT,
    last_message_sender UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    seller_deleted BOOLEAN DEFAULT false,
    buyer_deleted BOOLEAN DEFAULT false,
    UNIQUE(seller_id, buyer_id, product_id, order_id)
);

-- MESSAGES TABLE ALTERATIONS
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS conversation_id UUID,
    ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS sender_deleted BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS receiver_deleted BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

-- DEPENDENT MESSAGING TABLES
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_support_participants (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, admin_id)
);

CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (blocker_id, blocked_id)
);

---

-- ---------------------------------------------------------------------------
-- 3. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_product_id ON public.conversations(product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_order_id ON public.conversations(order_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read_status ON public.messages(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_is_internal ON public.messages(is_internal) WHERE is_internal = TRUE;

CREATE INDEX IF NOT EXISTS idx_conversation_support_participants_admin ON public.conversation_support_participants(admin_id);
CREATE INDEX IF NOT EXISTS idx_conversation_support_participants_conversation ON public.conversation_support_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_messages_full_text ON public.messages USING GIN (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_conversations_search_text ON public.conversations USING GIN (to_tsvector('english', subject || ' ' || last_message));

CREATE INDEX IF NOT EXISTS idx_product_media_link_product ON public.product_media_link(product_id);

---

-- ---------------------------------------------------------------------------
-- 4. ATOMIC BACKFILL & FOREIGN KEY CONSTRAINT (RE-RUNNABLE BLOCK)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    -- 1. DROP the foreign key constraint first (to allow data cleaning)
    ALTER TABLE public.messages
        DROP CONSTRAINT IF EXISTS fk_messages_conversation;

    -- 2. Clean up any invalid conversation_ids remaining from failed backfills.
    UPDATE public.messages m
    SET conversation_id = NULL
    WHERE m.conversation_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.conversations c WHERE c.id = m.conversation_id
      );

    -- 3. Backfill: Insert conversations for existing, unlinked messages (Parent Records)
    INSERT INTO public.conversations (seller_id, buyer_id, last_message, updated_at, created_at)
    SELECT
        CASE WHEN sender_id IN (SELECT user_id FROM public.vendors) THEN sender_id ELSE receiver_id END as seller_id,
        CASE WHEN sender_id IN (SELECT user_id FROM public.vendors) THEN receiver_id ELSE sender_id END as buyer_id,
        content as last_message,
        created_at as updated_at,
        created_at
    FROM public.messages
    WHERE conversation_id IS NULL
    AND (sender_id IN (SELECT user_id FROM public.vendors) OR receiver_id IN (SELECT user_id FROM public.vendors))
    ON CONFLICT (seller_id, buyer_id, product_id, order_id) DO NOTHING;

    -- 4. Backfill: Link existing messages to the newly created/existing conversations (Child Records)
    UPDATE public.messages
    SET conversation_id = sub.c_id
    FROM (
        SELECT m.id AS msg_id, c.id AS c_id
        FROM public.messages m
        JOIN public.conversations c ON c.seller_id = (
            CASE WHEN m.sender_id IN (SELECT user_id FROM public.vendors) THEN m.sender_id ELSE m.receiver_id END
        )
        AND c.buyer_id = (
            CASE WHEN m.sender_id IN (SELECT user_id FROM public.vendors) THEN m.receiver_id ELSE m.sender_id END
        )
        WHERE m.conversation_id IS NULL
        ORDER BY m.created_at DESC
    ) AS sub
    WHERE public.messages.id = sub.msg_id
    AND public.messages.conversation_id IS NULL;

    -- 5. Re-add the Foreign Key constraint
    ALTER TABLE public.messages
        ADD CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES public.conversations(id)
        ON DELETE CASCADE;
END $$;

---
---
-- ---------------------------------------------------------------------------
-- 5. FUNCTIONS (TRIGGERS, CORE LOGIC)
-- ---------------------------------------------------------------------------

-- Wrapper to read JWT claims safely (created in public schema)
CREATE OR REPLACE FUNCTION public.get_auth_uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', TRUE), ''),
    NULLIF(current_setting('request.jwt.claim.user_id', TRUE), '')
  )::uuid;
$$;

-- FIX: Drop function explicitly (Dependencies cleared in Section 6A)
DROP FUNCTION IF EXISTS public.is_admin_user(UUID);

-- Placeholder for is_admin_user (Crucial for RLS/Security, assume exists or create stub)
CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
    SELECT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND role = 'admin');
$$;


-- Trigger function for public.conversations updated_at column
CREATE OR REPLACE FUNCTION public.set_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation's 'updated_at' when a new message arrives
CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET
        updated_at = NEW.created_at,
        last_message = NEW.content,
        last_message_sender = NEW.sender_id
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply message trigger
DROP TRIGGER IF EXISTS trg_update_conversation_on_new_message ON public.messages;
CREATE TRIGGER trg_update_conversation_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_on_new_message();

-- 1. Create Conversation
CREATE OR REPLACE FUNCTION public.create_conversation(
    p_seller_id UUID, p_buyer_id UUID, p_product_id UUID DEFAULT NULL, p_order_id UUID DEFAULT NULL, p_subject TEXT DEFAULT NULL, p_initial_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE conversation_uuid UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM public.user_blocks WHERE (blocker_id = p_buyer_id AND blocked_id = p_seller_id) OR (blocker_id = p_seller_id AND blocked_id = p_buyer_id)) THEN
        RAISE EXCEPTION 'Conversation blocked due to user settings.';
    END IF;

    SELECT id INTO conversation_uuid FROM public.conversations
    WHERE seller_id = p_seller_id AND buyer_id = p_buyer_id AND product_id IS NOT DISTINCT FROM p_product_id AND order_id IS NOT DISTINCT FROM p_order_id LIMIT 1;

    IF conversation_uuid IS NOT NULL THEN RETURN conversation_uuid; END IF;

    INSERT INTO public.conversations (seller_id, buyer_id, product_id, order_id, subject, last_message, last_message_sender, updated_at)
    VALUES (p_seller_id, p_buyer_id, p_product_id, p_order_id, p_subject, p_buyer_id::text, p_buyer_id, NOW())
    RETURNING id INTO conversation_uuid;

    IF p_initial_message IS NOT NULL THEN
        INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content)
        VALUES (conversation_uuid, p_buyer_id, p_seller_id, p_initial_message);
    END IF;

    RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Send Message
CREATE OR REPLACE FUNCTION public.send_message_and_update_conversation(
    p_conversation_id UUID, p_sender_id UUID, p_receiver_id UUID, p_content TEXT
) RETURNS void AS $$
DECLARE message_uuid UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM public.user_blocks WHERE blocker_id = p_receiver_id AND blocked_id = p_sender_id) THEN
        RAISE EXCEPTION 'Cannot send message. You have been blocked by the recipient.';
    END IF;

    INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content)
    VALUES (p_conversation_id, p_sender_id, p_receiver_id, p_content)
    RETURNING id INTO message_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Send Internal Admin Message
CREATE OR REPLACE FUNCTION public.send_internal_admin_note(
    p_conversation_id UUID, p_admin_id UUID, p_content TEXT
) RETURNS void AS $$
DECLARE target_receiver UUID;
BEGIN
    IF NOT public.is_admin_user(p_admin_id) THEN RAISE EXCEPTION 'Permission denied. Only admins can send internal notes.'; END IF;

    SELECT admin_id INTO target_receiver FROM public.conversation_support_participants
    WHERE conversation_id = p_conversation_id AND is_primary = TRUE LIMIT 1;
    target_receiver := COALESCE(target_receiver, p_admin_id);

    INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content, is_internal)
    VALUES (p_conversation_id, p_admin_id, target_receiver, p_content, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get Conversation Messages
DROP FUNCTION IF EXISTS public.get_conversation_messages(UUID, UUID, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_conversation_messages(
    p_conversation_id UUID, p_requester_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID, conversation_id UUID, sender_id UUID, receiver_id UUID, content TEXT, message_type TEXT, metadata JSONB,
    is_read BOOLEAN, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ, sender_deleted BOOLEAN, receiver_deleted BOOLEAN,
    is_internal BOOLEAN, attachments JSONB
) AS $$
DECLARE requester_uuid UUID; is_admin_req BOOLEAN;
BEGIN
    requester_uuid := COALESCE(public.get_auth_uid(), p_requester_id);
    is_admin_req := public.is_admin_user(requester_uuid);

    RETURN QUERY
    SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.content, m.message_type, m.metadata,
        m.is_read, m.read_at, m.created_at, m.sender_deleted, m.receiver_deleted, m.is_internal,
        COALESCE((
            SELECT jsonb_agg(jsonb_build_object( 'id', ma.id, 'file_name', ma.file_name, 'storage_path', ma.storage_path,
                                                'file_type', ma.file_type, 'file_size', ma.file_size, 'created_at', ma.created_at)
                             ORDER BY ma.created_at)
            FROM public.message_attachments ma WHERE ma.message_id = m.id
        ), '[]'::jsonb) AS attachments
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND (NOT m.is_internal OR is_admin_req OR EXISTS (SELECT 1 FROM public.conversation_support_participants csp WHERE csp.conversation_id = p_conversation_id AND csp.admin_id = requester_uuid))
    ORDER BY m.created_at ASC
    OFFSET GREATEST(COALESCE(p_offset, 0), 0) LIMIT CASE WHEN p_limit IS NULL OR p_limit < 1 THEN 50 ELSE p_limit END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Utility Functions
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id UUID, p_user_id UUID) RETURNS void AS $$
BEGIN
    UPDATE public.messages SET is_read = true, read_at = NOW() WHERE conversation_id = p_conversation_id AND receiver_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id UUID) RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.messages WHERE receiver_id = p_user_id AND is_read = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.assign_admin_to_conversation(p_conversation_id UUID, p_admin_id UUID, p_is_primary BOOLEAN DEFAULT FALSE) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.conversation_support_participants (conversation_id, admin_id, is_primary) VALUES (p_conversation_id, p_admin_id, COALESCE(p_is_primary, FALSE))
    ON CONFLICT (conversation_id, admin_id) DO UPDATE SET is_primary = EXCLUDED.is_primary, updated_at = NOW();

    IF COALESCE(p_is_primary, FALSE) THEN
        UPDATE public.conversation_support_participants SET is_primary = FALSE, updated_at = NOW() WHERE conversation_id = p_conversation_id AND admin_id <> p_admin_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---
---

-- ---------------------------------------------------------------------------
-- 6B. RLS POLICIES (Re-Creation)
-- ---------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_support_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6A.1 EXPLICIT FOREIGN KEYS (Fix for PostgREST detection)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    -- Seller FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_conversations_seller') THEN
        ALTER TABLE public.conversations
            ADD CONSTRAINT fk_conversations_seller
            FOREIGN KEY (seller_id)
            REFERENCES public.users(id)
            ON DELETE CASCADE;
    END IF;

    -- Buyer FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_conversations_buyer') THEN
        ALTER TABLE public.conversations
            ADD CONSTRAINT fk_conversations_buyer
            FOREIGN KEY (buyer_id)
            REFERENCES public.users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- Conversations RLS (Re-creation)
CREATE POLICY conversation_members_select_policy
    ON public.conversations FOR SELECT
    USING (
        (public.get_auth_uid() = seller_id OR public.get_auth_uid() = buyer_id)
        OR EXISTS (
            SELECT 1 FROM public.conversation_support_participants csp
            WHERE csp.conversation_id = public.conversations.id AND csp.admin_id = public.get_auth_uid()
        )
        OR public.is_admin_user(public.get_auth_uid())
    );

-- Messages RLS (Re-creation)
CREATE POLICY conversation_members_select_messages
    ON public.messages FOR SELECT
    USING (
        public.get_auth_uid() IN (SELECT c.buyer_id FROM public.conversations c WHERE c.id = conversation_id)
        OR public.get_auth_uid() IN (SELECT c.seller_id FROM public.conversations c WHERE c.id = conversation_id)
        OR EXISTS (
            SELECT 1 FROM public.conversation_support_participants csp
            WHERE csp.conversation_id = conversation_id AND csp.admin_id = public.get_auth_uid()
        )
        OR public.is_admin_user(public.get_auth_uid())
    );

-- Support Participants RLS (Re-creation)
CREATE POLICY support_admins_manage_participants
    ON public.conversation_support_participants FOR ALL
    USING (public.is_admin_user(public.get_auth_uid()))
    WITH CHECK (public.is_admin_user(public.get_auth_uid()));

-- User Blocks RLS (Re-creation)
CREATE POLICY user_blocks_all_access
    ON public.user_blocks FOR ALL
    USING (blocker_id = public.get_auth_uid() OR public.is_admin_user(public.get_auth_uid()))
    WITH CHECK (blocker_id = public.get_auth_uid());

-- Attachments RLS (Re-creation)
CREATE POLICY message_attachments_select_policy
    ON public.message_attachments FOR SELECT
    USING (
        public.is_admin_user(public.get_auth_uid())
        OR EXISTS (
            SELECT 1 FROM public.messages m WHERE m.id = message_id
              AND (m.sender_id = public.get_auth_uid() OR m.receiver_id = public.get_auth_uid())
              OR EXISTS (
                  SELECT 1 FROM public.conversations c JOIN public.conversation_support_participants csp ON csp.conversation_id = c.id
                  WHERE c.id = m.conversation_id AND csp.admin_id = public.get_auth_uid()
              )
        )
    );

CREATE POLICY message_attachments_insert_policy ON public.message_attachments FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND (m.sender_id = public.get_auth_uid() OR m.receiver_id = public.get_auth_uid())));

CREATE POLICY message_attachments_delete_policy ON public.message_attachments FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND (m.sender_id = public.get_auth_uid() OR m.receiver_id = public.get_auth_uid())));

---

-- ---------------------------------------------------------------------------
-- 7. VIEWS (Must be created before dependent functions)
-- ---------------------------------------------------------------------------

-- Seller Conversation Overview View
DROP VIEW IF EXISTS public.seller_conversation_overview;
CREATE VIEW public.seller_conversation_overview AS
SELECT
    c.id, c.seller_id, c.buyer_id, c.product_id, c.order_id, c.subject, c.last_message, c.last_message_sender, c.updated_at, c.created_at, c.is_active, c.seller_deleted, c.buyer_deleted,
    COALESCE(buyer_profile.business_name, buyer_profile.full_name, buyer_profile.email) AS buyer_display_name, buyer_profile.full_name AS buyer_full_name, buyer_profile.business_name AS buyer_business_name, buyer_profile.email AS buyer_email, buyer_profile.phone AS buyer_phone, buyer_profile.avatar_url AS buyer_avatar_url, buyer_profile.business_address AS buyer_business_address,
    COALESCE(vendor_data.shop_name, seller_profile.business_name, seller_profile.full_name, seller_profile.email) AS seller_display_name, seller_profile.full_name AS seller_full_name, seller_profile.business_name AS seller_business_name, seller_profile.avatar_url AS seller_avatar_url, seller_profile.phone AS seller_phone, seller_profile.business_address AS seller_business_address,
    p.title AS product_title, p.price AS product_price,
    primary_image.storage_path AS product_primary_image,
    o.order_number, o.status AS order_status, o.total_price AS order_total,
    unread.unread_count, last_message_meta.last_message_at, last_message_meta.last_sender_id, last_message_meta.last_sender_name
FROM public.conversations c
LEFT JOIN public.users buyer_profile ON buyer_profile.id = c.buyer_id
LEFT JOIN public.users seller_profile ON seller_profile.id = c.seller_id
LEFT JOIN public.vendors vendor_data ON vendor_data.user_id = c.seller_id
LEFT JOIN public.products p ON p.id = c.product_id
LEFT JOIN public.orders o ON o.id = c.order_id
LEFT JOIN LATERAL (
    SELECT m.storage_path
    FROM public.product_media_link pml
    JOIN public.media m ON m.id = pml.media_id
    WHERE pml.product_id = p.id
    ORDER BY pml.is_primary DESC, pml.sort_order ASC
    LIMIT 1
) primary_image ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*) AS unread_count FROM public.messages m WHERE m.conversation_id = c.id AND m.receiver_id = c.seller_id AND m.is_read = false AND m.is_internal = FALSE) unread ON TRUE
LEFT JOIN LATERAL (SELECT m.created_at AS last_message_at, m.sender_id AS last_sender_id, COALESCE(sp.business_name, sp.full_name, sp.email) AS last_sender_name FROM public.messages m LEFT JOIN public.users sp ON sp.id = m.sender_id WHERE m.conversation_id = c.id AND m.is_internal = FALSE ORDER BY m.created_at DESC LIMIT 1) last_message_meta ON TRUE;


-- Admin Conversation Overview View
DROP VIEW IF EXISTS public.admin_conversation_overview;
CREATE VIEW public.admin_conversation_overview AS
SELECT
    c.id, c.seller_id, c.buyer_id, c.product_id, c.order_id, c.subject, c.last_message, c.last_message_sender, c.updated_at, c.created_at, c.is_active, c.seller_deleted, c.buyer_deleted,
    buyer_profile.full_name AS buyer_full_name, buyer_profile.business_name AS buyer_business_name, buyer_profile.email AS buyer_email, buyer_profile.phone AS buyer_phone, buyer_profile.avatar_url AS buyer_avatar_url, buyer_profile.business_address AS buyer_business_address,
    seller_profile.full_name AS seller_full_name, seller_profile.business_name AS seller_business_name, COALESCE(vendor_data.shop_name, seller_profile.business_name, seller_profile.full_name, seller_profile.email) AS seller_display_name, seller_profile.email AS seller_email, seller_profile.phone AS seller_phone, seller_profile.business_address AS seller_business_address,
    p.title AS product_title, p.price AS product_price,
    primary_image.storage_path AS product_primary_image,
    o.order_number, o.status AS order_status, o.total_price AS order_total,
    unread_for_buyer.unread_count AS buyer_unread_count, unread_for_seller.unread_count AS seller_unread_count,
    last_message_meta.last_message_at, last_message_meta.last_sender_id, last_message_meta.last_sender_name,
    CASE WHEN last_message_meta.last_sender_id = c.seller_id THEN 'seller' WHEN last_message_meta.last_sender_id = c.buyer_id THEN 'buyer' ELSE 'admin' END AS last_sender_role,
    CONCAT_WS(' ', c.subject, o.order_number, buyer_profile.full_name, buyer_profile.business_name, buyer_profile.email, seller_profile.full_name, seller_profile.business_name, seller_profile.email, COALESCE(vendor_data.shop_name, ''), p.title, c.last_message) AS search_text
FROM public.conversations c
LEFT JOIN public.users buyer_profile ON buyer_profile.id = c.buyer_id
LEFT JOIN public.users seller_profile ON seller_profile.id = c.seller_id
LEFT JOIN public.vendors vendor_data ON vendor_data.user_id = c.seller_id
LEFT JOIN public.products p ON p.id = c.product_id
LEFT JOIN public.orders o ON o.id = c.order_id
LEFT JOIN LATERAL (
    SELECT m.storage_path
    FROM public.product_media_link pml
    JOIN public.media m ON m.id = pml.media_id
    WHERE pml.product_id = p.id
    ORDER BY pml.is_primary DESC, pml.sort_order ASC
    LIMIT 1
) primary_image ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*) AS unread_count FROM public.messages m WHERE m.conversation_id = c.id AND m.receiver_id = c.buyer_id AND m.is_read = false AND m.is_internal = FALSE) unread_for_buyer ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*) AS unread_count FROM public.messages m WHERE m.conversation_id = c.id AND m.receiver_id = c.seller_id AND m.is_read = false AND m.is_internal = FALSE) unread_for_seller ON TRUE
LEFT JOIN LATERAL (SELECT m.created_at AS last_message_at, m.sender_id AS last_sender_id, COALESCE(sp.business_name, sp.full_name, sp.email) AS last_sender_name FROM public.messages m LEFT JOIN public.users sp ON sp.id = m.sender_id WHERE m.conversation_id = c.id AND m.is_internal = FALSE ORDER BY m.created_at DESC LIMIT 1) last_message_meta ON TRUE;

---

-- ---------------------------------------------------------------------------
-- 8. GRANTS & FUNCTIONS DEPENDENT ON VIEWS (Must be defined AFTER views)
-- ---------------------------------------------------------------------------

-- 8.1 GRANTS for Views
GRANT SELECT ON public.seller_conversation_overview TO authenticated;
GRANT SELECT ON public.admin_conversation_overview TO authenticated;

-- 8.2 DROP existing dependent functions (to allow clean re-creation)
DROP FUNCTION IF EXISTS public.get_seller_conversations_overview(UUID);
DROP FUNCTION IF EXISTS public.get_admin_conversations_overview(TEXT, INTEGER, INTEGER);


-- 8.3 GRANTS for core messaging functions (re-run grants for completeness)
GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_conversation(UUID, UUID, UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_message_and_update_conversation(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_internal_admin_note(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_admin_to_conversation(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(UUID, UUID, INTEGER, INTEGER) TO authenticated;

-- New generic function for both buyers and sellers
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id UUID) RETURNS SETOF public.admin_conversation_overview AS $$
    SELECT * FROM public.admin_conversation_overview 
    WHERE seller_id = p_user_id OR buyer_id = p_user_id
    ORDER BY COALESCE(last_message_at, updated_at) DESC, created_at DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_user_conversations(UUID) TO authenticated;


-- 8.4 Re-create functions that depend on the views

CREATE OR REPLACE FUNCTION public.get_seller_conversations_overview(p_seller_id UUID) RETURNS SETOF public.seller_conversation_overview AS $$
    SELECT * FROM public.seller_conversation_overview WHERE seller_id = p_seller_id ORDER BY COALESCE(last_message_at, updated_at) DESC, created_at DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_seller_conversations_overview(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_conversations_overview(p_search TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0) RETURNS SETOF public.admin_conversation_overview AS $$
    SELECT * FROM public.admin_conversation_overview WHERE p_search IS NULL OR search_text ILIKE '%' || p_search || '%' ORDER BY COALESCE(last_message_at, updated_at, created_at) DESC OFFSET GREATEST(p_offset, 0) LIMIT CASE WHEN p_limit IS NULL OR p_limit < 1 THEN 50 ELSE p_limit END;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_admin_conversations_overview(TEXT, INTEGER, INTEGER) TO authenticated;