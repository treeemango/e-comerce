-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    device_info TEXT, -- 'web', 'mobile', or detailed user agent
    status TEXT DEFAULT 'unread', -- 'unread', 'read', 'archived'
    page_url TEXT, -- Where the feedback was sent from
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin can view all
CREATE POLICY "Admins can view all feedback" ON public.feedback
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_permissions
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Admin can update status
CREATE POLICY "Admins can update feedback" ON public.feedback
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_permissions
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Anyone can insert (authenticated or anon if we want anon feedback)
-- For now, let's allow authenticated users.
CREATE POLICY "Users can submit feedback" ON public.feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Depending on requirements, we might want anon feedback.
-- If user is null, we can allow it.
CREATE POLICY "Anon feedback insert" ON public.feedback
    FOR INSERT
    WITH CHECK (user_id IS NULL);
