
import React, { useEffect, useRef } from 'react';
import { useNotifications } from './NotificationContext';
import { fetchUserCoupons, fetchBuyerOrders, fetchBuyerNotificationPreferences, getSellerUnreadCount, getWishlist, fetchLightningDeals, fetchSellerOrdersSummary, fetchSellerStats, fetchVendorFullProfile, WishlistProduct, LightningDealItem } from '../lib/api';
import { UserCoupon, BuyerOrder, User, BuyerNotificationPreferences, SellerOrderSummary, SellerStats } from '../types';
import { supabase } from '../lib/supabase';

interface WebNotificationWrapperProps {
    user: User | null;
    onDataUpdate: (coupons: UserCoupon[], orders: BuyerOrder[]) => void;
    onReviewPrompt?: (orderId: string) => void;
    onDeepLink?: (type: 'product' | 'order' | 'chat', id: string) => void;
}

export const WebNotificationWrapper: React.FC<WebNotificationWrapperProps> = ({ user, onDataUpdate, onReviewPrompt, onDeepLink }) => {
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

    const prevSellerVerifiedRef = useRef<boolean | null>(null);

    const onDataUpdateRef = useRef(onDataUpdate);
    const showNotificationRef = useRef(showNotification);

    useEffect(() => {
        onDataUpdateRef.current = onDataUpdate;
        showNotificationRef.current = showNotification;
    }, [onDataUpdate, showNotification]);

    useEffect(() => {
        let highFreqInterval: NodeJS.Timeout;
        let lowFreqInterval: NodeJS.Timeout;

        const loadHighFrequencyData = async () => {
            if (!user?.id) return;
            try {
                const isSeller = user.role === 'seller' || (user as any)?.role === 'vendor' || user.role === 'admin' || (user as any)?.is_seller === true;
                const [orders, unreadCount, sellerOrders, sellerStats, vendorProfile] = await Promise.all([
                    fetchBuyerOrders(user.id),
                    getSellerUnreadCount(user.id),
                    isSeller ? fetchSellerOrdersSummary(user.id) : Promise.resolve([] as SellerOrderSummary[]),
                    isSeller ? fetchSellerStats(user.id) : Promise.resolve(null as SellerStats | null),
                    isSeller ? fetchVendorFullProfile(user.id) : Promise.resolve(null as any)
                ]);

                // Seller verification approved notification (once)
                if (isSeller && vendorProfile && typeof vendorProfile.is_verified === 'boolean') {
                    const currentVerified = !!vendorProfile.is_verified;
                    const prevVerified = prevSellerVerifiedRef.current;

                    if (prevVerified === null) {
                        prevSellerVerifiedRef.current = currentVerified;
                    } else {
                        const storageKey = `seller_verified_notified_${user.id}`;
                        const alreadyNotified = typeof window !== 'undefined' && window.localStorage
                            ? window.localStorage.getItem(storageKey) === '1'
                            : false;

                        if (!alreadyNotified && prevVerified === false && currentVerified === true) {
                            showNotificationRef.current(
                                '🎉 Congratulations! Your seller profile has been approved. Your store is now verified.',
                                'success',
                                8000,
                                undefined,
                                { target: 'seller-dashboard' }
                            );
                            try {
                                window.localStorage?.setItem(storageKey, '1');
                            } catch {
                                // ignore
                            }
                        }
                        prevSellerVerifiedRef.current = currentVerified;
                    }
                }

                if (hasInitialLoaded.current) {
                    // Order status change notification...
                    const ordersEnabled = prefsRef.current?.orders !== false;
                    if (ordersEnabled) {
                        orders.slice(0, 5).forEach(order => {
                            const prevStatus = prevOrdersStatus.current[order.id];
                            const isParcel = order.fulfillment_type === 'local_parcel' || order.shipping_method === 'local_parcel';
                            const justShipped = prevStatus && prevStatus !== 'shipped' && order.status === 'shipped';

                            if (isParcel && justShipped && order.delivery_otp) {
                                showNotificationRef.current(
                                    `📦 Parcel Ready! Order #${order.id.slice(0, 8)} - Collection Code: ${order.delivery_otp}`,
                                    'success',
                                    8000,
                                    () => onDeepLink?.('order', order.id),
                                    { target: 'order', id: order.id }
                                );
                            } else if (prevStatus && order.status && prevStatus !== order.status) {
                                showNotificationRef.current(
                                    `Order #${order.id.slice(0, 8)} status updated to ${order.status}!`,
                                    'info',
                                    5000,
                                    () => onDeepLink?.('order', order.id),
                                    { target: 'order', id: order.id }
                                );
                            }
                        });
                    }

                    if (isSeller) {
                        // New Orders
                        if (sellerOrders.length > prevSellerOrdersCount.current) {
                            const newCount = sellerOrders.length - prevSellerOrdersCount.current;
                            showNotificationRef.current(
                                `🚀 You have ${newCount} new order${newCount > 1 ? 's' : ''}!`,
                                'success',
                                5000,
                                undefined,
                                { target: 'seller-orders' }

                            );
                        }

                        sellerOrders.forEach(order => {
                            const prevStatus = prevSellerOrdersStatus.current[order.order_id];
                            const prevReturnStatus = prevSellerReturnsStatus.current[order.order_id];

                            if (prevStatus && order.order_status && prevStatus !== order.order_status) {
                                if (order.order_status === 'paid') {
                                    showNotificationRef.current(
                                        `💰 Order #${order.order_id.slice(0, 8)} has been paid! Time to pack.`,
                                        'success',
                                        5000,
                                        () => onDeepLink?.('order', order.order_id),
                                        { target: 'order', id: order.order_id }
                                    );
                                } else {
                                    showNotificationRef.current(
                                        `Order #${order.order_id.slice(0, 8)} status updated to ${order.order_status}.`,
                                        'info',
                                        5000,
                                        () => onDeepLink?.('order', order.order_id),
                                        { target: 'order', id: order.order_id }
                                    );
                                }
                            }

                            if (prevReturnStatus !== undefined && order.return_status && prevReturnStatus !== order.return_status) {
                                showNotificationRef.current(
                                    `🔄 Return request for Order #${order.order_id.slice(0, 8)} is now ${order.return_status}.`,
                                    'warning',
                                    5000,
                                    () => onDeepLink?.('order', order.order_id),
                                    { target: 'order', id: order.order_id }
                                );
                            }
                        });

                        // Low Stock Alerts
                        if (sellerStats && sellerStats.low_stock_count > prevLowStockCount.current) {
                            showNotificationRef.current(
                                `⚠️ Some items are running low on stock! Check your inventory.`,
                                'warning',
                                5000,
                                undefined,
                                { target: 'inventory' }
                            );
                        }

                        // Funds available
                        if (sellerStats && sellerStats.balance > prevBalance.current && prevBalance.current > 0) {
                            showNotificationRef.current(
                                `💸 New funds are now available for withdrawal!`,
                                'success',
                                5000,
                                undefined,
                                { target: 'finances' }
                            );
                        }
                    }

                    // New messages
                    const messagesEnabled = prefsRef.current?.messages !== false;
                    if (messagesEnabled && unreadCount > prevUnreadCount.current) {
                        showNotificationRef.current(
                            `You have new unread messages!`,
                            'info',
                            5000,
                            () => onDeepLink?.('chat', 'inbox'),
                            { target: 'chat', id: 'inbox' },
                            user?.id ? `unread_messages_${user.id}` : undefined
                        );
                    }
                }

                // Update refs
                const statusMap: Record<string, string> = {};
                orders.slice(0, 5).forEach(o => { if (o.status) statusMap[o.id] = o.status; });
                prevOrdersStatus.current = statusMap;
                prevUnreadCount.current = unreadCount;

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

                // Pass critical updates up
                onDataUpdateRef.current([], orders); // Coupons updated separately
            } catch (err) {
                console.error('Error loading high frequency data:', err);
            }
        };

        const loadLowFrequencyData = async () => {
            if (!user?.id) return;
            try {
                const [coupons, prefs, wishlist, deals] = await Promise.all([
                    fetchUserCoupons(user.id),
                    fetchBuyerNotificationPreferences(user.id),
                    getWishlist(user.id),
                    fetchLightningDeals(user.id, 20)
                ]);

                prefsRef.current = prefs;
                const activeCoupons = coupons.filter(c => c.status === 'active' && !c.used_at);

                if (hasInitialLoaded.current) {
                    // New coupons
                    const dealsEnabled = prefs?.deals !== false;
                    if (dealsEnabled && activeCoupons.length > prevCouponsCount.current) {
                        const newCount = activeCoupons.length - prevCouponsCount.current;
                        showNotificationRef.current(
                            `${newCount} new offer${newCount > 1 ? 's' : ''} available! Check your rewards.`,
                            'success',
                            5000,
                            undefined,
                            { target: 'coupons' }
                        );

                    }

                    // Price drops
                    const priceDropsEnabled = prefs?.price_drops !== false;
                    if (priceDropsEnabled) {
                        const newPriceDrops = wishlist.filter(item =>
                            (item.lower_than_similar || (item.discountPercent && item.discountPercent >= 20)) &&
                            !prevPriceDropIds.current.has(item.id.toString())
                        );
                        if (newPriceDrops.length > 0) {
                            const first = newPriceDrops[0];
                            showNotificationRef.current(
                                `${newPriceDrops.length} item${newPriceDrops.length > 1 ? 's' : ''} in your wishlist had a price drop!`,
                                'success',
                                6000,
                                newPriceDrops.length > 1
                                    ? undefined
                                    : (first?.id ? () => onDeepLink?.('product', first.id.toString()) : undefined),
                                newPriceDrops.length > 1
                                    ? { target: 'wishlist' }
                                    : (first?.id ? { target: 'product', id: first.id.toString() } : undefined)
                            );
                            newPriceDrops.forEach(item => prevPriceDropIds.current.add(item.id.toString()));
                        }
                    }

                    // Recommendations
                    const recommendationsEnabled = prefs?.recommendations !== false;
                    if (recommendationsEnabled) {
                        const newRecommendations = deals.filter(deal =>
                            (deal.personalization_score && deal.personalization_score >= 0.7) &&
                            !prevRecommendedIds.current.has(deal.id)
                        );
                        if (newRecommendations.length > 0) {
                            const first = newRecommendations[0];
                            showNotificationRef.current(
                                `New personalized deals found for you!`,
                                'success',
                                6000,
                                undefined,
                                { target: 'deals' }
                            );

                            newRecommendations.forEach(deal => prevRecommendedIds.current.add(deal.id));
                        }
                    }
                } else {
                    // Initial load: populate refs
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
                    hasInitialLoaded.current = true;
                }

                prevCouponsCount.current = activeCoupons.length;
                onDataUpdateRef.current(activeCoupons, []); // Orders updated separately
            } catch (err) {
                console.error('Error loading low frequency data:', err);
            }
        };

        if (user?.id) {
            loadHighFrequencyData();
            loadLowFrequencyData();

            // Poll high frequency every 30 seconds
            highFreqInterval = setInterval(loadHighFrequencyData, 30000);
            // Poll low frequency every 5 minutes
            lowFreqInterval = setInterval(loadLowFrequencyData, 300000);
        }

        return () => {
            if (highFreqInterval) clearInterval(highFreqInterval);
            if (lowFreqInterval) clearInterval(lowFreqInterval);
        };
    }, [user?.id]);

    // Real-time notifications_queue subscription
    useEffect(() => {
        if (!user?.id) return;

        console.log('Starting real-time notification subscription for user:', user.id);

        const channel = supabase
            .channel(`user-notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications_queue',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('New notification received:', payload.new);

                    const isReviewPrompt = payload.new.notification_type === 'review_prompt';
                    const orderId = payload.new.metadata?.order_id || payload.new.order_id;
                    const productId = payload.new.metadata?.product_id || payload.new.product_id;
                    const conversationId = payload.new.metadata?.conversation_id || payload.new.conversation_id;

                    const onClick = isReviewPrompt && orderId
                        ? () => onReviewPrompt?.(orderId)
                        : (productId
                            ? () => onDeepLink?.('product', productId)
                            : (conversationId
                                ? () => onDeepLink?.('chat', conversationId)
                                : (orderId ? () => onDeepLink?.('order', orderId) : undefined)));

                    const action = isReviewPrompt && orderId
                        ? { target: 'order' as const, id: orderId }
                        : (productId
                            ? { target: 'product' as const, id: String(productId) }
                            : (conversationId
                                ? { target: 'chat' as const, id: String(conversationId) }
                                : (orderId ? { target: 'order' as const, id: String(orderId) } : undefined)));

                    showNotificationRef.current(
                        payload.new.message_body || payload.new.message,
                        isReviewPrompt ? 'success' : ((payload.new.type || 'info') as any),
                        isReviewPrompt ? 15000 : 5000,
                        onClick,
                        action
                    );

                    // Mark as sent in the queue (optional, but good for tracking)
                    supabase
                        .from('notifications_queue')
                        .update({ status: 'sent' })
                        .eq('id', payload.new.id)
                        .then(({ error }) => {
                            if (error) console.error('Error marking notification as sent:', error);
                        });
                }
            )
            .subscribe((status) => {
                console.log(`Notification subscription status for ${user.id}:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    return null; // Logic-only component
};
