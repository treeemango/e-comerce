-- Check if admin_2025_user_permissions exists and has data
SELECT 
    'admin_2025_user_permissions' as table_name, 
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_2025_user_permissions') as table_exists,
    (SELECT count(*) FROM admin_2025_user_permissions) as row_count;

-- Check if admin_permissions exists and has data
SELECT 
    'admin_permissions' as table_name, 
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_permissions') as table_exists,
    (SELECT count(*) FROM admin_permissions) as row_count;

-- Check for Super Admin users in both tables
SELECT 'admin_2025_user_permissions - Super Admins' as source, email, permission_level, is_active 
FROM admin_2025_user_permissions 
WHERE permission_level = 'super_admin';

SELECT 'admin_permissions - Super Admins' as source, email, permission_level, is_active 
FROM admin_permissions 
WHERE permission_level = 'super_admin';
