-- =====================================================
-- FOLLOWED STORES FEATURE - CUSTOMIZED FOR YOUR SCHEMA
-- =====================================================

-- =====================================================
-- 1. CORE TABLE: user_followed_stores (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_followed_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique follow relationship
    CONSTRAINT unique_follow UNIQUE (user_id, vendor_id)
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_followed_stores_user 
    ON user_followed_stores(user_id, followed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_followed_stores_vendor 
    ON user_followed_stores(vendor_id, followed_at DESC);

-- =====================================================
-- 2. ADD FOLLOWER_COUNT COLUMN TO VENDORS (if not exists)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'follower_count'
    ) THEN
        ALTER TABLE vendors ADD COLUMN follower_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- =====================================================
-- 3. FUNCTION: toggle_follow_store
-- =====================================================
CREATE OR REPLACE FUNCTION toggle_follow_store(
    p_user_id UUID,
    p_vendor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_was_following BOOLEAN;
    v_is_following BOOLEAN;
    v_follower_count INTEGER;
    v_vendor_data JSONB;
BEGIN
    -- Check current state
    SELECT EXISTS (
        SELECT 1 FROM user_followed_stores 
        WHERE user_id = p_user_id AND vendor_id = p_vendor_id
    ) INTO v_was_following;
    
    -- Toggle follow state
    IF v_was_following THEN
        -- Unfollow
        DELETE FROM user_followed_stores 
        WHERE user_id = p_user_id AND vendor_id = p_vendor_id;
        v_is_following := false;
    ELSE
        -- Follow
        INSERT INTO user_followed_stores (user_id, vendor_id)
        VALUES (p_user_id, p_vendor_id)
        ON CONFLICT (user_id, vendor_id) DO NOTHING;
        v_is_following := true;
    END IF;
    
    -- Get updated follower count
    SELECT COUNT(*) INTO v_follower_count
    FROM user_followed_stores
    WHERE vendor_id = p_vendor_id;
    
    -- Update vendor's follower count
    UPDATE vendors 
    SET follower_count = v_follower_count
    WHERE id = p_vendor_id;
    
    -- Get vendor data for response
    SELECT jsonb_build_object(
        'id', v.id,
        'business_name', v.business_name,
        'shop_name', COALESCE(v.shop_name, v.business_name),
        'logo_url', v.logo_url,
        'is_verified', COALESCE(v.is_verified, false),
        'rating', COALESCE(v.rating, 0),
        'review_count', COALESCE(v.review_count, 0)
    ) INTO v_vendor_data
    FROM vendors v
    WHERE v.id = p_vendor_id;
    
    -- Return comprehensive response
    RETURN jsonb_build_object(
        'success', true,
        'vendor', v_vendor_data,
        'was_following', v_was_following,
        'is_following', v_is_following,
        'follower_count', v_follower_count,
        'action', CASE WHEN v_was_following THEN 'unfollowed' ELSE 'followed' END
    );
END;
$$;

-- =====================================================
-- 4. FUNCTION: get_followed_vendors_paginated
-- =====================================================
CREATE OR REPLACE FUNCTION get_followed_vendors_paginated(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_count BIGINT;
    v_results JSONB;
BEGIN
    -- Get total count
    SELECT COUNT(*) INTO v_total_count
    FROM user_followed_stores ufs
    WHERE ufs.user_id = p_user_id;
    
    -- Get paginated results with vendor info (order/limit in subquery to avoid GROUP BY errors)
    SELECT jsonb_agg(
        jsonb_build_object(
            'vendor', jsonb_build_object(
                'id', sq.v_id,
                'business_name', sq.business_name,
                'shop_name', sq.shop_name,
                'business_description', sq.business_description,
                'logo_url', sq.logo_url,
                'banner_url', sq.banner_url,
                'rating', sq.rating,
                'review_count', sq.review_count,
                'is_verified', sq.is_verified,
                'is_active', sq.is_active,
                'store_active', sq.store_active,
                'profile_completed', sq.profile_completed,
                'address_country', sq.address_country,
                'created_at', sq.created_at,
                'shop_slug', sq.shop_slug,
                'business_slug', sq.business_slug
            ),
            'stats', jsonb_build_object(
                'follower_count', sq.follower_count,
                'total_sales', sq.total_sales,
                'total_earnings', sq.total_earnings
            ),
            'follow_info', jsonb_build_object(
                'followed_at', sq.followed_at,
                'is_following', true,
                'follow_duration_days', EXTRACT(DAY FROM NOW() - sq.followed_at)
            ),
            'latest_products', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', pm_sub.id,
                            'title', pm_sub.title,
                            'price', pm_sub.price,
                            'original_price', pm_sub.original_price,
                            'main_image', pm_sub.featured_image_url,
                            'rating', COALESCE(pm_sub.rating, 0),
                            'review_count', COALESCE(pm_sub.review_count, 0)
                        )
                        ORDER BY pm_sub.created_at DESC
                    )
                    FROM (
                        SELECT 
                            pm.id,
                            pm.title,
                            pm.price,
                            pm.original_price,
                            pm.featured_image_url,
                            pm.rating,
                            pm.review_count,
                            pm.created_at
                        FROM products_with_media pm
                        WHERE pm.seller_id = sq.v_id 
                          AND pm.status = 'approved'
                        ORDER BY pm.created_at DESC
                        LIMIT 6
                    ) pm_sub
                ), 
                '[]'::jsonb
            )
        )
    ) INTO v_results
    FROM (
        SELECT 
            ufs.followed_at,
            v.id AS v_id,
            v.business_name,
            COALESCE(v.shop_name, v.business_name) AS shop_name,
            v.business_description,
            v.logo_url,
            v.banner_url,
            COALESCE(v.rating, 0) AS rating,
            COALESCE(v.review_count, 0) AS review_count,
            COALESCE(v.is_verified, false) AS is_verified,
            COALESCE(v.is_active, true) AS is_active,
            COALESCE(v.store_active, false) AS store_active,
            COALESCE(v.profile_completed, false) AS profile_completed,
            COALESCE(v.address_country, 'Kenya') AS address_country,
            v.created_at,
            v.shop_slug,
            v.business_slug,
            COALESCE(v.follower_count, 0) AS follower_count,
            COALESCE(v.total_sales, 0) AS total_sales,
            COALESCE(v.total_earnings, 0) AS total_earnings
        FROM user_followed_stores ufs
        JOIN vendors v ON v.id = ufs.vendor_id
        WHERE ufs.user_id = p_user_id
        ORDER BY ufs.followed_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) sq;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', COALESCE(v_results, '[]'::jsonb),
        'pagination', jsonb_build_object(
            'total', v_total_count,
            'limit', p_limit,
            'offset', p_offset,
            'has_more', v_total_count > p_offset + p_limit
        )
    );
END;
$$;

-- =====================================================
-- 5. FUNCTION: is_vendor_followed
-- =====================================================
CREATE OR REPLACE FUNCTION is_vendor_followed(
    p_user_id UUID,
    p_vendor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_following BOOLEAN;
    v_follower_count INTEGER;
    v_followed_at TIMESTAMPTZ;
BEGIN
    -- Check if following
    SELECT 
        EXISTS(
            SELECT 1 FROM user_followed_stores
            WHERE user_id = p_user_id AND vendor_id = p_vendor_id
        ),
        COUNT(*),
        MAX(followed_at)
    INTO 
        v_is_following,
        v_follower_count,
        v_followed_at
    FROM user_followed_stores
    WHERE vendor_id = p_vendor_id;
    
    RETURN jsonb_build_object(
        'is_following', COALESCE(v_is_following, false),
        'follower_count', COALESCE(v_follower_count, 0),
        'followed_at', v_followed_at
    );
END;
$$;

-- =====================================================
-- 6. FUNCTION: get_vendor_followers
-- =====================================================
CREATE OR REPLACE FUNCTION get_vendor_followers(
    p_vendor_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_count BIGINT;
    v_vendor_name TEXT;
    v_results JSONB;
BEGIN
    -- Get vendor name
    SELECT business_name INTO v_vendor_name
    FROM vendors WHERE id = p_vendor_id;
    
    -- Get total count
    SELECT COUNT(*) INTO v_total_count
    FROM user_followed_stores
    WHERE vendor_id = p_vendor_id;
    
    -- Get followers
    SELECT jsonb_agg(
        jsonb_build_object(
            'user', jsonb_build_object(
                'id', u.id,
                'full_name', COALESCE(u.full_name, u.name),
                'email', u.email,
                'avatar_url', u.avatar_url
            ),
            'followed_at', ufs.followed_at,
            'follow_duration', 
                EXTRACT(DAY FROM NOW() - ufs.followed_at) || ' days'
        )
        ORDER BY ufs.followed_at DESC
    ) INTO v_results
    FROM user_followed_stores ufs
    JOIN public.users u ON u.id = ufs.user_id
    WHERE ufs.vendor_id = p_vendor_id
    LIMIT p_limit
    OFFSET p_offset;
    
    RETURN jsonb_build_object(
        'success', true,
        'vendor', jsonb_build_object(
            'id', p_vendor_id,
            'business_name', v_vendor_name
        ),
        'data', COALESCE(v_results, '[]'::jsonb),
        'pagination', jsonb_build_object(
            'total', v_total_count,
            'limit', p_limit,
            'offset', p_offset,
            'has_more', v_total_count > p_offset + p_limit
        )
    );
END;
$$;

-- =====================================================
-- 7. FUNCTION: get_trending_vendors_to_follow
-- =====================================================
CREATE OR REPLACE FUNCTION get_trending_vendors_to_follow(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_results JSONB;
BEGIN
    -- Get vendors NOT already followed by user, sorted by various metrics
    SELECT jsonb_agg(
        jsonb_build_object(
            'vendor', jsonb_build_object(
                'id', v.id,
                'business_name', v.business_name,
                'shop_name', COALESCE(v.shop_name, v.business_name),
                'business_description', v.business_description,
                'logo_url', v.logo_url,
                'rating', COALESCE(v.rating, 0),
                'review_count', COALESCE(v.review_count, 0),
                'is_verified', COALESCE(v.is_verified, false),
                'is_active', COALESCE(v.is_active, true),
                'created_at', v.created_at,
                'address_country', COALESCE(v.address_country, 'Kenya')
            ),
            'stats', jsonb_build_object(
                'follower_count', COALESCE(v.follower_count, 0),
                'total_sales', COALESCE(v.total_sales, 0),
                'product_count', (
                    SELECT COUNT(*) 
                    FROM products_with_media pm 
                    WHERE pm.seller_id = v.id 
                    AND pm.status = 'approved'
                )
            ),
            'is_following', false,
            'reason', CASE 
                WHEN v.is_verified THEN 'Verified Vendor'
                WHEN COALESCE(v.rating, 0) >= 4.0 THEN 'Highly Rated'
                WHEN COALESCE(v.follower_count, 0) >= 10 THEN 'Popular Vendor'
                WHEN v.created_at > NOW() - INTERVAL '7 days' THEN 'New Vendor'
                ELSE 'Recommended for you'
            END
        )
        ORDER BY 
            v.is_verified DESC,
            COALESCE(v.rating, 0) DESC,
            COALESCE(v.follower_count, 0) DESC,
            v.created_at DESC
    ) INTO v_results
    FROM vendors v
    WHERE v.id NOT IN (
        SELECT vendor_id 
        FROM user_followed_stores 
        WHERE user_id = p_user_id
    )
    AND COALESCE(v.is_active, true) = true
    AND COALESCE(v.store_active, false) = true
    AND COALESCE(v.profile_completed, false) = true
    LIMIT p_limit;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', COALESCE(v_results, '[]'::jsonb),
        'count', COALESCE(jsonb_array_length(v_results), 0)
    );
END;
$$;

-- =====================================================
-- 8. TRIGGER: update_vendor_follower_count
-- =====================================================
CREATE OR REPLACE FUNCTION update_vendor_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment follower count
        UPDATE vendors 
        SET follower_count = COALESCE(follower_count, 0) + 1
        WHERE id = NEW.vendor_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement follower count
        UPDATE vendors 
        SET follower_count = GREATEST(COALESCE(follower_count, 0) - 1, 0)
        WHERE id = OLD.vendor_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_vendor_follower_count ON user_followed_stores;
CREATE TRIGGER trg_update_vendor_follower_count
    AFTER INSERT OR DELETE ON user_followed_stores
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_follower_count();

-- =====================================================
-- 9. FUNCTION: get_user_following_stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_following_stats(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_following INTEGER;
    v_recent_follows INTEGER;
    v_verified_vendors INTEGER;
    v_country_distribution JSONB;
BEGIN
    -- Get basic stats
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE followed_at > NOW() - INTERVAL '7 days'),
        COUNT(*) FILTER (WHERE v.is_verified = true)
    INTO 
        v_total_following,
        v_recent_follows,
        v_verified_vendors
    FROM user_followed_stores ufs
    JOIN vendors v ON v.id = ufs.vendor_id
    WHERE ufs.user_id = p_user_id;
    
    -- Get country distribution
    SELECT jsonb_agg(
        jsonb_build_object(
            'country', v.address_country,
            'count', COUNT(*),
            'percentage', ROUND(COUNT(*) * 100.0 / NULLIF(v_total_following, 0), 1)
        )
    ) INTO v_country_distribution
    FROM user_followed_stores ufs
    JOIN vendors v ON v.id = ufs.vendor_id
    WHERE ufs.user_id = p_user_id
    GROUP BY v.address_country
    ORDER BY COUNT(*) DESC;
    
    RETURN jsonb_build_object(
        'success', true,
        'stats', jsonb_build_object(
            'total_following', COALESCE(v_total_following, 0),
            'recent_follows_7d', COALESCE(v_recent_follows, 0),
            'verified_vendors', COALESCE(v_verified_vendors, 0),
            'average_vendor_rating', (
                SELECT ROUND(AVG(COALESCE(v2.rating, 0)), 2)
                FROM user_followed_stores ufs2
                JOIN vendors v2 ON v2.id = ufs2.vendor_id
                WHERE ufs2.user_id = p_user_id
            ),
            'total_vendor_sales', (
                SELECT SUM(COALESCE(v2.total_sales, 0))
                FROM user_followed_stores ufs2
                JOIN vendors v2 ON v2.id = ufs2.vendor_id
                WHERE ufs2.user_id = p_user_id
            )
        ),
        'distribution', jsonb_build_object(
            'countries', COALESCE(v_country_distribution, '[]'::jsonb)
        )
    );
END;
$$;

-- =====================================================
-- 10. FUNCTION: sync_all_vendor_follower_counts
-- =====================================================
CREATE OR REPLACE FUNCTION sync_all_vendor_follower_counts()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Update all vendor follower counts from the user_followed_stores table
    WITH vendor_counts AS (
        SELECT 
            vendor_id,
            COUNT(*) as new_count
        FROM user_followed_stores
        GROUP BY vendor_id
    )
    UPDATE vendors v
    SET follower_count = COALESCE(vc.new_count, 0)
    FROM vendor_counts vc
    WHERE v.id = vc.vendor_id
      AND COALESCE(v.follower_count, 0) != COALESCE(vc.new_count, 0);
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Vendor follower counts synchronized',
        'updated_count', v_updated_count,
        'timestamp', NOW()
    );
END;
$$;

-- =====================================================
-- 11. INITIALIZATION: Sync existing follower counts
-- =====================================================
-- Run this once to initialize follower counts
SELECT sync_all_vendor_follower_counts();

-- =====================================================
-- 12. ROW LEVEL SECURITY (if using Supabase Auth)
-- =====================================================
DO $$ 
BEGIN
    -- Enable RLS on the table
    EXECUTE 'ALTER TABLE user_followed_stores ENABLE ROW LEVEL SECURITY';
    
    -- Create policies if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_followed_stores' 
        AND policyname = 'Users can view own follows'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can view own follows" ON user_followed_stores
                 FOR SELECT USING (auth.uid() = user_id)';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_followed_stores' 
        AND policyname = 'Users can manage own follows'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can manage own follows" ON user_followed_stores
                 FOR ALL USING (auth.uid() = user_id)';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    -- If RLS already configured or error occurs, continue
    NULL;
END $$;

-- =====================================================
-- 13. TEST QUERIES (Comment out in production)
-- =====================================================
/*
-- Test follow/unfollow
SELECT toggle_follow_store(
    'e468c587-8986-4fa5-85f1-e8d0180e70f8', -- user_id
    'f419cd41-6054-48d6-b36a-5bb3f8344d2a'  -- vendor_id
);

-- Get followed vendors
SELECT * FROM get_followed_vendors_paginated(
    'e468c587-8986-4fa5-85f1-e8d0180e70f8', -- user_id
    10, 0
);

-- Check if following
SELECT * FROM is_vendor_followed(
    'e468c587-8986-4fa5-85f1-e8d0180e70f8',
    'f419cd41-6054-48d6-b36a-5bb3f8344d2a'
);

-- Get trending vendors to follow
SELECT * FROM get_trending_vendors_to_follow(
    'e468c587-8986-4fa5-85f1-e8d0180e70f8',
    5
);

-- Get user stats
SELECT * FROM get_user_following_stats(
    'e468c587-8986-4fa5-85f1-e8d0180e70f8'
);
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT jsonb_build_object(
    'status', 'Followed stores system installed successfully',
    'features', jsonb_build_array(
        'Toggle follow/unfollow stores',
        'Get followed vendors with pagination',
        'Check follow status',
        'Get vendor followers list',
        'Discover trending vendors',
        'User following analytics',
        'Automatic follower count sync'
    ),
    'tables_modified', jsonb_build_object(
        'user_followed_stores', 'Created',
        'vendors', 'Added follower_count column'
    ),
    'functions_created', 8,
    'timestamp', NOW()
) as installation_report;