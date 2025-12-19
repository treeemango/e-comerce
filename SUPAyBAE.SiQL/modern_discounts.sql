-- Modern Discount System Migration
-- This script adds support for automatic shop-wide discounts and per-product quantity (bulk) discounts.

-------------------------------------------------------------------------------
-- 1. Automatic Discounts Table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.automatic_discounts (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name                       TEXT      NOT NULL,
    discount_type              TEXT      NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y')),
    discount_value             DECIMAL(10, 2), -- Percentage (e.g. 10.00) or Fixed Amount
    buy_qty                    INT,      -- For buy_x_get_y
    get_qty                    INT,      -- For buy_x_get_y
    min_requirement_value      DECIMAL(10, 2) DEFAULT 0.00, -- Min order value or min qty based on type
    starts_at                  TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at                    TIMESTAMP WITH TIME ZONE NOT NULL,
    status                     TEXT      DEFAULT 'scheduled' CHECK (status IN ('active', 'scheduled', 'expired', 'deactivated')),
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_automatic_discounts_seller_id ON public.automatic_discounts(seller_id);
CREATE INDEX IF NOT EXISTS idx_automatic_discounts_status ON public.automatic_discounts(status);

-- RLS Policies
ALTER TABLE public.automatic_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage their own automatic discounts" 
ON public.automatic_discounts FOR ALL 
USING (auth.uid() = seller_id);

CREATE POLICY "Everyone can view active automatic discounts" 
ON public.automatic_discounts FOR SELECT 
USING (status = 'active' OR status = 'scheduled');

-------------------------------------------------------------------------------
-- 2. Quantity (Bulk) Discounts Table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.quantity_discounts (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id                 UUID      NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id                 UUID      REFERENCES public.product_variants(id) ON DELETE CASCADE,
    min_quantity               INT       NOT NULL, -- e.g. 5+
    unit_price                 DECIMAL(10, 2) NOT NULL, -- Discounted price for this qty
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_quantity_discounts_product_id ON public.quantity_discounts(product_id);

-- RLS Policies
ALTER TABLE public.quantity_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quantity discounts" 
ON public.quantity_discounts FOR SELECT 
USING (true);

-- Policy for sellers to manage quantity discounts
-- Since quantity_discounts doesn't have seller_id directly, we check via products table
CREATE POLICY "Sellers can manage quantity discounts for their products" 
ON public.quantity_discounts FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = quantity_discounts.product_id 
        AND p.seller_id = auth.uid()
    )
);

-------------------------------------------------------------------------------
-- 3. Update products table
-------------------------------------------------------------------------------

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='has_quantity_discount') THEN
        ALTER TABLE public.products ADD COLUMN has_quantity_discount BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-------------------------------------------------------------------------------
-- 4. Trigger for automatic status update (Optional/Helper)
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_discount_statuses() RETURNS void AS $$
BEGIN
    -- Set scheduled to active if starts_at is reached
    UPDATE public.automatic_discounts 
    SET status = 'active' 
    WHERE status = 'scheduled' AND starts_at <= NOW() AND ends_at > NOW();

    -- Set active/scheduled to expired if ends_at is passed
    UPDATE public.automatic_discounts 
    SET status = 'expired' 
    WHERE status IN ('active', 'scheduled') AND ends_at <= NOW();
END;
$$ LANGUAGE plpgsql;
