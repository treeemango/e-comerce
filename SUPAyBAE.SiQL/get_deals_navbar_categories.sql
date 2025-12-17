DROP FUNCTION IF EXISTS get_deals_navbar_categories;

CREATE OR REPLACE FUNCTION get_deals_navbar_categories(
  p_user_id UUID DEFAULT NULL,
  department_limit INT DEFAULT 4,
  categories_per_department INT DEFAULT 8,
  min_deals_per_category INT DEFAULT 1,
  personalization_weight NUMERIC DEFAULT 0.4,
  include_all_categories BOOLEAN DEFAULT false
)
RETURNS TABLE (
  department_id UUID,
  department_name TEXT,
  department_handle TEXT,
  category_id UUID,
  category_name TEXT,
  category_handle TEXT,
  featured_deal_id UUID,
  featured_deal_title TEXT,
  featured_deal_image_url TEXT,
  featured_deal_price NUMERIC,
  featured_deal_original_price NUMERIC,
  featured_deal_discount_percent NUMERIC,
  deal_type TEXT,
  deal_ends_at TIMESTAMPTZ,
  active_deals_count INT,
  total_discount_avg NUMERIC,
  hot_deal_available BOOLEAN,
  base_deal_score NUMERIC,
  personalization_score NUMERIC,
  final_score NUMERIC,
  department_sort_order INT,
  user_has_history_with_category BOOLEAN,
  deal_priority TEXT
)
LANGUAGE SQL
AS $$
WITH RECENT_WINDOW AS (
    SELECT NOW() - INTERVAL '7 days' AS cutoff
),
-- 1. USER BEHAVIOR HISTORY
user_behavior AS (
    SELECT 
        p.category_id,
        p.seller_id AS vendor_id,
        COUNT(*) * 0.7 AS weight,
        MAX(o.created_at) AS last_interaction
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = p_user_id
        AND o.status IN ('completed', 'shipped')
        AND o.created_at > NOW() - INTERVAL '90 days'
    GROUP BY p.category_id, p.seller_id
    
    UNION ALL
    
    SELECT 
        p.category_id,
        p.seller_id AS vendor_id,
        COUNT(*) * 0.3 AS weight,
        MAX(upv.viewed_at) AS last_interaction
    FROM user_product_views upv
    JOIN products p ON upv.product_id = p.id
    WHERE upv.user_id = p_user_id
        AND upv.viewed_at > NOW() - INTERVAL '30 days'
    GROUP BY p.category_id, p.seller_id
),
user_preferences AS (
    SELECT 
        category_id,
        vendor_id,
        SUM(weight) AS preference_score,
        CASE 
            WHEN MAX(last_interaction) > NOW() - INTERVAL '7 days' THEN 1.2
            WHEN MAX(last_interaction) > NOW() - INTERVAL '30 days' THEN 1.0
            ELSE 0.8
        END AS recency_boost
    FROM user_behavior
    GROUP BY category_id, vendor_id
),
max_preference AS (
    SELECT COALESCE(MAX(preference_score * recency_boost), 1) AS max_score 
    FROM user_preferences
),
-- 2. ACTIVE COUPONS WITH SPECIFIC PRODUCTS
ACTIVE_COUPONS_WITH_PRODUCTS AS (
    SELECT 
        c.id as coupon_id,
        c.name as coupon_name,
        c.discount_amount,
        c.discount_percentage,
        c.start_time,
        c.end_time,
        c.seller_id as vendor_id,
        cp.product_id,
        p.category_id,
        p.title as product_title,
        p.rating,
        p.view_count,
        pv.price as current_price,
        COALESCE(pv.original_price, pv.price * 1.3) as original_price,
        pv.discount_percent as product_discount_percent,
        -- Calculate total discount
        COALESCE(
            c.discount_percentage,
            CASE 
                WHEN c.discount_amount IS NOT NULL AND pv.price > 0 
                THEN (c.discount_amount / pv.price) * 100
                ELSE 0
            END
        ) as coupon_discount_percent,
        -- Combined discount (capped at 90%)
        LEAST(
            COALESCE(
                c.discount_percentage,
                CASE 
                    WHEN c.discount_amount IS NOT NULL AND pv.price > 0 
                    THEN (c.discount_amount / pv.price) * 100
                    ELSE 0
                END
            ) + COALESCE(pv.discount_percent, 0),
            90
        ) as total_discount_percent,
        -- Time urgency (0-1, higher = more urgent)
        CASE 
            WHEN (c.end_time - NOW()) < INTERVAL '24 hours' THEN 1.0
            WHEN (c.end_time - NOW()) < INTERVAL '3 days' THEN 0.7
            WHEN (c.end_time - NOW()) < INTERVAL '7 days' THEN 0.3
            ELSE 0.1
        END as time_urgency,
        -- Get product image
        COALESCE(
            (SELECT m.image_url FROM media m WHERE m.product_id = p.id AND m.is_main = true LIMIT 1),
            (SELECT m.image_url FROM media m WHERE m.product_id = p.id ORDER BY m.position ASC LIMIT 1),
            '/images/default-product.jpg'
        ) as product_image_url
    FROM coupons c
    JOIN coupon_products cp ON c.id = cp.coupon_id
    JOIN products p ON cp.product_id = p.id AND p.status IN ('active','approved')
    JOIN product_variants pv ON p.id = pv.product_id AND pv.is_default = true
    WHERE c.status = 'Ongoing'
      AND c.start_time <= NOW()
      AND c.end_time > NOW()
      AND c.claimed_quantity < c.total_quantity
      AND pv.stock > 0
),
-- 3. ACTIVE PRODUCT DEALS (non-coupon)
ACTIVE_PRODUCT_DEALS AS (
    SELECT 
        p.category_id,
        p.id as deal_id,
        p.title,
        p.seller_id as vendor_id,
        p.is_flash_sale,
        p.flash_sale_end as deal_end,
        p.is_lightning_deal,
        p.lightning_ends_at as lightning_end,
        p.created_at,
        p.view_count,
        p.rating,
        v.price as current_price,
        COALESCE(v.original_price, v.price * 1.3) as original_price,
        v.discount_percent,
        v.stock,
        COALESCE(
            CASE 
                WHEN v.original_price IS NOT NULL AND v.original_price > 0 
                THEN ((v.original_price - v.price) / v.original_price) * 100
                ELSE v.discount_percent
            END,
            0
        ) as calculated_discount_percent,
        -- Time urgency for product deals
        CASE 
            WHEN p.is_flash_sale = true AND (p.flash_sale_end - NOW()) < INTERVAL '24 hours' THEN 1.0
            WHEN p.is_flash_sale = true AND (p.flash_sale_end - NOW()) < INTERVAL '3 days' THEN 0.7
            WHEN p.is_lightning_deal = true AND (p.lightning_ends_at - NOW()) < INTERVAL '24 hours' THEN 1.0
            WHEN p.is_lightning_deal = true AND (p.lightning_ends_at - NOW()) < INTERVAL '3 days' THEN 0.7
            ELSE 0.1
        END as time_urgency,
        COALESCE(
            (SELECT m.image_url FROM media m WHERE m.product_id = p.id AND m.is_main = true LIMIT 1),
            (SELECT m.image_url FROM media m WHERE m.product_id = p.id ORDER BY m.position ASC LIMIT 1),
            '/images/default-product.jpg'
        ) as product_image_url,
        'product' as deal_source
    FROM products p
    JOIN product_variants v ON p.id = v.product_id AND v.is_default = true
    WHERE p.status IN ('active','approved')
      AND v.stock > 0
      AND (
        (p.is_flash_sale = true AND p.flash_sale_end > NOW())
        OR (p.is_lightning_deal = true AND p.lightning_ends_at > NOW())
        OR (v.original_price IS NOT NULL AND v.original_price > v.price AND 
           ((v.original_price - v.price) / v.original_price) >= 0.10)
        OR (v.discount_percent IS NOT NULL AND v.discount_percent >= 10)
      )
),
-- 4. ALL DEALS (combined)
ALL_ACTIVE_DEALS AS (
    SELECT 
        category_id,
        coupon_id as deal_id,
        product_title as title,
        vendor_id,
        FALSE as is_flash_sale,
        end_time as deal_end,
        FALSE as is_lightning_deal,
        end_time as lightning_end,
        start_time as created_at,
        view_count,
        rating,
        current_price,
        original_price,
        total_discount_percent as calculated_discount_percent,
        time_urgency,
        product_image_url,
        'coupon' as deal_source
    FROM ACTIVE_COUPONS_WITH_PRODUCTS
    
    UNION ALL
    
    SELECT 
        category_id,
        deal_id,
        title,
        vendor_id,
        is_flash_sale,
        deal_end,
        is_lightning_deal,
        lightning_end,
        created_at,
        view_count,
        rating,
        current_price,
        original_price,
        calculated_discount_percent,
        time_urgency,
        product_image_url,
        'product' as deal_source
    FROM ACTIVE_PRODUCT_DEALS
),
-- 5. DEALS BY CATEGORY WITH PERSONALIZATION
DEALS_BY_CATEGORY AS (
    SELECT 
        aad.category_id,
        COUNT(DISTINCT aad.deal_id) as active_deals_count,
        AVG(aad.calculated_discount_percent) as total_discount_avg,
        MAX(aad.calculated_discount_percent) as max_discount_percent,
        BOOL_OR(aad.calculated_discount_percent >= 40) as has_hot_deal,
        AVG(aad.time_urgency) as avg_time_urgency,
        COALESCE(
            SUM(
                CASE 
                    WHEN up.preference_score IS NOT NULL 
                    THEN up.preference_score * up.recency_boost 
                    ELSE 0 
                END
            ) / NULLIF(MAX(mp.max_score), 0),
            0
        ) as user_category_score,
        BOOL_OR(up.preference_score IS NOT NULL) as user_has_history
    FROM ALL_ACTIVE_DEALS aad
    CROSS JOIN max_preference mp
    LEFT JOIN user_preferences up ON 
        up.category_id = aad.category_id 
        OR up.vendor_id = aad.vendor_id
    GROUP BY aad.category_id
    HAVING COUNT(DISTINCT aad.deal_id) >= min_deals_per_category
),
-- 6. BEST DEAL IN EACH CATEGORY
RANKED_BEST_DEALS AS (
    SELECT 
        aad.category_id,
        aad.deal_id,
        aad.title,
        aad.product_image_url,
        aad.current_price,
        aad.original_price,
        aad.calculated_discount_percent,
        aad.rating,
        aad.view_count,
        aad.is_flash_sale,
        aad.deal_end,
        aad.is_lightning_deal,
        aad.lightning_end,
        aad.deal_source,
        aad.time_urgency,
        CASE 
            WHEN aad.deal_source = 'coupon' THEN 'coupon'
            WHEN aad.is_flash_sale = true AND aad.deal_end > NOW() THEN 'flash_sale'
            WHEN aad.is_lightning_deal = true AND aad.lightning_end > NOW() THEN 'lightning'
            WHEN aad.calculated_discount_percent >= 30 THEN 'hot_discount'
            WHEN aad.calculated_discount_percent >= 10 THEN 'discount'
            ELSE 'standard'
        END as deal_type,
        COALESCE(aad.deal_end, aad.lightning_end) as deal_ends_at,
        ROW_NUMBER() OVER (
            PARTITION BY aad.category_id
            ORDER BY 
                (aad.calculated_discount_percent * 0.6 + aad.time_urgency * 0.4) DESC,
                aad.view_count DESC,
                aad.rating DESC NULLS LAST
        ) as deal_rank
    FROM ALL_ACTIVE_DEALS aad
    WHERE aad.category_id IN (SELECT category_id FROM DEALS_BY_CATEGORY)
),
BEST_DEAL_IN_CATEGORY AS (
    SELECT * FROM RANKED_BEST_DEALS WHERE deal_rank = 1
),
-- 7. JOIN WITH CATEGORY HIERARCHY (NO USER CATEGORY FILTERING)
CATEGORIES_WITH_DEALS AS (
    SELECT 
        sc.id as category_id,
        sc.name as category_name,
        sc.handle as category_handle,
        sc.parent_id,
        COALESCE(parent.sort_order, 0) as department_sort_order,
        parent.name as department_name,
        parent.handle as department_handle,
        parent.id as department_id,
        dbc.active_deals_count,
        dbc.total_discount_avg,
        dbc.has_hot_deal as hot_deal_available,
        dbc.user_has_history,
        dbc.avg_time_urgency,
        bdic.deal_id as best_deal_id,
        bdic.time_urgency as best_deal_urgency,
        -- Base score with time urgency
        CAST(
            LOG(GREATEST(dbc.active_deals_count, 1)) * 0.3 + 
            LEAST(dbc.total_discount_avg / 100, 0.4) * 0.3 +
            CASE WHEN dbc.has_hot_deal THEN 0.2 ELSE 0 END +
            dbc.avg_time_urgency * 0.2
            AS NUMERIC
        ) as base_deal_score,
        CAST(dbc.user_category_score AS NUMERIC) as personalization_score
    FROM shopify_categories sc
    JOIN shopify_categories parent ON sc.parent_id = parent.id
    JOIN DEALS_BY_CATEGORY dbc ON dbc.category_id = sc.id
    LEFT JOIN BEST_DEAL_IN_CATEGORY bdic ON bdic.category_id = sc.id
    WHERE sc.is_active = true
      AND parent.is_active = true
      AND parent.show_in_navbar = true
      AND parent.level IN (1,2)
      -- REMOVED THE include_all_categories FILTER - always show all categories with deals
),
CATEGORIES_WITH_FINAL_SCORES AS (
    SELECT 
        *,
        CAST(
            CASE 
                WHEN p_user_id IS NOT NULL AND include_all_categories = false THEN
                    -- For personalized mode: prioritize user's categories heavily
                    CASE 
                        WHEN user_has_history = true THEN
                            base_deal_score * 0.3 + personalization_score * 0.7
                        ELSE
                            base_deal_score * 0.7 + personalization_score * 0.3
                    END
                WHEN p_user_id IS NOT NULL THEN
                    -- For mixed mode: balanced approach
                    (base_deal_score * (1 - personalization_weight)) + 
                    (personalization_score * personalization_weight)
                ELSE
                    base_deal_score  -- Anonymous users
            END
            AS NUMERIC
        ) as final_score,
        -- Determine deal priority
        CASE 
            WHEN user_has_history = true AND personalization_score > 0.5 THEN 'personalized'
            WHEN best_deal_urgency > 0.7 THEN 'ending_soon'
            WHEN hot_deal_available = true THEN 'hot_deal'
            ELSE 'trending'
        END as deal_priority
    FROM CATEGORIES_WITH_DEALS
),
RANKED_DEPARTMENTS AS (
    SELECT 
        cwfs.department_id,
        cwfs.department_name,
        cwfs.department_handle,
        cwfs.department_sort_order,
        SUM(cwfs.active_deals_count) as total_department_deals,
        AVG(cwfs.final_score) as avg_department_score,
        ROW_NUMBER() OVER (
            ORDER BY 
                AVG(cwfs.final_score) DESC,
                SUM(cwfs.active_deals_count) DESC,
                cwfs.department_sort_order
        ) as department_rank
    FROM CATEGORIES_WITH_FINAL_SCORES cwfs
    GROUP BY 
        cwfs.department_id, 
        cwfs.department_name, 
        cwfs.department_handle, 
        cwfs.department_sort_order
),
RANKED_CATEGORIES AS (
    SELECT 
        cwfs.*,
        rd.department_rank,
        rd.total_department_deals,
        ROW_NUMBER() OVER (
            PARTITION BY cwfs.department_id
            ORDER BY 
                -- For personalized mode: user's categories first
                CASE 
                    WHEN include_all_categories = false AND user_has_history = true THEN 1
                    WHEN include_all_categories = false AND user_has_history = false THEN 2
                    ELSE 3
                END,
                cwfs.final_score DESC,
                cwfs.active_deals_count DESC
        ) as category_rank
    FROM CATEGORIES_WITH_FINAL_SCORES cwfs
    JOIN RANKED_DEPARTMENTS rd ON rd.department_id = cwfs.department_id
    WHERE rd.department_rank <= department_limit
      -- Apply include_all_categories filter at the END
      AND (include_all_categories = true OR user_has_history = true)
)
-- 8. FINAL RESULTS
SELECT 
    rc.department_id,
    rc.department_name,
    rc.department_handle,
    rc.category_id,
    rc.category_name,
    rc.category_handle,
    rc.best_deal_id as featured_deal_id,
    bdic.title as featured_deal_title,
    bdic.product_image_url as featured_deal_image_url,
    bdic.current_price as featured_deal_price,
    bdic.original_price as featured_deal_original_price,
    CAST(bdic.calculated_discount_percent AS NUMERIC(10,1)) as featured_deal_discount_percent,
    bdic.deal_type,
    bdic.deal_ends_at,
    rc.active_deals_count,
    CAST(rc.total_discount_avg AS NUMERIC(10,1)) as total_discount_avg,
    rc.hot_deal_available,
    CAST(rc.base_deal_score AS NUMERIC(10,3)) as base_deal_score,
    CAST(rc.personalization_score AS NUMERIC(10,3)) as personalization_score,
    CAST(rc.final_score AS NUMERIC(10,3)) as final_score,
    rc.department_sort_order,
    rc.user_has_history as user_has_history_with_category,
    rc.deal_priority
FROM RANKED_CATEGORIES rc
LEFT JOIN BEST_DEAL_IN_CATEGORY bdic ON bdic.category_id = rc.category_id
WHERE rc.category_rank <= categories_per_department
ORDER BY 
    rc.department_rank,
    rc.category_rank;
$$;