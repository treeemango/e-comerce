-- Create a new table to store notification topic preferences for buyers.
CREATE TABLE IF NOT EXISTS public.buyer_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    orders BOOLEAN DEFAULT true,
    deals BOOLEAN DEFAULT true,
    price_drops BOOLEAN DEFAULT true,
    messages BOOLEAN DEFAULT true,
    recommendations BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.buyer_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notification preferences"
ON public.buyer_notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.buyer_notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences (UPDATE)"
ON public.buyer_notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER trg_buyer_notification_preferences_updated_at
BEFORE UPDATE ON public.buyer_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
