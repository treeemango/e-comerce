-- Add vendor_id to products_with_media view
-- This fixes the foreign key constraint error when following stores

-- Drop and recreate the views with vendor_id included
DROP VIEW IF EXISTS public.products_with_media CASCADE;
DROP VIEW IF EXISTS public.product_card_metrics_view CASCADE;

-- Recreate product_card_metrics_view (inherits from product_unified_view)
CREATE VIEW public.product_card_metrics_view AS 
SELECT * FROM public.product_unified_view;

-- Recreate products_with_media with vendor_id
CREATE VIEW public.products_with_media AS 
SELECT 
    product_id AS id,
    title,
    product_name AS name,
    product_description AS description,
    price,
    original_price,
    "originalPrice",
    stock,
    currency,
    category_id,
    category_name,
    category_description,
    brand,
    brand_id,
    brand_name,
    brand_description,
    seller_id,
    vendor_id,                 -- ✅ ADD: Actual vendor table ID for follow operations
    business_name,
    website_url,
    vendor_active,
    vendor_active AS is_active,
    slug,
    status,
    approval_status,
    created_at,
    updated_at,
    price_confidence,
    rating,
    review_count,
    is_featured,
    is_new,
    is_on_sale,
    is_flash_sale,
    flash_sale_start,
    flash_sale_end,
    popularity,
    view_count,
    sales_count,
    free_delivery,
    delivery_cost,
    delivery_time_estimate,
    delivery_time_days,
    min_order_value,
    min_order_for_free_delivery,
    is_express_delivery,
    delivery_scope,
    seller_rating,
    seller_total_orders,
    seller_experience_years,
    seller_badge_type,
    featured_image_url,
    featured_thumbnail_url,
    gallery_media,
    "galleryMedia" AS gallery_images,
    discount_percent,
    "discountPercent",
    "promoText",
    "promoCode",
    "activeCoupon",
    deal_type,
    coupon_expires_at,
    auto_discount_type,
    auto_discount_value,
    auto_discount_buy_qty,
    auto_discount_get_qty,
    auto_discount_min_requirement,
    auto_discount_name,
    stock_state,
    variants
FROM public.product_unified_view;
