
import React, { useEffect } from 'react';
import { useNotifications, dispatchNotificationAction, Notification } from './NotificationContext';

interface NotificationInboxProps {
    onClose?: () => void;
    compact?: boolean;
}

const NotificationInbox: React.FC<NotificationInboxProps> = ({ onClose, compact = false }) => {
    const { history, clearHistory, markAllAsRead } = useNotifications();

    // Opening the inbox means the user has seen the notifications.
    // Clear the bell badge/"new" indicator on both web and mobile.
    useEffect(() => {
        void markAllAsRead();
    }, [markAllAsRead]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'notifications';
        }
    };

    const getColorClass = (type: string) => {
        switch (type) {
            case 'success': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10';
            case 'error': return 'text-red-500 bg-red-50 dark:bg-red-500/10';
            case 'warning': return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10';
            case 'info': return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
            default: return 'text-gray-500 bg-gray-50 dark:bg-gray-500/10';
        }
    };

    const formatTimestamp = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Fallback: Infer action from notification message for legacy notifications
    const inferActionFromMessage = (message: string): { target: string; id?: string } | null => {
        const lowerMessage = message.toLowerCase();

        // Seller notifications
        if (lowerMessage.includes('new order') || lowerMessage.includes('new orders')) {
            return { target: 'seller-orders' };
        }
        if (lowerMessage.includes('low on stock') || lowerMessage.includes('inventory')) {
            return { target: 'inventory' };
        }
        if (lowerMessage.includes('funds') || lowerMessage.includes('withdrawal') || lowerMessage.includes('payout')) {
            return { target: 'finances' };
        }
        if (lowerMessage.includes('order') && lowerMessage.includes('paid')) {
            return { target: 'seller-orders' };
        }
        if (lowerMessage.includes('return request')) {
            return { target: 'seller-orders' };
        }

        // Buyer notifications
        if (lowerMessage.includes('offer') || lowerMessage.includes('coupon') || lowerMessage.includes('reward')) {
            return { target: 'coupons' };
        }
        if (lowerMessage.includes('personalized deal') || lowerMessage.includes('items you might love')) {
            return { target: 'deals' };
        }
        if (lowerMessage.includes('wishlist') || lowerMessage.includes('price drop')) {
            return { target: 'wishlist' };
        }
        if (lowerMessage.includes('message') || lowerMessage.includes('unread')) {
            return { target: 'chat', id: 'inbox' };
        }
        if (lowerMessage.includes('order') && (lowerMessage.includes('shipped') || lowerMessage.includes('status') || lowerMessage.includes('parcel'))) {
            return { target: 'order' };
        }

        return null;
    };


    return (
        <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${compact ? '' : 'rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800'}`}>
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <span className="material-icons text-primary">notifications_active</span>
                    <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {history.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {history.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                            <span className="material-icons text-xl">close</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-icons text-gray-300 text-3xl">notifications_paused</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">All caught up!</p>
                        <p className="text-xs text-gray-500 mt-1">New price drops and recommendations will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {history.map((item: Notification) => (
                            <div
                                key={item.id}
                                className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                                onClick={() => {
                                    console.log('[NotificationInbox] Click on item:', item.id, item.message);

                                    // Get action - either from item or inferred from message
                                    const action = item.action || inferActionFromMessage(item.message);
                                    console.log('[NotificationInbox] action:', action, '(original:', item.action, ')');

                                    if (action) {
                                        console.log('[NotificationInbox] Dispatching action:', action);
                                        dispatchNotificationAction(action as any);
                                    } else if (typeof item.onClick === 'function') {
                                        console.log('[NotificationInbox] Calling onClick');
                                        item.onClick();
                                    } else {
                                        console.warn('[NotificationInbox] Could not determine action for notification:', item.id);
                                    }

                                    if (onClose) {
                                        onClose();
                                    }
                                }}


                            >
                                <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${getColorClass(item.type)}`}>
                                    <span className="material-icons text-base">{getIcon(item.type)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug line-clamp-3">
                                        {item.message}
                                    </p>
                                    <p className="text-[10px] font-medium text-gray-400 mt-1 flex items-center gap-1">
                                        <span className="material-icons text-[10px]">schedule</span>
                                        {formatTimestamp(item.timestamp || new Date().toISOString())}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!compact && history.length > 5 && (
                <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-center">
                    <button className="text-xs font-bold text-primary hover:underline">
                        View All Activity
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationInbox;
