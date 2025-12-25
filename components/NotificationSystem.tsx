
import React from 'react';
import { useNotifications, Notification } from './NotificationContext';

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
    const { dismissNotification } = useNotifications();

    const getIcon = () => {
        switch (notification.type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'notifications';
        }
    };

    const getTypeStyles = () => {
        switch (notification.type) {
            case 'success': return 'border-emerald-500/30 text-emerald-800 dark:text-emerald-300';
            case 'error': return 'border-red-500/30 text-red-800 dark:text-red-300';
            case 'warning': return 'border-amber-500/30 text-amber-800 dark:text-amber-300';
            case 'info': return 'border-blue-500/30 text-blue-800 dark:text-blue-300';
            default: return 'border-gray-500/30 text-gray-800 dark:text-gray-300';
        }
    };

    const getIconColor = () => {
        switch (notification.type) {
            case 'success': return 'text-emerald-500';
            case 'error': return 'text-red-500';
            case 'warning': return 'text-amber-500';
            case 'info': return 'text-blue-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div
            className={`
        group relative w-full sm:w-[380px] flex items-start gap-3 p-4 
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
        border-l-4 ${getTypeStyles()}
        rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] 
        animate-in slide-in-from-right fade-in duration-500
        hover:scale-[1.02] transition-transform cursor-pointer
      `}
            onClick={() => {
                if (notification.onClick) {
                    notification.onClick();
                }
                dismissNotification(notification.id);
            }}
        >
            <div className={`mt-0.5 ${getIconColor()}`}>
                <span className="material-icons text-2xl">{getIcon()}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                    {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                </p>
                <p className="text-sm mt-1 text-gray-600 dark:text-gray-400 leading-snug">
                    {notification.message}
                </p>
            </div>
            <button
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notification.id);
                }}
            >
                <span className="material-icons text-lg">close</span>
            </button>

            {/* Progress Bar for Auto-dismiss */}
            {notification.duration && notification.duration !== Infinity && (
                <div className="absolute bottom-0 left-0 h-1 bg-gray-200/20 w-full overflow-hidden rounded-b-xl">
                    <div
                        className={`h-full opacity-50 ${getIconColor().replace('text', 'bg')}`}
                        style={{
                            animation: `shrinkWidth ${notification.duration}ms linear forwards`
                        }}
                    />
                </div>
            )}

            <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
        </div>
    );
};

const NotificationSystem: React.FC = () => {
    const { notifications } = useNotifications();

    return (
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            <div className="flex flex-col gap-3 pointer-events-auto items-end">
                {notifications.map((n) => (
                    <NotificationItem key={n.id} notification={n} />
                ))}
            </div>
        </div>
    );
};

export default NotificationSystem;
