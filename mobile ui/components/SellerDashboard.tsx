import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchSellerStats,
  fetchSellerOrders,
  getSellerUnreadCount,
  fetchFilteredProducts,
} from '../../lib/api';
import {
  SellerStats,
  SellerOrder,
  Product,
} from '../../types';
import { cn } from '../../lib/utils';
import { useCurrencyConverter, formatPrice } from '../../lib/currency';
import { createPortal } from 'react-dom';

// Sub-components
import { SellerProductsView } from './SellerProductsView';
import { SellerOrdersView } from './SellerOrdersView';
import { SellerAddProductView } from './SellerAddProductView';
import { SellerPromotionsView } from './SellerPromotionsView';
import { SellerCreateCouponView } from './SellerCreateCouponView';
import { SellerMessagesView } from './SellerMessagesView';
import { SellerCreateAutomaticDiscountView } from './SellerCreateAutomaticDiscountView';
import { SellerManageQuantityDiscountsView } from './SellerManageQuantityDiscountsView';
import { SellerDiscountProductView } from './SellerDiscountProductView';
import { SellerWalletView } from './SellerWalletView';
import { SellerOrderDetailsSheet } from './SellerOrderDetailsSheet';
import { SellerReviewsView } from './SellerReviewsView';
import { SellerManageReturnsView } from './SellerManageReturnsView';
import { SellerAnalyticsView } from './SellerAnalyticsView';

interface SellerDashboardProps {
  sellerId: string;
  userName: string;
  storeName: string;
  onSignOut: () => void;
  onSwitchAccount: () => void;
  onCreateProduct: () => void;
  onOpenMessages: () => void;
  onOpenOrders: () => void;
  onOpenPayouts: () => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  sellerId,
  userName,
  storeName,
  onSignOut,
  onSwitchAccount,
  onCreateProduct,
  onOpenMessages,
  onOpenOrders,
  onOpenPayouts,
}) => {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'promotions' | 'messages' | 'wallet' | 'menu' | 'reviews' | 'returns' | 'analytics'>('overview');

  // Modal State (Overlays)
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [showCreateAutomaticDiscount, setShowCreateAutomaticDiscount] = useState(false);
  const [selectedProductForPricing, setSelectedProductForPricing] = useState<Product | null>(null);
  const [selectedProductForBulkPricing, setSelectedProductForBulkPricing] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

  const refreshInventory = async () => {
    if (!sellerId) return;
    try {
      const invData = await fetchFilteredProducts('', {
        category_ids: [],
        brand_ids: [],
        price_min: null,
        price_max: null,
        attributes: {},
        delivery_locations: []
      }, sellerId);
      setProducts(invData);
    } catch (e) {
      console.error('Failed to refresh products', e);
    }
  };

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      if (!sellerId) return;
      setLoading(true);
      try {
        const [statsData, invData, ordersData, msgCount] = await Promise.all([
          fetchSellerStats(sellerId),
          fetchFilteredProducts('', {
            category_ids: [],
            brand_ids: [],
            price_min: null,
            price_max: null,
            attributes: {},
            delivery_locations: []
          }, sellerId),
          fetchSellerOrders(sellerId),
          getSellerUnreadCount(sellerId),
        ]);
        setStats(statsData);
        setProducts(invData);
        setOrders(ordersData);
        setUnreadCount(msgCount);
      } catch (error) {
        console.error('Failed to load seller dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [sellerId]);

  // Derived Data
  const lowStockItems = useMemo(() => products.filter(i => (i.stock || 0) < 5), [products]);
  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

  // Currency conversion for dashboard monetary values
  const priceValues = useMemo(() => {
    const vals: { id: string; amount: number; currency: string }[] = [];

    vals.push({ id: 'total-sales', amount: stats?.total_sales ?? 0, currency: 'USD' });
    vals.push({ id: 'sales-7d', amount: stats?.sales_7d ?? 0, currency: 'USD' });

    lowStockItems.forEach((item, idx) => {
      vals.push({ id: `low-stock-${idx}`, amount: item.price ?? item.current_price ?? 0, currency: item.currency || 'USD' });
    });

    return vals;
  }, [stats, lowStockItems]);

  const { convertedValues, preferredCurrency } = useCurrencyConverter(priceValues);

  const getConvertedPrice = (id: string, fallback: number) => {
    return convertedValues[id]?.converted ?? formatPrice(fallback, preferredCurrency);
  };

  const dashboardCards = useMemo(
    () => [
      {
        title: 'Gross sales',
        value: getConvertedPrice('total-sales', stats?.total_sales ?? 0),
        sub: stats?.sales_7d ? `${getConvertedPrice('sales-7d', stats.sales_7d)} last 7d` : 'Live from Seller Center',
        accent: 'from-emerald-400/80 to-emerald-600/80',
        icon: 'payments',
        actionTab: 'analytics' as const,
      },
      {
        title: 'Active Products',
        value: stats?.total_products?.toString() ?? '0',
        sub: `${lowStockItems.length} low stock`,
        accent: 'from-blue-400/80 to-blue-600/80',
        icon: 'inventory_2',
        actionTab: 'products' as const,
      },
      {
        title: 'Messages',
        value: unreadCount.toString(),
        sub: 'Unread inquiries',
        accent: 'from-purple-400/80 to-purple-600/80',
        icon: 'chat',
        actionTab: 'messages' as const,
      },
    ],
    [stats, lowStockItems.length, unreadCount, convertedValues]
  );

  // Handlers
  const handleRefresh = async () => {
    // Re-fetch logic can be duplicated here or made into a reusable function
    // For now we just close modals
    setShowAddProduct(false);
    setShowCreateCoupon(false);
    setShowCreateAutomaticDiscount(false);
    setSelectedProductForPricing(null);
    setSelectedProductForBulkPricing(null);
  };

  // --- Render Content ---

  const renderContent = () => {
    switch (activeTab) {
      case 'products':
        return (
          <SellerProductsView
            products={products}
            loading={loading}
            onCreateProduct={() => setShowAddProduct(true)}
            onDiscountProduct={(p) => setSelectedProductForPricing(p)}
            onBulkPricing={(p) => setSelectedProductForBulkPricing(p)}
          />
        );
      case 'orders':
        return (
          <SellerOrdersView
            orders={orders}
            loading={loading}
            onOrderClick={(orderId) => {
              const order = orders.find(o => o.id === orderId);
              if (order) setSelectedOrder(order);
            }}
          />
        );
      case 'promotions':
        return (
          <SellerPromotionsView
            sellerId={sellerId}
            onCreateCoupon={() => setShowCreateCoupon(true)}
            onCreateAutomaticDiscount={() => setShowCreateAutomaticDiscount(true)}
          />
        );
      case 'messages':
        return (
          <SellerMessagesView
            sellerId={sellerId}
            onBack={() => setActiveTab('overview')}
          />
        );
      case 'wallet':
        return (
          <SellerWalletView
            sellerId={sellerId}
          />
        );
      case 'reviews':
        return (
          <SellerReviewsView
            sellerId={sellerId}
          />
        );
      case 'returns':
        return (
          <SellerManageReturnsView
            sellerId={sellerId}
            onBack={() => setActiveTab('menu')}
          />
        );
      case 'analytics':
        return (
          <SellerAnalyticsView
            sellerId={sellerId}
            onBack={() => setActiveTab('menu')}
          />
        );
      case 'menu':
        return (
          <div className="bg-gray-50 dark:bg-black min-h-full p-5 pb-28 space-y-5">
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h2>

            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-md shadow-gray-100/50 dark:shadow-none border border-gray-100 dark:border-gray-800">
              <div className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30">
                  {storeName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-gray-900 dark:text-white truncate">{storeName}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{userName}</div>
                </div>
                <button
                  onClick={onSwitchAccount}
                  className="text-[10px] font-bold text-primary uppercase tracking-wider"
                >
                  Switch
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-md shadow-gray-100/50 dark:shadow-none border border-gray-100 dark:border-gray-800">
              {[
                { icon: 'mail', label: 'Messages', tab: 'messages' },
                { icon: 'account_balance_wallet', label: 'Payouts', tab: 'wallet' },
                { icon: 'star', label: 'Manage Reviews', tab: 'reviews' },
                { icon: 'assignment_return', label: 'Manage Returns', tab: 'returns' },
                { icon: 'insights', label: 'Analytics', tab: 'analytics' },
                { icon: 'settings', label: 'Settings', tab: null },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => item.tab && setActiveTab(item.tab as any)}
                  className="w-full text-left px-5 py-4 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-800 last:border-0 flex items-center gap-4 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    <span className="material-icons-round text-gray-400 text-lg">{item.icon}</span>
                  </div>
                  <span className="font-bold flex-1">{item.label}</span>
                  <span className="material-icons-round text-gray-200 dark:text-gray-700 text-lg">chevron_right</span>
                </button>
              ))}
            </div>

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              className="w-full py-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-black rounded-2xl text-sm uppercase tracking-wider active:scale-95 transition-transform"
            >
              Sign Out
            </button>
          </div>
        );
      case 'overview':
      default:
        return (
          <div className="bg-gray-50 dark:bg-black min-h-full pb-24">
            {/* Premium Header */}
            <div className="bg-white dark:bg-gray-900 px-5 pt-12 pb-8 rounded-b-[2.5rem] shadow-lg shadow-gray-200/50 dark:shadow-none relative overflow-hidden border-b border-gray-100 dark:border-gray-800">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <span className="material-icons-round text-9xl">storefront</span>
              </div>
              {/* Gradient glow */}
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-[80px]"></div>

              <div className="relative z-10 flex justify-between items-start mb-8">
                <div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 block">Seller Hub</span>
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Welcome back! 👋</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">{storeName}</p>
                </div>
                <button onClick={() => setActiveTab('messages')} className="relative w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center active:scale-90 transition-transform shadow-sm">
                  <span className="material-icons-round text-gray-600 dark:text-gray-300 text-xl">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Premium Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                {dashboardCards.map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveTab(card.actionTab)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md shadow-gray-100/50 dark:shadow-none border border-gray-100 dark:border-gray-700 relative overflow-hidden group active:scale-95 transition-transform"
                  >
                    <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${card.accent} blur-2xl opacity-20 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:opacity-30 transition-opacity`} />
                    <div className="relative z-10">
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${card.accent} flex items-center justify-center mb-3 shadow-lg`}>
                        <span className="material-icons-round text-white text-lg">{card.icon}</span>
                      </div>
                      <div className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{card.value}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{card.title}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-5 mt-8 mb-8">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <button onClick={() => setShowAddProduct(true)} className="flex flex-col items-center gap-2.5 group">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-active:scale-90 transition-transform">
                    <span className="material-icons-round text-xl">add</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">New Listing</span>
                </button>
                <button onClick={() => setActiveTab('orders')} className="flex flex-col items-center gap-2.5 group">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 group-active:scale-90 transition-transform">
                    <span className="material-icons-round text-xl">local_shipping</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">Ship Orders</span>
                </button>
                <button onClick={() => setShowCreateCoupon(true)} className="flex flex-col items-center gap-2.5 group">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 group-active:scale-90 transition-transform">
                    <span className="material-icons-round text-xl">confirmation_number</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">Coupons</span>
                </button>
                <button onClick={() => setActiveTab('messages')} className="flex flex-col items-center gap-2.5 group">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-active:scale-90 transition-transform">
                    <span className="material-icons-round text-xl">chat_bubble</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">Messages</span>
                </button>
              </div>
            </div>

            {/* Low Stock Watchlist */}
            {lowStockItems.length > 0 && (
              <div className="px-5 mb-8">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Low Stock Alert</h3>
                  <button onClick={() => setActiveTab('products')} className="text-[11px] text-primary font-bold uppercase tracking-wider">View All →</button>
                </div>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                  {lowStockItems.map(item => (
                    <div key={item.product_id || item.id} className="min-w-[140px] bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-md shadow-gray-100/50 dark:shadow-none border border-gray-100 dark:border-gray-800">
                      <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl mb-2.5 overflow-hidden">
                        {item.image ? <img src={item.image} className="w-full h-full object-cover" alt={item.title || item.product_title} /> : <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />}
                      </div>
                      <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate mb-1.5">{item.title || item.product_title || 'Product'}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-lg uppercase">
                          {item.stock ?? item.current_stock ?? 0} left
                        </span>
                        <span className="text-[11px] font-bold text-gray-900 dark:text-white">{getConvertedPrice(`low-stock-${lowStockItems.indexOf(item)}`, item.price ?? item.current_price ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {renderContent()}
      </div>

      {/* Overlays / Modals */}
      {showAddProduct && createPortal(
        <div className="fixed inset-0 z-50">
          <SellerAddProductView
            sellerId={sellerId}
            onClose={() => setShowAddProduct(false)}
            onSuccess={() => {
              setShowAddProduct(false);
              handleRefresh();
            }}
          />
        </div>,
        document.body
      )}

      {showCreateCoupon && createPortal(
        <div className="fixed inset-0 z-50">
          <SellerCreateCouponView
            sellerId={sellerId}
            onClose={() => setShowCreateCoupon(false)}
            onSuccess={() => {
              setShowCreateCoupon(false);
              handleRefresh();
            }}
          />
        </div>,
        document.body
      )}

      {showCreateAutomaticDiscount && createPortal(
        <div className="fixed inset-0 z-50">
          <SellerCreateAutomaticDiscountView
            sellerId={sellerId}
            onClose={() => setShowCreateAutomaticDiscount(false)}
            onSuccess={() => {
              setShowCreateAutomaticDiscount(false);
              handleRefresh();
            }}
          />
        </div>,
        document.body
      )}

      {selectedProductForPricing && createPortal(
        <div className="fixed inset-0 z-50">
          <SellerDiscountProductView
            product={selectedProductForPricing}
            onClose={() => setSelectedProductForPricing(null)}
            onSuccess={async () => {
              setSelectedProductForPricing(null);
              await refreshInventory();
              handleRefresh();
            }}
          />
        </div>,
        document.body
      )}

      {selectedProductForBulkPricing && createPortal(
        <div className="fixed inset-0 z-50">
          <SellerManageQuantityDiscountsView
            product={selectedProductForBulkPricing}
            onClose={() => setSelectedProductForBulkPricing(null)}
            onSuccess={async () => {
              setSelectedProductForBulkPricing(null);
              await refreshInventory();
              handleRefresh();
            }}
          />
        </div>,
        document.body
      )}

      {selectedOrder && createPortal(
        <SellerOrderDetailsSheet
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={async () => {
            setSelectedOrder(null);
            // Refresh orders
            const ordersData = await fetchSellerOrders(sellerId);
            setOrders(ordersData);
          }}
        />,
        document.body
      )}

      {/* Premium Floating Bottom Navigation */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-[420px]">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/10 dark:shadow-black/30 border border-gray-100 dark:border-gray-800 px-2 py-2">
          <div className="grid grid-cols-6 gap-0.5">
            <NavButton active={activeTab === 'overview'} icon="home" label="Home" onClick={() => setActiveTab('overview')} />
            <NavButton active={activeTab === 'products'} icon="inventory_2" label="Products" onClick={() => setActiveTab('products')} />
            <NavButton active={activeTab === 'orders'} icon="local_shipping" label="Orders" onClick={() => setActiveTab('orders')} />
            <NavButton active={activeTab === 'wallet'} icon="account_balance_wallet" label="Wallet" onClick={() => setActiveTab('wallet')} />
            <NavButton active={activeTab === 'messages'} icon="chat" label="Msgs" onClick={() => setActiveTab('messages')} />
            <NavButton active={activeTab === 'menu'} icon="menu" label="Menu" onClick={() => setActiveTab('menu')} />
          </div>
        </div>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; icon: string; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all duration-300",
      active
        ? "text-primary bg-primary/10"
        : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
    )}
  >
    <span className={cn("material-icons-round text-xl mb-0.5 transition-transform", active ? "scale-110" : "scale-100")}>{icon}</span>
    <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);
