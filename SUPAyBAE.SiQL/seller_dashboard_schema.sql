-- Seller Dashboard Schema Extensions
-- This file defines the new tables and relationships required to replace mock data in the Seller Dashboard.

-------------------------------------------------------------------------------
-- 1. Shipping Templates & Settings (Supports EditShippingTemplateView, etc.)
-------------------------------------------------------------------------------

CREATE TABLE public.shipping_templates (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) ON DELETE CASCADE,
    name                       TEXT      NOT NULL,
    is_free_shipping_enabled   BOOLEAN   DEFAULT FALSE,
    free_shipping_threshold    DECIMAL(10, 2), -- e.g. Free above $30
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.shipping_template_regions (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id                UUID      REFERENCES public.shipping_templates(id) ON DELETE CASCADE,
    region_names               TEXT[]    NOT NULL, -- Array of state/region names
    address_types              JSONB,    -- e.g. {"street": true, "po_box": false}
    transit_time_min           INT,      -- e.g. 2 days
    transit_time_max           INT,      -- e.g. 5 days
    shipping_fee               DECIMAL(10, 2) DEFAULT 0.00
);

CREATE TABLE public.seller_addresses (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) ON DELETE CASCADE,
    address_name               TEXT      NOT NULL, -- e.g. "Warehouse 1"
    contact_person             TEXT,
    phone_number               TEXT,
    street_address             TEXT,
    city                       TEXT,
    state                      TEXT,
    zip_code                   TEXT,
    country                    TEXT,
    is_default                 BOOLEAN   DEFAULT FALSE,
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 2. Promotions & Coupons (Supports PromotionsCouponsView, CreateCouponView)
-------------------------------------------------------------------------------

CREATE TABLE public.coupons (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) ON DELETE CASCADE,
    name                       TEXT      NOT NULL,
    code                       TEXT,     -- Optional code for coupon
    discount_amount            DECIMAL(10, 2), -- Fixed amount discount
    discount_percentage        INT,      -- OR percentage discount
    start_time                 TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time                   TIMESTAMP WITH TIME ZONE NOT NULL,
    status                     TEXT      CHECK (status IN ('Ongoing', 'Upcoming', 'Expired', 'Deactivated')),
    total_quantity             INT       NOT NULL,
    claimed_quantity           INT       DEFAULT 0,
    used_quantity              INT       DEFAULT 0,
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.coupon_products (
    coupon_id                  UUID      REFERENCES public.coupons(id) ON DELETE CASCADE,
    product_id                 UUID      REFERENCES public.products(id) ON DELETE CASCADE,
    PRIMARY KEY (coupon_id, product_id)
);

CREATE TABLE public.promotional_campaigns (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) ON DELETE CASCADE,
    name                       TEXT      NOT NULL,
    type                       TEXT,     -- 'Flash Sale', 'Seasonal', etc.
    start_time                 TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time                   TIMESTAMP WITH TIME ZONE NOT NULL,
    status                     TEXT      CHECK (status IN ('Draft', 'Scheduled', 'Active', 'Ended')),
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 3. Returns Management (Supports ManageReturnsView)
-------------------------------------------------------------------------------

CREATE TABLE public.return_requests (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id                   UUID      REFERENCES public.orders(id), -- FK to parent order
    user_id                    UUID      REFERENCES auth.users(id), -- FK to buyer
    product_id                 UUID      REFERENCES public.products(id),
    return_reason              TEXT,
    quantity                   INT       DEFAULT 1,
    buyer_comment              TEXT,
    status                     TEXT      CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'completed')),
    is_auto_authorized         BOOLEAN   DEFAULT FALSE,
    tracking_number            TEXT,
    refund_amount              DECIMAL(10, 2),
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.return_history (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    return_id                  UUID      REFERENCES public.return_requests(id) ON DELETE CASCADE,
    action                     TEXT,     -- e.g. "Approved", "Refunded"
    performed_by               UUID      REFERENCES auth.users(id), -- Staff user ID
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 4. Financials & Payments (Supports PaymentsView)
-------------------------------------------------------------------------------

CREATE TABLE public.seller_transactions (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) NOT NULL,
    order_id                   UUID      REFERENCES public.orders(id), -- Optional
    batch_id                   TEXT,     -- For grouped payouts
    transaction_type           TEXT      NOT NULL, -- 'Order Payment', 'Refund', 'Subscription Fee', etc.
    amount                     DECIMAL(10, 2) NOT NULL, -- Negative for debits, Positive for credits
    product_charges            DECIMAL(10, 2) DEFAULT 0,
    other_charges              DECIMAL(10, 2) DEFAULT 0, -- Shipping, fees
    description                TEXT,
    transaction_date           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.seller_payment_methods (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) NOT NULL,
    type                       TEXT      NOT NULL, -- 'Credit Card', 'Bank Account'
    last4                      TEXT,
    details                    JSONB,    -- Encrypted or tokenized info reference
    is_default                 BOOLEAN   DEFAULT FALSE,
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 5. Order Reports & Files (Supports Bulk Uploads)
-------------------------------------------------------------------------------

CREATE TABLE public.order_reports (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) NOT NULL,
    report_type                TEXT      NOT NULL, -- 'Unshipped orders', 'Return requests', etc.
    batch_id                   TEXT,
    status                     TEXT      CHECK (status IN ('Processing', 'Ready', 'Failed')),
    download_url               TEXT,
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.order_file_uploads (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) NOT NULL,
    file_name                  TEXT      NOT NULL,
    file_type                  TEXT,     -- 'Shipping Confirmation', etc.
    records_processed          INT       DEFAULT 0,
    status                     TEXT      CHECK (status IN ('Uploaded', 'Processing', 'Success', 'Failed')),
    error_log                  TEXT,
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.product_bulk_uploads (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) NOT NULL,
    file_name                  TEXT      NOT NULL,
    status                     TEXT      CHECK (status IN ('Uploaded', 'Processing', 'Completed', 'Failed')),
    total_records              INT       DEFAULT 0,
    success_count              INT       DEFAULT 0,
    error_report_url           TEXT,
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 6. Product Compliance (Supports ProductComplianceView)
-------------------------------------------------------------------------------

CREATE TABLE public.product_compliance (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id                 UUID      REFERENCES public.products(id) ON DELETE CASCADE,
    document_type              TEXT      NOT NULL, -- 'CPC', 'UL', 'FCC', etc.
    document_url               TEXT,
    status                     TEXT      DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Rejected')),
    rejection_reason           TEXT,
    submitted_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 7. Pricing Health (Supports PricingHealthView)
-------------------------------------------------------------------------------

CREATE TABLE public.pricing_suggestions (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id                 UUID      REFERENCES public.products(id) ON DELETE CASCADE,
    seller_id                  UUID      REFERENCES auth.users(id) NOT NULL,
    pricing_id                 TEXT      NOT NULL, -- Helper ID for frontend display
    current_price              DECIMAL(10, 2),
    suggested_reference_price  DECIMAL(10, 2),
    status                     TEXT      CHECK (status IN ('action_required', 'accepted', 'rejected', 'in_process')),
    days_left                  INT       DEFAULT 14,
    accepted_at                TIMESTAMP WITH TIME ZONE,
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 8. Seller Performance Metrics
-------------------------------------------------------------------------------

CREATE TABLE public.seller_performance_metrics (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_type                TEXT      NOT NULL, -- 'late_shipment_rate', 'cancellation_rate', etc.
    value                      DECIMAL(10, 2), -- The actual metric value
    target_value               DECIMAL(10, 2), -- The goal (e.g., < 4%)
    status                     TEXT      CHECK (status IN ('Healthy', 'At Risk', 'Critical')),
    updated_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 9. Apps & Services
-------------------------------------------------------------------------------

CREATE TABLE public.marketplace_apps (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    name                       TEXT      NOT NULL,
    description                TEXT,
    icon_url                   TEXT,
    price                      DECIMAL(10, 2), -- 0 for free
    is_active                  BOOLEAN   DEFAULT TRUE,
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.seller_app_subscriptions (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id                     UUID      REFERENCES public.marketplace_apps(id),
    status                     TEXT      CHECK (status IN ('active', 'expired', 'cancelled')),
    start_date                 TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    renewal_date               TIMESTAMP WITH TIME ZONE
);

-------------------------------------------------------------------------------
-- 10. Extended Seller Profile & Teams
-------------------------------------------------------------------------------

CREATE TABLE public.seller_profiles_extended (
    seller_id                  UUID      REFERENCES auth.users(id) PRIMARY KEY,
    legal_business_name        TEXT,
    tax_id                     TEXT,
    business_address           JSONB,
    notification_preferences   JSONB,    -- e.g. {"orders": true, "returns": true}
    return_settings            JSONB,    -- e.g. {"auto_authorize": true, "return_address_id": "..."}
    updated_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.seller_team_members (
    id                         UUID      DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id                  UUID      REFERENCES auth.users(id) NOT NULL, -- Main account owner (Business ID)
    user_id                    UUID      REFERENCES auth.users(id), -- The team member user account
    role                       TEXT      NOT NULL, -- 'Admin', 'Editor', 'Viewer'
    permissions                JSONB,    -- Granular permissions e.g. {"orders": "read", "products": "write"}
    created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- FUNCTIONS (PL/pgSQL)
-------------------------------------------------------------------------------

-- Function to get dashboard overview stats
CREATE OR REPLACE FUNCTION get_seller_stats(p_seller_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'pending_orders', (SELECT count(*) FROM public.orders WHERE seller_id = p_seller_id AND status = 'pending'),
        'pending_returns', (SELECT count(*) FROM public.return_requests r JOIN public.orders o ON r.order_id = o.id WHERE o.seller_id = p_seller_id AND r.status = 'pending'),
        'active_coupons', (SELECT count(*) FROM public.coupons WHERE seller_id = p_seller_id AND status = 'Ongoing'),
        'balance', (SELECT COALESCE(SUM(amount), 0) FROM public.seller_transactions WHERE seller_id = p_seller_id),
        'total_products', (SELECT count(*) FROM public.products WHERE seller_id = p_seller_id),
        'low_stock_count', (SELECT count(*) FROM public.products p JOIN public.product_variants v ON p.id = v.product_id WHERE p.seller_id = p_seller_id AND v.stock < 5), -- Corrected to use v.stock
        'total_sales', (SELECT COALESCE(SUM(total_amount), 0) FROM public.orders WHERE seller_id = p_seller_id AND status = 'completed')
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.shipping_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can manage their own templates" ON public.shipping_templates
    USING (auth.uid() = seller_id);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can manage their own coupons" ON public.coupons
    USING (auth.uid() = seller_id);

ALTER TABLE public.seller_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can view their own transactions" ON public.seller_transactions
    USING (auth.uid() = seller_id);
    
ALTER TABLE public.pricing_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can view their own pricing suggestions" ON public.pricing_suggestions
    USING (auth.uid() = seller_id);