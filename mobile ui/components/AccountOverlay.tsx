import React from 'react';

interface AccountOverlayProps {
    onClose: () => void;
    userName?: string;
    avatarUrl?: string;
    messageCount?: number;
    couponCount?: number;
    onSignOut?: () => void;
    onSignIn?: () => void;
    onNavigate?: (section: 'orders' | 'coupons' | 'credit' | 'reviews' | 'stores' | 'history' | 'addresses' | 'support' | 'settings' | 'switch' | 'logout') => void;
}

export const AccountOverlay: React.FC<AccountOverlayProps> = ({ onClose, userName = 'Guest', avatarUrl, messageCount, couponCount, onSignOut, onSignIn, onNavigate }) => {
    const isAuthed = !!onSignOut && userName !== 'Guest';
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
                                    {avatarUrl ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" /> : userName.slice(0,2).toUpperCase()}
                                </div>
                                <span className="font-bold text-lg text-black dark:text-white truncate max-w-[140px]">{userName}</span>
                        </div>
                        {isAuthed ? (
                            <div className="flex items-center gap-2">
                                <button className="border border-gray-300 dark:border-gray-600 rounded-full pl-2 pr-1 py-1 flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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

        {/* List Menu */}
        <div className="py-2">
            {[
                { icon: 'rate_review', label: 'Your reviews', key: 'reviews' as const },
                { icon: 'storefront', label: 'Followed stores', key: 'stores' as const },
                { icon: 'history', label: 'Browsing history', key: 'history' as const },
                { icon: 'location_on', label: 'Addresses', key: 'addresses' as const },
                { icon: 'headset_mic', label: 'Customer support', key: 'support' as const },
                { icon: 'settings', label: 'Settings', key: 'settings' as const },
                { icon: 'switch_account', label: 'Switch accounts', key: 'switch' as const },
                { icon: 'logout', label: isAuthed ? 'Sign out' : 'Sign in', action: isAuthed ? onSignOut : onSignIn, key: isAuthed ? 'logout' : 'switch' },
            ].map((item, idx) => (
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
                    <span className="material-icons-outlined text-gray-800 dark:text-gray-200 text-xl">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};
