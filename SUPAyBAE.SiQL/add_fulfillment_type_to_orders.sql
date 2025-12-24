-- Migration to add fulfillment_type to orders table
-- This supports differentiating between 'official_courier' and 'local_parcel' (bus/shuttle)

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS fulfillment_type text DEFAULT 'official_courier';

-- Update existing orders to have a default value if needed
UPDATE public.orders SET fulfillment_type = 'official_courier' WHERE fulfillment_type IS NULL;

-- Comment for documentation
COMMENT ON COLUMN public.orders.fulfillment_type IS 'Type of fulfillment: official_courier or local_parcel';
