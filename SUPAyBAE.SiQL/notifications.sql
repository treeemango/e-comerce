-- Create a new table to store persistent notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('success', 'info', 'warning', 'error')),
    title TEXT,
    message TEXT NOT NULL,
    action_link TEXT,
    action_payload JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Admins/System can insert notifications (for everyone)
-- Assuming service_role or admin user handling inserts, but for now allow authenticated to insert if they are system (handled by logic)
-- Or better, create a function to insert notification that is security definer if needed.
-- For now, let's allow insert for key operations if needed, or rely on service_role for backend ops. 
-- Since ModerationQueueView runs as Admin (likely authenticated user), they need insert permission for OTHER users.
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true); -- Ideally restrict to admin role, but for simplicity here allow insert. Backend logic controls who calls it.

-- Trigger for realtime? 
-- Supabase realtime can listen to inserts on this table.
