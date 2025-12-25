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
import { formatCurrency, cn } from '../../lib/utils';
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
  const [selectedProductForDiscounts, setSelectedProductForDiscounts] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

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

  const dashboardCards = useMemo(
    () => [
      {
        title: 'Gross sales',
        value: formatCurrency(stats?.total_sales ?? 0),
        sub: stats?.sales_7d ? `${formatCurrency(stats.sales_7d)} last 7d` : 'Live from Seller Center',
        accent: 'from-emerald-400/80 to-emerald-600/80',
        icon: 'payments'
      },
      {
        title: 'Active Products',
        value: stats?.total_products?.toString() ?? '0',
        sub: `${lowStockItems.length} low stock`,
        accent: 'from-blue-400/80 to-blue-600/80',
        icon: 'inventory_2'
      },
      {
        title: 'Messages',
        value: unreadCount.toString(),
        sub: 'Unread inquiries',
        accent: 'from-purple-400/80 to-purple-600/80',
        icon: 'chat'
      },
    ],
    [stats, lowStockItems.length, unreadCount]
  );

  // Handlers
  const handleRefresh = async () => {
    // Re-fetch logic can be duplicated here or made into a reusable function
    // For now we just close modals
    setShowAddProduct(false);
    setShowCreateCoupon(false);
    setShowCreateAutomaticDiscount(false);
    setSelectedProductForDiscounts(null);
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
            onEditProduct={(p) => setSelectedProductForDiscounts(p)}
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
          <div className="bg-gray-50 min-h-full p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Menu</h2>

            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <div className="p-4 border-b flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                  {storeName[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{storeName}</div>
                  <div className="text-xs text-gray-500">{userName}</div>
                </div>
              </div>
              <button
                onClick={onSwitchAccount}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
              >
                Switch Account
                <span className="material-icons text-gray-300">chevron_right</span>
              </button>
            </div>

            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <button onClick={() => setActiveTab('messages')} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b flex items-center gap-3">
                <span className="material-icons text-gray-400">mail</span> Messages
              </button>
              <button onClick={() => setActiveTab('wallet')} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b flex items-center gap-3">
                <span className="material-icons text-gray-400">account_balance_wallet</span> Payouts
              </button>
              <button onClick={() => setActiveTab('reviews')} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b flex items-center gap-3">
                <span className="material-icons text-gray-400">star_outline</span> Manage Reviews
              </button>
              <button onClick={() => setActiveTab('returns')} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b flex items-center gap-3">
                <span className="material-icons text-gray-400">assignment_return</span> Manage Returns
              </button>
              <button onClick={() => setActiveTab('analytics')} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b flex items-center gap-3">
                <span className="material-icons text-gray-400">insights</span> Analytics
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                <span className="material-icons text-gray-400">settings</span> Settings
              </button>
            </div>

            <button
              onClick={onSignOut}
              className="w-full py-3 bg-white border border-red-100 text-red-600 font-bold rounded-xl shadow-sm"
            >
              Sign Out
            </button>
          </div>
        );
      case 'overview':
      default:
        return (
          <div className="bg-gray-50 min-h-full pb-20">
            {/* Header */}
            <div className="bg-white px-5 pt-12 pb-6 rounded-b-[2rem] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <span className="material-icons text-9xl">storefront</span>
              </div>
              <div className="relative z-10 flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">Seller Hub</h1>
                  <p className="text-slate-500 text-sm font-medium">Welcome back, {storeName}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setActiveTab('messages')} className="relative p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition">
                    <span className="material-icons text-gray-600">notifications_none</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2">
                {dashboardCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="snap-center bg-white border border-gray-100 p-4 rounded-2xl shadow-sm relative overflow-hidden min-w-[280px]"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.accent} blur-2xl opacity-10 rounded-full translate-x-1/3 -translate-y-1/3`} />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`material-icons text-lg text-transparent bg-clip-text bg-gradient-to-br ${card.accent}`}>
                          {card.icon}
                        </span>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.title}</span>
                      </div>
                      <div className="text-2xl font-black text-slate-800">{card.value}</div>
                      <div className="text-xs font-medium text-slate-400 mt-1">{card.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-5 mt-6 mb-8">
              <h3 className="text-sm font-bold text-slate-900 mb-4 px-1">Quick Actions</h3>
              <div className="grid grid-cols-4 gap-3">
                <button onClick={() => setShowAddProduct(true)} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 group-active:scale-95 transition">
                    <span className="material-icons">add</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">New Listing</span>
                </button>
                <button onClick={() => setActiveTab('orders')} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100 group-active:scale-95 transition">
                    <span className="material-icons">local_shipping</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">Ship Orders</span>
                </button>
                <button onClick={() => setShowCreateCoupon(true)} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm border border-orange-100 group-active:scale-95 transition">
                    <span className="material-icons">confirmation_number</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">Coupons</span>
                </button>
                <button onClick={() => setActiveTab('messages')} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 group-active:scale-95 transition">
                    <span className="material-icons">chat_bubble_outline</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">Messages</span>
                </button>
              </div>
            </div>

            {/* Low Stock Watchlist */}
            {lowStockItems.length > 0 && (
              <div className="px-5 mb-8">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-bold text-slate-900">Low Stock Alert</h3>
                  <button onClick={() => setActiveTab('products')} className="text-xs text-orange-600 font-bold">View All</button>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {lowStockItems.map(item => (
                    <div key={item.product_id || item.id} className="min-w-[140px] bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                      <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                        {item.image ? <img src={item.image} className="w-full h-full object-cover" alt={item.title || item.product_title} /> : <div className="w-full h-full bg-gray-200" />}
                      </div>
                      <div className="text-xs font-bold text-gray-800 truncate mb-1">{item.title || item.product_title || 'Product'}</div>
                      <div className="flex justify-between items-end">
                        <div className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                          {item.stock ?? item.current_stock ?? 0} left
                        </div>
                        <div className="text-xs font-bold text-gray-900">{formatCurrency(item.price ?? item.current_price ?? 0, item.currency || 'USD')}</div>
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

      {selectedProductForDiscounts && createPortal(
        <div className="fixed inset-0 z-50">
          <SellerManageQuantityDiscountsView
            product={selectedProductForDiscounts}
            onClose={() => setSelectedProductForDiscounts(null)}
            onSuccess={() => {
              setSelectedProductForDiscounts(null);
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

      {/* Bottom Navigation */}
      <div className="border-t border-gray-100 bg-white/90 backdrop-blur-md px-2 pb-safe pt-2 sticky bottom-0 z-40">
        <div className="grid grid-cols-6 gap-1">
          <NavButton
            active={activeTab === 'overview'}
            icon="home"
            label="Home"
            onClick={() => setActiveTab('overview')}
          />
          <NavButton
            active={activeTab === 'products'}
            icon="inventory_2"
            label="Products"
            onClick={() => setActiveTab('products')}
          />
          <NavButton
            active={activeTab === 'orders'}
            icon="local_shipping"
            label="Orders"
            onClick={() => setActiveTab('orders')}
          />
          <NavButton
            active={activeTab === 'wallet'}
            icon="account_balance_wallet"
            label="Wallet"
            onClick={() => setActiveTab('wallet')}
          />
          <NavButton
            active={activeTab === 'messages'}
            icon="chat"
            label="Msgs"
            onClick={() => setActiveTab('messages')}
          />
          <NavButton
            active={activeTab === 'menu'}
            icon="menu"
            label="Menu"
            onClick={() => setActiveTab('menu')}
          />
        </div>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; icon: string; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200",
      active ? "text-orange-600 bg-orange-50" : "text-gray-400 hover:bg-gray-50"
    )}
  >
    <span className={cn("material-icons text-2xl mb-0.5", active ? "scale-110" : "scale-100")}>{icon}</span>
    <span className="text-[10px] font-bold tracking-tight">{label}</span>
  </button>
);
