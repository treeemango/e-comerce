
import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../../components/NotificationContext';
import { fetchUserCoupons, fetchBuyerOrders, fetchBuyerNotificationPreferences, getSellerUnreadCount, getWishlist, fetchLightningDeals, fetchSellerOrdersSummary, fetchSellerStats, WishlistProduct, LightningDealItem } from '@/lib/api';
import { UserCoupon, BuyerOrder, User, BuyerNotificationPreferences, SellerOrderSummary, SellerStats } from '@/types';
import { supabase } from '@/lib/supabase';

interface MobileNotificationWrapperProps {
    user: User | null;
    onDataUpdate: (coupons: UserCoupon[], orders: BuyerOrder[]) => void;
    onReviewPrompt?: (orderId: string) => void;
    onDeepLink?: (type: 'product' | 'order' | 'chat', id: string) => void;
}

export const MobileNotificationWrapper: React.FC<MobileNotificationWrapperProps> = ({ user, onDataUpdate, onReviewPrompt, onDeepLink }) => {
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
        let highFreqInterval: NodeJS.Timeout;
        let lowFreqInterval: NodeJS.Timeout;

        const loadHighFrequencyData = async () => {
            if (!user?.id) return;
            try {
                const isSeller = user.role === 'seller' || user.role === 'vendor' || user.role === 'admin';
                const [orders, unreadCount, sellerOrders, sellerStats] = await Promise.all([
                    fetchBuyerOrders(user.id),
                    getSellerUnreadCount(user.id),
                    isSeller ? fetchSellerOrdersSummary(user.id) : Promise.resolve([] as SellerOrderSummary[]),
                    isSeller ? fetchSellerStats(user.id) : Promise.resolve(null as SellerStats | null)
                ]);

                if (hasInitialLoaded.current) {
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

                        if (sellerStats && sellerStats.low_stock_count > prevLowStockCount.current) {
                            showNotificationRef.current(
                                `⚠️ Some items are running low on stock! Check your inventory.`,
                                'warning',
                                5000,
                                undefined,
                                { target: 'inventory' }
                            );
                        }

                        if (sellerStats && sellerStats.balance && sellerStats.balance > prevBalance.current && prevBalance.current > 0) {
                            showNotificationRef.current(
                                `💸 New funds are now available for withdrawal!`,
                                'success',
                                5000,
                                undefined,
                                { target: 'finances' }
                            );
                        }
                    }

                    const messagesEnabled = prefsRef.current?.messages !== false;
                    if (messagesEnabled && unreadCount > prevUnreadCount.current) {
                        showNotificationRef.current(
                            `You have new unread messages!`,
                            'info',
                            5000,
                            () => onDeepLink?.('chat', 'inbox'),
                            { target: 'chat', id: 'inbox' }
                        );
                    }
                }

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

                onDataUpdateRef.current([], orders);
            } catch (err) {
                console.error('Error loading mobile high frequency data:', err);
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

                    const priceDropsEnabled = prefs?.price_drops !== false;
                    if (priceDropsEnabled) {
                        const newPriceDrops = wishlist.filter(item =>
                            (item.lower_than_similar || (item.discountPercent && item.discountPercent >= 20)) &&
                            !prevPriceDropIds.current.has(item.id.toString())
                        );
                        if (newPriceDrops.length > 0) {
                            const first = newPriceDrops[0];
                            showNotificationRef.current(
                                `${newPriceDrops.length} wishlist item${newPriceDrops.length > 1 ? 's' : ''} dropped in price!`,
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
                onDataUpdateRef.current(activeCoupons, []);
            } catch (err) {
                console.error('Error loading mobile low frequency data:', err);
            }
        };

        if (user?.id) {
            loadHighFrequencyData();
            loadLowFrequencyData();
            highFreqInterval = setInterval(loadHighFrequencyData, 30000);
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

        console.log('Mobile: Starting real-time notification subscription for user:', user.id);

        const channel = supabase
            .channel(`user-notifications-mobile-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications_queue',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Mobile: New notification received:', payload.new);

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
                            if (error) console.error('Mobile: Error marking notification as sent:', error);
                        });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    return null;
};
