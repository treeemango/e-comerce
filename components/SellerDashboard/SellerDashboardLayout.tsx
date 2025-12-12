
import React, { useState, useEffect } from 'react';
import { getSellerUnreadCount } from '@/lib/api';


interface SellerDashboardLayoutProps {
    children: React.ReactNode;
    activeTab: 'overview' | 'products' | 'manage-products' | 'add-products' | 'orders' | 'promotions' | 'finances' | 'performance' | 'apps' | 'account' | 'settings' | 'messages';
    onTabChange: (tab: 'overview' | 'products' | 'manage-products' | 'add-products' | 'orders' | 'promotions' | 'finances' | 'performance' | 'apps' | 'account' | 'settings' | 'messages') => void;
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

    // Load unread message count
    useEffect(() => {
        if (user?.id) {
            loadUnreadCount();
            // Poll every 30 seconds for new messages
            const interval = setInterval(loadUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [user?.id]);

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
        <div className="min-h-screen bg-gray-50 flex font-display">
            {/* Dark Sidebar */}
            <aside className="bg-gray-900 w-64 flex flex-col fixed inset-y-0 z-20">
                {/* Logo/Brand Section */}
                <div className="h-14 flex items-center px-4 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <span className="material-icons text-white text-lg">store</span>
                        </div>
                        <div>
                            <div className="text-white font-bold text-sm">JuaExpress</div>
                            <div className="text-gray-400 text-xs">Seller Center</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
                    {menuItems.map(item => (
                        <div key={item.id}>
                            <button
                                onClick={() => handleMenuClick(item.id, !!item.submenu)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === item.id || (item.submenu && expandedMenus.includes(item.id))
                                    ? 'bg-orange-500 text-white'
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-icons text-lg">{item.icon}</span>
                                    <span>{item.label}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {item.badge && (
                                        <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                            {item.badge}
                                        </span>
                                    )}
                                    {item.submenu && (
                                        <span className="material-icons text-sm">
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
                {/* Top Header */}
                <header className="h-14 bg-gray-900 text-white sticky top-0 z-10 px-6 flex items-center justify-between border-b border-gray-800">
                    <h1 className="text-base font-semibold">
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
                        <button className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1.5">
                            <span className="material-icons text-sm">support_agent</span>
                            Support
                        </button>

                        {/* Messages Button */}
                        <button
                            onClick={() => onTabChange('messages')}
                            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 relative"
                        >
                            <span className="material-icons text-sm">forum</span>
                            Messages
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Language Selector */}
                        <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md transition-colors">
                            EN
                        </button>

                        {/* User Info */}
                        <div className="flex items-center gap-3 pl-3 border-l border-gray-700">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-icons text-gray-400 text-sm">person</span>
                                )}
                            </div>
                            <div className="hidden lg:block">
                                <p className="text-sm font-medium leading-none">The MegaMerchant</p>
                                <p className="text-xs text-gray-400 mt-0.5">ID: {user?.id?.substring(0, 12) || 'xxxxx'}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default SellerDashboardLayout;
