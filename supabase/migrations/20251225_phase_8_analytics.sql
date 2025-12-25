-- Phase 8: Seller Analytics Schema

-- Table: seller_daily_metrics
CREATE TABLE IF NOT EXISTS public.seller_daily_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES auth.users(id),
    date DATE NOT NULL,
    total_sales DECIMAL(10, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    visitors INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage
    aov DECIMAL(10, 2) DEFAULT 0, -- Average Order Value
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(seller_id, date)
);

-- Table: seller_traffic_sources
CREATE TABLE IF NOT EXISTS public.seller_traffic_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES auth.users(id),
    date DATE NOT NULL,
    source TEXT NOT NULL, -- e.g., 'Internal Search', 'External', 'Direct'
    visits INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(seller_id, date, source)
);

-- Table: seller_regional_sales
CREATE TABLE IF NOT EXISTS public.seller_regional_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES auth.users(id),
    date DATE NOT NULL,
    region TEXT NOT NULL, -- e.g., 'Nairobi', 'Mombasa'
    order_count INTEGER DEFAULT 0,
    sales_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(seller_id, date, region)
);

-- RLS Policies
ALTER TABLE public.seller_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_traffic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_regional_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own metrics" ON public.seller_daily_metrics
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can view own traffic" ON public.seller_traffic_sources
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can view own regional sales" ON public.seller_regional_sales
    FOR SELECT USING (auth.uid() = seller_id);

-- Function: get_seller_analytics_summary
CREATE OR REPLACE FUNCTION get_seller_analytics_summary(
    p_seller_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_sales DECIMAL;
    v_total_orders INTEGER;
    v_total_visitors INTEGER;
    v_avg_conversion DECIMAL;
    v_avg_aov DECIMAL;
    v_daily_trend JSONB;
    v_traffic_sources JSONB;
    v_regional_sales JSONB;
BEGIN
    -- Verify user is accessing their own data
    IF auth.uid() <> p_seller_id THEN
        RAISE EXCEPTION 'Unauthorized access to analytics';
    END IF;

    -- Aggregate Metrics
    SELECT 
        COALESCE(SUM(total_sales), 0),
        COALESCE(SUM(total_orders), 0),
        COALESCE(SUM(visitors), 0),
        COALESCE(AVG(conversion_rate), 0),
        COALESCE(AVG(aov), 0)
    INTO 
        v_total_sales,
        v_total_orders,
        v_total_visitors,
        v_avg_conversion,
        v_avg_aov
    FROM seller_daily_metrics
    WHERE seller_id = p_seller_id AND date BETWEEN p_start_date AND p_end_date;

    -- Daily Trend
    SELECT jsonb_agg(t) INTO v_daily_trend
    FROM (
        SELECT date, total_sales, total_orders, visitors
        FROM seller_daily_metrics
        WHERE seller_id = p_seller_id AND date BETWEEN p_start_date AND p_end_date
        ORDER BY date ASC
    ) t;

    -- Traffic Sources
    SELECT jsonb_agg(t) INTO v_traffic_sources
    FROM (
        SELECT source, SUM(visits) as total_visits
        FROM seller_traffic_sources
        WHERE seller_id = p_seller_id AND date BETWEEN p_start_date AND p_end_date
        GROUP BY source
        ORDER BY total_visits DESC
    ) t;

    -- Regional Sales
    SELECT jsonb_agg(t) INTO v_regional_sales
    FROM (
        SELECT region, SUM(order_count) as total_orders, SUM(sales_amount) as total_sales
        FROM seller_regional_sales
        WHERE seller_id = p_seller_id AND date BETWEEN p_start_date AND p_end_date
        GROUP BY region
        ORDER BY total_sales DESC
        LIMIT 10
    ) t;

    RETURN jsonb_build_object(
        'summary', jsonb_build_object(
            'total_sales', v_total_sales,
            'total_orders', v_total_orders,
            'total_visitors', v_total_visitors,
            'avg_conversion_rate', v_avg_conversion,
            'avg_aov', v_avg_aov
        ),
        'daily_trend', COALESCE(v_daily_trend, '[]'::jsonb),
        'traffic_sources', COALESCE(v_traffic_sources, '[]'::jsonb),
        'regional_sales', COALESCE(v_regional_sales, '[]'::jsonb)
    );
END;
$$;
