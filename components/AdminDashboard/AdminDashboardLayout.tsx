import React, { useState, useEffect } from 'react';
import { AdminPermissions, ADMIN_TABS, AdminTabConfig } from '@/types';
import { hasPermissionLevel } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { PermissionBadge } from '@/hooks/useAdminPermissions';
import AIBackgroundLayer from '../SellerDashboard/AIBackgroundLayer';

// Extended tabs including content and team
type AdminTabId = 'overview' | 'products' | 'sellers' | 'drivers' | 'users' | 'orders' | 'moderation' | 'finances' | 'content' | 'activity' | 'team';

interface AdminDashboardLayoutProps {
    children: React.ReactNode;
    activeTab: AdminTabId;
    onTabChange: (tab: AdminTabId) => void;
    user: any;
    permissions: AdminPermissions;
    onSignOut: () => void;
}

interface MenuItem {
    id: string;
    label: string;
    icon: string;
    badge?: number;
}

const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({
    children,
    activeTab,
    onTabChange,
    user,
    permissions,
    onSignOut
}) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [pendingProductsCount, setPendingProductsCount] = useState(0);
    const [pendingSellersCount, setPendingSellersCount] = useState(0);
    const [pendingDriversCount, setPendingDriversCount] = useState(0);

    // Filter tabs based on user's permission level
    const visibleTabs = ADMIN_TABS.filter(tab =>
        hasPermissionLevel(permissions?.permission_level, tab.requiredLevel)
    );

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                // Fetch pending products count
                const { data: products } = await supabase
                    .from('products')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'pending');
                setPendingProductsCount(products?.length || 0);

                // Fetch pending sellers count
                const { data: sellers } = await supabase
                    .from('vendors')
                    .select('id', { count: 'exact', head: true })
                    .eq('is_verified', false);
                setPendingSellersCount(sellers?.length || 0);

                // Fetch pending drivers count
                const { data: drivers } = await supabase
                    .from('delivery_partners')
                    .select('id', { count: 'exact', head: true })
                    .eq('verification_status', 'pending');
                setPendingDriversCount(drivers?.length || 0);
            } catch (err) {
                console.error('Error fetching pending counts:', err);
            }
        };

        fetchCounts();
        const interval = setInterval(fetchCounts, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    // Convert ADMIN_TABS to MenuItems with dynamic badges
    const menuItems: MenuItem[] = visibleTabs.map(tab => ({
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        badge: tab.id === 'products' ? pendingProductsCount
            : tab.id === 'sellers' ? pendingSellersCount
                : tab.id === 'drivers' ? pendingDriversCount
                    : undefined
    }));

    const handleMenuClick = (menuId: string) => {
        onTabChange(menuId as AdminTabId);
        setIsSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-800 to-slate-900 text-white z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:translate-x-0`}
            >
                {/* Sidebar Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i className="fas fa-shield-alt text-white text-xl"></i>
                            </div>
                            <div>
                                <h1 className="text-white text-lg font-bold">Admin Panel</h1>
                                <p className="text-blue-100 text-sm">Management Dashboard</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="md:hidden text-white hover:text-blue-200"
                        >
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                {/* User Info */}
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-white"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-medium">{user?.name || user?.email || 'Admin'}</p>
                            <div className="flex flex-col items-start mt-1">
                                <PermissionBadge level={permissions?.permission_level} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-2">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleMenuClick(item.id)}
                                className={`w-full text-left px-3 py-3 rounded-lg flex items-center space-x-3 transition-all duration-200 ${activeTab === item.id
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                <i className={`${item.icon} w-5 h-5`}></i>
                                <span className="flex-1">{item.label}</span>
                                {item.badge !== undefined && item.badge > 0 && (
                                    <span className="bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-gray-700">
                    <button
                        onClick={onSignOut}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="md:ml-64 min-h-screen">
                {/* Top Header */}
                <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="md:hidden bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors duration-200"
                                >
                                    <i className="fas fa-bars text-gray-600"></i>
                                </button>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {menuItems.find(m => m.id === activeTab)?.label || 'Dashboard'}
                                    </h1>
                                    <p className="text-gray-600 text-sm">Manage your e-commerce platform</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                {/* Real-time Status */}
                                <div className="hidden md:flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-gray-600">Live</span>
                                </div>

                                {/* Refresh Button */}
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2">
                                    <i className="fas fa-sync-alt"></i>
                                    <span className="hidden sm:inline">Refresh</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="p-6">
                    {children}
                </main>
            </div>

            {/* AI Worker iframe for embedding generation */}
            <AIBackgroundLayer />
        </div>
    );
};

export default AdminDashboardLayout;
