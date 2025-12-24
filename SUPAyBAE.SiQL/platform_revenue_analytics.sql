-- Platform Revenue Analytics View & Dependencies
-- Aggregates revenue from orders for the Admin Dashboard

-- ============================================================================
-- STEP 1: Drop dependent views first (to avoid CASCADE issues in future)
-- ============================================================================
DROP VIEW IF EXISTS public.monthly_profit_summary CASCADE;
DROP VIEW IF EXISTS public.platform_revenue_analytics CASCADE;

-- ============================================================================
-- STEP 2: Create the Platform Revenue Analytics View
-- This is a comprehensive view that provides order-level and daily aggregated data
-- ============================================================================
CREATE OR REPLACE VIEW public.platform_revenue_analytics AS
SELECT
    o.id AS id,
    o.id AS order_id,
    DATE(o.created_at) AS transaction_date,
    o.status AS order_status,
    
    -- Revenue metrics
    COALESCE(o.total, 0) AS total_revenue,
    COALESCE(o.total, 0) AS gross_revenue,
    
    -- Platform commission (assuming 10% platform fee, adjust as needed)
    COALESCE(o.total * 0.10, 0) AS platform_commission,
    COALESCE(o.total * 0.10, 0) AS platform_net_profit,
    
    -- Seller payouts (90% goes to sellers)
    COALESCE(o.total * 0.90, 0) AS seller_payouts

FROM public.orders o
WHERE o.status IN ('completed', 'delivered')
ORDER BY o.created_at DESC;

-- Add a comment to the view
COMMENT ON VIEW public.platform_revenue_analytics IS 'Order-level revenue analytics. Used by Admin Dashboard for financial performance chart.';

-- ============================================================================
-- STEP 3: Recreate the Monthly Profit Summary View (dependent view)
-- ============================================================================
CREATE OR REPLACE VIEW public.monthly_profit_summary AS
SELECT 
    date_trunc('month', transaction_date) AS month,
    SUM(gross_revenue) AS total_sales,
    SUM(platform_net_profit) AS total_net_profit,
    COUNT(order_id) AS total_orders
FROM platform_revenue_analytics
WHERE order_status = 'delivered'
GROUP BY date_trunc('month', transaction_date)
ORDER BY date_trunc('month', transaction_date) DESC;

-- Add a comment to the view
COMMENT ON VIEW public.monthly_profit_summary IS 'Monthly aggregated profit summary derived from platform_revenue_analytics.';
