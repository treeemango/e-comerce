import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchLightningDeals, type LightningDealItem } from '../lib/api';

interface LightningDeal extends LightningDealItem {
  accent?: string;
  tag?: string;
}

const formatPrice = (value: number) => `£${value.toFixed(2)}`;

type LightningDealsRowProps = {
  userId?: string | null;
  onViewAllDeals?: () => void;
};

const LightningDealsRow: React.FC<LightningDealsRowProps> = ({ userId, onViewAllDeals }) => {
  const [deals, setDeals] = useState<LightningDeal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const liveDeals = await fetchLightningDeals(userId || undefined, 8);
      setDeals(liveDeals || []);
    } catch (err) {
      console.error('Error loading lightning deals', err);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const items = useMemo(() => deals, [deals]);
  const renderItems: LightningDeal[] = useMemo(() => {
    if (!loading) return items;
    return Array.from({ length: 4 }, (_, i) => ({
      id: `skeleton-${i}`,
      title: '',
      price: 0,
      originalPrice: 0,
      discountPercent: 0,
      image: '',
    }));
  }, [items, loading]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="relative overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-r from-amber-50 via-orange-50 to-white shadow-[0_20px_60px_-28px_rgba(251,146,60,0.6)] dark:border-orange-900/40 dark:from-[#1a1208] dark:via-[#1f1408] dark:to-[#1a1208]">
        <div className="absolute -left-24 -top-24 h-52 w-52 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-900/40" aria-hidden />
        <div className="absolute -right-16 -bottom-24 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-900/30" aria-hidden />

        <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200/40 dark:shadow-orange-900/40">
              <span className="material-icons text-2xl">bolt</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-300">Lightning deals</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Fresh, fast, limited-time drops</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Handpicked offers refreshed daily. Grab them before they vanish.</p>
            </div>
          </div>

          <button
            className="inline-flex items-center gap-2 self-start rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            onClick={onViewAllDeals}
          >
            View all deals
            <span className="material-icons text-base">chevron_right</span>
          </button>
        </div>

        <div className="relative px-3 pb-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {renderItems.map((deal, idx) => (
              <article
                key={deal.id || idx}
                className="group relative overflow-hidden rounded-xl border border-orange-100 bg-white/90 p-3 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg dark:border-orange-900/50 dark:bg-gray-900/80"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  {loading ? (
                    <div className="h-full w-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                  ) : (
                    <>
                      <img
                        src={deal.image}
                        alt={deal.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md">
                        <span className="material-icons text-[14px]">flash_on</span>
                        {deal.tag ?? 'Limited'}
                      </div>
                      <div
                        className={`absolute right-3 top-3 rounded-md bg-gradient-to-br ${deal.accent ?? 'from-orange-500 to-amber-500'} px-2 py-1 text-xs font-bold text-white shadow-lg`}
                      >
                        -{deal.discountPercent}%
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 dark:text-white">
                      {loading ? <span className="inline-block h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /> : deal.title}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      {loading ? (
                        <span className="inline-block h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      ) : (
                        <span className="text-lg font-bold text-orange-600 dark:text-orange-300">{formatPrice(deal.price)}</span>
                      )}
                      {loading ? (
                        <span className="inline-block h-4 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      ) : (
                        <span className="text-xs text-gray-500 line-through dark:text-gray-400">{formatPrice(deal.originalPrice)}</span>
                      )}
                    </div>
                    {(!loading && deal.rrp) && (
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">RRP {formatPrice(deal.rrp)}</p>
                    )}
                  </div>
                  <button className="h-10 rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:bg-orange-500 dark:hover:bg-orange-600">
                    {loading ? '...' : 'Add'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LightningDealsRow;
