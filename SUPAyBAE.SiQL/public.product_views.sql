CREATE TABLE IF NOT EXISTS public.product_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevents multiple exact entries, although we rely more on the index for querying
    UNIQUE(user_id, product_id, viewed_at)
);

-- Index for fast lookups by user and recency
CREATE INDEX idx_product_views_user_viewed_at ON public.product_views (user_id, viewed_at DESC);

-- Enable RLS and create a policy
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Policy to allow the user to record their own activity
CREATE POLICY "Users can insert their own views" ON public.product_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow the user to retrieve their own activity (for the "Recent Views" feature)
CREATE POLICY "Users can only select their own views" ON public.product_views
    FOR SELECT USING (auth.uid() = user_id);