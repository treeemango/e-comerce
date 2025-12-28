-- Fix Database Query Errors
-- This migration addresses two critical issues:
-- 1. Missing vendor_id column in products_with_media view
-- 2. RLS permission error when fetching vendor profiles

-- =====================================================
-- PART 1: Add vendor_id to products_with_media view
-- =====================================================

-- Drop the existing view
DROP VIEW IF EXISTS public.products_with_media CASCADE;

-- Recreate the view with vendor_id included
CREATE OR REPLACE VIEW public.products_with_media AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.original_price,
    p.rrp,
    p.discount_percent,
    p.currency,
    p.rating,
    p.review_count,
    p.stock,
    p.stock_quantity,
    p.status,
    p.seller_id,
    p.category_id,
    p.brand_id,
    p.brand_name,
    p.category_name,
    p.created_at,
    p.updated_at,
    p.is_flash_sale,
    p.is_new,
    p.is_featured,
    p.free_delivery,
    p.delivery_time_estimate,
    p.delivery_time_days,
    p.is_express_delivery,
    p.delivery_scope,
    p.delay_credit,
    p.delivery_locations,
    p.delivery_cost,
    p.min_order_value,
    p.min_order_for_free_delivery,
    p.sale_unit,
    p.tags,
    p.use_case_tags,
    p.occasion_tags,
    p.listing_type,
    p.condition,
    p.has_quantity_discount,
    p.auto_discount_type,
    p.auto_discount_value,
    p.auto_discount_buy_qty,
    p.auto_discount_get_qty,
    p.auto_discount_min_requirement,
    p.auto_discount_name,
    p.sold_count,
    p.sku,
    -- Add vendor_id from vendors table
    v.id as vendor_id,
    -- Gallery media as JSON array
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', pm.id,
                    'image_url', pm.image_url,
                    'thumbnail_url', pm.thumbnail_url,
                    'video_url', pm.video_url,
                    'type', pm.media_type,
                    'is_main', pm.is_main,
                    'alt_text', pm.alt_text,
                    'position', pm.position
                )
                ORDER BY pm.position, pm.is_main DESC
            )
            FROM product_media pm
            WHERE pm.product_id = p.id
        ),
        '[]'::json
    ) AS gallery_media,
    -- Featured image URL (first main image or first image)
    (
        SELECT pm.image_url
        FROM product_media pm
        WHERE pm.product_id = p.id
        ORDER BY pm.is_main DESC, pm.position
        LIMIT 1
    ) AS featured_image_url
FROM products p
LEFT JOIN vendors v ON v.user_id = p.seller_id;

-- Grant appropriate permissions
GRANT SELECT ON public.products_with_media TO anon, authenticated;

-- =====================================================
-- PART 2: Fix RLS for vendor profile fetching
-- =====================================================

-- The issue is that fetchVendorFullProfile tries to join vendor_media
-- which might require access to the users table indirectly.

-- Ensure RLS is properly configured for vendors table
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Vendors are viewable by everyone" ON public.vendors;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.vendors;

-- Create a policy that allows anyone to view vendor profiles
CREATE POLICY "Enable read access for all users" ON public.vendors
    FOR SELECT
    USING (true);

-- Ensure vendor_media table has proper RLS
ALTER TABLE IF EXISTS public.vendor_media ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Vendor media is viewable by everyone" ON public.vendor_media;

-- Create a policy that allows anyone to view vendor media
CREATE POLICY "Enable read access for all users" ON public.vendor_media
    FOR SELECT
    USING (true);

COMMENT ON VIEW public.products_with_media IS 'Enhanced products view with vendor_id and optimized media aggregation';
