-- COMPREHENSIVE ADMIN ACCESS RECOVERY SCRIPT
-- This script ensures BOTH the primary and fallback admin tables exist and grants you Super Admin access.

-- 1. Create the PRIMARY table (using the schema you provided)
CREATE TABLE IF NOT EXISTS public.admin_2025_user_permissions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  permission_level text not null,
  granted_by uuid null,
  is_active boolean null default true,
  granted_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  permissions jsonb null default '{}'::jsonb,
  constraint admin_2025_user_permissions_pkey primary key (id),
  constraint unique_active_user_permission unique (user_id, is_active),
  constraint unique_user_id unique (user_id),
  constraint admin_2025_user_permissions_granted_by_fkey foreign KEY (granted_by) references auth.users (id),
  constraint admin_2025_user_permissions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint admin_2025_user_permissions_permission_level_check check (
    (
      permission_level = any (
        array[
          'content_manager'::text,
          'junior_admin'::text,
          'senior_admin'::text,
          'super_admin'::text,
          'admin'::text
        ]
      )
    )
  )
);

-- 2. Create the FALLBACK table (Required to stop the "relation does not exist" error)
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
    permission_level TEXT CHECK (permission_level IN ('content_manager', 'junior_admin', 'senior_admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(email)
);

-- 3. Enable RLS and simple policies
ALTER TABLE public.admin_2025_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own permissions" ON public.admin_2025_user_permissions;
CREATE POLICY "Users can view own permissions" ON public.admin_2025_user_permissions FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all fallback" ON public.admin_permissions;
CREATE POLICY "Admins can view all fallback" ON public.admin_permissions FOR SELECT USING (true);

-- 4. INSERT CURRENT USER AS SUPER ADMIN INTO BOTH TABLES
DO $$
DECLARE
    curr_user_id uuid;
    curr_user_email text;
BEGIN
    -- Get current authenticated user ID
    curr_user_id := auth.uid();
    
    IF curr_user_id IS NOT NULL THEN
        SELECT email INTO curr_user_email FROM auth.users WHERE id = curr_user_id;
        
        -- A. Primary Table
        INSERT INTO public.admin_2025_user_permissions (
            user_id, 
            permission_level, 
            is_active, 
            permissions
        )
        VALUES (
            curr_user_id, 
            'super_admin', 
            true, 
            '{"canManageTeam": true, "canManageUsers": true, "canEditProducts": true, "canViewActivity": true, "canManageContent": true, "canManageDrivers": true, "canManageSellers": true, "canViewAnalytics": true, "canManageDisputes": true, "canManageFinances": true, "canModerationQueue": true}'::jsonb
        )
        ON CONFLICT (user_id) DO UPDATE SET
            is_active = true,
            permission_level = 'super_admin';
            
        -- B. Fallback Table (email is required here)
        INSERT INTO public.admin_permissions (user_id, email, role, permission_level)
        VALUES (curr_user_id, curr_user_email, 'super_admin', 'super_admin')
        ON CONFLICT (user_id) DO UPDATE SET
            is_active = true,
            permission_level = 'super_admin';

        RAISE NOTICE 'SUCCESS: Granted Super Admin access to % in both tables.', curr_user_email;
    ELSE
        RAISE NOTICE 'WARNING: No authenticated user session found. Please log in to the dashboard first, then run this script to grant yourself access.';
    END IF;
END $$;

-- 5. Verification
SELECT table_name, row_count FROM (
  SELECT 'admin_2025_user_permissions' as table_name, count(*) as row_count FROM admin_2025_user_permissions
  UNION ALL
  SELECT 'admin_permissions', count(*) FROM admin_permissions
) as stats;
