
import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../../components/NotificationContext';
import { fetchUserCoupons, fetchBuyerOrders, fetchBuyerNotificationPreferences, getSellerUnreadCount, getWishlist, fetchLightningDeals, WishlistProduct, LightningDealItem } from '@/lib/api';
import { UserCoupon, BuyerOrder, User, BuyerNotificationPreferences } from '@/types';

interface MobileNotificationWrapperProps {
    user: User | null;
    onDataUpdate: (coupons: UserCoupon[], orders: BuyerOrder[]) => void;
}

export const MobileNotificationWrapper: React.FC<MobileNotificationWrapperProps> = ({ user, onDataUpdate }) => {
    const { showNotification } = useNotifications();
    const hasInitialLoaded = useRef(false);
    const prevCouponsCount = useRef(0);
    const prevOrdersStatus = useRef<Record<string, string>>({});
    const prevUnreadCount = useRef(0);
    const prevPriceDropIds = useRef<Set<string>>(new Set());
    const prevRecommendedIds = useRef<Set<string>>(new Set());
    const prefsRef = useRef<BuyerNotificationPreferences | null>(null);

    const onDataUpdateRef = useRef(onDataUpdate);
    const showNotificationRef = useRef(showNotification);

    useEffect(() => {
        onDataUpdateRef.current = onDataUpdate;
        showNotificationRef.current = showNotification;
    }, [onDataUpdate, showNotification]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const loadData = async () => {
            if (!user?.id) return;

            try {
                const [coupons, orders, prefs, unreadCount, wishlist, deals] = await Promise.all([
                    fetchUserCoupons(user.id),
                    fetchBuyerOrders(user.id),
                    fetchBuyerNotificationPreferences(user.id),
                    getSellerUnreadCount(user.id),
                    getWishlist(user.id),
                    fetchLightningDeals(user.id, 20)
                ]);

                prefsRef.current = prefs;
                const activeCoupons = coupons.filter(c => c.status === 'active' && !c.used_at);

                // Notifications logic
                if (hasInitialLoaded.current) {
                    // New coupons notification (Subject to "deals" preference)
                    const dealsEnabled = prefs?.deals !== false;
                    if (dealsEnabled && activeCoupons.length > prevCouponsCount.current) {
                        const newCount = activeCoupons.length - prevCouponsCount.current;
                        showNotificationRef.current(
                            `${newCount} new offer${newCount > 1 ? 's' : ''} available! Check your rewards.`,
                            'success'
                        );
                    }

                    // Order status change notification (Subject to "orders" preference)
                    const ordersEnabled = prefs?.orders !== false;
                    if (ordersEnabled) {
                        orders.slice(0, 3).forEach(order => {
                            const prevStatus = prevOrdersStatus.current[order.id];
                            if (prevStatus && order.status && prevStatus !== order.status) {
                                showNotificationRef.current(
                                    `Order #${order.id.slice(0, 8)} status updated to ${order.status}!`,
                                    'info'
                                );
                            }
                        });
                    }

                    // New messages notification (Subject to "messages" preference)
                    const messagesEnabled = prefs?.messages !== false;
                    if (messagesEnabled && unreadCount > prevUnreadCount.current) {
                        showNotificationRef.current(
                            `You have new unread messages!`,
                            'info'
                        );
                    }

                    // Price drops notification (Subject to "price_drops" preference)
                    const priceDropsEnabled = prefs?.price_drops !== false;
                    if (priceDropsEnabled) {
                        const newPriceDrops = wishlist.filter(item =>
                            (item.lower_than_similar || (item.discountPercent && item.discountPercent >= 20)) &&
                            !prevPriceDropIds.current.has(item.id.toString())
                        );
                        if (newPriceDrops.length > 0) {
                            showNotificationRef.current(
                                `${newPriceDrops.length} wishlist item${newPriceDrops.length > 1 ? 's' : ''} dropped in price!`,
                                'success'
                            );
                            newPriceDrops.forEach(item => prevPriceDropIds.current.add(item.id.toString()));
                        }
                    }

                    // Recommendations notification (Subject to "recommendations" preference)
                    const recommendationsEnabled = prefs?.recommendations !== false;
                    if (recommendationsEnabled) {
                        const newRecommendations = deals.filter(deal =>
                            (deal.personalization_score && deal.personalization_score >= 0.7) &&
                            !prevRecommendedIds.current.has(deal.id)
                        );
                        if (newRecommendations.length > 0) {
                            showNotificationRef.current(
                                `New personalized deals found for you!`,
                                'success'
                            );
                            newRecommendations.forEach(deal => prevRecommendedIds.current.add(deal.id));
                        }
                    }
                } else {
                    // Initial load: populate refs without showing notifications
                    wishlist.forEach(item => {
                        if (item.lower_than_similar || (item.discountPercent && item.discountPercent >= 20)) {
                            prevPriceDropIds.current.add(item.id.toString());
                        }
                    });
                    deals.forEach(deal => {
                        if (deal.personalization_score && deal.personalization_score >= 0.7) {
                            prevRecommendedIds.current.add(deal.id);
                        }
                    });
                }

                // Update parent state via ref to avoid re-triggering this effect
                onDataUpdateRef.current(activeCoupons, orders);

                // Update refs for next comparison
                prevCouponsCount.current = activeCoupons.length;
                prevUnreadCount.current = unreadCount;
                const statusMap: Record<string, string> = {};
                orders.slice(0, 3).forEach(o => { if (o.status) statusMap[o.id] = o.status; });
                prevOrdersStatus.current = statusMap;
                hasInitialLoaded.current = true;
            } catch (err) {
                console.error('Error loading mobile notification data:', err);
            }
        };

        if (user?.id) {
            loadData();
            // Poll every 120 seconds for updates (reduced frequency for performance)
            interval = setInterval(loadData, 120000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [user?.id]);

    return null; // This is a logic-only component
};
