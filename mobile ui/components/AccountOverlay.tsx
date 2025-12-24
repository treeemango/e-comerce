import React from 'react';
import { UserCoupon, BuyerOrder } from '@/types';
import { formatPrice } from '@/lib/currency';

interface AccountOverlayProps {
    onClose: () => void;
    userName?: string;
    avatarUrl?: string;
    messageCount?: number;
    notificationCount?: number;
    userCoupons?: UserCoupon[];
    recentOrders?: BuyerOrder[];
    onSignOut?: () => void;
    onSignIn?: () => void;
    onNavigate?: (section: 'orders' | 'coupons' | 'credit' | 'reviews' | 'stores' | 'history' | 'addresses' | 'support' | 'settings' | 'switch' | 'logout' | 'messages' | 'driver_access' | 'wishlist' | 'notifications') => void;
}

export const AccountOverlay: React.FC<AccountOverlayProps> = ({
    onClose,
    userName = 'Guest',
    avatarUrl,
    messageCount,
    notificationCount = 0,
    userCoupons = [],
    recentOrders = [],
    onSignOut,
    onSignIn,
    onNavigate
}) => {
    const isAuthed = !!onSignOut && userName !== 'Guest';
    const couponCount = userCoupons.length;
    return (
        <div className="fixed inset-0 z-[100]" onClick={onClose}>
            {/* Menu Positioned relative to typical header height */}
            <div
                className="absolute top-[56px] right-2 w-[320px] bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Triangle pointer (optional aesthetic) */}
                <div className="absolute -top-1.5 right-11 w-3 h-3 bg-white dark:bg-surface-dark transform rotate-45 border-t border-l border-gray-100 dark:border-gray-700"></div>

                {/* User Header */}
                <div className="p-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-200">
                            {avatarUrl ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" /> : userName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-lg text-black dark:text-white truncate max-w-[140px]">{userName}</span>
                    </div>
                    {isAuthed ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onNavigate?.('messages')}
                                className="border border-gray-300 dark:border-gray-600 rounded-full pl-2 pr-1 py-1 flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <span className="material-icons-outlined text-sm">chat_bubble_outline</span>
                                Messages
                                {typeof messageCount === 'number' && (
                                    <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{messageCount}</span>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button onClick={onSignIn} className="border border-gray-300 dark:border-gray-600 rounded-full px-3 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            Sign in
                        </button>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="flex justify-around px-2 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <button className="flex flex-col items-center gap-2 group" onClick={() => onNavigate?.('orders')}>
                        <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black group-hover:scale-105 transition-transform">
                            <span className="material-icons-outlined text-2xl">list_alt</span>
                        </div>
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Your orders</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 group" onClick={() => onNavigate?.('coupons')}>
                        <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black group-hover:scale-105 transition-transform">
                            <span className="material-icons-outlined text-2xl">confirmation_number</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 font-medium">
                            <span>Coupons</span>
                            {typeof couponCount === 'number' && couponCount > 0 && (
                                <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{couponCount}</span>
                            )}
                        </div>
                    </button>
                    <button className="flex flex-col items-center gap-2 group" onClick={() => onNavigate?.('credit')}>
                        <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black group-hover:scale-105 transition-transform">
                            <span className="material-icons-outlined text-2xl">account_balance_wallet</span>
                        </div>
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Credit balance</span>
                    </button>
                </div>

                {/* Real-time Rewards & Activity Preview */}
                {isAuthed && (userCoupons.length > 0 || recentOrders.length > 0) && (
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 py-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="px-4 mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rewards & Activity</span>
                            <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                        </div>
                        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar scroll-smooth pb-2">
                            {userCoupons.map((coupon, idx) => (
                                <div
                                    key={`coupon-${coupon.id || idx}`}
                                    onClick={() => onNavigate?.('coupons')}
                                    className="shrink-0 w-[180px] p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-primary/10 border border-orange-200/50 dark:border-orange-500/20 flex flex-col gap-1 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-icons text-orange-500 text-sm">local_offer</span>
                                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase truncate">{coupon.coupon.name}</span>
                                    </div>
                                    <div className="text-sm font-black text-gray-900 dark:text-white">
                                        {coupon.coupon.discount_percentage ? `${coupon.coupon.discount_percentage}% OFF` : `${formatPrice(coupon.coupon.discount_amount || 0, 'USD')} OFF`}
                                    </div>
                                    <div className="text-[9px] text-gray-500 font-medium">Click to use code</div>
                                </div>
                            ))}
                            {recentOrders.slice(0, 1).map((order, idx) => (
                                <div
                                    key={`order-${order.id || idx}`}
                                    onClick={() => onNavigate?.('orders')}
                                    className="shrink-0 w-[180px] p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-500/20 flex flex-col gap-1 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-icons text-blue-500 text-sm">inventory_2</span>
                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Latest Order</span>
                                    </div>
                                    <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        {order.status === 'delivered' ? 'Delivered!' :
                                            ((order.fulfillment_type === 'local_parcel' || order.shipping_method === 'local_parcel') && order.status === 'shipped') ? 'Ready for Collection' :
                                                `Status: ${order.status}`}
                                    </div>
                                    <div className="text-[9px] text-gray-500 font-medium">Order #{order.id.slice(0, 8)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* List Menu */}
                <div className="py-2">
                    {[
                        { icon: 'rate_review', label: 'Your reviews', key: 'reviews' as const },
                        { icon: 'favorite_border', label: 'Saved Wishlist', key: 'wishlist' as const },
                        { icon: 'storefront', label: 'Followed stores', key: 'stores' as const },
                        { icon: 'history', label: 'Browsing history', key: 'history' as const },
                        { icon: 'location_on', label: 'Addresses', key: 'addresses' as const },
                        { icon: 'headset_mic', label: 'Customer support', key: 'support' as const },
                        { icon: 'settings', label: 'Settings', key: 'settings' as const },
                        { icon: 'local_shipping', label: 'Become a Driver', key: 'driver_access' as const, highlight: true },
                        {
                            icon: 'notifications_none',
                            label: 'Notifications',
                            key: 'notifications' as const,
                            badge: notificationCount > 0 ? notificationCount : undefined
                        },
                        { icon: 'switch_account', label: 'Switch accounts', key: 'switch' as const },
                        { icon: 'logout', label: isAuthed ? 'Sign out' : 'Sign in', action: isAuthed ? onSignOut : onSignIn, key: isAuthed ? 'logout' : 'switch' },
                    ].map((item: any, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                if (item.action) {
                                    item.action();
                                }
                                onNavigate?.(item.key ?? 'settings');
                            }}
                            className="w-full text-left px-5 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-none"
                        >
                            <span className={`material-icons-outlined ${item.highlight ? 'text-emerald-500' : 'text-gray-800 dark:text-gray-200'} text-xl`}>{item.icon}</span>
                            <span className={`text-sm font-medium ${item.highlight ? 'text-emerald-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>{item.label}</span>
                            {item.badge !== undefined && (
                                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{item.badge}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
