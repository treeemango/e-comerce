-- Create the user_product_views table
CREATE TABLE IF NOT EXISTS public.user_product_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Can be null for anonymous users
    product_id BIGINT NOT NULL, -- Assuming product_id is BIGINT based on other files, check if it should be UUID
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_product_views ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anyone to insert views (including anonymous)
CREATE POLICY "Anyone can insert views" 
ON public.user_product_views 
FOR INSERT 
WITH CHECK (true);

-- Allow users to see their own views
CREATE POLICY "Users can see their own views" 
ON public.user_product_views 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a function to track views safely
CREATE OR REPLACE FUNCTION public.track_product_view(
    p_product_id BIGINT,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_view_id UUID;
BEGIN
    INSERT INTO public.user_product_views (product_id, user_id)
    VALUES (p_product_id, p_user_id)
    RETURNING id INTO v_view_id;
    
    RETURN v_view_id;
END;
$$;
