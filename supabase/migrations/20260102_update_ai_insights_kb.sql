-- Migration: Add Knowledge Base mapping for Universal Q&A
-- This stores a JSONB map of common questions to specific attribute names/IDs

ALTER TABLE public.product_ai_insights 
ADD COLUMN IF NOT EXISTS knowledge_base JSONB DEFAULT '{}';

-- Step 0: Drop the existing function to change return type
DROP FUNCTION IF EXISTS public.get_cached_product_insights(UUID, TEXT, TEXT);

-- Update get_cached_product_insights to return knowledge_base
CREATE OR REPLACE FUNCTION public.get_cached_product_insights(
    p_product_id UUID,
    p_product_hash TEXT,
    p_vendor_hash TEXT DEFAULT NULL
)
RETURNS TABLE (
    cache_status TEXT,
    feature_highlights TEXT,
    vendor_highlights TEXT,
    positive_retail_outlook TEXT,
    suggested_questions JSONB,
    knowledge_base JSONB,
    needs_vendor_update BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cached RECORD;
    v_needs_vendor_update BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_cached
    FROM public.product_ai_insights
    WHERE product_id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            'miss'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::JSONB, NULL::JSONB, FALSE;
        RETURN;
    END IF;
    
    IF v_cached.product_hash != p_product_hash THEN
        RETURN QUERY SELECT 
            'stale_product'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::JSONB, NULL::JSONB, FALSE;
        RETURN;
    END IF;
    
    IF p_vendor_hash IS NOT NULL AND v_cached.vendor_hash IS DISTINCT FROM p_vendor_hash THEN
        v_needs_vendor_update := TRUE;
    END IF;
    
    RETURN QUERY SELECT 
        'hit'::TEXT,
        v_cached.feature_highlights,
        v_cached.vendor_highlights,
        v_cached.positive_retail_outlook,
        v_cached.suggested_questions,
        v_cached.knowledge_base,
        v_needs_vendor_update;
END;
$$;

-- Step 0.1: Drop the existing upsert function to avoid overloading
DROP FUNCTION IF EXISTS public.upsert_product_ai_insights(UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, JSONB, BOOLEAN);

-- Update upsert_product_ai_insights to store knowledge_base
CREATE OR REPLACE FUNCTION public.upsert_product_ai_insights(
    p_product_id UUID,
    p_product_hash TEXT,
    p_vendor_hash TEXT DEFAULT NULL,
    p_vendor_id UUID DEFAULT NULL,
    p_feature_highlights TEXT DEFAULT NULL,
    p_vendor_highlights TEXT DEFAULT NULL,
    p_positive_retail_outlook TEXT DEFAULT NULL,
    p_suggested_questions JSONB DEFAULT '[]',
    p_knowledge_base JSONB DEFAULT '{}',
    p_vendor_only BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_vendor_only THEN
        UPDATE public.product_ai_insights
        SET 
            vendor_highlights = p_vendor_highlights,
            vendor_hash = p_vendor_hash,
            vendor_id = p_vendor_id,
            vendor_updated_at = NOW(),
            updated_at = NOW()
        WHERE product_id = p_product_id;
    ELSE
        INSERT INTO public.product_ai_insights (
            product_id, product_hash, vendor_hash, vendor_id,
            feature_highlights, vendor_highlights, positive_retail_outlook, 
            suggested_questions, knowledge_base, vendor_updated_at
        ) VALUES (
            p_product_id, p_product_hash, p_vendor_hash, p_vendor_id,
            p_feature_highlights, p_vendor_highlights, p_positive_retail_outlook,
            p_suggested_questions, p_knowledge_base, NOW()
        )
        ON CONFLICT (product_id) DO UPDATE SET
            product_hash = EXCLUDED.product_hash,
            vendor_hash = EXCLUDED.vendor_hash,
            vendor_id = EXCLUDED.vendor_id,
            feature_highlights = EXCLUDED.feature_highlights,
            vendor_highlights = EXCLUDED.vendor_highlights,
            positive_retail_outlook = EXCLUDED.positive_retail_outlook,
            suggested_questions = EXCLUDED.suggested_questions,
            knowledge_base = EXCLUDED.knowledge_base,
            vendor_updated_at = NOW(),
            updated_at = NOW();
    END IF;
END;
$$;
