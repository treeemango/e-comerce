-- Add delay_credit to product views for frontend display
-- This ensures the delay credit field is exposed to the frontend APIs

-- 1. DROP ALL DEPENDENCIES
DROP VIEW IF EXISTS public.products_with_media CASCADE;
DROP VIEW IF EXISTS public.product_card_metrics_view CASCADE;
DROP VIEW IF EXISTS public.product_unified_view CASCADE;

-- 2. CREATE THE MASTER UNIFIED VIEW WITH delay_credit
CREATE VIEW public.product_unified_view AS
WITH 
-- Grab the best currently active (Ongoing) coupon for each product
active_coupons AS (
    SELECT DISTINCT ON (cp.product_id)
        cp.product_id,
        c.id AS coupon_id,
        c.name AS coupon_name,
        c.discount_amount,
        c.discount_percentage,
        c.end_time,
        c.code AS coupon_code,
        c.seller_id AS coupon_seller_id,
        CASE 
            WHEN c.discount_amount IS NOT NULL THEN c.discount_amount
            ELSE NULL
        END AS fixed_discount_amount
    FROM public.coupons c
    JOIN public.coupon_products cp ON c.id = cp.coupon_id
    WHERE c.status = 'Ongoing' 
      AND c.start_time <= CURRENT_TIMESTAMP
      AND c.end_time > CURRENT_TIMESTAMP
      AND (c.total_quantity IS NULL OR c.total_quantity > COALESCE(c.claimed_quantity, 0))
    ORDER BY cp.product_id, 
        CASE WHEN c.discount_amount IS NOT NULL THEN 1 ELSE 2 END,
        COALESCE(c.discount_amount, 0) DESC NULLS LAST,
        COALESCE(c.discount_percentage, 0) DESC NULLS LAST
),
active_automatic_discounts AS (
    SELECT DISTINCT ON (seller_id)
        id,
        seller_id,
        name,
        discount_type,
        discount_value,
        min_requirement_value,
        buy_qty,
        get_qty
    FROM public.automatic_discounts
    WHERE status = 'active'
      AND starts_at <= CURRENT_TIMESTAMP
      AND ends_at > CURRENT_TIMESTAMP
    ORDER BY seller_id, created_at DESC
),
-- Aggregate all variants into a JSON array for each product
variant_agg AS (
    SELECT 
        product_id,
        jsonb_agg(jsonb_build_object(
            'id', id,
            'sku', sku,
            'price', price,
            'compare_at_price', compare_at_price,
            'stock', stock,
            'quantity', quantity,
            'options', options,
            'is_default', is_default
        )) as variants_json
    FROM public.product_variants
    GROUP BY product_id
),
-- Aggregate and transform all media (Images + YouTube)
media_agg AS (
    SELECT 
        product_id,
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'image_url', image_url,
                'thumbnail_url', thumbnail_url,
                'is_main', is_main,
                'type', CASE
                    WHEN (media_type IN ('video', 'youtube') OR video_url IS NOT NULL) 
                         AND (COALESCE(video_url, image_url) LIKE '%youtube.com%' 
                              OR COALESCE(video_url, image_url) LIKE '%youtu.be%') 
                    THEN 'youtube'
                    ELSE COALESCE(media_type, 'image')
                END,
                'media_type', COALESCE(media_type, 'image'),
                'video_url', CASE
                    WHEN COALESCE(video_url, image_url) LIKE '%youtube.com/watch?v=%' 
                        THEN 'https://www.youtube.com/embed/' || split_part(split_part(COALESCE(video_url, image_url), 'v=', 2), '&', 1)
                    WHEN COALESCE(video_url, image_url) LIKE '%youtu.be/%' 
                        THEN 'https://www.youtube.com/embed/' || split_part(split_part(COALESCE(video_url, image_url), '/', -1), '?', 1)
                    ELSE video_url
                END,
                'alt_text', alt_text
            ) ORDER BY position ASC, created_at DESC
        ) as gallery_json
    FROM public.media
    GROUP BY product_id
)
SELECT 
    -- Core IDs & Basic Info
    p.id AS product_id,
    p.id,
    p.slug,
    p.status,
    p.status AS approval_status,
    p.title,
    p.title AS product_name,
    p.description AS product_description,
    p.description AS longdescription,
    
    -- REQUIRED FRONTEND FIELDS
    v.price,                               -- price (number)
    p.currency,                            -- currency (e.g., USD, KES)
    p.sale_unit,                           -- Unit of measurement
    p.delay_credit,                        -- ✅ ADDED: Credit for delay
    v.compare_at_price AS original_price,
    v.compare_at_price AS "originalPrice",
    ROUND(CASE 
        WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price 
        THEN ((v.compare_at_price - v.price) / v.compare_at_price) * 100 
        ELSE 0 
    END) AS discount_percent,
    ROUND(CASE 
        WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price 
        THEN ((v.compare_at_price - v.price) / v.compare_at_price) * 100 
        ELSE 0 
    END) AS "discountPercent",
    p.promo_text AS "promoText",
    p.promo_code AS "promoCode",

    -- Automatic Discounts
    ad.discount_type AS auto_discount_type,
    ad.discount_value AS auto_discount_value,
    ad.buy_qty AS auto_discount_buy_qty,
    ad.get_qty AS auto_discount_get_qty,
    ad.min_requirement_value AS auto_discount_min_requirement,
    ad.name AS auto_discount_name,

    -- 🔥 NEW: Deal Type Differentiation
    CASE
        WHEN ac.coupon_id IS NOT NULL THEN 'coupon'
        WHEN ad.id IS NOT NULL THEN 'hot_discount'
        WHEN p.is_flash_sale = true AND p.flash_sale_end > CURRENT_TIMESTAMP THEN 'flash_sale'
        WHEN p.is_lightning_deal = true AND p.lightning_ends_at > CURRENT_TIMESTAMP THEN 'lightning_deal'
        WHEN v.compare_at_price IS NOT NULL
             AND v.compare_at_price > v.price
             AND ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)) >= 0.3 THEN 'hot_discount'
        WHEN v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price
             AND ((v.compare_at_price - v.price) / NULLIF(v.compare_at_price, 0)) >= 0.1 THEN 'discount'
        ELSE 'standard'
    END AS deal_type,

    -- ⏳ NEW: Coupon expiration for real-time countdown timers (NULL if not coupon)
    ac.end_time AS coupon_expires_at,

    -- EXISTING: Active Coupon Data with calculated final price
    CASE 
        WHEN ac.coupon_id IS NOT NULL THEN jsonb_build_object(
            'id', ac.coupon_id,
            'label', ac.coupon_name,
            'code', ac.coupon_code,
            'amount', ac.discount_amount,
            'percent', ac.discount_percentage,
            'endsAt', ac.end_time,
            'finalPrice', CASE
                WHEN ac.discount_amount IS NOT NULL THEN GREATEST(v.price - ac.discount_amount, 0)
                WHEN ac.discount_percentage IS NOT NULL THEN ROUND(v.price * (1 - ac.discount_percentage::numeric / 100), 2)
                ELSE v.price
            END,
            'savings', CASE
                WHEN ac.discount_amount IS NOT NULL THEN ac.discount_amount
                WHEN ac.discount_percentage IS NOT NULL THEN ROUND(v.price * (ac.discount_percentage::numeric / 100), 2)
                ELSE 0
            END
        )
        ELSE NULL 
    END AS "activeCoupon",

    -- Stock & Inventory
    v.stock,
    CASE WHEN v.stock > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS stock_state,
    v.stock AS stock_quantity,
    (COALESCE(v.compare_at_price, v.price) - v.price) AS price_gap,

    -- Categorization & Branding
    p.category_id,
    p.category,
    p.brand,
    p.brand_id,
    p.brand_custom_name,
    p.tags,
    p.vertical_id,
    c.name AS category_name,
    NULL::text AS category_description,
    b.name AS brand_name,
    NULL::text AS brand_description,

    -- Seller Info
    p.seller_id,
    vd.business_name,
    vd.website_url,
    vd.is_active AS vendor_active,

    -- Media (Featured & Gallery)
    m.image_url AS featured_image_url,
    m.thumbnail_url AS featured_thumbnail_url,
    p.featured_media_id,
    COALESCE(ma.gallery_json, '[]'::jsonb) AS gallery_media,
    COALESCE(ma.gallery_json, '[]'::jsonb) AS "galleryMedia",

    -- Metrics & Flags
    p.rating,
    p.review_count,
    p.review_count AS calculated_review_count,
    p.is_featured,
    p.is_new,
    p.is_on_sale,
    p.is_flash_sale,
    p.flash_sale_start,
    p.flash_sale_end,
    p.eco_friendly,
    p.sales_count,
    p.sales_count AS sold_count,
    p.view_count,
    p.popularity,
    p.orders_last_week,

    -- AI / Price Intelligence
    p.ai_recommendation,
    p.ai_recommendation_score,
    p.lower_than_similar,
    p.lower_than_similar AS calculated_lower_than_similar,
    p.similar_avg_price,
    p.similar_avg_price AS calculated_similar_avg_price,
    p.price_confidence,
    p.price_confidence AS calculated_price_confidence,
    NULL::jsonb AS price_signals,

    -- Delivery
    p.free_delivery,
    p.delivery_cost,
    p.delivery_time_days,
    p.delivery_time_estimate,
    p.is_express_delivery,
    p.min_order_value,
    p.min_order_for_free_delivery,
    p.delivery_scope,
    p.delivery_locations,

    -- SEO & Tech
    p.url_slug,
    p.url_slug_auto,
    p.seo_title,
    p.meta_description,
    p.seo_keywords,
    p.canonical_url,
    COALESCE(va.variants_json, '[]'::jsonb) AS variants,
    NULL::jsonb AS attributes,
    p.search_vector,
    p.tsv,
    p.embedding,
    NULL::text AS text_embedding,
    NULL::boolean AS has_embedding,
    NULL::timestamp AS embedding_generated_at,
    NULL::integer AS embedding_generation_time,
    NULL::text AS embedding_model_version,

    -- Seller Metrics
    p.seller_rating,
    p.seller_total_orders,
    p.seller_experience_years,
    p.seller_badge_type,

    -- Moderation
    p.approved_at,
    p.approved_by,
    p.rejected_at,
    p.rejected_by,
    p.rejection_reason,
    p.created_at,
    p.updated_at,
    p.updated_at AS metrics_updated_at

FROM public.products p
LEFT JOIN public.product_variants v ON p.id = v.product_id AND v.is_default = true
LEFT JOIN public.media m ON p.featured_media_id = m.id
LEFT JOIN public.shopify_categories c ON p.category_id = c.id
LEFT JOIN public.admin_2025_shopify_brands b ON p.brand_id = b.id
LEFT JOIN public.vendors vd ON p.seller_id = vd.user_id
LEFT JOIN variant_agg va ON p.id = va.product_id
LEFT JOIN media_agg ma ON p.id = ma.product_id
LEFT JOIN active_coupons ac ON p.id = ac.product_id
LEFT JOIN active_automatic_discounts ad ON p.seller_id = ad.seller_id;

-- 3. RECREATE CHILD VIEWS (they inherit new fields automatically)
CREATE VIEW public.product_card_metrics_view AS 
SELECT * FROM public.product_unified_view;

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
    sale_unit,
    delay_credit,              -- ✅ ADDED: Credit for delay
    category_id,
    category_name,
    category_description,
    brand,
    brand_id,
    brand_name,
    brand_description,
    seller_id,
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
    delivery_locations,
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
