-- 1. Create Condition Enum
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_condition_enum') THEN
        CREATE TYPE public.product_condition_enum AS ENUM ('new', 'used', 'refurbished', 'open_box', 'digital');
    END IF;
END $$;

-- 2. Add condition column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition public.product_condition_enum DEFAULT 'new';

-- 3. Update the product creation RPC
CREATE OR REPLACE FUNCTION public.fn_create_new_product_full(
    p_seller_id uuid,
    p_product_data jsonb,
    p_variants_data jsonb,
    p_media_data jsonb,
    p_attributes_data jsonb,
    p_quantity_discounts_data jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
    v_product_id uuid;
    v_variant_data jsonb;
    v_media_item jsonb;
    v_attribute_item jsonb;
    v_discount_item jsonb;
    v_media_id uuid;
    v_slug text;
    v_media_type text;
    v_is_video boolean;
    v_is_first_variant boolean := true;
    
    -- Variables for Delivery Logic Fix
    v_is_free_delivery boolean;
    v_delivery_cost numeric(10, 2);
BEGIN
    -- 1. Generate & Ensure Unique Slug
    v_slug := COALESCE(
        p_product_data->>'url_slug', 
        LOWER(REGEXP_REPLACE(p_product_data->>'title', '[^a-zA-Z0-9]+', '-', 'g'))
    );
    v_slug := TRIM(BOTH '-' FROM v_slug);

    -- If slug exists, append random suffix
    IF EXISTS (SELECT 1 FROM products WHERE slug = v_slug OR url_slug = v_slug) THEN
        v_slug := v_slug || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4);
    END IF;

    -- 2. Delivery Logic PRE-CALCULATION to satisfy 'chk_products_free_delivery_logic' constraint
    
    -- Determine if the seller set free_delivery to true (defaulting to false)
    v_is_free_delivery := COALESCE((p_product_data->>'free_delivery')::boolean, false);
    
    -- Determine delivery cost: MUST be 0 if free_delivery is true, otherwise use seller input
    v_delivery_cost := 
        CASE 
            WHEN v_is_free_delivery THEN 0.00 -- Forces cost to 0 when free_delivery is TRUE
            ELSE COALESCE((p_product_data->>'delivery_cost')::numeric, 0.00) 
        END;

    -- 3. INSERT into products
    INSERT INTO products (
        seller_id, title, description, category_id, slug, brand_id, currency, status,

        -- SELLER-CONTROLLABLE DELIVERY/ECO/SEO FIELDS
        free_delivery,
        delivery_scope,
        min_order_value,
        delivery_cost,
        delivery_time_estimate,
        is_express_delivery,
        delivery_time_days,
        min_order_for_free_delivery,
        eco_friendly,
        seo_title,
        meta_description,
        url_slug, 
        seo_keywords,
        canonical_url,
        tags,
        use_case_tags,
        occasion_tags,

        is_choice,
        delivery_locations,
        sale_unit,

        -- NEW FIELDS
        listing_type,
        condition,
        has_quantity_discount,

        -- ADMIN-CONTROLLED/PROMOTIONAL FIELDS
        is_featured, is_new, is_on_sale, 
        is_flash_sale, flash_sale_start, flash_sale_end,
        promo_text, promo_code, is_lightning_deal, lightning_ends_at
    )
    VALUES (
        p_seller_id,
        p_product_data->>'title',
        p_product_data->>'description',
        (p_product_data->>'category_id')::uuid,
        v_slug, 
        (p_product_data->>'brand_id')::uuid,
        COALESCE(p_product_data->>'currency', 'USD'),
        'pending', -- Force status to pending for moderation

        -- MAPPING SELLER INPUTS
        v_is_free_delivery,
        COALESCE(p_product_data->>'delivery_scope', 'nationwide')::public.delivery_scope_enum,
        COALESCE((p_product_data->>'min_order_value')::numeric, 0),
        v_delivery_cost,
        p_product_data->>'delivery_time_estimate',
        COALESCE((p_product_data->>'is_express_delivery')::boolean, false),
        COALESCE((p_product_data->>'delivery_time_days')::integer, 1),
        COALESCE((p_product_data->>'min_order_for_free_delivery')::numeric, 0),
        COALESCE((p_product_data->>'eco_friendly')::boolean, false),
        p_product_data->>'seo_title',
        p_product_data->>'meta_description',
        v_slug,
        p_product_data->>'seo_keywords',
        p_product_data->>'canonical_url',

        -- TAGS
        CASE WHEN p_product_data->'tags' IS NOT NULL THEN (SELECT array_agg(elem) FROM jsonb_array_elements_text(p_product_data->'tags') AS elem) ELSE '{}'::text[] END,
        CASE WHEN p_product_data->'use_case_tags' IS NOT NULL THEN (SELECT array_agg(elem) FROM jsonb_array_elements_text(p_product_data->'use_case_tags') AS elem) ELSE '{}'::text[] END,
        CASE WHEN p_product_data->'occasion_tags' IS NOT NULL THEN (SELECT array_agg(elem) FROM jsonb_array_elements_text(p_product_data->'occasion_tags') AS elem) ELSE '{}'::text[] END,

        -- NEW FIELDS MAPPING
        COALESCE((p_product_data->>'is_choice')::boolean, false),
        CASE WHEN p_product_data->'delivery_locations' IS NOT NULL THEN (SELECT array_agg(elem) FROM jsonb_array_elements_text(p_product_data->'delivery_locations') AS elem) ELSE '{}'::text[] END,
        p_product_data->>'sale_unit',

        COALESCE((p_product_data->>'listing_type')::public.listing_type_enum, 'direct_purchase'),
        COALESCE((p_product_data->>'condition')::public.product_condition_enum, 'new'),
        jsonb_array_length(p_quantity_discounts_data) > 0,

        -- ADMIN/PROMOTIONAL DEFAULTS
        FALSE, -- is_featured
        TRUE,  -- is_new
        FALSE, -- is_on_sale
        FALSE, -- is_flash_sale
        NULL,  -- flash_sale_start
        NULL,  -- flash_sale_end
        p_product_data->>'promo_text',
        p_product_data->>'promo_code',
        FALSE, -- is_lightning_deal
        NULL   -- lightning_ends_at
    )
    RETURNING id INTO v_product_id;

    -- ... (rest of function)
    -- 4. INSERT into media and images
    FOR v_media_item IN SELECT * FROM jsonb_array_elements(p_media_data) LOOP
        v_media_type := v_media_item->>'media_type';
        v_is_video := (v_media_type IN ('video', 'youtube'));

        INSERT INTO media (
            product_id, media_type, is_main, alt_text, position, storage_path,
            image_url, video_url, provider, thumbnail_url
        )
        VALUES (
            v_product_id, v_media_type, (v_media_item->>'is_main')::boolean, v_media_item->>'alt_text',
            (v_media_item->>'position')::integer, v_media_item->>'storage_path',
            v_media_item->>'url',
            CASE WHEN v_is_video THEN v_media_item->>'url' ELSE NULL END,
            CASE WHEN v_is_video THEN v_media_item->>'provider' ELSE NULL END,
            CASE WHEN v_is_video THEN v_media_item->>'thumbnail_url' ELSE NULL END
        )
        RETURNING id INTO v_media_id;
        
        IF v_media_type = 'image' THEN 
            INSERT INTO images (product_id, media_id) VALUES (v_product_id, v_media_id);
        END IF;
        
        IF (v_media_item->>'is_main')::boolean THEN
            UPDATE products SET featured_media_id = v_media_id WHERE id = v_product_id;
        END IF;
    END LOOP;

    -- 5. INSERT into product_variants
    FOR v_variant_data IN SELECT * FROM jsonb_array_elements(p_variants_data) LOOP
        INSERT INTO product_variants (
            product_id, sku, price, stock, options, compare_at_price, 
            original_price, rrp, discount_percent, is_default, image_url 
        )
        VALUES (
            v_product_id,
            v_variant_data->>'sku',
            (v_variant_data->>'price')::numeric,
            (v_variant_data->>'stock')::integer,
            v_variant_data->'options',
            (v_variant_data->>'compare_at_price')::numeric,
            (v_variant_data->>'original_price')::numeric,
            (v_variant_data->>'rrp')::numeric,
            (v_variant_data->>'discount_percent')::numeric,
            CASE 
                WHEN v_is_first_variant THEN true 
                ELSE COALESCE((v_variant_data->>'is_default')::boolean, false) 
            END,
            v_variant_data->>'image_url'
        );
        v_is_first_variant := false;
    END LOOP;

    -- 6. INSERT into product_attribute_values
    FOR v_attribute_item IN SELECT * FROM jsonb_array_elements(p_attributes_data) LOOP
        INSERT INTO product_attribute_values (
            product_id, attribute_id, value_option_id, value_text
        )
        VALUES (
            v_product_id,
            (v_attribute_item->>'attribute_id')::uuid,
            (v_attribute_item->>'value_option_id')::uuid,
            v_attribute_item->>'value_text'
        );
    END LOOP;

    -- 7. NEW: INSERT into quantity_discounts
    FOR v_discount_item IN SELECT * FROM jsonb_array_elements(p_quantity_discounts_data) LOOP
        INSERT INTO public.quantity_discounts (product_id, min_quantity, unit_price)
        VALUES (v_product_id, (v_discount_item->>'min_quantity')::integer, (v_discount_item->>'unit_price')::numeric);
    END LOOP;

    RETURN v_product_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Product posting failed: %', SQLERRM;
END;
$function$;
