DROP FUNCTION IF EXISTS calculate_category_relevance_score_optimized;

CREATE OR REPLACE FUNCTION calculate_category_relevance_score_optimized(
    user_session_id UUID,
    user_id UUID DEFAULT NULL,
    department_limit INT DEFAULT 4,
    categories_per_department INT DEFAULT 8
)
RETURNS TABLE (
    department_id UUID,
    department_name TEXT,
    category_id UUID,
    category_name TEXT,
    relevance_score NUMERIC,
    is_trending BOOLEAN
)
LANGUAGE SQL
AS $$
WITH RECENT_WINDOW AS (
    SELECT NOW() - INTERVAL '7 days' AS cutoff
),
USER_IDENTIFIER AS (
    -- Determine the primary ID for personalized lookups: 
    -- Prioritize logged-in user_id, fall back to session_id for guests.
    SELECT 
        COALESCE(calculate_category_relevance_score_optimized.user_id, calculate_category_relevance_score_optimized.user_session_id) AS current_id,
        calculate_category_relevance_score_optimized.user_id IS NOT NULL AS is_logged_in
),
CATALOG_PRODUCTS AS (
    SELECT
        parent.id AS department_id,
        parent.name AS department_name,
        parent.sort_order AS department_sort_order,
        child.id AS category_id,
        child.name AS category_name,
        p.id AS product_id
    FROM shopify_categories parent
    INNER JOIN shopify_categories child
      ON child.parent_id = parent.id
    INNER JOIN products p
      ON p.category_id = child.id
    WHERE 
        parent.level IN (1, 2)
        AND parent.show_in_navbar = true
        AND parent.is_active = true
        AND child.is_active = true
        AND p.status IN ('active', 'approved')
),
USER_ACTIVITY AS (
    SELECT
        cp.category_id,
        COUNT(DISTINCT upv_personal.id) AS personal_product_views,
        COUNT(DISTINCT ubh_personal.id) AS personal_category_views
    FROM CATALOG_PRODUCTS cp
    CROSS JOIN RECENT_WINDOW rw 
    CROSS JOIN USER_IDENTIFIER ui -- Bring identifier into scope
    LEFT JOIN user_product_views upv_personal
        ON upv_personal.product_id = cp.product_id
        AND upv_personal.viewed_at > rw.cutoff
        -- **CRITICAL FIX:** Join on user_id OR session_id
        AND (upv_personal.user_id = ui.current_id OR upv_personal.session_id = ui.current_id) 
    LEFT JOIN user_browsing_history ubh_personal
        ON ubh_personal.entity_id = cp.category_id
        AND ubh_personal.interacted_at > rw.cutoff
        -- **CRITICAL FIX:** Join on user_id OR session_id
        AND (ubh_personal.user_id = ui.current_id OR ubh_personal.session_id = ui.current_id)
        AND ubh_personal.interaction_type IN ('CATEGORY_VIEW', 'NAVBAR_CLICK')
    GROUP BY 1
),
GLOBAL_ACTIVITY AS (
    SELECT
        cp.category_id,
        COUNT(DISTINCT cp.product_id) AS product_count,
        COUNT(DISTINCT upv_global.id) AS global_product_views,
        COUNT(DISTINCT oi.id) AS global_sales
    FROM CATALOG_PRODUCTS cp
    CROSS JOIN RECENT_WINDOW rw 
    -- Global Views (now counting all records, including those with the new session_id)
    LEFT JOIN user_product_views upv_global
        ON upv_global.product_id = cp.product_id AND upv_global.viewed_at > rw.cutoff
    -- Global Sales 
    LEFT JOIN order_items oi 
        ON oi.product_id = cp.product_id
    LEFT JOIN orders o 
        ON o.id = oi.order_id AND o.created_at > rw.cutoff
    GROUP BY 1
    HAVING COUNT(DISTINCT cp.product_id) > 0
),
FINAL_SCORING AS (
    SELECT
        cp.department_id,
        cp.department_name,
        cp.department_sort_order,
        ga.category_id,
        cp.category_name,
        ga.product_count,
        ui.is_logged_in, 
        
        -- *** SIMULATE ML FEATURES ***
        COALESCE(0.05 * LOG(GREATEST(ga.global_sales, 1)), 0.0) AS ml_category_conversion_prob, 
        COALESCE(0.1 * LOG(GREATEST(ga.global_product_views, 1)), 0.0) AS ml_category_trending_score,
        
        -- FINAL HYBRID SCORE CALCULATION
        (
            CASE 
                WHEN ui.is_logged_in THEN 
                    (ua.personal_category_views * 2.5) +
                    (ua.personal_product_views * 1.0) +
                    (COALESCE(0.05 * LOG(GREATEST(ga.global_sales, 1)), 0.0) * 3.0) +
                    (COALESCE(0.1 * LOG(GREATEST(ga.global_product_views, 1)), 0.0) * 0.5)
                ELSE
                    (ga.global_sales * 0.5) +
                    (COALESCE(0.05 * LOG(GREATEST(ga.global_sales, 1)), 0.0) * 2.0) +
                    (COALESCE(0.1 * LOG(GREATEST(ga.global_product_views, 1)), 0.0) * 1.0)
            END
        ) AS relevance_score,

        (ga.global_product_views >= 50 OR ga.global_sales >= 20) AS is_trending
    FROM GLOBAL_ACTIVITY ga
    INNER JOIN USER_ACTIVITY ua ON ga.category_id = ua.category_id
    INNER JOIN (SELECT DISTINCT department_id, department_name, department_sort_order, category_id, category_name FROM CATALOG_PRODUCTS) cp 
        ON ga.category_id = cp.category_id
    CROSS JOIN USER_IDENTIFIER ui
),
RANK_AND_FILTER AS (
    SELECT
        department_id,
        department_name,
        category_id,
        category_name,
        relevance_score,
        is_trending,
        department_sort_order,
        ROW_NUMBER() OVER (
            PARTITION BY department_id
            ORDER BY relevance_score DESC, product_count DESC
        ) AS rank_in_department
    FROM FINAL_SCORING
),
TOP_DEPARTMENTS AS (
    SELECT department_id
    FROM FINAL_SCORING
    GROUP BY department_id
    ORDER BY SUM(relevance_score) DESC
    LIMIT department_limit
)
SELECT
    rf.department_id,
    rf.department_name,
    rf.category_id,
    rf.category_name,
    rf.relevance_score,
    rf.is_trending
FROM RANK_AND_FILTER rf
INNER JOIN TOP_DEPARTMENTS td ON rf.department_id = td.department_id
WHERE rf.rank_in_department <= categories_per_department
ORDER BY rf.department_sort_order, rf.relevance_score DESC;
$$;