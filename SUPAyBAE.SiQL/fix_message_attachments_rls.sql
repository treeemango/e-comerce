-- Fix message attachments RLS policy to use auth.uid() instead of public.get_auth_uid()
-- This allows attachment uploads to work in realtime subscription context

-- Drop and recreate the INSERT policy for message_attachments
DROP POLICY IF EXISTS message_attachments_insert_policy ON public.message_attachments;

CREATE POLICY message_attachments_insert_policy ON public.message_attachments FOR INSERT
    WITH CHECK (
        public.is_admin_user(auth.uid())
        OR EXISTS (
            SELECT 1
            FROM public.messages m
            WHERE m.id = message_id
                AND (
                    m.sender_id = auth.uid()
                    OR m.receiver_id = auth.uid()
                    OR EXISTS (
                        SELECT 1
                        FROM public.conversation_support_participants csp
                        WHERE csp.conversation_id = m.conversation_id
                            AND csp.admin_id = auth.uid()
                    )
                )
        )
    );

-- Also fix the SELECT policy to be consistent
DROP POLICY IF EXISTS message_attachments_select_policy ON public.message_attachments;

CREATE POLICY message_attachments_select_policy
    ON public.message_attachments FOR SELECT
    USING (
        public.is_admin_user(auth.uid())
        OR EXISTS (
            SELECT 1
            FROM public.messages m
            WHERE m.id = message_id
                AND (
                    m.sender_id = auth.uid()
                    OR m.receiver_id = auth.uid()
                    OR EXISTS (
                        SELECT 1
                        FROM public.conversation_support_participants csp
                        WHERE csp.conversation_id = m.conversation_id
                            AND csp.admin_id = auth.uid()
                    )
                )
        )
    );

-- And the DELETE policy
DROP POLICY IF EXISTS message_attachments_delete_policy ON public.message_attachments;

CREATE POLICY message_attachments_delete_policy ON public.message_attachments FOR DELETE
    USING (
        public.is_admin_user(auth.uid())
        OR EXISTS (
            SELECT 1
            FROM public.messages m
            WHERE m.id = message_id
                AND (
                    m.sender_id = auth.uid()
                    OR m.receiver_id = auth.uid()
                    OR EXISTS (
                        SELECT 1
                        FROM public.conversation_support_participants csp
                        WHERE csp.conversation_id = m.conversation_id
                            AND csp.admin_id = auth.uid()
                    )
                )
        )
    );
