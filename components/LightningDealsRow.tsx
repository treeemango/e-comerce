import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchLightningDeals, type LightningDealItem } from '../lib/api';
import { getCurrencySymbol } from '@/lib/currency';
import { MediaItem, Product } from '@/types';

interface LightningDeal extends LightningDealItem {
  accent?: string;
  tag?: string;
}

const formatPrice = (value: number, currency?: string) => `${getCurrencySymbol(currency || 'USD')}${value.toFixed(2)}`;

type LightningDealsRowProps = {
  userId?: string | null;
  onViewAllDeals?: () => void;
  onAddToCart?: (deal: LightningDeal) => void;
  onProductClick?: (product: Product) => void;
};

const LightningDealCard: React.FC<{
  deal: LightningDeal;
  loading: boolean;
  cardStyles: { border: string; bg: string };
  timeRemaining?: { days: number; hours: number; minutes: number; seconds: number };
  onAddToCart?: (deal: LightningDeal) => void;
  onProductClick?: (product: Product) => void;
}> = ({ deal, loading, cardStyles, timeRemaining, onAddToCart, onProductClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const videoDelayRef = useRef<NodeJS.Timeout>();
  const rotateRef = useRef<NodeJS.Timeout>();
  const addedTimerRef = useRef<NodeJS.Timeout>();

  const galleryAsMedia = useMemo(() => {
    return (deal.gallery_media || [])
      .map((media, idx) => ({
        id: (media.id ?? `${deal.id}-gallery-${idx}`).toString(),
        type: (media.type as MediaItem['type']) ?? 'image',
        url: (media.video_url ?? (media as any).video_embed_url ?? media.image_url ?? '').toString(),
        thumbnail: media.thumbnail_url ?? undefined,
        isMain: media.is_main ?? undefined,
      }))
      .filter(m => !!m.url);
  }, [deal.gallery_media, deal.id]);

  const mediaList = useMemo(() => (deal.media && deal.media.length ? deal.media : galleryAsMedia), [deal.media, galleryAsMedia]);
  const hasVideo = mediaList.some(m => m.type === 'video' || m.type === 'youtube');

  const imageUrls = useMemo(() => {
    const sources = [deal.image, ...mediaList.filter(m => m.type === 'image').map(m => m.url)].filter(Boolean) as string[];
    return Array.from(new Set(sources));
  }, [deal.image, mediaList]);

  const primaryImage = imageUrls[0] || mediaList.find(m => m.type !== 'video' && m.type !== 'youtube')?.url || '';

  const productPayload = useMemo<Product | null>(() => {
    if (loading) return null;
    return {
      id: deal.id,
      title: deal.title,
      price: deal.price,
      originalPrice: deal.originalPrice,
      discountPercent: deal.discountPercent,
      currency: deal.currency,
      rating: 0,
      reviews: 0,
      image: primaryImage,
      media: mediaList,
      gallery_media: deal.gallery_media,
      badge: deal.tag,
      deliveryTimeEstimate: deal.delivery_time_estimate,
      deliveryTimeDays: deal.delivery_time_days,
      isExpressDelivery: deal.is_express_delivery,
      deliveryScope: deal.delivery_scope,
      seller_id: deal.seller_id,
      categoryId: undefined,
      deal_type: deal.deal_type,
      coupon_name: deal.coupon_name,
      coupon_end: deal.coupon_end,
      coupon_discount_percent: deal.coupon_discount_percent,
      personalization_score: deal.personalization_score,
      in_stock: deal.in_stock,
    };
  }, [deal, loading, mediaList, primaryImage]);

  useEffect(() => {
    if (isHovered && !isVideoPlaying && imageUrls.length > 1) {
      rotateRef.current = setInterval(() => {
        setActiveImageIndex(prev => (prev + 1) % imageUrls.length);
      }, 1500);
    } else if (rotateRef.current) {
      clearInterval(rotateRef.current);
      rotateRef.current = undefined;
    }

    return () => {
      if (rotateRef.current) {
        clearInterval(rotateRef.current);
        rotateRef.current = undefined;
      }
    };
  }, [isHovered, isVideoPlaying, imageUrls.length]);

  useEffect(() => () => {
    if (videoDelayRef.current) {
      clearTimeout(videoDelayRef.current);
      videoDelayRef.current = undefined;
    }
    if (rotateRef.current) {
      clearInterval(rotateRef.current);
      rotateRef.current = undefined;
    }
    if (addedTimerRef.current) {
      clearTimeout(addedTimerRef.current);
      addedTimerRef.current = undefined;
    }
  }, []);

  const showVideo = isHovered && isVideoPlaying && hasVideo;
  const videoMedia = mediaList.find(m => m.type === 'video' || m.type === 'youtube');
  const videoUrl = videoMedia?.url ?? '';
  const deliveryEstimate = deal.delivery_time_estimate || (deal.delivery_time_days ? `${deal.delivery_time_days} day${deal.delivery_time_days === 1 ? '' : 's'}` : undefined);
  const scopeLabel = deal.delivery_scope ? deal.delivery_scope.replace(/_/g, ' ') : undefined;

  const handleMouseEnter = () => {
    setIsHovered(true);
    setIsVideoPlaying(false);
    setActiveImageIndex(0);
    if (videoDelayRef.current) clearTimeout(videoDelayRef.current);
    if (hasVideo) {
      const delay = imageUrls.length > 0 ? Math.min(imageUrls.length * 1500, 3000) : 0;
      videoDelayRef.current = setTimeout(() => setIsVideoPlaying(true), delay);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsVideoPlaying(false);
    setActiveImageIndex(0);
    if (videoDelayRef.current) {
      clearTimeout(videoDelayRef.current);
      videoDelayRef.current = undefined;
    }
  };

  const handleCardClick = () => {
    if (loading || !productPayload) return;
    onProductClick?.(productPayload);
  };

  return (
    <article
      className={`group relative overflow-hidden rounded-xl border ${cardStyles.border} ${cardStyles.bg} p-3 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg min-w-[240px] max-w-[260px] snap-start cursor-pointer`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {loading ? (
          <div className="h-full w-full animate-pulse bg-gray-200 dark:bg-gray-700" />
        ) : (
          <>
            {/* Gradient Overlay */}
            {deal.deal_type === 'coupon' && (
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-amber-500/10 pointer-events-none z-10" />
            )}
            {deal.deal_type === 'hot_discount' && (
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-pink-500/10 pointer-events-none z-10" />
            )}

            {showVideo && videoMedia ? (
              videoMedia.type === 'youtube' ? (
                <iframe
                  src={`${videoUrl}${videoUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&controls=0&loop=1`}
                  className="h-full w-full object-cover pointer-events-none"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  title={deal.title}
                />
              ) : (
                <video src={videoUrl} autoPlay muted loop className="h-full w-full object-cover" />
              )
            ) : primaryImage ? (
              <img
                src={imageUrls[activeImageIndex] || primaryImage}
                alt={deal.title || 'Deal item'}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" aria-hidden />
            )}

            {/* Deal Type Badge - Top Left */}
            {deal.deal_type === 'coupon' ? (
              <div className="absolute left-3 top-3 z-20">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white px-2 py-1 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-95 animate-pulse">
                  <div className="flex items-center gap-1">
                    <span className="material-icons text-[12px]">local_offer</span>
                    <span className="text-[10px] font-bold">COUPON</span>
                  </div>
                </div>
              </div>
            ) : deal.deal_type === 'hot_discount' ? (
              <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-md z-20">
                <span className="text-[12px]">🔥</span>
                HOT
              </div>
            ) : (
              <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md z-20">
                <span className="material-icons text-[14px]">flash_on</span>
                {deal.tag ?? 'Limited'}
              </div>
            )}

            {/* Discount Badge - Top Right */}
            <div
              className={`absolute right-3 top-3 rounded-md px-2 py-1 text-xs font-bold text-white shadow-lg z-20 ${deal.deal_type === 'coupon'
                ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                : deal.deal_type === 'hot_discount'
                  ? 'bg-gradient-to-br from-red-500 via-rose-500 to-pink-600'
                  : `bg-gradient-to-br ${deal.accent ?? 'from-orange-500 to-amber-500'}`
                }`}
            >
              -{deal.coupon_discount_percent || deal.discountPercent}%
            </div>

            {/* Personalization Badge */}
            {deal.personalization_score && deal.personalization_score > 0.5 && (
              <div className="absolute left-3 bottom-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 backdrop-blur-sm bg-opacity-90 z-20">
                <span className="material-icons text-[10px]">auto_awesome</span>
                FOR YOU
              </div>
            )}

            {/* Countdown Timer for Coupons */}
            {deal.deal_type === 'coupon' && timeRemaining && (
              <div className="absolute bottom-2 right-2 left-2 z-20">
                <div className="bg-black/50 backdrop-blur-md rounded-lg px-2 py-1 text-white">
                  <div className="text-[7px] font-semibold opacity-80 text-center mb-0.5">ENDS IN</div>
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                    {timeRemaining.days > 0 && (
                      <>
                        <div className="flex flex-col items-center">
                          <span className="text-xs leading-none">{timeRemaining.days}</span>
                          <span className="text-[6px] opacity-70">D</span>
                        </div>
                        <span className="opacity-50">:</span>
                      </>
                    )}
                    <div className="flex flex-col items-center">
                      <span className="text-xs leading-none">{String(timeRemaining.hours).padStart(2, '0')}</span>
                      <span className="text-[6px] opacity-70">H</span>
                    </div>
                    <span className="opacity-50">:</span>
                    <div className="flex flex-col items-center">
                      <span className="text-xs leading-none">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                      <span className="text-[6px] opacity-70">M</span>
                    </div>
                    <span className="opacity-50">:</span>
                    <div className="flex flex-col items-center">
                      <span className="text-xs leading-none">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                      <span className="text-[6px] opacity-70">S</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              <span className={`text-lg font-bold ${deal.deal_type === 'coupon'
                ? 'text-orange-600 dark:text-orange-300'
                : deal.deal_type === 'hot_discount'
                  ? 'text-red-600 dark:text-red-300'
                  : 'text-orange-600 dark:text-orange-300'
                }`}>{formatPrice(deal.price, deal.currency)}</span>
            )}
            {loading ? (
              <span className="inline-block h-4 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <span className="text-xs text-gray-500 line-through dark:text-gray-400">{formatPrice(deal.originalPrice, deal.currency)}</span>
            )}
          </div>
          {!loading && (deal.is_express_delivery || deliveryEstimate || deal.vendor_country || scopeLabel) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-700 dark:text-gray-200">
              {deal.is_express_delivery && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500/12 via-emerald-400/10 to-emerald-500/12 px-2.5 py-1 font-semibold text-emerald-700 shadow-sm shadow-emerald-200/40 ring-1 ring-emerald-300/60 backdrop-blur-sm dark:from-emerald-900/30 dark:via-emerald-800/30 dark:to-emerald-900/30 dark:text-emerald-100 dark:ring-emerald-700/50">
                  <span className="material-icons text-[13px] leading-none">bolt</span>
                  <span className="leading-none">Express</span>
                </span>
              )}
              {deliveryEstimate && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gray-100 via-white to-gray-100 px-2.75 py-1 font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200/80 backdrop-blur-sm dark:from-gray-800/60 dark:via-gray-900/60 dark:to-gray-800/60 dark:text-gray-100 dark:ring-gray-700/70">
                  <span className="material-icons text-[13px] leading-none">local_shipping</span>
                  <span className="leading-none">{deliveryEstimate}</span>
                </span>
              )}
              {(deal.vendor_country || scopeLabel) && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500/12 via-sky-400/10 to-sky-500/12 px-2.75 py-1 font-semibold text-sky-700 shadow-sm shadow-sky-200/40 ring-1 ring-sky-300/60 backdrop-blur-sm dark:from-sky-900/30 dark:via-sky-800/30 dark:to-sky-900/30 dark:text-sky-100 dark:ring-sky-700/50">
                  <span className="material-icons text-[13px] leading-none">public</span>
                  <span className="leading-none">{scopeLabel || deal.vendor_country}</span>
                </span>
              )}
            </div>
          )}
          {(!loading && deal.rrp) && (
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">RRP {formatPrice(deal.rrp)}</p>
          )}
        </div>
        {(!deal.listing_type || deal.listing_type === 'direct_purchase') && (
          <button
            className={`relative h-10 rounded-lg px-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${isAdded
              ? 'bg-emerald-600 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-600'
              : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (loading || !onAddToCart) return;
              onAddToCart(deal);
              setIsAdded(true);
              if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
              addedTimerRef.current = setTimeout(() => setIsAdded(false), 1800);
            }}
            disabled={loading || !onAddToCart}
            type="button"
          >
            {loading ? '...' : isAdded ? (
              <span className="inline-flex items-center gap-1">
                <span className="material-icons text-[16px] leading-none">check_circle</span>
                Added
                <span className="absolute inset-0 rounded-lg ring-2 ring-emerald-400/60 animate-ping" aria-hidden />
              </span>
            ) : 'Add'}
          </button>
        )}
      </div>
    </article>
  );
};

const LightningDealsRow: React.FC<LightningDealsRowProps> = ({ userId, onViewAllDeals, onAddToCart, onProductClick }) => {
  const [deals, setDeals] = useState<LightningDeal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRemainings, setTimeRemainings] = useState<Map<string, { days: number; hours: number; minutes: number; seconds: number }>>(new Map());

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const liveDeals = await fetchLightningDeals(userId || undefined, 8, 5);

      // Deduplicate deals
      const uniqueDeals = Array.from(new Map((liveDeals || []).map(d => [d.id, d])).values());

      setDeals(uniqueDeals);
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

  // Countdown timer for coupon deals
  useEffect(() => {
    const couponDeals = deals.filter(d => d.deal_type === 'coupon' && d.coupon_end);

    if (couponDeals.length === 0) return;

    const updateTimers = () => {
      const newTimers = new Map();
      const now = new Date().getTime();

      couponDeals.forEach(deal => {
        if (deal.coupon_end) {
          const endTime = new Date(deal.coupon_end).getTime();
          const distance = endTime - now;

          if (distance > 0) {
            newTimers.set(deal.id, {
              days: Math.floor(distance / (1000 * 60 * 60 * 24)),
              hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
              minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
              seconds: Math.floor((distance % (1000 * 60)) / 1000)
            });
          }
        }
      });

      setTimeRemainings(newTimers);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [deals]);

  const items = useMemo(() => deals, [deals]);
  const renderItems: LightningDeal[] = useMemo(() => {
    if (!loading) return items;
    return Array.from({ length: 5 }, (_, i) => ({
      id: `skeleton-${i}`,
      title: '',
      price: 0,
      originalPrice: 0,
      discountPercent: 0,
      image: '',
    }));
  }, [items, loading]);

  // Show only a single row preview; full list available via "View all deals"
  const previewItems = useMemo(() => {
    const seen = new Set<string>();
    const deduped: LightningDeal[] = [];

    renderItems.forEach((item, index) => {
      const key = item.id || `idx-${index}`;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });

    return deduped.slice(0, 5);
  }, [renderItems]);

  // Get deal styling based on type
  const getDealCardStyles = (deal: LightningDeal) => {
    switch (deal.deal_type) {
      case 'coupon':
        return {
          border: 'border-orange-200/60 dark:border-orange-800/40',
          bg: 'bg-gradient-to-br from-orange-50/90 via-white to-amber-50/90 dark:from-orange-950/30 dark:via-gray-900/80 dark:to-amber-950/30'
        };
      case 'hot_discount':
        return {
          border: 'border-red-200/60 dark:border-red-800/40',
          bg: 'bg-gradient-to-br from-red-50/90 via-white to-pink-50/90 dark:from-red-950/30 dark:via-gray-900/80 dark:to-pink-950/30'
        };
      default:
        return {
          border: 'border-orange-100 dark:border-orange-900/50',
          bg: 'bg-white/90 dark:bg-gray-900/80'
        };
    }
  };

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
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
            {previewItems.map((deal, idx) => {
              const cardKey = deal.id || `deal-${idx}`;
              const cardStyles = getDealCardStyles(deal);
              const timeRemaining = timeRemainings.get(deal.id);

              return (
                <LightningDealCard
                  key={cardKey}
                  deal={deal}
                  loading={loading}
                  cardStyles={cardStyles}
                  timeRemaining={timeRemaining}
                  onAddToCart={onAddToCart}
                  onProductClick={onProductClick}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LightningDealsRow;
