
import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
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
    markAllAsRead: () => Promise<void>;
    clearHistory: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [history, setHistory] = useState<Notification[]>([]); // Initialize empty, load in useEffect
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const dismissNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const showNotification = useCallback((message: string, type: NotificationType, duration = 5000, onClick?: () => void, action?: NotificationAction, customId?: string) => {
        const id = customId || Math.random().toString(36).substring(2, 9);
        const timestamp = new Date().toISOString();
        const newNotification: Notification = { id, message, type, duration, timestamp, onClick, action, is_read: false };

        setNotifications((prev) => [...prev, newNotification]);
        setHistory((prev) => {
            const updated = [newNotification, ...prev].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).slice(0, 50);
            if (currentUserId) {
                localStorage.setItem(`notification_history_${currentUserId}`, JSON.stringify(updated));
            }
            return updated;
        });

        playNotificationSound();

        if (duration !== Infinity) {
            setTimeout(() => {
                dismissNotification(id);
            }, duration);
        }
    }, [dismissNotification, currentUserId]);

    const showNotificationRef = useRef(showNotification);

    useEffect(() => {
        showNotificationRef.current = showNotification;
    }, [showNotification]);

    // Load history and setup notifications on auth change
    useEffect(() => {
        let subscription: any;

        const setupNotifications = async (user: any) => {
            if (!user) {
                setHistory([]);
                setCurrentUserId(null);
                return;
            }

            // Important: reset history when switching users so one user's notifications
            // never appear in another user's session (even if the new user has no saved/DB notifications).
            setHistory([]);
            setCurrentUserId(user.id);

            // Load from local storage (user-specific key)
            try {
                const saved = localStorage.getItem(`notification_history_${user.id}`);
                if (saved) setHistory(JSON.parse(saved));
            } catch (e) {
                console.warn('[NotificationContext] Failed to load local history:', e);
            }

            // Fetch initial from DB
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

                setHistory(prev => {
                    const combined = [...dbNotes, ...prev.filter(p => !dbNotes.find(d => d.id === p.id))];
                    const sorted = combined.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 50);
                    // Save merged history back to user-specific localStorage
                    localStorage.setItem(`notification_history_${user.id}`, JSON.stringify(sorted));
                    return sorted;
                });
            }

            // Realtime subscription for the current user
            subscription = supabase
                .channel(`notifications:${user.id}`) // User-specific channel
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, payload => {
                    const newNote = payload.new;
                    showNotificationRef.current(
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

        // Listen for auth state changes
        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
            if (subscription) {
                supabase.removeChannel(subscription);
                subscription = null;
            }
            setupNotifications(session?.user || null);
        });

        // Initial setup
        supabase.auth.getUser().then(({ data: { user } }) => {
            setupNotifications(user);
        });

        return () => {
            authSub.unsubscribe();
            if (subscription) supabase.removeChannel(subscription);
        };
    }, []);

    const markAllAsRead = useCallback(async () => {
        // Clear active toast UI
        setNotifications([]);

        // Mark all local history items as read so the bell badge clears immediately.
        setHistory((prev) => {
            if (!prev.length) return prev;
            const updated = prev.map((n) => ({ ...n, is_read: true }));
            if (currentUserId) {
                try {
                    localStorage.setItem(`notification_history_${currentUserId}`, JSON.stringify(updated));
                } catch (e) {
                    console.warn('[NotificationContext] Failed to persist read state:', e);
                }
            }
            return updated;
        });

        // Best-effort: sync read state to DB for this user so it persists across sessions.
        if (!currentUserId) return;
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', currentUserId)
                .eq('is_read', false);
        } catch (e) {
            console.warn('[NotificationContext] Failed to mark notifications read in DB:', e);
        }
    }, [currentUserId]);

    const clearHistory = useCallback(() => {
        setHistory([]);
        if (currentUserId) {
            localStorage.removeItem(`notification_history_${currentUserId}`);
        }
    }, [currentUserId]);

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
