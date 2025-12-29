-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
    permission_level TEXT CHECK (permission_level IN ('content_manager', 'junior_admin', 'senior_admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    UNIQUE(user_id),
    UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Admins can view all permissions
CREATE POLICY "Admins can view all permissions" 
ON public.admin_permissions 
FOR SELECT 
USING (
    auth.uid() IN (SELECT user_id FROM public.admin_permissions)
);

-- 2. Super admins can manage permissions
CREATE POLICY "Super admins can manage permissions" 
ON public.admin_permissions 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.admin_permissions 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- Insert initial super admin (current user)
-- You may need to update the email to your specific user email
INSERT INTO public.admin_permissions (user_id, email, role, permission_level)
SELECT id, email, 'super_admin', 'super_admin'
FROM auth.users
WHERE email = 'juaexpress01@gmail.com' -- Replace with your actual admin email if known, or run manually
ON CONFLICT (user_id) DO NOTHING;
