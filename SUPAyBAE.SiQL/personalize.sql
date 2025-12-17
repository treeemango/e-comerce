-- ==============================================================================
-- 0. EXTENSIONS & SETUP
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==============================================================================
-- I. CORE INFRASTRUCTURE TABLES & MODIFICATIONS
-- ==============================================================================

-- 1. Browsing History Table
CREATE TABLE IF NOT EXISTS user_browsing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- 'product_view', 'category_view', 'vendor_view'
    entity_id UUID NOT NULL, 
    interacted_at TIMESTAMPTZ DEFAULT NOW(),
    context_id UUID, 
    CONSTRAINT chk_interaction_type CHECK (interaction_type IN ('product_view', 'category_view', 'vendor_view'))
);
CREATE INDEX IF NOT EXISTS idx_user_browsing_history_user_time 
    ON user_browsing_history(user_id, interacted_at DESC);


-- 2. Loyalty Profile Table
CREATE TABLE IF NOT EXISTS user_loyalty_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    loyalty_points INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
    lifetime_spend NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    current_tier TEXT NOT NULL DEFAULT 'Bronze', 
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_loyalty_points ON user_loyalty_profiles(loyalty_points DESC);


-- 3. Followed Stores Table
CREATE TABLE IF NOT EXISTS user_followed_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_follow UNIQUE (user_id, vendor_id)
);


-- 4. Vendor Table Modification (Add follower_count if missing)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'follower_count'
    ) THEN
        ALTER TABLE vendors ADD COLUMN follower_count INTEGER DEFAULT 0;
    END IF;
END $$;


-- 5. Products Table Modification (Add stock_quantity if needed, based on previous errors)
DO $$ 
BEGIN
    -- This assumes you wish to keep p.stock in the table for consistency, 
    -- although we are using the existing 'stock' column in the function below.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'stock_quantity'
    ) THEN
        -- We won't add it to avoid confusion, as your table has 'stock'.
        -- This block is kept simple for maximum compatibility.
        NULL; 
    END IF;
END $$;


-- ==============================================================================
-- II. CATEGORY TRENDING & PERSONALIZATION FUNCTIONS (CLEANED)
-- ==============================================================================

-- Drop variants to ensure clean slate
DROP FUNCTION IF EXISTS get_trending_categories_overlay(uuid, int, int);

CREATE OR REPLACE FUNCTION get_trending_categories_overlay(
  p_user_id UUID,
  limit_parent_categories INT,
  limit_subcategories_per_parent INT
)
RETURNS TABLE (
  parent_category_id UUID, parent_category_name TEXT, subcategory_id UUID, subcategory_name TEXT, subcategory_handle TEXT,
  trending_product_id UUID, trending_product_name TEXT, trending_product_image_url TEXT, trend_score NUMERIC,
  is_hot BOOLEAN, is_trending BOOLEAN, product_count BIGINT, hot_badge_text TEXT, 
  parent_category_sort_order INT, data_quality TEXT, personalization_score NUMERIC
)
LANGUAGE plpgsql 
AS $$
BEGIN
    -- Handle defaults manually inside PLPGSQL body
    limit_parent_categories := COALESCE(limit_parent_categories, 35);
    limit_subcategories_per_parent := COALESCE(limit_subcategories_per_parent, 35);
    
    RETURN QUERY 
    WITH parent_categories AS (
        SELECT DISTINCT pc.id, pc.name, pc.handle, COALESCE(pc.sort_order, 0) as sort_order
        FROM shopify_categories pc
        JOIN shopify_categories sc ON sc.parent_id = pc.id AND sc.is_active = true
        JOIN products p ON p.category_id = sc.id AND p.status IN ('active', 'approved')
        WHERE pc.level IN (1, 2) AND pc.is_active = true
        ORDER BY COALESCE(pc.sort_order, 0) NULLS LAST, pc.name
        LIMIT limit_parent_categories
    ),
    subcategory_trends AS (
        SELECT 
            sc.id as subcategory_id, sc.name as subcategory_name, sc.handle as subcategory_handle, sc.parent_id,
            pc.name as parent_category_name, pc.id as parent_category_id, pc.sort_order as parent_category_sort_order,
            COUNT(DISTINCT p.id) as product_count, COUNT(DISTINCT upv.id) as view_count, COUNT(DISTINCT oi.id) as sales_count,
            
            COALESCE(
                (
                    SELECT 
                        (COUNT(DISTINCT CASE WHEN ubh.interaction_type = 'category_view' THEN ubh.id END) * 1.5) +
                        (COUNT(DISTINCT CASE WHEN ubh.interaction_type = 'product_view' THEN ubh.id END) * 0.5)
                    FROM user_browsing_history ubh
                    LEFT JOIN products sub_p ON sub_p.id = ubh.entity_id AND ubh.interaction_type = 'product_view'
                    WHERE ubh.user_id = p_user_id AND ubh.interacted_at > NOW() - INTERVAL '14 days' 
                        AND ((ubh.interaction_type = 'category_view' AND ubh.entity_id = sc.id) OR (ubh.interaction_type = 'product_view' AND sub_p.category_id = sc.id))
                ), 
                0
            ) AS personalization_score,
            
            CASE 
                WHEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 THEN (COUNT(DISTINCT upv.id) * 0.5) + (COUNT(DISTINCT oi.id) * 0.3) + (LOG(GREATEST(COUNT(DISTINCT p.id), 1)) * 0.2) + (CASE WHEN p_user_id IS NOT NULL THEN 2.0 ELSE 0 END)
                WHEN COUNT(DISTINCT upv.id) > 10 OR COUNT(DISTINCT oi.id) > 5 THEN (COUNT(DISTINCT upv.id) * 0.4) + (COUNT(DISTINCT oi.id) * 0.2) + (COUNT(DISTINCT p.id) * 0.4) + (CASE WHEN p_user_id IS NOT NULL THEN 1.5 ELSE 0 END)
                ELSE (COUNT(DISTINCT p.id) * 0.8) + (LOG(GREATEST(COUNT(DISTINCT upv.id), 1)) * 0.15) + (LOG(GREATEST(COUNT(DISTINCT oi.id), 1)) * 0.05) + (CASE WHEN p_user_id IS NOT NULL THEN 1.0 ELSE 0 END)
            END as trend_score,
            
            CASE WHEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 THEN 'high' WHEN COUNT(DISTINCT upv.id) > 10 OR COUNT(DISTINCT oi.id) > 5 THEN 'medium' ELSE 'basic' END as data_quality,
            CASE WHEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 THEN COUNT(DISTINCT upv.id) > 100 OR COUNT(DISTINCT oi.id) > 40 WHEN COUNT(DISTINCT upv.id) > 10 OR COUNT(DISTINCT oi.id) > 5 THEN COUNT(DISTINCT upv.id) > 25 OR COUNT(DISTINCT oi.id) > 10 OR COUNT(DISTINCT p.id) > 15 ELSE COUNT(DISTINCT p.id) >= 8 END as is_hot,
            CASE WHEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 THEN COUNT(DISTINCT upv.id) > 200 OR COUNT(DISTINCT oi.id) > 80 WHEN COUNT(DISTINCT upv.id) > 10 OR COUNT(DISTINCT oi.id) > 5 THEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 OR COUNT(DISTINCT p.id) > 25 ELSE COUNT(DISTINCT p.id) >= 15 END as is_trending,
            CASE WHEN COUNT(DISTINCT upv.id) > 200 OR COUNT(DISTINCT oi.id) > 80 THEN '🔥 HOT' WHEN COUNT(DISTINCT upv.id) > 100 OR COUNT(DISTINCT oi.id) > 40 THEN '🚀 TRENDING' WHEN COUNT(DISTINCT upv.id) > 50 OR COUNT(DISTINCT oi.id) > 20 THEN '↑ POPULAR' WHEN COUNT(DISTINCT upv.id) > 25 OR COUNT(DISTINCT oi.id) > 10 THEN '📈 RISING' WHEN COUNT(DISTINCT p.id) >= 15 THEN '🆕 NEW' WHEN COUNT(DISTINCT p.id) >= 8 THEN '✨ FRESH' ELSE '' END as hot_badge_text
            
        FROM shopify_categories sc
        JOIN parent_categories pc ON sc.parent_id = pc.id
        LEFT JOIN products p ON p.category_id = sc.id AND p.status IN ('active', 'approved')
        LEFT JOIN user_product_views upv ON upv.product_id = p.id 
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id 
        WHERE sc.level IN (2, 3, 4, 5) AND sc.is_active = true
        GROUP BY sc.id, sc.name, sc.handle, sc.parent_id, pc.name, pc.id, pc.sort_order
        HAVING COUNT(DISTINCT p.id) > 0
    ),
    trending_products AS (
        SELECT p.category_id, p.id as product_id, p.name as product_name,
            COALESCE(
                (SELECT m.image_url FROM media m WHERE m.product_id = p.id AND m.is_main = true LIMIT 1),
                (SELECT m.image_url FROM media m WHERE m.product_id = p.id ORDER BY m.position ASC LIMIT 1),
                '/images/default-product.jpg'
            ) as product_image_url,
            ROW_NUMBER() OVER (
                PARTITION BY p.category_id 
                ORDER BY (COUNT(DISTINCT upv.id) * 0.6 + COUNT(DISTINCT oi.id) * 0.4) DESC, p.view_count DESC, p.created_at DESC
            ) as rank_within_category
         FROM products p
        LEFT JOIN user_product_views upv ON upv.product_id = p.id
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id
        WHERE p.status IN ('active', 'approved') AND p.category_id IN (SELECT subcategory_id FROM subcategory_trends)
        GROUP BY p.category_id, p.id, p.name, p.view_count, p.created_at
    ),
    ranked_subcategories AS (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY parent_category_id 
                ORDER BY trend_score DESC, product_count DESC, subcategory_name
            ) as subcategory_rank
        FROM subcategory_trends
    )
    SELECT 
        rs.parent_category_id, rs.parent_category_name, rs.subcategory_id, rs.subcategory_name, rs.subcategory_handle,
        tp.product_id as trending_product_id, tp.product_name as trending_product_name, tp.product_image_url as trending_product_image_url,
        rs.trend_score, rs.is_hot, rs.is_trending, rs.product_count, rs.hot_badge_text, rs.parent_category_sort_order, rs.data_quality, rs.personalization_score
    FROM ranked_subcategories rs
    LEFT JOIN trending_products tp ON tp.category_id = rs.subcategory_id AND tp.rank_within_category = 1 
    WHERE rs.subcategory_rank <= limit_subcategories_per_parent
    ORDER BY rs.parent_category_sort_order, rs.parent_category_name, rs.trend_score DESC, rs.product_count DESC;
END;
$$;


-- get_navbar_recommended_categories
DROP FUNCTION IF EXISTS get_navbar_recommended_categories;

CREATE OR REPLACE FUNCTION get_navbar_recommended_categories(
  department_limit INT DEFAULT 4,
  categories_per_department INT DEFAULT 8
)
RETURNS TABLE (
  department_id UUID, department_name TEXT, department_handle TEXT, category_id UUID, category_name TEXT, category_handle TEXT,
  trend_score NUMERIC, is_hot BOOLEAN, product_count BIGINT, department_sort_order INT
)
LANGUAGE SQL
AS $$
WITH department_candidates AS (
  SELECT DISTINCT parent.id, parent.name, parent.handle, COALESCE(parent.sort_order, 0) AS sort_order, parent.level
  FROM shopify_categories parent
  JOIN shopify_categories child ON child.parent_id = parent.id
  WHERE parent.is_active = true AND parent.show_in_navbar = true AND child.is_active = true AND parent.level IN (1, 2)
),
popular_departments AS (
  SELECT dc.id, dc.name AS department_name, dc.handle AS department_handle, dc.sort_order AS department_sort_order,
    COUNT(DISTINCT p.id) AS total_products, COUNT(DISTINCT upv.id) AS total_views, COUNT(DISTINCT oi.id) AS total_sales,
    (COUNT(DISTINCT upv.id) * 0.6 + COUNT(DISTINCT oi.id) * 0.4) AS department_popularity
  FROM department_candidates dc
  LEFT JOIN shopify_categories child ON child.parent_id = dc.id AND child.is_active = true AND child.level IN (2, 3, 4)
  LEFT JOIN products p ON p.category_id = child.id AND p.status = 'active'
  LEFT JOIN user_product_views upv ON upv.product_id = p.id AND upv.viewed_at > NOW() - INTERVAL '7 days'
  LEFT JOIN order_items oi ON oi.product_id = p.id
  LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at > NOW() - INTERVAL '7 days'
  GROUP BY dc.id, dc.name, dc.handle, dc.sort_order
  HAVING COUNT(DISTINCT p.id) > 0
  ORDER BY department_popularity DESC
  LIMIT department_limit
),
subcategory_trends AS (
  SELECT pd.id AS department_id, pd.department_name, pd.department_handle, pd.department_sort_order,
    sc.id AS category_id, sc.name AS category_name, sc.handle AS category_handle,
    COUNT(DISTINCT p.id) AS product_count, COUNT(DISTINCT upv.id) AS view_count, COUNT(DISTINCT oi.id) AS sales_count,
    (COUNT(DISTINCT upv.id) * 0.5 + COUNT(DISTINCT oi.id) * 0.3 + (LOG(GREATEST(COUNT(DISTINCT p.id), 1)) * 0.2)) AS trend_score,
    (COUNT(DISTINCT upv.id) >= 20 OR COUNT(DISTINCT oi.id) >= 10) AS is_hot
  FROM popular_departments pd
  JOIN shopify_categories sc ON sc.parent_id = pd.id AND sc.is_active = true AND sc.level IN (2, 3, 4, 5)
  LEFT JOIN products p ON p.category_id = sc.id AND p.status = 'active'
  LEFT JOIN user_product_views upv ON upv.product_id = p.id AND upv.viewed_at > NOW() - INTERVAL '7 days'
  LEFT JOIN order_items oi ON oi.product_id = p.id
  LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at > NOW() - INTERVAL '7 days'
  GROUP BY pd.id, pd.department_name, pd.department_handle, pd.department_sort_order, sc.id, sc.name, sc.handle
  HAVING COUNT(DISTINCT p.id) > 0
),
ranked_categories AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY trend_score DESC, product_count DESC) AS rank_in_department
  FROM subcategory_trends
)
SELECT department_id, department_name, department_handle, category_id, category_name, category_handle, trend_score, is_hot, product_count, department_sort_order
FROM ranked_categories
WHERE rank_in_department <= categories_per_department
ORDER BY department_sort_order, trend_score DESC;
$$;


-- ==============================================================================
-- III. VENDOR FOLLOWING FUNCTIONS
-- ==============================================================================

-- toggle_follow_store
DROP FUNCTION IF EXISTS toggle_follow_store(uuid, uuid);

CREATE OR REPLACE FUNCTION toggle_follow_store(p_user_id UUID, p_vendor_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    v_was_following BOOLEAN; 
    v_is_following BOOLEAN; 
    v_follower_count INTEGER; 
    v_vendor_data JSONB;
BEGIN
    SELECT EXISTS (SELECT 1 FROM user_followed_stores WHERE user_id = p_user_id AND vendor_id = p_vendor_id) INTO v_was_following;
    IF v_was_following THEN
        DELETE FROM user_followed_stores WHERE user_id = p_user_id AND vendor_id = p_vendor_id;
        v_is_following := false;
    ELSE
        INSERT INTO user_followed_stores (user_id, vendor_id) VALUES (p_user_id, p_vendor_id) ON CONFLICT (user_id, vendor_id) DO NOTHING;
        v_is_following := true;
    END IF;
    SELECT COUNT(*) INTO v_follower_count FROM user_followed_stores WHERE vendor_id = p_vendor_id;
    UPDATE vendors SET follower_count = v_follower_count WHERE id = p_vendor_id;
    SELECT jsonb_build_object('id', v.id, 'business_name', v.business_name, 'shop_name', COALESCE(v.shop_name, v.business_name), 'logo_url', v.logo_url, 'is_verified', COALESCE(v.is_verified, false), 'rating', COALESCE(v.rating, 0), 'review_count', COALESCE(v.review_count, 0)) INTO v_vendor_data FROM vendors v WHERE v.id = p_vendor_id;
    RETURN jsonb_build_object('success', true, 'vendor', v_vendor_data, 'was_following', v_was_following, 'is_following', v_is_following, 'follower_count', v_follower_count, 'action', CASE WHEN v_was_following THEN 'unfollowed' ELSE 'followed' END);
END;
$$;

-- get_trending_vendors_to_follow
DROP FUNCTION IF EXISTS get_trending_vendors_to_follow(uuid, int);

CREATE OR REPLACE FUNCTION get_trending_vendors_to_follow(
    p_user_id UUID,
    p_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_results JSONB;
BEGIN
    p_limit := COALESCE(p_limit, 10);
    
    SELECT jsonb_agg(
        jsonb_build_object(
            'vendor', jsonb_build_object('id', v.id, 'business_name', v.business_name, 'shop_name', COALESCE(v.shop_name, v.business_name), 'business_description', v.business_description, 'logo_url', v.logo_url, 'rating', COALESCE(v.rating, 0), 'review_count', COALESCE(v.review_count, 0), 'is_verified', COALESCE(v.is_verified, false), 'is_active', COALESCE(v.is_active, true), 'created_at', v.created_at, 'address_country', COALESCE(v.address_country, 'Kenya')),
            'stats', jsonb_build_object('follower_count', COALESCE(v.follower_count, 0), 'total_sales', COALESCE(v.total_sales, 0), 'personal_view_score', COALESCE(vh.personal_view_score, 0), 'product_count', (SELECT COUNT(*) FROM products p WHERE p.vendor_id = v.id AND p.status = 'active')),
            'is_following', (p_user_id IS NOT NULL AND EXISTS(SELECT 1 FROM user_followed_stores WHERE user_id = p_user_id AND vendor_id = v.id)),
            'reason', CASE 
                WHEN COALESCE(vh.personal_view_score, 0) > 0 THEN 'Based on your recent product views'
                WHEN v.is_verified THEN 'Verified Vendor'
                WHEN COALESCE(v.rating, 0) >= 4.0 THEN 'Highly Rated'
                WHEN COALESCE(v.follower_count, 0) >= 10 THEN 'Popular Vendor'
                WHEN v.created_at > NOW() - INTERVAL '7 days' THEN 'New Vendor'
                ELSE 'Recommended for you'
            END
        )
    ) INTO v_results
    FROM vendors v
    
    LEFT JOIN (
        SELECT 
            p.vendor_id, 
            COUNT(DISTINCT ubh.id) AS personal_view_score 
        FROM user_browsing_history ubh
        JOIN products p ON p.id = ubh.entity_id AND ubh.interaction_type = 'product_view'
        WHERE ubh.user_id = p_user_id AND ubh.interacted_at > NOW() - INTERVAL '30 days'
        GROUP BY p.vendor_id
    ) AS vh ON vh.vendor_id = v.id
    
    WHERE (p_user_id IS NULL OR v.id NOT IN (SELECT vendor_id FROM user_followed_stores WHERE user_id = p_user_id))
    AND COALESCE(v.is_active, true) = true
    AND COALESCE(v.store_active, false) = true
    AND COALESCE(v.profile_completed, false) = true
    
    ORDER BY COALESCE(vh.personal_view_score, 0) DESC, v.is_verified DESC, COALESCE(v.rating, 0) DESC, COALESCE(v.follower_count, 0) DESC, v.created_at DESC
    LIMIT p_limit;
    
    RETURN jsonb_build_object('success', true, 'data', COALESCE(v_results, '[]'::jsonb), 'count', COALESCE(jsonb_array_length(v_results), 0));
END;
$$;


-- ==============================================================================
-- IV. LOYALTY SYSTEM TRIGGERS & FUNCTIONS
-- ==============================================================================

-- Vendor Follower Count Trigger Function
CREATE OR REPLACE FUNCTION update_vendor_follower_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN UPDATE vendors SET follower_count = COALESCE(follower_count, 0) + 1 WHERE id = NEW.vendor_id;
    ELSIF TG_OP = 'DELETE' THEN UPDATE vendors SET follower_count = GREATEST(COALESCE(follower_count, 0) - 1, 0) WHERE id = OLD.vendor_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger definition for Vendor Follower Count
DROP TRIGGER IF EXISTS trg_update_vendor_follower_count ON user_followed_stores;
CREATE TRIGGER trg_update_vendor_follower_count
    AFTER INSERT OR DELETE ON user_followed_stores
    FOR EACH ROW EXECUTE FUNCTION update_vendor_follower_count();


-- Loyalty Profile Update Trigger Function
CREATE OR REPLACE FUNCTION update_loyalty_on_order_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_points_earned INTEGER;
    v_new_lifetime_spend NUMERIC(10, 2);
    v_new_tier TEXT;
    v_current_spend NUMERIC(10, 2);
BEGIN
    IF NEW.status IN ('completed', 'delivered') AND OLD.status NOT IN ('completed', 'delivered') THEN
        v_points_earned := FLOOR(NEW.total_amount / 10); 
        
        INSERT INTO user_loyalty_profiles (user_id) 
        VALUES (NEW.user_id)
        ON CONFLICT (user_id) DO UPDATE 
        SET last_activity_at = NOW()
        RETURNING lifetime_spend INTO v_current_spend;

        v_new_lifetime_spend := v_current_spend + NEW.total_amount;

        IF v_new_lifetime_spend >= 10000.00 THEN v_new_tier := 'Platinum';
        ELSIF v_new_lifetime_spend >= 5000.00 THEN v_new_tier := 'Gold';
        ELSIF v_new_lifetime_spend >= 1000.00 THEN v_new_tier := 'Silver';
        ELSE v_new_tier := 'Bronze';
        END IF;

        UPDATE user_loyalty_profiles
        SET 
            loyalty_points = loyalty_points + v_points_earned,
            lifetime_spend = v_new_lifetime_spend,
            current_tier = v_new_tier,
            last_activity_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger definition for Loyalty Profile Update
DROP TRIGGER IF EXISTS trg_update_loyalty_on_order ON orders;
CREATE TRIGGER trg_update_loyalty_on_order
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_loyalty_on_order_complete();


-- ==============================================================================
-- V. PRODUCT DISCOVERY SCORE FUNCTION (FIXED: Uses p.stock)
-- ==============================================================================

DROP FUNCTION IF EXISTS get_product_discovery_score(uuid);

CREATE OR REPLACE FUNCTION get_product_discovery_score(
    p_product_id UUID
)
RETURNS NUMERIC
LANGUAGE SQL
AS $$
SELECT
    -- A. Recent Engagement (50% Weight)
    (
        COALESCE(SUM(CASE WHEN upv.viewed_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) * 0.25 + 
        COALESCE(SUM(CASE WHEN o.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) * 0.25   
    ) * 0.5 +

    -- B. Overall Quality & Popularity (30% Weight)
    (
        COALESCE(p.rating, 0) * 0.15 +                     
        LOG(GREATEST(COALESCE(p.review_count, 1), 1)) * 0.15 
    ) * 0.3 +

    -- C. Product Health & Inventory (20% Weight)
    (
        CASE WHEN p.status = 'active' THEN 0.10 ELSE 0.0 END +
        CASE WHEN p.stock > 0 THEN 0.10 ELSE 0.0 END -- CORRECTED to use existing 'stock' column
    ) * 0.2 
FROM products p
LEFT JOIN user_product_views upv ON upv.product_id = p.id
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id
WHERE p.id = p_product_id
GROUP BY p.id, p.rating, p.review_count, p.status, p.stock;
$$;

-- ==============================================================================
-- VI. FINAL SYNCHRONIZATION 
-- ==============================================================================
CREATE OR REPLACE FUNCTION sync_all_vendor_follower_counts()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE v_updated_count INTEGER;
BEGIN
    WITH vendor_counts AS (
        SELECT vendor_id, COUNT(*) as new_count FROM user_followed_stores GROUP BY vendor_id
    )
    UPDATE vendors v
    SET follower_count = COALESCE(vc.new_count, 0)
    FROM vendor_counts vc
    WHERE v.id = vc.vendor_id AND COALESCE(v.follower_count, 0) != COALESCE(vc.new_count, 0);
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'message', 'Vendor follower counts synchronized', 'updated_count', v_updated_count, 'timestamp', NOW());
END;
$$;

-- Execute the synchronization and generate report
SELECT sync_all_vendor_follower_counts();


-- ==============================================================================
-- VII. INSTALLATION REPORT
-- ==============================================================================
SELECT jsonb_build_object(
    'status', 'All advanced features installed successfully.',
    'features_installed', jsonb_build_array(
        'Personalized Category Trending (get_trending_categories_overlay)',
        'Personalized Vendor Discovery (get_trending_vendors_to_follow)',
        'Customer Loyalty & Tiering (Triggers on orders)',
        'Automated Product Discovery Scoring (get_product_discovery_score)',
        'Vendor Following System (toggle_follow_store)'
    ),
    'timestamp', NOW()
) as installation_report;