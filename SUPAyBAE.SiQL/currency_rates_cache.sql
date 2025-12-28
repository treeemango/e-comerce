-- Currency rates caching table for efficient currency conversions
-- Stores exchange rates with configurable expiry times

CREATE TABLE IF NOT EXISTS currency_rates (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,8) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(from_currency, to_currency)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_currency_rates_lookup ON currency_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_currency_rates_expiry ON currency_rates(expires_at);

-- Function to get cached exchange rate
CREATE OR REPLACE FUNCTION get_cached_exchange_rate(
    p_from_currency TEXT,
    p_to_currency TEXT
) RETURNS DECIMAL(15,8) AS $$
DECLARE
    cached_rate DECIMAL(15,8);
BEGIN
    -- Try to get valid cached rate
    SELECT rate INTO cached_rate
    FROM currency_rates
    WHERE from_currency = UPPER(p_from_currency)
      AND to_currency = UPPER(p_to_currency)
      AND expires_at > NOW();

    RETURN cached_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to update cached exchange rate
CREATE OR REPLACE FUNCTION update_cached_exchange_rate(
    p_from_currency TEXT,
    p_to_currency TEXT,
    p_rate DECIMAL(15,8),
    p_cache_hours INTEGER DEFAULT 2
) RETURNS VOID AS $$
BEGIN
    INSERT INTO currency_rates (from_currency, to_currency, rate, expires_at)
    VALUES (
        UPPER(p_from_currency),
        UPPER(p_to_currency),
        p_rate,
        NOW() + INTERVAL '1 hour' * p_cache_hours
    )
    ON CONFLICT (from_currency, to_currency)
    DO UPDATE SET
        rate = EXCLUDED.rate,
        last_updated = NOW(),
        expires_at = EXCLUDED.expires_at;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired rates (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_rates() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM currency_rates WHERE expires_at <= NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE currency_rates IS 'Caches currency exchange rates to minimize API calls';
COMMENT ON FUNCTION get_cached_exchange_rate(TEXT, TEXT) IS 'Retrieves valid cached exchange rate or returns null';
COMMENT ON FUNCTION update_cached_exchange_rate(TEXT, TEXT, DECIMAL, INTEGER) IS 'Updates or inserts cached exchange rate with expiry';
COMMENT ON FUNCTION cleanup_expired_rates() IS 'Removes expired cached rates, returns count deleted';
