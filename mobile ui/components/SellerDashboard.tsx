import React, { useEffect, useMemo, useState } from 'react';
import { fetchSellerInventory, fetchSellerOrders, fetchSellerStats, getSellerUnreadCount } from '@/lib/api';
import { SellerInventoryItem, SellerOrder, SellerStats } from '@/types';

interface SellerDashboardProps {
  sellerId?: string | null;
  userName?: string | null;
  storeName?: string | null;
  onSignOut?: () => void;
  onSwitchAccount?: () => void;
  onCreateProduct?: () => void;
  onOpenMessages?: () => void;
  onOpenOrders?: () => void;
  onOpenPayouts?: () => void;
}

const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(value || 0);

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
  const [inventory, setInventory] = useState<SellerInventoryItem[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!sellerId) {
      setStats(null);
      setInventory([]);
      setOrders([]);
      setUnreadCount(0);
      return;
    }

    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const [statsData, inventoryData, ordersData, unread] = await Promise.all([
          fetchSellerStats(sellerId),
          fetchSellerInventory(sellerId),
          fetchSellerOrders(sellerId),
          getSellerUnreadCount(sellerId),
        ]);

        if (!mounted) return;
        setStats(statsData || null);
        setInventory(Array.isArray(inventoryData) ? inventoryData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setUnreadCount(typeof unread === 'number' ? unread : 0);
      } catch (error) {
        console.error('[SellerDashboard] Failed to load seller data', error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sellerId]);

  const lowStockItems = useMemo(() => inventory.filter((item) => item.current_stock < 5).slice(0, 4), [inventory]);
  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

  const dashboardCards = useMemo(
    () => [
      {
        title: 'Gross sales',
        value: formatCurrency(stats?.total_sales ?? 0),
        sub: stats?.sales_7d ? `${formatCurrency(stats.sales_7d)} last 7d` : 'Live from Seller Center',
        accent: 'from-emerald-400/80 to-emerald-600/80',
      },
      {
        title: 'Products',
        value: (stats?.total_products ?? 0).toString(),
        sub: `${lowStockItems.length || stats?.low_stock_count || 0} low stock`,
        accent: 'from-sky-400/80 to-blue-600/80',
      },
      {
        title: 'Messages',
        value: unreadCount > 99 ? '99+' : unreadCount.toString(),
        sub: 'Open conversations',
        accent: 'from-fuchsia-400/80 to-purple-600/80',
      },
    ],
    [stats, lowStockItems.length, unreadCount]
  );

  const quickActions = [
    { icon: 'add_box', label: 'New listing', actionKey: 'create' },
    { icon: 'local_shipping', label: 'Ship orders', actionKey: 'orders' },
    { icon: 'payments', label: 'Payouts', actionKey: 'payouts' },
    { icon: 'chat', label: 'Messages', actionKey: 'messages' },
  ];

  const handleAction = (actionKey: string) => {
    if (actionKey === 'create') onCreateProduct?.();
    if (actionKey === 'orders') onOpenOrders?.();
    if (actionKey === 'payouts') onOpenPayouts?.();
    if (actionKey === 'messages') onOpenMessages?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white pb-24">
      <div className="px-5 pt-12 pb-6 flex items-center justify-between">
        <div>
          <div className="text-xs text-white/60 uppercase tracking-wide">Seller dashboard</div>
          <div className="text-2xl font-black leading-snug">{storeName || 'Your Store'}</div>
          <div className="text-sm text-white/70">Signed in as {userName || 'seller'}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={onSwitchAccount} className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <span className="material-icons-outlined">switch_account</span>
          </button>
          <button onClick={onSignOut} className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <span className="material-icons-outlined">logout</span>
          </button>
        </div>
      </div>

      <div className="px-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {dashboardCards.map((card) => (
          <div
            key={card.title}
            className={`rounded-2xl p-4 bg-gradient-to-br ${card.accent} shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/10`}
          >
            <div className="text-xs text-white/80 uppercase tracking-wide">{card.title}</div>
            <div className="text-2xl font-black mt-1">{card.value}</div>
            <div className="text-[12px] text-white/75 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="px-5 mt-5">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between shadow-[0_15px_40px_rgba(0,0,0,0.35)]">
          <div>
            <div className="text-sm text-white/75">This week</div>
            <div className="text-2xl font-black">{formatCurrency(stats?.sales_7d ?? stats?.total_sales ?? 0)}</div>
            <div className="text-xs text-emerald-300">Live from Seller Center</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-xs font-semibold">
              <span className="material-icons-outlined text-sm">trending_up</span>
              Growth mode
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5">
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((item) => (
            <button
              key={item.label}
              onClick={() => handleAction(item.actionKey)}
              className="rounded-2xl bg-white/5 border border-white/10 p-4 text-left text-white/80 flex items-start gap-3 hover:bg-white/10 transition-colors"
            >
              <span className="material-icons-outlined text-xl text-white">{item.icon}</span>
              <div className="text-sm font-semibold leading-tight">{item.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6 space-y-3">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Recent orders</div>
              <div className="text-xs text-white/70">{recentOrders.length > 0 ? `${recentOrders.length} in progress` : 'No orders yet'}</div>
            </div>
            <button onClick={onOpenOrders} className="text-xs font-bold text-emerald-300">View all</button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {loading ? (
              <div className="text-xs text-white/60">Loading orders...</div>
            ) : recentOrders.length === 0 ? (
              <div className="text-xs text-white/60">Start selling to see orders here.</div>
            ) : (
              recentOrders.map((order) => {
                const itemCount = (order.items || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
                const badgeTone = order.status === 'pending' ? 'bg-amber-300/20 text-amber-200' : order.status === 'shipped' ? 'bg-sky-300/20 text-sky-200' : 'bg-emerald-300/20 text-emerald-200';
                return (
                  <div key={order.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">Order #{order.id}</div>
                      <div className="text-[11px] text-white/65 truncate">{itemCount} items • {order.customer_name || 'Buyer'}</div>
                    </div>
                    <span className={`text-[11px] px-3 py-1 rounded-full font-bold capitalize ${badgeTone}`}>{order.status || 'open'}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Messages</div>
              <div className="text-xs text-white/70">{unreadCount > 0 ? `${unreadCount} unread` : 'Inbox is clear'}</div>
            </div>
            <button onClick={onOpenMessages} className="text-xs font-bold text-sky-300">Open inbox</button>
          </div>
          <div className="mt-3 text-[11px] text-white/65">
            Fast replies boost performance score. Notifications mirror Seller Center.
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Inventory watchlist</div>
              <div className="text-xs text-white/70">{lowStockItems.length > 0 ? 'Restock soon' : 'All stocked'}</div>
            </div>
            <button onClick={onCreateProduct} className="text-xs font-bold text-amber-200">Restock</button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {loading ? (
              <div className="text-xs text-white/60">Checking inventory...</div>
            ) : lowStockItems.length === 0 ? (
              <div className="text-xs text-white/60">No low-stock alerts.</div>
            ) : (
              lowStockItems.map((item) => (
                <div key={item.variant_id || item.product_id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{item.product_title}</div>
                    <div className="text-[11px] text-white/65">SKU: {item.sku || '—'}</div>
                  </div>
                  <span className="text-[11px] px-3 py-1 rounded-full bg-red-300/20 text-red-200 font-bold">{item.current_stock} left</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
