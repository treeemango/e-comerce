
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { playNotificationSound } from '../lib/sounds';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export type NotificationActionTarget = 'product' | 'order' | 'chat' | 'wishlist' | 'coupons' | 'inventory' | 'finances' | 'deals' | 'seller-orders';

export interface NotificationAction {
    target: NotificationActionTarget;
    id?: string;
}

export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
    onClick?: () => void;
    action?: NotificationAction;
    timestamp?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    history: Notification[];
    showNotification: (message: string, type: NotificationType, duration?: number, onClick?: () => void, action?: NotificationAction) => void;
    dismissNotification: (id: string) => void;
    markAllAsRead: () => void;
    clearHistory: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [history, setHistory] = useState<Notification[]>(() => {
        try {
            const saved = localStorage.getItem('notification_history');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const dismissNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const showNotification = useCallback((message: string, type: NotificationType, duration = 5000, onClick?: () => void, action?: NotificationAction) => {
        const id = Math.random().toString(36).substring(2, 9);
        const timestamp = new Date().toISOString();
        const newNotification: Notification = { id, message, type, duration, timestamp, onClick, action };

        setNotifications((prev) => [...prev, newNotification]);
        setHistory((prev) => {
            const updated = [newNotification, ...prev].slice(0, 50); // Keep last 50
            localStorage.setItem('notification_history', JSON.stringify(updated));
            return updated;
        });

        playNotificationSound();

        if (duration !== Infinity) {
            setTimeout(() => {
                dismissNotification(id);
            }, duration);
        }
    }, [dismissNotification]);

    const markAllAsRead = useCallback(() => {
        // Since we don't have an "unread" state yet, we can clear the active toasts
        setNotifications([]);
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem('notification_history');
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, history, showNotification, dismissNotification, markAllAsRead, clearHistory }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const dispatchNotificationAction = (action: NotificationAction) => {
    console.log('[dispatchNotificationAction] Dispatching:', action);
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('juax:notification-action', { detail: action }));
    console.log('[dispatchNotificationAction] Event dispatched successfully');
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
