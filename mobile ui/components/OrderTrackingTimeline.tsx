import React, { useEffect, useState } from 'react';
import { fetchOrderTrackingEvents } from '@/lib/api';
import type { BuyerOrder, OrderTrackingEvent } from '@/types';

const isDeliveredLike = (status?: string) => {
  const normalized = status?.toLowerCase();
  return normalized === 'delivered' || normalized === 'completed';
};

const buildSyntheticEvents = (order: BuyerOrder): OrderTrackingEvent[] => {
  const createdAt = (order as any).created_at || new Date().toISOString();
  const updatedAt = (order as any).updated_at || createdAt;
  const shippedAt = (order as any).shipped_at || updatedAt;
  const status = (order as any).status?.toLowerCase?.() || 'pending';

  const synthetic: OrderTrackingEvent[] = [
    {
      id: 'synthetic-placed',
      order_id: (order as any).id,
      event_type: 'order_placed',
      event_description: 'Order placed successfully',
      created_at: createdAt
    } as any
  ];

  if (['processing', 'confirmed', 'shipped', 'delivered', 'completed'].includes(status)) {
    synthetic.push({
      id: 'synthetic-confirmed',
      order_id: (order as any).id,
      event_type: 'order_confirmed',
      event_description: 'Order confirmed and processing',
      created_at: createdAt
    } as any);
  }

  if (['shipped', 'delivered', 'completed'].includes(status)) {
    synthetic.push({
      id: 'synthetic-shipped',
      order_id: (order as any).id,
      event_type: 'picked_up',
      event_description: 'Order has been shipped',
      created_at: shippedAt
    } as any);
  }

  if (isDeliveredLike(status)) {
    synthetic.push({
      id: 'synthetic-delivered',
      order_id: (order as any).id,
      event_type: 'delivered',
      event_description: 'Order delivered successfully',
      created_at: updatedAt
    } as any);
  }

  return synthetic;
};

export const OrderTrackingTimeline: React.FC<{ order: BuyerOrder }> = ({ order }) => {
  const [events, setEvents] = useState<OrderTrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await fetchOrderTrackingEvents((order as any).id);
        const resolved = data && data.length > 0 ? data : buildSyntheticEvents(order);
        if (!cancelled) setEvents(resolved);
      } catch {
        if (!cancelled) setEvents(buildSyntheticEvents(order));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [(order as any).id]);

  if (loading) {
    return <div className="py-3 text-center text-[10px] text-gray-400 italic">Loading tracking info...</div>;
  }

  return (
    <div className="mt-3 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Order Journey</h4>
      <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
        {events.map((event, idx) => {
          const isLatest = idx === events.length - 1;
          const date = event.created_at ? new Date(event.created_at) : null;

          return (
            <div key={(event as any).id || idx} className="relative">
              <div
                className={
                  `absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-black shadow-sm ` +
                  (isLatest ? 'bg-orange-500 scale-125' : 'bg-gray-300 dark:bg-gray-600')
                }
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className={
                    `text-xs font-bold ` + (isLatest ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300')
                  }>
                    {(event as any).event_description || (event as any).event_type || 'Update'}
                  </p>
                  <span className="text-[9px] font-black text-gray-300 dark:text-gray-500 uppercase whitespace-nowrap">
                    {date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-medium">
                  {date ? date.toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''}
                  {((event as any).location_name || (event as any).location) ? ` • ${(event as any).location_name || (event as any).location}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTrackingTimeline;
