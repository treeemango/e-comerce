
import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
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
    is_read?: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    history: Notification[];
    showNotification: (message: string, type: NotificationType, duration?: number, onClick?: () => void, action?: NotificationAction, id?: string) => void;
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

    // Load improved notifications from DB
    useEffect(() => {
        let subscription: any;

        const setupNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch initial
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) {
                const dbNotes: Notification[] = data.map(n => ({
                    id: n.id,
                    message: n.message,
                    type: n.type as NotificationType,
                    timestamp: n.created_at,
                    action: n.action_payload,
                    is_read: n.is_read
                }));
                // Merge with local history - prioritizing DB
                setHistory(prev => {
                    const combined = [...dbNotes, ...prev.filter(p => !dbNotes.find(d => d.id === p.id))];
                    return combined.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 50);
                });
            }

            // Realtime subscription
            subscription = supabase
                .channel('public:notifications')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, payload => {
                    const newNote = payload.new;
                    showNotification(
                        newNote.message,
                        newNote.type as NotificationType,
                        5000,
                        undefined,
                        newNote.action_payload,
                        newNote.id
                    );
                })
                .subscribe();
        };

        setupNotifications();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const showNotification = useCallback((message: string, type: NotificationType, duration = 5000, onClick?: () => void, action?: NotificationAction, customId?: string) => {
        const id = customId || Math.random().toString(36).substring(2, 9);
        const timestamp = new Date().toISOString();
        const newNotification: Notification = { id, message, type, duration, timestamp, onClick, action };

        setNotifications((prev) => [...prev, newNotification]);
        setHistory((prev) => {
            const updated = [newNotification, ...prev].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).slice(0, 50);
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
