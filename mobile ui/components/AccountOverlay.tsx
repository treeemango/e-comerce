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
    onNavigate?: (section: 'orders' | 'coupons' | 'credit' | 'reviews' | 'stores' | 'history' | 'addresses' | 'support' | 'settings' | 'switch' | 'logout' | 'messages' | 'driver_access' | 'wishlist' | 'notifications' | 'profile') => void;
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
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300" onClick={onClose}>
            {/* Backdrop Blur Layer */}
            <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"></div>

            {/* Premium Menu Sheet */}
            <div
                className="absolute top-[64px] right-3 left-3 sm:left-auto sm:w-[330px] max-h-[calc(100vh-80px)] bg-white/90 dark:bg-black/90 backdrop-blur-2xl rounded-[32px] shadow-[0_24px_64px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.4)] overflow-hidden overflow-y-auto animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 border border-white/50 dark:border-gray-800/50"
                onClick={(e) => e.stopPropagation()}
            >
                {/* User Header Section */}
                <div className="p-6 pb-4">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4 cursor-pointer active:scale-95 transition-transform" onClick={() => isAuthed && onNavigate?.('profile')}>
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-700 shadow-xl">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-lg font-black text-gray-400">
                                            {userName.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                {isAuthed && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-black shadow-sm"></div>}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Welcome back</span>
                                <span className="text-[17px] font-black text-black dark:text-white truncate tracking-tight">{userName}</span>
                            </div>
                        </div>

                        {isAuthed ? (
                            <button
                                onClick={() => onNavigate?.('messages')}
                                className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 active:scale-90 transition-transform"
                            >
                                <span className="material-icons-round text-gray-800 dark:text-white text-xl">chat_bubble</span>
                                {typeof messageCount === 'number' && messageCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-white dark:border-black shadow-sm">
                                        {messageCount}
                                    </span>
                                )}
                            </button>
                        ) : (
                            <button onClick={onSignIn} className="bg-primary hover:bg-orange-600 text-white px-5 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">
                                Sign in
                            </button>
                        )}
                    </div>

                    {/* Dashboard Quick Actions */}
                    <div className="grid grid-cols-3 gap-3 p-1">
                        <button className="flex flex-col items-center gap-2 group" onClick={() => onNavigate?.('orders')}>
                            <div className="w-full aspect-square bg-gray-50 dark:bg-black/40 rounded-2xl flex items-center justify-center text-gray-800 dark:text-gray-200 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm border border-gray-100 dark:border-gray-800">
                                <span className="material-icons-round text-2xl">receipt_long</span>
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-tighter">Orders</span>
                        </button>
                        <button className="flex flex-col items-center gap-2 group" onClick={() => onNavigate?.('coupons')}>
                            <div className="relative w-full aspect-square bg-gray-50 dark:bg-black/40 rounded-2xl flex items-center justify-center text-gray-800 dark:text-gray-200 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm border border-gray-100 dark:border-gray-800">
                                <span className="material-icons-round text-2xl">confirmation_number</span>
                                {couponCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white dark:border-black shadow-sm">
                                        {couponCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-tighter">Coupons</span>
                        </button>
                        <button className="flex flex-col items-center gap-2 group" onClick={() => onNavigate?.('credit')}>
                            <div className="w-full aspect-square bg-gray-50 dark:bg-black/40 rounded-2xl flex items-center justify-center text-gray-800 dark:text-gray-200 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm border border-gray-100 dark:border-gray-800">
                                <span className="material-icons-round text-2xl">account_balance_wallet</span>
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-tighter">Credit</span>
                        </button>
                    </div>
                </div>

                {/* Animated Activity Stream */}
                {isAuthed && (userCoupons.length > 0 || recentOrders.length > 0) && (
                    <div className="py-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="px-6 mb-3 flex items-center justify-between">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Latest Benefits</span>
                            <div className="flex gap-1">
                                <div className="w-1 h-1 rounded-full bg-primary/30"></div>
                                <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex gap-3 px-6 overflow-x-auto hide-scrollbar scroll-smooth">
                            {userCoupons.map((coupon, idx) => (
                                <div
                                    key={`coupon-${coupon.id || idx}`}
                                    onClick={() => onNavigate?.('coupons')}
                                    className="shrink-0 w-[200px] p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-orange-500/10 border border-primary/10 flex flex-col gap-1.5 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="material-icons-round text-sm">local_offer</span>
                                        </div>
                                        <span className="text-[9px] font-black text-primary uppercase tracking-wider truncate">{coupon.coupon.name}</span>
                                    </div>
                                    <div className="text-[16px] font-black text-black dark:text-white tracking-tight">
                                        {coupon.coupon.discount_percentage ? `${coupon.coupon.discount_percentage}% REDUCTION` : `${formatPrice(coupon.coupon.discount_amount || 0, 'USD')} OFF`}
                                    </div>
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.1em]">Tap to apply at checkout</span>
                                </div>
                            ))}
                            {recentOrders.slice(0, 1).map((order, idx) => (
                                <div
                                    key={`order-${order.id || idx}`}
                                    onClick={() => onNavigate?.('orders')}
                                    className="shrink-0 w-[200px] p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1.5 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                            <span className="material-icons-round text-sm">inventory_2</span>
                                        </div>
                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Order Update</span>
                                    </div>
                                    <div className="text-[14px] font-black text-black dark:text-white truncate tracking-tight">
                                        {order.status === 'delivered' ? 'Arrival Confirmed!' :
                                            ((order.fulfillment_type === 'local_parcel' || order.shipping_method === 'local_parcel') && order.status === 'shipped') ? 'Ready for Pickup' :
                                                `Status: ${order.status.replace('_', ' ')}`}
                                    </div>
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.1em]">ID: {order.id.slice(0, 12)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation List Menu */}
                <div className="py-2 bg-gray-50/50 dark:bg-black/20">
                    {[
                        { icon: 'person_outline', label: 'My Profile', key: 'profile' as const },
                        { icon: 'star_outline', label: 'Your Reviews', key: 'reviews' as const },
                        { icon: 'favorite_border', label: 'Curated Wishlist', key: 'wishlist' as const },
                        { icon: 'storefront', label: 'Followed Stores', key: 'stores' as const },
                        { icon: 'history', label: 'Browsing History', key: 'history' as const },
                        { icon: 'map', label: 'Delivery Addresses', key: 'addresses' as const },
                        { icon: 'headset_mic', label: 'Direct Support', key: 'support' as const },
                        { icon: 'local_shipping', label: 'Partner Program', key: 'driver_access' as const, highlight: true },
                        {
                            icon: 'notifications_none',
                            label: 'Notices',
                            key: 'notifications' as const,
                            badge: notificationCount > 0 ? notificationCount : undefined
                        },
                        { icon: 'settings', label: 'Preferences', key: 'settings' as const },
                        { icon: 'power_settings_new', label: isAuthed ? 'End Session' : 'Get Started', action: isAuthed ? onSignOut : onSignIn, key: isAuthed ? 'logout' : 'switch' },
                    ].map((item: any, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                if (item.action) {
                                    item.action();
                                }
                                onNavigate?.(item.key ?? 'settings');
                            }}
                            className="w-full text-left px-6 py-3.5 flex items-center gap-4 hover:bg-white dark:hover:bg-gray-800 transition-all active:px-7"
                        >
                            <span className={`material-icons-round ${item.highlight ? 'text-primary' : 'text-gray-400 dark:text-gray-500'} text-xl group-hover:text-primary transition-colors`}>{item.icon}</span>
                            <span className={`text-[13px] font-bold ${item.highlight ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}>{item.label}</span>
                            {item.badge !== undefined && (
                                <span className="ml-auto bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-primary/20">{item.badge}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
