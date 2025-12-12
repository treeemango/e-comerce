import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AdminPermissions, AdminGranularPermissions, PERMISSION_LEVELS } from '@/types';
import { checkAdminPermission, hasPermissionLevel, hasResourcePermission } from '@/lib/api';

// Context interface
interface AdminPermissionsContextType {
    permissions: AdminPermissions | null;
    isLoading: boolean;
    error: string | null;
    loadPermissions: (userId: string) => Promise<AdminPermissions | null>;
    clearPermissions: () => void;
    canAccessTab: (requiredLevel: string) => boolean;
    canPerformAction: (resource: keyof AdminGranularPermissions, action: string) => boolean;
    permissionLevel: string | undefined;
}

// Create context with default values
const AdminPermissionsContext = createContext<AdminPermissionsContextType>({
    permissions: null,
    isLoading: false,
    error: null,
    loadPermissions: async () => null,
    clearPermissions: () => { },
    canAccessTab: () => false,
    canPerformAction: () => false,
    permissionLevel: undefined
});

// Provider component
interface AdminPermissionsProviderProps {
    children: ReactNode;
}

export function AdminPermissionsProvider({ children }: AdminPermissionsProviderProps) {
    const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 Hours
    const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

    // Logout function
    const performLogout = useCallback(async () => {
        try {
            const { supabase } = await import('@/lib/supabase'); // Dynamic import to avoid cycles if any
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Error signing out:', e);
        }
        setPermissions(null);
        setError('Session expired due to inactivity. Please log in again.');
        localStorage.removeItem('adminLastActive');
        window.location.href = '/admin'; // Redirect to login
    }, []);

    // Session Timeout Logic
    useEffect(() => {
        if (!permissions) return;

        // Initialize last active time
        const updateLastActive = () => {
            localStorage.setItem('adminLastActive', Date.now().toString());
        };

        // Set initial if missing
        if (!localStorage.getItem('adminLastActive')) {
            updateLastActive();
        }

        // Activity listeners
        const handleActivity = () => updateLastActive();
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        // Check interval
        const intervalId = setInterval(() => {
            const lastActive = parseInt(localStorage.getItem('adminLastActive') || '0', 10);
            const now = Date.now();

            if (now - lastActive > SESSION_TIMEOUT_MS) {
                console.warn('Session timed out. Logging out...');
                performLogout();
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            clearInterval(intervalId);
        };
    }, [permissions, performLogout]);

    const loadPermissions = useCallback(async (userId: string): Promise<AdminPermissions | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const perms = await checkAdminPermission(userId);

            if (!perms) {
                setError('No admin permissions found for this user');
                setPermissions(null);
                return null;
            }

            if (!perms.is_active) {
                setError('Admin access has been deactivated');
                setPermissions(null);
                return null;
            }

            setPermissions(perms);
            localStorage.setItem('adminLastActive', Date.now().toString()); // Reset activity on load
            return perms;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load permissions';
            setError(errorMessage);
            setPermissions(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearPermissions = useCallback(() => {
        setPermissions(null);
        setError(null);
        localStorage.removeItem('adminLastActive');
    }, []);

    const canAccessTab = useCallback((requiredLevel: string): boolean => {
        if (!permissions) return false;
        return hasPermissionLevel(permissions.permission_level, requiredLevel);
    }, [permissions]);

    const canPerformAction = useCallback((
        resource: keyof AdminGranularPermissions,
        action: string
    ): boolean => {
        if (!permissions) return false;
        return hasResourcePermission(permissions.permissions, resource, action);
    }, [permissions]);

    const value: AdminPermissionsContextType = {
        permissions,
        isLoading,
        error,
        loadPermissions,
        clearPermissions,
        canAccessTab,
        canPerformAction,
        permissionLevel: permissions?.permission_level
    };

    return (
        <AdminPermissionsContext.Provider value={value}>
            {children}
        </AdminPermissionsContext.Provider>
    );
}

// Custom hook for consuming the context
export function useAdminPermissions(): AdminPermissionsContextType {
    const context = useContext(AdminPermissionsContext);
    if (!context) {
        throw new Error('useAdminPermissions must be used within an AdminPermissionsProvider');
    }
    return context;
}

// Utility hook for permission-gated components
export function usePermissionGate(
    requiredLevel?: string,
    resource?: keyof AdminGranularPermissions,
    action?: string
): { hasAccess: boolean; isLoading: boolean } {
    const { permissions, isLoading, canAccessTab, canPerformAction } = useAdminPermissions();

    if (isLoading) {
        return { hasAccess: false, isLoading: true };
    }

    if (!permissions) {
        return { hasAccess: false, isLoading: false };
    }

    let hasAccess = true;

    if (requiredLevel) {
        hasAccess = hasAccess && canAccessTab(requiredLevel);
    }

    if (resource && action) {
        hasAccess = hasAccess && canPerformAction(resource, action);
    }

    return { hasAccess, isLoading: false };
}

// Permission badge component for UI
interface PermissionBadgeProps {
    level: string;
    className?: string;
}

export function PermissionBadge({ level, className = '' }: PermissionBadgeProps) {
    const badgeColors: Record<string, string> = {
        'super_admin': 'bg-purple-100 text-purple-800 border-purple-200',
        'senior_admin': 'bg-blue-100 text-blue-800 border-blue-200',
        'junior_admin': 'bg-green-100 text-green-800 border-green-200',
        'content_manager': 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const labels: Record<string, string> = {
        'super_admin': 'Super Admin',
        'senior_admin': 'Senior Admin',
        'junior_admin': 'Junior Admin',
        'content_manager': 'Content Manager'
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColors[level] || badgeColors['content_manager']} ${className}`}>
            {labels[level] || level}
        </span>
    );
}

export default AdminPermissionsContext;
