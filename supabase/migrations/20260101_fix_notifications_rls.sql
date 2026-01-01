-- Enable RLS on notifications_queue
ALTER TABLE public.notifications_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can only see their own notification queue" ON public.notifications_queue;

-- Add policy to allow users to ONLY see (subscribe to) their own notifications
-- This is crucial for fixing the broadcast issue where everyone sees everyone's alerts
CREATE POLICY "Users can only see their own notification queue"
ON public.notifications_queue
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Also allow the service_role (edge functions) to insert and manage the queue
-- Actually, triggers usually run as definer (postgres), so they aren't affected by RLS.
-- But if we ever insert from the client, we need an insert policy.
-- For now, let's just ensure admins/triggers can work.
-- If the functions that insert are 'SECURITY DEFINER', they bypass RLS anyway.
