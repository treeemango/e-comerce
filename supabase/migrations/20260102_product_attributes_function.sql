-- Quick fix migration: Ensure products_with_media returns attributes
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing function if it exists (to change return type)
DROP FUNCTION IF EXISTS public.get_product_attributes(UUID);

-- Step 2: Create the function to get product attributes
CREATE OR REPLACE FUNCTION public.get_product_attributes(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'attribute_id', pav.attribute_id,
            'name', sa.name,
            'value', COALESCE(ao.value, pav.value_text, pav.value_number::text)
        )
    )
    INTO result
    FROM public.product_attribute_values pav
    JOIN public.shopify_attributes sa ON pav.attribute_id = sa.id
    LEFT JOIN public.attribute_options ao ON pav.value_option_id = ao.id
    WHERE pav.product_id = p_product_id;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_attributes TO anon, authenticated, service_role;

-- Step 3: Test the function works
-- SELECT get_product_attributes('f8b2f13b-63af-46d6-9df8-6fc1121...'::uuid);
