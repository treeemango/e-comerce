-- Function to handle the atomic insertion of a new product and all related data
-- UPDATED: uses 'description' instead of 'longdescription' and 'stock' instead of 'quantity'
-- Ensure image_url column exists
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_url text;

CREATE OR REPLACE FUNCTION fn_create_new_product_full(
    p_seller_id uuid,
    p_product_data jsonb,
    p_variants_data jsonb,
    p_media_data jsonb,
    p_attributes_data jsonb
)
RETURNS uuid AS $$
DECLARE
    v_product_id uuid;
    v_variant_data jsonb;
    v_media_item jsonb;
    v_attribute_item jsonb;
    v_media_id uuid;
    v_slug text;
BEGIN
    -- 1. Generate Slug
    v_slug := LOWER(REGEXP_REPLACE(p_product_data->>'title', '[^a-zA-Z0-9]+', '-', 'g'));

    -- 2. INSERT into products (Core Product Data)
    -- Changed longdescription to description
    INSERT INTO products (
        seller_id, title, description, category_id, slug, brand_id, currency, status,
        seo_title, meta_description, url_slug, delivery_cost, delivery_time_estimate
    )
    VALUES (
        p_seller_id,
        p_product_data->>'title',
        p_product_data->>'description', -- Changed from longdescription
        (p_product_data->>'category_id')::uuid,
        COALESCE(p_product_data->>'url_slug', v_slug), -- Use provided slug or generated one
        (p_product_data->>'brand_id')::uuid,
        COALESCE(p_product_data->>'currency', 'USD'),
        'pending',
        p_product_data->>'seo_title',
        p_product_data->>'meta_description',
        p_product_data->>'url_slug',
        (p_product_data->>'delivery_cost')::numeric,
        p_product_data->>'delivery_time_estimate'
    )
    RETURNING id INTO v_product_id;

    -- 3. INSERT into media and images
    FOR v_media_item IN SELECT * FROM jsonb_array_elements(p_media_data) LOOP
        INSERT INTO media (
            product_id, image_url, storage_path, media_type, is_main, alt_text, position
        )
        VALUES (
            v_product_id,
            v_media_item->>'url',
            v_media_item->>'storage_path',
            v_media_item->>'media_type',
            (v_media_item->>'is_main')::boolean,
            v_media_item->>'alt_text',
            (v_media_item->>'position')::integer
        )
        RETURNING id INTO v_media_id;
        
        -- Insert into images table, linking to the new media record
        -- Corrected: images table only links to media entries and holds embeddings, 
        -- it does NOT duplicate the url/metadata columns.
        INSERT INTO images (
            product_id, media_id
        )
        VALUES (
            v_product_id, v_media_id
        );
        
        -- If main image, update the featured_media_id on the products table
        IF (v_media_item->>'is_main')::boolean THEN
            UPDATE products SET featured_media_id = v_media_id WHERE id = v_product_id;
        END IF;
    END LOOP;

    -- 4. INSERT into product_variants
    FOR v_variant_data IN SELECT * FROM jsonb_array_elements(p_variants_data) LOOP
        INSERT INTO product_variants (
            product_id, sku, price, stock, options, compare_at_price, is_default, image_url
        )
        VALUES (
            v_product_id,
            v_variant_data->>'sku',
            (v_variant_data->>'price')::numeric,
            (v_variant_data->>'stock')::integer, -- Changed from quantity
            v_variant_data->'options',
            (v_variant_data->>'compare_at_price')::numeric,
            (v_variant_data->>'is_default')::boolean,
            v_variant_data->>'image_url'
        );
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
$$ LANGUAGE plpgsql;
