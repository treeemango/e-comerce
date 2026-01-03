-- Migration: Hero Banner Cache with Global Country Support
-- Creates caching infrastructure for AI-generated event-aware hero banners

-- 1. CREATE THE CACHE TABLE
CREATE TABLE IF NOT EXISTS public.hero_banner_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code TEXT NOT NULL DEFAULT 'GLOBAL',    -- ISO country code: "KE", "US", "NG", "GLOBAL"
    event_name TEXT NOT NULL,                        -- "Valentine's Day", "Jamhuri Day", "default"
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    banner_data JSONB NOT NULL,                      -- {headline, subheadline, cta, backgroundColor, accentColor, vibe}
    version INTEGER DEFAULT 1,
    
    UNIQUE(country_code, event_name)
);

-- 2. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_hero_banner_cache_country 
    ON public.hero_banner_cache(country_code);

CREATE INDEX IF NOT EXISTS idx_hero_banner_cache_expires 
    ON public.hero_banner_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_hero_banner_cache_lookup 
    ON public.hero_banner_cache(country_code, expires_at);

-- 3. GRANT PERMISSIONS
GRANT SELECT ON public.hero_banner_cache TO anon, authenticated;
GRANT ALL ON public.hero_banner_cache TO service_role;

-- 4. RPC: GET CACHED HERO BANNER
-- Returns cached banner if valid, null otherwise
DROP FUNCTION IF EXISTS public.get_cached_hero_banner(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_cached_hero_banner(
    p_country_code TEXT,
    p_event_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    banner_data JSONB,
    event_name TEXT,
    expires_at TIMESTAMPTZ,
    cache_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cached RECORD;
BEGIN
    -- Try to find cached banner for country + event
    SELECT hbc.banner_data, hbc.event_name, hbc.expires_at
    INTO v_cached
    FROM public.hero_banner_cache hbc
    WHERE hbc.country_code = COALESCE(p_country_code, 'GLOBAL')
      AND (p_event_name IS NULL OR hbc.event_name = p_event_name)
      AND hbc.expires_at > NOW()
    ORDER BY hbc.generated_at DESC
    LIMIT 1;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            v_cached.banner_data,
            v_cached.event_name,
            v_cached.expires_at,
            'hit'::TEXT;
        RETURN;
    END IF;
    
    -- Try global fallback if country-specific not found
    IF p_country_code != 'GLOBAL' THEN
        SELECT hbc.banner_data, hbc.event_name, hbc.expires_at
        INTO v_cached
        FROM public.hero_banner_cache hbc
        WHERE hbc.country_code = 'GLOBAL'
          AND hbc.expires_at > NOW()
        ORDER BY hbc.generated_at DESC
        LIMIT 1;
        
        IF FOUND THEN
            RETURN QUERY SELECT 
                v_cached.banner_data,
                v_cached.event_name,
                v_cached.expires_at,
                'global_fallback'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- No cache found
    RETURN QUERY SELECT 
        NULL::JSONB,
        NULL::TEXT,
        NULL::TIMESTAMPTZ,
        'miss'::TEXT;
END;
$$;

-- 5. RPC: UPSERT HERO BANNER CACHE
DROP FUNCTION IF EXISTS public.upsert_hero_banner_cache(TEXT, TEXT, JSONB, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.upsert_hero_banner_cache(
    p_country_code TEXT,
    p_event_name TEXT,
    p_banner_data JSONB,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Default expiration: end of current day
    v_expires_at := COALESCE(p_expires_at, (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ);
    
    INSERT INTO public.hero_banner_cache (
        country_code,
        event_name,
        banner_data,
        expires_at
    ) VALUES (
        COALESCE(p_country_code, 'GLOBAL'),
        p_event_name,
        p_banner_data,
        v_expires_at
    )
    ON CONFLICT (country_code, event_name) DO UPDATE SET
        banner_data = EXCLUDED.banner_data,
        expires_at = EXCLUDED.expires_at,
        generated_at = NOW(),
        version = hero_banner_cache.version + 1;
END;
$$;

-- 6. RPC: CLEANUP EXPIRED BANNERS (for scheduled jobs)
CREATE OR REPLACE FUNCTION public.cleanup_expired_hero_banners()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.hero_banner_cache
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- 7. GRANT EXECUTE PERMISSIONS
GRANT EXECUTE ON FUNCTION public.get_cached_hero_banner TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_hero_banner_cache TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_hero_banners TO service_role;

-- 8. COMMENT ON TABLE
COMMENT ON TABLE public.hero_banner_cache IS 'Caches AI-generated hero banners per country and event with daily expiration';
