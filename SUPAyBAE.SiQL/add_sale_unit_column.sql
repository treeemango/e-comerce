-- Add sale_unit column to products table
-- This stores the unit of measurement for pricing (e.g., "piece", "kg", "L")

-- Add column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sale_unit TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN products.sale_unit IS 'Unit of measurement for pricing display (e.g., piece, kg, L, ml, meter, box, pack, pair, dozen)';

-- Create index for faster filtering/querying (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_products_sale_unit ON products(sale_unit) WHERE sale_unit IS NOT NULL;
