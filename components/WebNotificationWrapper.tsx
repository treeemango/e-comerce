
import React, { useEffect, useRef } from 'react';
import { useNotifications } from './NotificationContext';
import { fetchUserCoupons, fetchBuyerOrders, fetchBuyerNotificationPreferences, getSellerUnreadCount, getWishlist, fetchLightningDeals, fetchSellerOrdersSummary, fetchSellerStats, WishlistProduct, LightningDealItem } from '../lib/api';
import { UserCoupon, BuyerOrder, User, BuyerNotificationPreferences, SellerOrderSummary, SellerStats } from '../types';

interface WebNotificationWrapperProps {
    user: User | null;
    onDataUpdate: (coupons: UserCoupon[], orders: BuyerOrder[]) => void;
}

export const WebNotificationWrapper: React.FC<WebNotificationWrapperProps> = ({ user, onDataUpdate }) => {
    const { showNotification } = useNotifications();
    const hasInitialLoaded = useRef(false);
    const prevCouponsCount = useRef(0);
    const prevOrdersStatus = useRef<Record<string, string>>({});
    const prevSellerOrdersStatus = useRef<Record<string, string>>({});
    const prevSellerReturnsStatus = useRef<Record<string, string>>({});
    const prevSellerOrdersCount = useRef(0);
    const prevLowStockCount = useRef(0);
    const prevBalance = useRef(0);
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

                // Seller Data Fetch (Conditional)
                const isSeller = user.role === 'seller' || user.role === 'vendor' || user.role === 'admin';
                let sellerOrders: SellerOrderSummary[] = [];
                let sellerStats: SellerStats | null = null;

                if (isSeller) {
                    const [sOrders, sStats] = await Promise.all([
                        fetchSellerOrdersSummary(user.id),
                        fetchSellerStats(user.id)
                    ]);
                    sellerOrders = sOrders;
                    sellerStats = sStats;
                }

                prefsRef.current = prefs;
                const activeCoupons = coupons.filter(c => c.status === 'active' && !c.used_at);

                // Notifications logic
                if (hasInitialLoaded.current) {
                    // --- BUYER NOTIFICATIONS ---
                    // New coupons notification...
                    const dealsEnabled = prefs?.deals !== false;
                    if (dealsEnabled && activeCoupons.length > prevCouponsCount.current) {
                        const newCount = activeCoupons.length - prevCouponsCount.current;
                        showNotificationRef.current(
                            `${newCount} new offer${newCount > 1 ? 's' : ''} available! Check your promotions.`,
                            'success'
                        );
                    }

                    // Order status change notification...
                    const ordersEnabled = prefs?.orders !== false;
                    if (ordersEnabled) {
                        orders.slice(0, 5).forEach(order => {
                            const prevStatus = prevOrdersStatus.current[order.id];
                            const isParcel = order.fulfillment_type === 'local_parcel' || order.shipping_method === 'local_parcel';
                            const justShipped = prevStatus && prevStatus !== 'shipped' && order.status === 'shipped';

                            if (isParcel && justShipped && order.delivery_otp) {
                                showNotificationRef.current(
                                    `📦 Parcel Ready! Order #${order.id.slice(0, 8)} - Collection Code: ${order.delivery_otp}`,
                                    'success'
                                );
                            } else if (prevStatus && order.status && prevStatus !== order.status) {
                                showNotificationRef.current(
                                    `Order #${order.id.slice(0, 8)} status updated to ${order.status}!`,
                                    'info'
                                );
                            }
                        });
                    }

                    // --- SELLER NOTIFICATIONS ---
                    if (isSeller) {
                        // New Orders
                        if (sellerOrders.length > prevSellerOrdersCount.current) {
                            const newCount = sellerOrders.length - prevSellerOrdersCount.current;
                            showNotificationRef.current(
                                `🚀 You have ${newCount} new order${newCount > 1 ? 's' : ''}!`,
                                'success'
                            );
                        }

                        // Order Status Changes (e.g. Paid)
                        sellerOrders.forEach(order => {
                            const prevStatus = prevSellerOrdersStatus.current[order.order_id];
                            const prevReturnStatus = prevSellerReturnsStatus.current[order.order_id];

                            if (prevStatus && order.order_status && prevStatus !== order.order_status) {
                                if (order.order_status === 'paid') {
                                    showNotificationRef.current(
                                        `💰 Order #${order.order_id.slice(0, 8)} has been paid! Time to pack.`,
                                        'success'
                                    );
                                } else {
                                    showNotificationRef.current(
                                        `Order #${order.order_id.slice(0, 8)} status updated to ${order.order_status}.`,
                                        'info'
                                    );
                                }
                            }

                            // Return Status Changes
                            if (prevReturnStatus !== undefined && order.return_status && prevReturnStatus !== order.return_status) {
                                showNotificationRef.current(
                                    `🔄 Return request for Order #${order.order_id.slice(0, 8)} is now ${order.return_status}.`,
                                    'warning'
                                );
                            }
                        });

                        // Low Stock Alerts
                        if (sellerStats && sellerStats.low_stock_count > prevLowStockCount.current) {
                            showNotificationRef.current(
                                `⚠️ Some items are running low on stock! Check your inventory.`,
                                'warning'
                            );
                        }

                        // Funds available (Balance increase)
                        if (sellerStats && sellerStats.balance > prevBalance.current && prevBalance.current > 0) {
                            showNotificationRef.current(
                                `💸 New funds are now available for withdrawal!`,
                                'success'
                            );
                        }
                    }

                    // --- GENERIC NOTIFICATIONS ---
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
                                `${newPriceDrops.length} item${newPriceDrops.length > 1 ? 's' : ''} in your wishlist had a price drop!`,
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
                                `We found some new items you might love!`,
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
                orders.slice(0, 5).forEach(o => { if (o.status) statusMap[o.id] = o.status; });
                prevOrdersStatus.current = statusMap;

                if (isSeller) {
                    prevSellerOrdersCount.current = sellerOrders.length;
                    const sStatusMap: Record<string, string> = {};
                    const sReturnMap: Record<string, string> = {};
                    sellerOrders.forEach(o => {
                        sStatusMap[o.order_id] = o.order_status;
                        if (o.return_status) sReturnMap[o.order_id] = o.return_status;
                    });
                    prevSellerOrdersStatus.current = sStatusMap;
                    prevSellerReturnsStatus.current = sReturnMap;
                    if (sellerStats) {
                        prevLowStockCount.current = sellerStats.low_stock_count;
                        prevBalance.current = sellerStats.balance || 0;
                    }
                }

                hasInitialLoaded.current = true;
            } catch (err) {
                console.error('Error loading web notification data:', err);
            }
        };

        if (user?.id) {
            loadData();
            // Poll every 120 seconds for updates
            interval = setInterval(loadData, 120000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [user?.id]);

    return null; // Logic-only component
};
