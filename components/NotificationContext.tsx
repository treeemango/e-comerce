
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { playNotificationSound } from '../lib/sounds';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
}

interface NotificationContextType {
    notifications: Notification[];
    history: Notification[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
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

    const showNotification = useCallback((message: string, type: NotificationType, duration = 5000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const timestamp = new Date().toISOString();
        const newNotification: Notification & { timestamp: string } = { id, message, type, duration, timestamp };

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

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
