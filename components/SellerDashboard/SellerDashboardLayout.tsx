
import React, { useState, useEffect, useRef } from 'react';
import { getSellerUnreadCount } from '@/lib/api';


interface SellerDashboardLayoutProps {
    children: React.ReactNode;
    activeTab: 'overview' | 'products' | 'manage-products' | 'add-products' | 'orders' | 'manage-orders' | 'manage-returns' | 'manage-reviews' | 'promotions' | 'finances' | 'finance-payments' | 'finance-wallet' | 'performance' | 'apps' | 'account' | 'settings' | 'messages' | 'create-auto-discount';
    onTabChange: (tab: 'overview' | 'products' | 'manage-products' | 'add-products' | 'orders' | 'manage-orders' | 'manage-returns' | 'manage-reviews' | 'promotions' | 'finances' | 'finance-payments' | 'finance-wallet' | 'performance' | 'apps' | 'account' | 'settings' | 'messages' | 'create-auto-discount') => void;
    user: any;
    onSignOut: () => void;
}

interface MenuItem {
    id: string;
    label: string;
    icon: string;
    badge?: number;
    submenu?: { id: string; label: string }[];
}

const SellerDashboardLayout: React.FC<SellerDashboardLayoutProps> = ({ children, activeTab, onTabChange, user, onSignOut }) => {
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['products']);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadUnreadCount = async () => {
        if (user?.id) {
            try {
                const count = await getSellerUnreadCount(user.id);
                setUnreadCount(count);
            } catch (error) {
                console.error('Error loading unread count:', error);
            }
        }
    };

    const loadUnreadCountRef = useRef(loadUnreadCount);

    useEffect(() => {
        loadUnreadCountRef.current = loadUnreadCount;
    }, [loadUnreadCount]);

    // Load unread message count
    useEffect(() => {
        if (user?.id) {
            loadUnreadCountRef.current();
            // Poll every 60 seconds for new messages (increased from 30s for performance)
            const interval = setInterval(() => loadUnreadCountRef.current(), 60000);
            return () => clearInterval(interval);
        }
    }, [user?.id]);

    const menuItems: MenuItem[] = [
        { id: 'overview', label: 'Homepage', icon: 'home' },
        {
            id: 'products',
            label: 'Products',
            icon: 'inventory_2',
            submenu: [
                { id: 'manage-products', label: 'Manage products' },
                { id: 'add-products', label: 'Add products' },
                { id: 'add-products-upload', label: 'Add products via upload' },
                { id: 'pricing-health', label: 'Pricing health' },
                { id: 'product-compliance', label: 'Product compliance' },
            ]
        },
        {
            id: 'orders',
            label: 'Orders',
            icon: 'shopping_bag',
            submenu: [
                { id: 'manage-orders', label: 'Manage orders' },
                { id: 'manage-returns', label: 'Manage returns' },
                { id: 'manage-reviews', label: 'Manage reviews' },
                { id: 'order-reports', label: 'Order reports' },
                { id: 'upload-order-files', label: 'Upload order related files' },
            ]
        },
        {
            id: 'promotions',
            label: 'Promotions',
            icon: 'local_offer',
            submenu: [
                { id: 'promotions-coupons', label: 'Coupons' },
                { id: 'promotions-campaigns', label: 'Campaigns' },
                { id: 'promotions-tools', label: 'Promotional tools' },
            ]
        },
        {
            id: 'finances',
            label: 'Finances',
            icon: 'account_balance_wallet',
            submenu: [
                { id: 'finance-wallet', label: 'Wallet & Payouts' },
                { id: 'finance-payments', label: 'Payments' },
                { id: 'finance-charge-method', label: 'Charge method' },
            ]
        },
        { id: 'performance', label: 'Performance', icon: 'trending_up', badge: 1 },
        { id: 'messages', label: 'Messages', icon: 'forum' },
        { id: 'apps', label: 'Apps and services', icon: 'apps' },
        {
            id: 'account',
            label: 'My account',
            icon: 'person',
            submenu: [
                { id: 'account-profile', label: 'Account profile' },
                { id: 'account-seller-profile', label: 'Seller profile' },
                { id: 'account-tax', label: 'Tax information' },
                { id: 'account-shipping', label: 'Shipping settings' },
                { id: 'account-return', label: 'Return settings' },
                { id: 'account-permissions', label: 'User permissions' },
                { id: 'account-notifications', label: 'Notification preferences' },
            ]
        },
    ];

    const toggleMenu = (menuId: string) => {
        if (expandedMenus.includes(menuId)) {
            setExpandedMenus(expandedMenus.filter(id => id !== menuId));
        } else {
            setExpandedMenus([...expandedMenus, menuId]);
        }
    };

    const handleMenuClick = (menuId: string, hasSubmenu: boolean) => {
        if (hasSubmenu) {
            toggleMenu(menuId);
        } else {
            onTabChange(menuId as any);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex font-display">
            {/* Premium Dark Sidebar */}
            <aside className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 w-64 flex flex-col fixed inset-y-0 z-20">
                {/* Logo/Brand Section */}
                <div className="h-16 flex items-center px-5 border-b border-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-icons-round text-white text-xl">store</span>
                        </div>
                        <div>
                            <div className="text-white font-black text-sm tracking-tight">JuaExpress</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Seller Center</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
                    {menuItems.map(item => (
                        <div key={item.id}>
                            <button
                                onClick={() => handleMenuClick(item.id, !!item.submenu)}
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id || (item.submenu && expandedMenus.includes(item.id))
                                    ? 'bg-gradient-to-r from-primary to-orange-500 text-white shadow-lg shadow-primary/20'
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-icons-round text-lg">{item.icon}</span>
                                    <span>{item.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {item.badge && (
                                        <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md">
                                            {item.badge}
                                        </span>
                                    )}
                                    {item.submenu && (
                                        <span className="material-icons-round text-sm">
                                            {expandedMenus.includes(item.id) ? 'expand_less' : 'expand_more'}
                                        </span>
                                    )}
                                </div>
                            </button>

                            {/* Submenu */}
                            {item.submenu && expandedMenus.includes(item.id) && (
                                <div className="ml-4 mt-1 space-y-0.5">
                                    {item.submenu.map(subitem => (
                                        <button
                                            key={subitem.id}
                                            onClick={() => onTabChange(subitem.id as any)}
                                            className={`w-full flex items-center px-3 py-2 rounded-md text-sm transition-colors ${activeTab === subitem.id
                                                ? 'bg-orange-500/20 text-orange-300 font-medium'
                                                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                                }`}
                                        >
                                            {subitem.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Sign Out */}
                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors text-sm font-medium"
                    >
                        <span className="material-icons text-lg">logout</span>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64">
                {/* Premium Top Header */}
                <header className="h-16 bg-gradient-to-r from-gray-900 via-gray-900 to-gray-950 text-white sticky top-0 z-10 px-6 flex items-center justify-between border-b border-gray-800/50">
                    <h1 className="text-lg font-black tracking-tight">
                        {activeTab === 'messages' ? 'Messages' :
                            activeTab === 'overview' ? 'Dashboard Overview' :
                                activeTab.includes('product') ? 'Products' :
                                    activeTab.includes('order') ? 'Orders' :
                                        activeTab.includes('promotion') ? 'Promotions' :
                                            activeTab.includes('finance') ? 'Finances' :
                                                activeTab.includes('account') ? 'Account' :
                                                    activeTab === 'performance' ? 'Performance' :
                                                        activeTab === 'apps' ? 'Apps and Services' : 'Dashboard'}
                    </h1>

                    <div className="flex items-center gap-3">
                        {/* Support Button */}
                        <button className="px-4 py-2 bg-gradient-to-r from-primary to-orange-500 hover:from-orange-500 hover:to-primary text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                            <span className="material-icons-round text-sm">support_agent</span>
                            Support
                        </button>

                        {/* Messages Button */}
                        <button
                            onClick={() => onTabChange('messages')}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 relative"
                        >
                            <span className="material-icons-round text-sm">forum</span>
                            Messages
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-gray-900">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Language Selector */}
                        <button className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-colors">
                            EN
                        </button>

                        {/* User Info */}
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden border border-gray-600">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-icons-round text-gray-400 text-sm">person</span>
                                )}
                            </div>
                            <div className="hidden lg:block">
                                <p className="text-sm font-black leading-none">The MegaMerchant</p>
                                <p className="text-[10px] text-gray-500 mt-0.5 font-bold">ID: {user?.id?.substring(0, 8) || 'xxxxx'}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-6 space-y-4">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default SellerDashboardLayout;
