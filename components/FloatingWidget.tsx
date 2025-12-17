import React, { useState } from 'react';
import { User } from '@/types';
import MessagesView from './MessagesView';

interface FloatingWidgetProps {
  user: User | null;
  activeConversationId?: string | null;
  onRequireAuth?: () => void;
}

const FloatingWidget: React.FC<FloatingWidgetProps> = ({ user, activeConversationId, onRequireAuth }) => {
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [activePane, setActivePane] = useState<'list' | 'promotions' | 'shipping'>('list');

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
        <div className="rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-orange-600 font-semibold">Hot Deal</p>
              <h3 className="text-lg font-semibold text-gray-900">Thank You with 6 Gifts 🎁</h3>
              <p className="text-sm text-gray-600">Claim all gifts before they expire.</p>
            </div>
            <span className="material-icons text-orange-500 text-3xl">local_offer</span>
          </div>
          <div className="px-4 pb-4">
            <button className="w-full bg-orange-500 text-white font-semibold rounded-lg py-2 shadow hover:shadow-md hover:bg-orange-600 transition">Accept now</button>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <img src="/promo-banner-1.png" alt="Deal" className="w-full h-28 object-cover" />
          <div className="p-4 space-y-2">
            <p className="text-sm text-gray-500">Yesterday 11:28</p>
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">Total Value: £120.03</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Grab 3 items with your purchase!</p>
            <button className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-lg py-2 shadow hover:shadow-md transition">Get now</button>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 space-y-2">
            <p className="text-sm text-gray-500">Yesterday 20:20</p>
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">Thank You with 6 Gifts 🎁</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Just need you to accept them. 😊</p>
            <button className="w-full bg-amber-500 text-white font-semibold rounded-lg py-2 shadow hover:shadow-md transition">Claim now</button>
          </div>
          <img src="/promo-banner-2.png" alt="Gift" className="w-full h-28 object-cover" />
        </div>
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
        <div className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
          <span className="material-icons text-green-500">local_shipping</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">No logistics information</p>
            <p className="text-xs text-gray-500">We will notify you when your orders ship.</p>
          </div>
          <span className="text-xs text-gray-400">—</span>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 p-3 text-sm text-emerald-800">
          Be wary of messages about delivery issues claiming to be from couriers.
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="flex flex-col items-center gap-4 bg-white/95 dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 px-3 py-4">
        <button
          onClick={handleMessages}
          className="relative flex flex-col items-center gap-1 text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors"
          aria-label="Messages"
        >
          <span className="material-icons text-2xl">chat_bubble_outline</span>
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full shadow-md">1</span>
          <span className="text-xs font-medium">Messages</span>
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
                    <span className="material-icons text-gray-700 dark:text-gray-200">chat_bubble_outline</span>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Messages</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Notifications">
                      <span className="material-icons text-gray-600 dark:text-gray-300">notifications_none</span>
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
                    onClick={() => setActivePane('promotions')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow">
                      <span className="material-icons">local_offer</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Promotions</p>
                        <span className="text-xs text-gray-500">Yesterday</span>
                      </div>
                      <p className="text-xs text-gray-500">Thank You with 6 Gifts 🎁</p>
                    </div>
                    <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">1</span>
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
                      </div>
                      <p className="text-xs text-gray-500">Keep up with your orders.</p>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingWidget;