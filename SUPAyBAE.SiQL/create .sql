CREATE OR REPLACE FUNCTION public.fn_create_new_product_full (
    p_seller_id uuid,
    p_product_data jsonb,
    p_media_data jsonb,
    p_variants_data jsonb,
    p_attributes_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
    v_product_id uuid;
    v_variant_data jsonb;
    v_media_item jsonb;
    v_attribute_item jsonb;
    v_media_id uuid;
    v_slug text;
    v_media_type text;
    v_is_video boolean;
    v_is_first_variant boolean := true;
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

    -- 2. INSERT into products (Removed Sales/Promo and Eco-Friendly fields)
    INSERT INTO products (
        seller_id, 
        title, 
        description, 
        category_id, 
        slug, 
        brand_id, 
        currency, 
        status,

        -- DELIVERY AND SALES
        free_delivery,
        delivery_scope,
        min_order_value,
        delivery_cost,
        delivery_time_estimate,
        is_express_delivery,
        delivery_time_days,
        min_order_for_free_delivery,
        
        -- SEO FIELDS
        seo_title,
        meta_description,
        url_slug,
        seo_keywords,
        canonical_url,
        
        -- TAGS
        tags,
        use_case_tags,
        occasion_tags
        -- END MODIFIED FIELDS
    )
    VALUES (
        p_seller_id,
        p_product_data->>'title',
        p_product_data->>'description',
        (p_product_data->>'category_id')::uuid,
        v_slug, -- maps to products.slug
        (p_product_data->>'brand_id')::uuid,
        COALESCE(p_product_data->>'currency', 'USD'),
        COALESCE(p_product_data->>'status', 'pending'),

        -- MAPPING DELIVERY FIELDS
        COALESCE((p_product_data->>'free_delivery')::boolean, false),
        COALESCE(p_product_data->>'delivery_scope', 'nationwide')::delivery_scope_enum,
        COALESCE((p_product_data->>'min_order_value')::numeric, 0),
        COALESCE((p_product_data->>'delivery_cost')::numeric, 0),
        p_product_data->>'delivery_time_estimate',
        COALESCE((p_product_data->>'is_express_delivery')::boolean, false),
        COALESCE((p_product_data->>'delivery_time_days')::integer, 1),
        COALESCE((p_product_data->>'min_order_for_free_delivery')::numeric, 0),
        
        -- MAPPING SEO FIELDS
        p_product_data->>'seo_title',
        p_product_data->>'meta_description',
        v_slug,
        p_product_data->>'seo_keywords',
        p_product_data->>'canonical_url',
        
        -- MAPPING TAGS
        CASE WHEN p_product_data->'tags' IS NOT NULL THEN (SELECT array_agg(elem) FROM jsonb_array_elements_text(p_product_data->'tags') AS elem) ELSE '{}'::text[] END,
        CASE WHEN p_product_data->'use_case_tags' IS NOT NULL THEN (SELECT array_agg(elem) FROM jsonb_array_elements_text(p_product_data->'use_case_tags') AS elem) ELSE '{}'::text[] END,
        CASE WHEN p_product_data->'occasion_tags' IS NOT NULL THEN (SELECT array_agg(elem) FROM jsonb_array_elements_text(p_product_data->'occasion_tags') AS elem) ELSE '{}'::text[] END
    )
    RETURNING id INTO v_product_id;

    -- 3. INSERT into media and images
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

    -- 4. INSERT into product_variants
    FOR v_variant_data IN SELECT * FROM jsonb_array_elements(p_variants_data) LOOP
        INSERT INTO product_variants (
            product_id, 
            sku, 
            price, 
            stock, 
            options, 
            compare_at_price, 
            original_price, 
            rrp,
            discount_percent,
            is_default, 
            image_url 
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

    -- 5. INSERT into product_attribute_values
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

    RETURN v_product_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Product posting failed: %', SQLERRM;
END;
$function$;