-- Migration: Add caching for AI product insights
-- This table stores cached AI-generated spotlights with hash-based change detection
-- Only vendor_highlights regenerates when vendor data changes

-- 1. CREATE THE CACHE TABLE
CREATE TABLE IF NOT EXISTS public.product_ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Cached AI content
    feature_highlights TEXT,
    vendor_highlights TEXT,
    positive_retail_outlook TEXT,
    suggested_questions JSONB DEFAULT '[]',
    
    -- Change detection hashes (MD5 of relevant data)
    product_hash TEXT NOT NULL,
    vendor_hash TEXT,
    vendor_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    vendor_updated_at TIMESTAMPTZ,
    
    UNIQUE(product_id)
);

-- 2. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_product_ai_insights_product_id 
    ON public.product_ai_insights(product_id);

CREATE INDEX IF NOT EXISTS idx_product_ai_insights_vendor_id 
    ON public.product_ai_insights(vendor_id);

-- 3. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE ON public.product_ai_insights TO anon, authenticated;
GRANT ALL ON public.product_ai_insights TO service_role;

-- 4. CREATE RPC FUNCTION TO GET CACHED INSIGHTS
DROP FUNCTION IF EXISTS public.get_cached_product_insights(UUID, TEXT, TEXT);
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
    needs_vendor_update BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cached RECORD;
    v_needs_vendor_update BOOLEAN := FALSE;
BEGIN
    -- Try to find cached insight
    SELECT * INTO v_cached
    FROM public.product_ai_insights
    WHERE product_id = p_product_id;
    
    IF NOT FOUND THEN
        -- No cache exists
        RETURN QUERY SELECT 
            'miss'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::JSONB,
            FALSE;
        RETURN;
    END IF;
    
    -- Check if product data changed (full regeneration needed)
    IF v_cached.product_hash != p_product_hash THEN
        RETURN QUERY SELECT 
            'stale_product'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::JSONB,
            FALSE;
        RETURN;
    END IF;
    
    -- Check if only vendor data changed
    IF p_vendor_hash IS NOT NULL AND v_cached.vendor_hash IS DISTINCT FROM p_vendor_hash THEN
        v_needs_vendor_update := TRUE;
    END IF;
    
    -- Return cached data
    RETURN QUERY SELECT 
        'hit'::TEXT,
        v_cached.feature_highlights,
        v_cached.vendor_highlights,
        v_cached.positive_retail_outlook,
        v_cached.suggested_questions,
        v_needs_vendor_update;
END;
$$;

-- 5. CREATE RPC FUNCTION TO STORE/UPDATE CACHED INSIGHTS
DROP FUNCTION IF EXISTS public.upsert_product_ai_insights(UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, JSONB, BOOLEAN);
CREATE OR REPLACE FUNCTION public.upsert_product_ai_insights(
    p_product_id UUID,
    p_product_hash TEXT,
    p_vendor_hash TEXT DEFAULT NULL,
    p_vendor_id UUID DEFAULT NULL,
    p_feature_highlights TEXT DEFAULT NULL,
    p_vendor_highlights TEXT DEFAULT NULL,
    p_positive_retail_outlook TEXT DEFAULT NULL,
    p_suggested_questions JSONB DEFAULT '[]',
    p_vendor_only BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_vendor_only THEN
        -- Only update vendor_highlights
        UPDATE public.product_ai_insights
        SET 
            vendor_highlights = p_vendor_highlights,
            vendor_hash = p_vendor_hash,
            vendor_id = p_vendor_id,
            vendor_updated_at = NOW(),
            updated_at = NOW()
        WHERE product_id = p_product_id;
    ELSE
        -- Full upsert
        INSERT INTO public.product_ai_insights (
            product_id,
            product_hash,
            vendor_hash,
            vendor_id,
            feature_highlights,
            vendor_highlights,
            positive_retail_outlook,
            suggested_questions,
            vendor_updated_at
        ) VALUES (
            p_product_id,
            p_product_hash,
            p_vendor_hash,
            p_vendor_id,
            p_feature_highlights,
            p_vendor_highlights,
            p_positive_retail_outlook,
            p_suggested_questions,
            NOW()
        )
        ON CONFLICT (product_id) DO UPDATE SET
            product_hash = EXCLUDED.product_hash,
            vendor_hash = EXCLUDED.vendor_hash,
            vendor_id = EXCLUDED.vendor_id,
            feature_highlights = EXCLUDED.feature_highlights,
            vendor_highlights = EXCLUDED.vendor_highlights,
            positive_retail_outlook = EXCLUDED.positive_retail_outlook,
            suggested_questions = EXCLUDED.suggested_questions,
            vendor_updated_at = NOW(),
            updated_at = NOW();
    END IF;
END;
$$;

-- 6. GRANT EXECUTE PERMISSIONS ON FUNCTIONS
GRANT EXECUTE ON FUNCTION public.get_cached_product_insights TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_product_ai_insights TO service_role;

-- ============================================================
-- 7. Q&A CACHE: Store question-answer pairs per product
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_ai_qa_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    question_hash TEXT NOT NULL, -- MD5 hash of normalized question
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    
    UNIQUE(product_id, question_hash)
);

-- Q&A Cache Indexes
CREATE INDEX IF NOT EXISTS idx_qa_cache_product_question 
    ON public.product_ai_qa_cache(product_id, question_hash);

CREATE INDEX IF NOT EXISTS idx_qa_cache_expires 
    ON public.product_ai_qa_cache(expires_at);

-- Q&A Cache Permissions
GRANT SELECT, INSERT, UPDATE ON public.product_ai_qa_cache TO anon, authenticated;
GRANT ALL ON public.product_ai_qa_cache TO service_role;

-- 8. RPC: Get cached Q&A answer (computes MD5 hash of question)
DROP FUNCTION IF EXISTS public.get_cached_qa(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.get_cached_qa(
    p_product_id UUID,
    p_question TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_answer TEXT;
    v_hash TEXT;
BEGIN
    -- Compute hash same way as upsert_cached_qa
    v_hash := md5(lower(trim(p_question)));
    
    SELECT answer INTO v_answer
    FROM public.product_ai_qa_cache
    WHERE product_id = p_product_id
      AND question_hash = v_hash
      AND expires_at > NOW();
    
    RETURN v_answer;
END;
$$;

-- 9. RPC: Store Q&A answer with 30-day TTL
CREATE OR REPLACE FUNCTION public.upsert_cached_qa(
    p_product_id UUID,
    p_question TEXT,
    p_answer TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hash TEXT;
BEGIN
    -- Create hash from normalized question (lowercase, trimmed)
    v_hash := md5(lower(trim(p_question)));
    
    INSERT INTO public.product_ai_qa_cache (
        product_id,
        question_hash,
        question,
        answer,
        expires_at
    ) VALUES (
        p_product_id,
        v_hash,
        p_question,
        p_answer,
        NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (product_id, question_hash) DO UPDATE SET
        answer = EXCLUDED.answer,
        expires_at = NOW() + INTERVAL '30 days';
END;
$$;

-- Q&A RPC Permissions
GRANT EXECUTE ON FUNCTION public.get_cached_qa TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_cached_qa TO anon, authenticated, service_role;
