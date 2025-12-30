import React, { useState, useEffect } from 'react';
import { AdminPermissions, ADMIN_TABS, AdminTabConfig } from '@/types';
import { hasPermissionLevel } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { PermissionBadge } from '@/hooks/useAdminPermissions';
import AIBackgroundLayer from '../SellerDashboard/AIBackgroundLayer';

// Extended tabs including content and team
type AdminTabId =
    | 'overview'
    | 'products'
    | 'sellers'
    | 'drivers'
    | 'users'
    | 'orders'
    | 'disputes'
    | 'moderation'
    | 'finances'
    | 'content'
    | 'activity'
    | 'team'
    | 'ai'
    | 'messages'
    | 'feedback';

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

            {/* Premium Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:translate-x-0`}
            >
                {/* Sidebar Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="material-icons-round text-white text-xl">admin_panel_settings</span>
                            </div>
                            <div>
                                <h1 className="text-white text-base font-black tracking-tight">Admin Panel</h1>
                                <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">Management Hub</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="md:hidden text-white hover:text-blue-200 p-2 rounded-xl hover:bg-white/10 transition-all"
                        >
                            <span className="material-icons-round">close</span>
                        </button>
                    </div>
                </div>

                {/* User Info */}
                <div className="p-5 border-b border-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="material-icons-round text-white">person</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-black text-sm">{user?.name || user?.email || 'Admin'}</p>
                            <div className="flex flex-col items-start mt-1">
                                <PermissionBadge level={permissions?.permission_level} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-1.5">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleMenuClick(item.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${activeTab === item.id
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                                    }`}
                            >
                                <i className={`${item.icon} w-5 h-5`}></i>
                                <span className="flex-1 font-bold text-sm">{item.label}</span>
                                {item.badge !== undefined && item.badge > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-gray-800/50">
                    <button
                        onClick={onSignOut}
                        className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-red-600/20"
                    >
                        <span className="material-icons-round text-lg">logout</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="md:ml-64 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                {/* Premium Top Header */}
                <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-30">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="md:hidden bg-gray-100 hover:bg-gray-200 p-2.5 rounded-xl transition-colors duration-200"
                                >
                                    <span className="material-icons-round text-gray-600">menu</span>
                                </button>
                                <div>
                                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                                        {menuItems.find(m => m.id === activeTab)?.label || 'Dashboard'}
                                    </h1>
                                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Manage your e-commerce platform</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Real-time Status */}
                                <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-bold text-emerald-700">Live</span>
                                </div>

                                {/* Refresh Button */}
                                <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-sm shadow-lg shadow-blue-600/20">
                                    <span className="material-icons-round text-sm">refresh</span>
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
