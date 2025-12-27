-- Create a table to store unique referral codes for users
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own code
CREATE POLICY "Users can read their own referral code" 
ON public.referral_codes FOR SELECT 
USING (auth.uid() = user_id);

-- Allow public to read/validate codes (needed when someone enters a code)
CREATE POLICY "Anyone can look up referral codes" 
ON public.referral_codes FOR SELECT 
USING (true);

-- Create a table to track who referred whom
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code_used TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed, rewarded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referred_user_id) -- A user can only be referred once
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referrers can see their successful referrals
CREATE POLICY "Users can see who they referred" 
ON public.referrals FOR SELECT 
USING (auth.uid() = referrer_id);

-- Function to generate a random referral code
CREATE OR REPLACE FUNCTION generate_unique_referral_code() 
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    done BOOLEAN := FALSE;
BEGIN
    WHILE NOT done LOOP
        -- Generate 8 char random string (uppercase)
        new_code := upper(substring(md5(random()::text) from 1 for 8));
        -- Check if exists
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = new_code) THEN
                done := TRUE;
            END IF;
        END;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create a referral code for new users
CREATE OR REPLACE FUNCTION auto_create_referral_code() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (NEW.id, generate_unique_referral_code());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hook into profile creation (assuming profiles table exists and is created on signup)
-- Note: You might want to attach this to auth.users or profiles depending on your architecture.
-- Safer to attach to profiles insert if possible, or trigger manually.
-- For now, let's create a function users can call to ensure they have a code.

CREATE OR REPLACE FUNCTION ensure_referral_code()
RETURNS TEXT AS $$
DECLARE
    my_code TEXT;
    my_uid UUID;
BEGIN
    my_uid := auth.uid();
    IF my_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT code INTO my_code FROM public.referral_codes WHERE user_id = my_uid;
    
    IF my_code IS NOT NULL THEN
        RETURN my_code;
    END IF;

    my_code := generate_unique_referral_code();
    INSERT INTO public.referral_codes (user_id, code) VALUES (my_uid, my_code);
    
    RETURN my_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
