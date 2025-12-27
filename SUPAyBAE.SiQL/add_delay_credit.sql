-- Add delay_credit column to products table
-- Allows sellers to specify how much credit they offer for delayed deliveries

-- Add the column if it doesn't exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delay_credit numeric(10, 2) DEFAULT 0;

-- Add a constraint to ensure it's non-negative (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_delay_credit_positive') THEN
        ALTER TABLE public.products ADD CONSTRAINT chk_products_delay_credit_positive CHECK (delay_credit >= 0);
    END IF;
END $$;

-- Create an index for filtering products with delay credit
CREATE INDEX IF NOT EXISTS idx_products_delay_credit ON public.products(delay_credit) 
WHERE delay_credit > 0;
