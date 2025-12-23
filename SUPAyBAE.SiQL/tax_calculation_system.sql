-- Tax Calculation System for E-commerce Checkout
-- Supports regional tax rates (VAT, GST, etc.) based on shipping destination

-- 1. Tax Rates Configuration Table
CREATE TABLE IF NOT EXISTS public.tax_rates (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    country_code text NOT NULL, -- ISO 3166-1 alpha-2 (GB, KE, US, etc.)
    country_name text NOT NULL,
    tax_rate numeric(5,4) NOT NULL DEFAULT 0.0000, -- Tax rate as decimal (0.2000 = 20%)
    tax_name text NOT NULL DEFAULT 'VAT', -- VAT, GST, Sales Tax, etc.
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tax_rates_pkey PRIMARY KEY (id),
    CONSTRAINT tax_rates_country_code_key UNIQUE (country_code)
);

-- Insert default tax rates for your markets
INSERT INTO public.tax_rates (country_code, country_name, tax_rate, tax_name) VALUES
('GB', 'United Kingdom', 0.2000, 'VAT'), -- 20% VAT
('KE', 'Kenya', 0.1600, 'VAT'), -- 16% VAT
('US', 'United States', 0.0000, 'Sales Tax'), -- Varies by state, default 0%
('DE', 'Germany', 0.1900, 'VAT'), -- 19% VAT
('FR', 'France', 0.2000, 'VAT'), -- 20% VAT
('CA', 'Canada', 0.0500, 'GST'), -- 5% GST (federal only)
('AU', 'Australia', 0.1000, 'GST'), -- 10% GST
('DEFAULT', 'Default', 0.0000, 'Tax') -- Default for unspecified countries
ON CONFLICT (country_code) DO NOTHING;

-- 2. Function to get tax rate for a country
CREATE OR REPLACE FUNCTION public.get_tax_rate(p_country_code text DEFAULT 'DEFAULT')
RETURNS numeric AS $$
DECLARE
    v_tax_rate numeric := 0.0000;
BEGIN
    SELECT tax_rate INTO v_tax_rate
    FROM public.tax_rates
    WHERE country_code = UPPER(p_country_code)
      AND is_active = true;

    -- Return default rate if country not found
    IF v_tax_rate IS NULL THEN
        SELECT tax_rate INTO v_tax_rate
        FROM public.tax_rates
        WHERE country_code = 'DEFAULT';
    END IF;

    RETURN COALESCE(v_tax_rate, 0.0000);
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Function to calculate tax amount for an order
CREATE OR REPLACE FUNCTION public.calculate_order_tax(
    p_subtotal numeric,
    p_delivery_fee numeric DEFAULT 0,
    p_country_code text DEFAULT 'DEFAULT'
)
RETURNS numeric AS $$
DECLARE
    v_tax_rate numeric;
    v_taxable_amount numeric;
    v_tax_amount numeric;
BEGIN
    -- Get tax rate for the country
    v_tax_rate := public.get_tax_rate(p_country_code);

    -- Calculate taxable amount (subtotal + delivery)
    -- Note: Some jurisdictions tax delivery fees, others don't
    -- Here we assume delivery is taxable for simplicity
    v_taxable_amount := p_subtotal + p_delivery_fee;

    -- Calculate tax amount
    v_tax_amount := ROUND(v_taxable_amount * v_tax_rate, 2);

    RETURN v_tax_amount;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Function to get detailed tax breakdown
CREATE OR REPLACE FUNCTION public.get_tax_breakdown(
    p_subtotal numeric,
    p_delivery_fee numeric DEFAULT 0,
    p_country_code text DEFAULT 'DEFAULT'
)
RETURNS jsonb AS $$
DECLARE
    v_tax_rate numeric;
    v_tax_name text;
    v_tax_amount numeric;
    v_result jsonb;
BEGIN
    -- Get tax details
    SELECT tax_rate, tax_name INTO v_tax_rate, v_tax_name
    FROM public.tax_rates
    WHERE country_code = UPPER(p_country_code)
      AND is_active = true;

    -- Fallback to default
    IF v_tax_rate IS NULL THEN
        SELECT tax_rate, tax_name INTO v_tax_rate, v_tax_name
        FROM public.tax_rates
        WHERE country_code = 'DEFAULT';
    END IF;

    -- Calculate tax amount
    v_tax_amount := public.calculate_order_tax(p_subtotal, p_delivery_fee, p_country_code);

    -- Build result
    v_result := jsonb_build_object(
        'tax_rate', v_tax_rate,
        'tax_name', COALESCE(v_tax_name, 'Tax'),
        'tax_amount', v_tax_amount,
        'taxable_amount', p_subtotal + p_delivery_fee,
        'country_code', UPPER(p_country_code),
        'tax_percentage', ROUND(v_tax_rate * 100, 2)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Grant permissions
GRANT SELECT ON public.tax_rates TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tax_rate(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_order_tax(numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tax_breakdown(numeric, numeric, text) TO authenticated;
