 $\text{PL/pgSQL}$ Function (Corrected for Schema)This function has been fixed to derive $\text{seller\_id}$ via the $\text{JOIN}$ and use o.total_price.SQL-- Function to get dashboard overview stats (FIXED FOR SCHEMA)
CREATE OR REPLACE FUNCTION get_seller_stats(p_seller_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'pending_orders', (
            SELECT COUNT(DISTINCT o.id) FROM public.orders o
            JOIN public.order_items oi ON o.id = oi.order_id
            JOIN public.products p ON oi.product_id = p.id
            WHERE p.seller_id = p_seller_id AND o.status = 'pending'
        ),
        'pending_returns', (
            SELECT COUNT(DISTINCT r.id) FROM public.return_requests r
            JOIN public.orders o ON r.order_id = o.id
            JOIN public.order_items oi ON o.id = oi.order_id
            JOIN public.products p ON oi.product_id = p.id
            WHERE p.seller_id = p_seller_id AND r.status = 'pending'
        ),
        'active_coupons', (SELECT count(*) FROM public.coupons WHERE seller_id = p_seller_id AND status = 'Ongoing'),
        'balance', (SELECT COALESCE(SUM(amount), 0) FROM public.seller_transactions WHERE seller_id = p_seller_id),
        'total_products', (SELECT count(*) FROM public.products WHERE seller_id = p_seller_id),
        'low_stock_count', (SELECT count(*) FROM public.products p JOIN public.product_variants v ON p.id = v.product_id WHERE p.seller_id = p_seller_id AND v.stock < 5),
        'total_sales', (
            SELECT COALESCE(SUM(o.total_price), 0) FROM public.orders o -- Corrected to total_price
            JOIN public.order_items oi ON o.id = oi.order_id
            JOIN public.products p ON oi.product_id = p.id
            WHERE p.seller_id = p_seller_id AND o.status = 'completed'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
4. 📊 Analytical Views (Corrected for Schema)The views are updated to derive $\text{seller\_id}$ via $\text{JOINs}$, use o.user_id for the buyer, and use o.total_price.SQL-- -----------------------------------------------------------------------------
-- Pre-emptive drop to bypass "cannot drop columns from view" errors
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.vw_monthly_seller_financials;
DROP VIEW IF EXISTS public.vw_low_stock_inventory;
DROP VIEW IF EXISTS public.vw_coupon_performance;
DROP VIEW IF EXISTS public.vw_seller_order_summary;


-- -----------------------------------------------------------------------------
-- VIEW 1: vw_monthly_seller_financials (FIXED)
-- Rerun to ensure clean creation. This relies on seller_transactions which is correct.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_monthly_seller_financials AS
SELECT
    t.seller_id,
    DATE_TRUNC('month', t.transaction_date) AS sales_month,
    COUNT(DISTINCT t.order_id) AS total_orders,
    SUM(CASE WHEN t.transaction_type = 'Order Payment' THEN t.amount ELSE 0 END) AS gross_merchandise_value_gmv,
    SUM(CASE WHEN t.transaction_type IN ('Commission', 'Subscription Fee', 'Shipping Label') THEN t.amount ELSE 0 END) AS total_marketplace_fees,
    (
        SUM(CASE WHEN t.transaction_type = 'Order Payment' THEN t.amount ELSE 0 END) -
        SUM(CASE WHEN t.transaction_type IN ('Commission', 'Subscription Fee', 'Shipping Label') THEN t.amount ELSE 0 END)
    ) AS net_revenue
FROM
    public.seller_transactions t
GROUP BY
    t.seller_id,
    sales_month
ORDER BY
    sales_month DESC;


-- -----------------------------------------------------------------------------
-- VIEW 2: vw_low_stock_inventory (Relies on products.seller_id and product_variants.stock)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_low_stock_inventory AS
SELECT
    p.seller_id,
    p.id AS product_id,
    p.title AS product_title,
    v.id AS variant_id,
    v.sku,
    v.stock AS current_stock_level,
    v.price AS current_selling_price,
    CASE
        WHEN v.stock <= 0 THEN 'CRITICAL - Out of Stock'
        WHEN v.stock < 5 THEN 'LOW - Reorder Now'
        ELSE 'Adequate'
    END AS stock_status_flag
FROM
    public.products p
JOIN
    public.product_variants v ON p.id = v.product_id
WHERE
    v.stock <= 10
ORDER BY
    p.seller_id,
    v.stock ASC;


-- -----------------------------------------------------------------------------
-- VIEW 3: vw_coupon_performance (Relies on coupons.seller_id)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_coupon_performance AS
SELECT
    c.seller_id,
    c.name AS coupon_name,
    c.code,
    c.status AS coupon_status,
    c.total_quantity,
    c.claimed_quantity,
    c.used_quantity,
    (c.used_quantity::DECIMAL / NULLIF(c.total_quantity, 0)) AS usage_rate,
    c.start_time,
    c.end_time
FROM
    public.coupons c
ORDER BY
    c.used_quantity DESC;


-- -----------------------------------------------------------------------------
-- VIEW 4: vw_seller_order_summary (FIXED FOR SCHEMA)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_seller_order_summary AS
SELECT
    o.id AS order_id,
    p.seller_id, -- Derived from products table
    o.total_price, -- Corrected column name
    o.status AS order_status,
    o.created_at AS order_date,
    o.user_id AS customer_id, -- Corrected column name
    COUNT(oi.id) AS item_count,
    r.status AS return_status
FROM
    public.orders o
JOIN
    public.order_items oi ON o.id = oi.order_id
JOIN
    public.products p ON oi.product_id = p.id
LEFT JOIN
    public.return_requests r ON o.id = r.order_id
GROUP BY
    o.id, p.seller_id, r.status, o.total_price, o.status, o.created_at, o.user_id
ORDER BY
    o.created_at DESC;