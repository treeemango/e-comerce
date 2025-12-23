import React, { useState, useEffect, useRef } from 'react';
import { User, UserCoupon, BuyerOrder } from '@/types';
import { fetchUserCoupons, fetchBuyerOrders } from '../lib/api';
import MessagesView from './MessagesView';
import { formatPrice } from '@/lib/currency';
import { useNotifications } from './NotificationContext';
import NotificationInbox from './NotificationInbox';

interface FloatingWidgetProps {
  user: User | null;
  activeConversationId?: string | null;
  onRequireAuth?: () => void;
  userCoupons: UserCoupon[];
  recentOrders: BuyerOrder[];
  isOpen?: boolean;
  onClose?: () => void;
  activePane?: 'list' | 'promotions' | 'shipping' | 'notifications';
  onPaneChange?: (pane: 'list' | 'promotions' | 'shipping' | 'notifications') => void;
}

const FloatingWidget: React.FC<FloatingWidgetProps> = ({
  user,
  activeConversationId,
  onRequireAuth,
  userCoupons,
  recentOrders,
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  activePane: propsActivePane,
  onPaneChange: propsOnPaneChange
}) => {
  const { history } = useNotifications();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [internalActivePane, setInternalActivePane] = useState<'list' | 'promotions' | 'shipping' | 'notifications'>('list');

  const totalAlerts = history.length + userCoupons.length;

  const isMessagesOpen = propsIsOpen !== undefined ? propsIsOpen : internalIsOpen;
  const activePane = propsActivePane !== undefined ? propsActivePane : internalActivePane;

  const setIsMessagesOpen = (open: boolean) => {
    if (propsOnClose && !open) propsOnClose();
    setInternalIsOpen(open);
  };

  const setActivePane = (pane: 'list' | 'promotions' | 'shipping' | 'notifications') => {
    if (propsOnPaneChange) propsOnPaneChange(pane);
    setInternalActivePane(pane);
  };

  // isLoadingData is no longer needed as App handles sync
  const isLoadingData = false;

  // Loading is handled by App.tsx WebNotificationWrapper

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMessages = () => {
    if (!user) {
      onRequireAuth?.();
      return;
    }
    setActivePane('list');
    setIsMessagesOpen(true);
  };

  const handleFeedback = () => {
    console.log('Open feedback form');
  };

  const renderPromotionsPanel = () => (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <button
          onClick={() => setActivePane('list')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Back to list"
        >
          <span className="material-icons text-gray-700 dark:text-gray-200">arrow_back</span>
        </button>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Promotions</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Latest offers, coupons, and deals</p>
        </div>
        <button
          onClick={() => setIsMessagesOpen(false)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <span className="material-icons text-gray-700 dark:text-gray-200">close</span>
        </button>
      </div>

      <div className="px-4 py-3 space-y-4">
        {isLoadingData ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-xs text-gray-400">Fetching offers...</p>
          </div>
        ) : userCoupons.length > 0 ? (
          userCoupons.map((uc, idx) => (
            <div key={uc.coupon.id} className={`rounded-xl border shadow-sm overflow-hidden ${idx === 0 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className={`text-[10px] uppercase tracking-wide font-semibold ${idx === 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {idx === 0 ? 'Featured Offer' : 'Voucher'}
                  </p>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{uc.coupon.name}</h3>
                  <p className="text-sm text-orange-600 font-bold">
                    {uc.coupon.discount_amount ? `${uc.coupon.discount_amount} OFF` : `${uc.coupon.discount_percentage}% OFF`}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Expires: {uc.coupon.end_time ? new Date(uc.coupon.end_time).toLocaleDateString() : 'Limited time'}
                  </p>
                </div>
                <span className={`material-icons text-3xl ${idx === 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                  {idx === 0 ? 'workspace_premium' : 'local_offer'}
                </span>
              </div>
              <div className="px-4 pb-4">
                <button className={`w-full font-semibold rounded-lg py-2 shadow-sm transition ${idx === 0 ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  Use Code: {uc.coupon.code}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-3">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
              <span className="material-icons text-gray-400 text-3xl">sentiment_dissatisfied</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">No active coupons</p>
              <p className="text-xs text-gray-500">Check back later for new deals and gifts!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderShippingPanel = () => (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <button
          onClick={() => setActivePane('list')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Back to list"
        >
          <span className="material-icons text-gray-700 dark:text-gray-200">arrow_back</span>
        </button>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Orders & Shipping</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Logistics updates and delivery status</p>
        </div>
        <button
          onClick={() => setIsMessagesOpen(false)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <span className="material-icons text-gray-700 dark:text-gray-200">close</span>
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {isLoadingData ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-xs text-gray-400">Loading orders...</p>
          </div>
        ) : recentOrders.length > 0 ? (
          recentOrders.map(order => (
            <div key={order.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700/50 pb-2">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Order #{order.id.slice(0, 8)}</p>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${order.status?.toLowerCase() === 'delivered' ? 'bg-green-100 text-green-700' :
                  order.status?.toLowerCase() === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                  {order.status || 'Processing'}
                </span>
              </div>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-hidden flex-shrink-0">
                  {order.items[0]?.image_url ? (
                    <img src={order.items[0].image_url} alt="Order item" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <span className="material-icons text-xl">inventory_2</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{order.items[0]?.product_title || 'Package'}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {order.items.length > 1 ? `+${order.items.length - 1} more items` : `Total: ${formatPrice(order.total_amount, order.currency)}`}
                  </p>
                </div>
              </div>
              {order.tracking_code && (
                <div className="pt-2 flex items-center gap-2 text-[10px] text-gray-400 italic">
                  <span className="material-icons text-xs">local_shipping</span>
                  {order.tracking_code}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
            <span className="material-icons text-green-500">local_shipping</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">No logistics information</p>
              <p className="text-xs text-gray-500">We will notify you when your orders ship.</p>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-100 dark:border-emerald-900/30 p-3 text-[10px] text-emerald-800 dark:text-emerald-300 italic">
          Be wary of messages about delivery issues claiming to be from couriers.
        </div>
      </div>
    </div>
  );

  const renderNotificationsPanel = () => (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <button
          onClick={() => setActivePane('list')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Back to list"
        >
          <span className="material-icons text-gray-700 dark:text-gray-200">arrow_back</span>
        </button>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Activity</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Your notifications and system updates</p>
        </div>
        <button
          onClick={() => setIsMessagesOpen(false)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <span className="material-icons text-gray-700 dark:text-gray-200">close</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NotificationInbox compact />
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="flex flex-col items-center gap-4 bg-white/95 dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 px-3 py-4">
        <button
          onClick={handleMessages}
          className="relative flex flex-col items-center gap-1 text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors"
          aria-label="Activity Hub"
        >
          <span className="material-icons text-2xl">hub</span>
          {totalAlerts > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
              {totalAlerts}
            </span>
          )}
          <span className="text-xs font-medium">Activity</span>
        </button>

        <button
          onClick={handleFeedback}
          className="flex flex-col items-center gap-1 text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors"
          aria-label="Feedback"
        >
          <span className="material-icons text-2xl">edit_note</span>
          <span className="text-xs font-medium">Feedback</span>
        </button>

        <button
          onClick={scrollToTop}
          className="flex flex-col items-center gap-1 text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors"
          aria-label="Back to top"
        >
          <span className="material-icons text-2xl">expand_less</span>
          <span className="text-xs font-medium">Top</span>
        </button>
      </div>
      {isMessagesOpen && user && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsMessagesOpen(false)}
          />
          <div className="relative mr-3 sm:mr-5 mb-4 sm:mb-6 h-[75vh] w-full max-w-[420px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
            {activePane === 'list' && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-gray-700 dark:text-gray-200">hub</span>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Activity Hub</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActivePane('notifications')}
                      className={`p-1.5 rounded-full transition-colors ${activePane === 'notifications' ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 invisible'}`}
                      aria-label="Activity"
                    >
                      <span className="material-icons">notifications</span>
                    </button>
                    <button
                      onClick={() => setIsMessagesOpen(false)}
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="Close messages"
                    >
                      <span className="material-icons text-gray-700 dark:text-gray-200">close</span>
                    </button>
                  </div>
                </div>

                <div className="border-b border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
                  <button
                    onClick={() => setActivePane('notifications')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 shadow-sm">
                      <span className="material-icons">notifications</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Activity</p>
                        <span className="text-[10px] text-gray-400">
                          {history.length > 0 ? 'Recently updated' : 'All quiet'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {history.length > 0 ? history[0].message : 'No new notifications'}
                      </p>
                    </div>
                    {history.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                        {history.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActivePane('promotions')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow">
                      <span className="material-icons">local_offer</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Promotions</p>
                        <span className="text-xs text-gray-500">
                          {userCoupons.length > 0 ? 'Latest' : 'Explore'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 transition-all">
                        {userCoupons.length > 0 ? `${userCoupons[0].coupon.name} ...` : 'No active offers'}
                      </p>
                    </div>
                    {userCoupons.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">
                        {userCoupons.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActivePane('shipping')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow">
                      <span className="material-icons">inventory_2</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Orders & Shipping</p>
                        {recentOrders.length > 0 && (
                          <span className="text-[9px] text-orange-500 font-bold uppercase tracking-tighter">
                            {recentOrders[0].status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {recentOrders.length > 0 ? `Tracking ${recentOrders.length} recent orders` : 'Keep up with your orders.'}
                      </p>
                    </div>
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <MessagesView user={user} activeConversationId={activeConversationId} compactMode />
                </div>
              </div>
            )}

            {activePane === 'promotions' && renderPromotionsPanel()}
            {activePane === 'shipping' && renderShippingPanel()}
            {activePane === 'notifications' && renderNotificationsPanel()}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingWidget;