-- Checkout Modernization Migration
-- 1. Update orders table with tax and guest fields
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tax_amount numeric(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_rate numeric(5, 4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS delivery_fee numeric(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_guest boolean DEFAULT false;

-- 2. Create user_addresses table
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    address_name text, -- e.g., 'Home', 'Work'
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone_number text NOT NULL,
    address_line1 text NOT NULL,
    postcode text NOT NULL,
    town_city text NOT NULL,
    county text NOT NULL,
    country text NOT NULL DEFAULT 'Kenya',
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_addresses_pkey PRIMARY KEY (id)
);

-- 3. Create user_payment_methods table (storing tokens)
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider text NOT NULL, -- e.g., 'Stripe', 'Pesapal', 'M-Pesa'
    method_type text NOT NULL, -- 'card', 'mpesa', etc.
    provider_token text NOT NULL,
    last_four text, -- For display
    expiry_month text,
    expiry_year text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_payment_methods_pkey PRIMARY KEY (id)
);

-- 4. Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS Policies
CREATE POLICY "Users can manage their own addresses" ON public.user_addresses
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payment methods" ON public.user_payment_methods
    FOR ALL USING (auth.uid() = user_id);
