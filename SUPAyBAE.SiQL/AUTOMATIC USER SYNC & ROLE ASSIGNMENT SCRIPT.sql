-- =====================================================
-- COMPLETE AUTOMATIC USER SYNC & ROLE ASSIGNMENT SCRIPT
-- =====================================================

-- =====================================================
-- 1. MANUAL SYNC FUNCTION (For Migration/Cleanup)
-- =====================================================
-- Creates a function to sync ALL auth users to public.users (for bulk updates)
CREATE OR REPLACE FUNCTION sync_all_auth_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_synced_count INTEGER;
    v_total_count INTEGER;
BEGIN
    -- Get total auth users count (requires admin, so we'll approximate)
    SELECT COUNT(*) INTO v_total_count FROM auth.users;

    -- Sync users that don't exist in public.users
    -- Create a temporary table with known users to bypass permission issues
    CREATE TEMP TABLE known_auth_users AS
    SELECT
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'name', SPLIT_PART(au.email, '@', 1)) as name,
        au.raw_user_meta_data->>'full_name' as full_name,
        au.raw_user_meta_data->>'avatar_url' as avatar_url,
        au.created_at,
        COALESCE(au.raw_user_meta_data->>'role', 'buyer') as role
    FROM auth.users au;

    -- Now sync them
    INSERT INTO public.users (
        id,
        email,
        role,
        name,
        full_name,
        avatar_url,
        created_at
    )
    SELECT
        kau.id,
        kau.email,
        CASE
            WHEN kau.role = 'admin' THEN 'admin'
            WHEN EXISTS (SELECT 1 FROM vendors WHERE user_id = kau.id) THEN 'seller'
            ELSE 'buyer'  -- Default for everyone else
        END as role,
        kau.name,
        kau.full_name,
        kau.avatar_url,
        kau.created_at
    FROM known_auth_users kau
    WHERE NOT EXISTS (
        SELECT 1 FROM public.users pu WHERE pu.id = kau.id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        name = COALESCE(public.users.name, EXCLUDED.name),
        full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
        updated_at = NOW();

    GET DIAGNOSTICS v_synced_count = ROW_COUNT;

    -- Clean up
    DROP TABLE known_auth_users;

    -- Update flags for all users
    UPDATE public.users
    SET
        is_buyer = role IN ('buyer', 'admin'),
        is_seller = role IN ('seller', 'admin'),
        is_admin = role = 'admin'
    WHERE is_buyer IS NULL OR is_seller IS NULL OR is_admin IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Auth users synced to public.users',
        'synced_count', v_synced_count,
        'total_users', (SELECT COUNT(*) FROM public.users)
    );
END;
$$;

---

-- =====================================================
-- 2. CORE PROFILE CREATION FUNCTION (Called by Trigger)
-- =====================================================
-- Function that performs the actual INSERT/UPDATE into public.users
CREATE OR REPLACE FUNCTION create_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_name TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'buyer'  -- DEFAULT TO BUYER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update user in public.users
    INSERT INTO public.users (
        id,
        email,
        role,
        name,
        full_name,
        avatar_url,
        created_at
    ) VALUES (
        p_user_id,
        p_email,
        p_role,  -- Will be 'buyer' by default
        COALESCE(p_name, SPLIT_PART(p_email, '@', 1)),
        p_full_name,
        p_avatar_url,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        name = COALESCE(public.users.name, EXCLUDED.name),
        full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
        updated_at = NOW();

    -- Update flags
    UPDATE public.users
    SET
        is_buyer = role IN ('buyer', 'admin'),
        is_seller = role IN ('seller', 'admin'),
        is_admin = role = 'admin'
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User profile created/updated',
        'user_id', p_user_id,
        'role', p_role
    );
END;
$$;

---

-- =====================================================
-- 3. TRIGGER FUNCTION (FIX: AUTOMATIC SYNC ON SIGNUP)
-- =====================================================
-- This function is called by the trigger after a new user inserts into auth.users.
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_metadata JSONB;
    v_role TEXT;
BEGIN
    p_metadata := NEW.raw_user_meta_data;
    v_role := COALESCE(p_metadata->>'role', 'buyer');

    -- 1. Create the user profile in public.users
    PERFORM public.create_user_profile(
        NEW.id,
        NEW.email,
        COALESCE(p_metadata->>'name', p_metadata->>'username'),
        p_metadata->>'full_name',
        p_metadata->>'avatar_url',
        v_role
    );

    -- 2. If the initial role is 'seller', create the vendor entry immediately
    IF v_role = 'seller' THEN
        INSERT INTO public.vendors (
            user_id,
            business_name,
            business_email,
            is_active,
            store_active
        ) VALUES (
            NEW.id,
            COALESCE(p_metadata->>'business_name', COALESCE(p_metadata->>'name', SPLIT_PART(NEW.email, '@', 1))),
            NEW.email,
            true,
            false
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- =====================================================
-- 4. CREATE THE TRIGGER
-- =====================================================
CREATE TRIGGER on_auth_user_created_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.on_auth_user_created();

---

-- =====================================================
-- 5. BULK UPDATE EXISTING USERS TO BUYER ROLE (Migration step)
-- =====================================================
-- Update all users without a vendor entry to 'buyer' role
UPDATE public.users u
SET
    role = 'buyer',
    is_buyer = true,
    is_seller = false,
    is_admin = false
WHERE NOT EXISTS (
    SELECT 1 FROM vendors v WHERE v.user_id = u.id
)
AND u.role NOT IN ('admin', 'seller');

-- Keep admin and seller roles flags accurate for existing users
UPDATE public.users
SET
    is_buyer = role IN ('buyer', 'admin'),
    is_seller = role IN ('seller', 'admin'),
    is_admin = role = 'admin'
WHERE is_buyer IS NULL OR is_seller IS NULL OR is_admin IS NULL;

---

-- =====================================================
-- 6. AUTOMATIC ROLE DETECTION FUNCTION (On-demand check)
-- =====================================================
CREATE OR REPLACE FUNCTION auto_detect_user_role(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_role TEXT;
    v_new_role TEXT;
    v_has_vendor BOOLEAN;
BEGIN
    -- Check current role
    SELECT role INTO v_current_role
    FROM public.users
    WHERE id = p_user_id;

    -- Check if user has a vendor account
    SELECT EXISTS (
        SELECT 1 FROM vendors WHERE user_id = p_user_id
    ) INTO v_has_vendor;

    -- Determine new role
    IF v_current_role = 'admin' THEN
        v_new_role := 'admin';  -- Keep admin role
    ELSIF v_has_vendor THEN
        v_new_role := 'seller';  -- User has vendor account
    ELSE
        v_new_role := 'buyer';  -- Default to buyer
    END IF;

    -- Update if role changed
    IF v_current_role IS DISTINCT FROM v_new_role THEN
        UPDATE public.users
        SET
            role = v_new_role,
            is_buyer = v_new_role IN ('buyer', 'admin'),
            is_seller = v_new_role IN ('seller', 'admin'),
            is_admin = v_new_role = 'admin',
            updated_at = NOW()
        WHERE id = p_user_id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'User role updated',
            'user_id', p_user_id,
            'old_role', v_current_role,
            'new_role', v_new_role
        );
    ELSE
        RETURN jsonb_build_object(
            'success', true,
            'message', 'User role unchanged',
            'user_id', p_user_id,
            'role', v_current_role
        );
    END IF;
END;
$$;

-- =====================================================
-- 7. RUN ROLE DETECTION ON ALL USERS (Migration step)
-- =====================================================
-- Apply automatic role detection to all existing users
DO $$
DECLARE
    v_user RECORD;
    v_result JSONB;
BEGIN
    FOR v_user IN SELECT id FROM public.users LOOP
        SELECT auto_detect_user_role(v_user.id) INTO v_result;
        RAISE NOTICE 'Processed user %: %', v_user.id, v_result->>'message';
    END LOOP;
END $$;

---

-- =====================================================
-- 8. CREATE A VIEW TO SEE USER ROLES (For inspection)
-- =====================================================
CREATE OR REPLACE VIEW user_roles_overview AS
SELECT
    u.id,
    u.email,
    u.role,
    u.name,
    u.is_buyer,
    u.is_seller,
    u.is_admin,
    u.created_at,
    CASE
        WHEN v.id IS NOT NULL THEN v.business_name
        ELSE NULL
    END as business_name,
    CASE
        WHEN u.role = 'buyer' THEN '👤 Buyer'
        WHEN u.role = 'seller' THEN '🏪 Seller'
        WHEN u.role = 'admin' THEN '👑 Admin'
        ELSE '❓ Unknown'
    END as role_display
FROM public.users u
LEFT JOIN vendors v ON v.user_id = u.id
ORDER BY
    CASE u.role
        WHEN 'admin' THEN 1
        WHEN 'seller' THEN 2
        ELSE 3
    END,
    u.created_at DESC;

-- =====================================================
-- 9. CHECK CURRENT USER ROLES (For inspection)
-- =====================================================
SELECT
    role,
    COUNT(*) as user_count,
    STRING_AGG(email, ', ' ORDER BY created_at) as users
FROM public.users
GROUP BY role
ORDER BY user_count DESC;

-- See detailed view
SELECT * FROM user_roles_overview;