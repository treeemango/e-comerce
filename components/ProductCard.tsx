import React, { useState, useRef, useEffect } from 'react';
import { Product } from '@/types';
import PreviewModal from './PreviewModal';
import SimilarItemsModal from './SimilarItemsModal';
import { formatPriceParts, getCurrencySymbol, formatPriceWithConversion, formatPrice, useCurrencyConverter, getUserCurrency } from '@/lib/currency';
import { useMemo } from 'react';
import ResponsiveImage from './ResponsiveImage';

interface ProductCardProps {
  product: Product;
  ranking?: number;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product, event?: React.MouseEvent | React.TouchEvent) => void;
  showVendorMeta?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, ranking, onProductClick, onAddToCart, showVendorMeta = true }) => {
  const [activeModal, setActiveModal] = useState<'preview' | 'similar' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  const priceValues = useMemo(() => {
    const userCurrency = getUserCurrency();
    const vals = [
      { id: 'price', amount: product.price, currency: product.currency || userCurrency }
    ];
    if (product.originalPrice) {
      vals.push({ id: 'originalPrice', amount: product.originalPrice, currency: product.currency || userCurrency });
    }
    if (product.rrp) {
      vals.push({ id: 'rrp', amount: product.rrp, currency: product.currency || userCurrency });
    }
    if (product.activeCoupon?.amount) {
      vals.push({ id: 'coupon', amount: product.activeCoupon.amount, currency: product.currency || userCurrency });
    }
    return vals;
  }, [product.price, product.originalPrice, product.currency, product.activeCoupon?.amount]);

  const { convertedValues } = useCurrencyConverter(priceValues);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const closeModal = () => setActiveModal(null);

  const validMedia = product.media?.filter(m => m.url) || [];
  const hasVideo = validMedia.some(m => m.type === 'video' || m.type === 'youtube');

  const fallbackImage = product.image || validMedia.find(m => m.type !== 'video' && m.type !== 'youtube')?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=60';
  const imageCandidates = [
    product.image,
    ...validMedia.filter(m => m.type !== 'video' && m.type !== 'youtube').map(m => m.url)
  ].filter(Boolean);
  const imageUrls = Array.from(new Set(imageCandidates.length > 0 ? imageCandidates : [fallbackImage]));
  const primaryImage = imageUrls[0] || fallbackImage;

  // Countdown timer for coupon deals
  useEffect(() => {
    if (product.deal_type === 'coupon' && product.coupon_end) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const endTime = new Date(product.coupon_end!).getTime();
        const distance = endTime - now;

        if (distance > 0) {
          setTimeRemaining({
            days: Math.floor(distance / (1000 * 60 * 60 * 24)),
            hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((distance % (1000 * 60)) / 1000)
          });
        } else {
          setTimeRemaining(null);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [product.deal_type, product.coupon_end]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHovered && !isVideoPlaying && imageUrls.length > 1) {
      interval = setInterval(() => {
        setActiveImageIndex(prev => (prev + 1) % imageUrls.length);
      }, 1500);
    } else {
      setActiveImageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovered, isVideoPlaying, imageUrls.length]);

  // Converted price results
  const mainPrice = convertedValues['price'];
  const originalPriceConverted = convertedValues['originalPrice'];
  const rrpConverted = convertedValues['rrp'];
  const couponConverted = convertedValues['coupon'];

  const showVideo = isHovered && hasVideo && isVideoPlaying;
  const videoMedia = validMedia.find(m => m.type === 'video' || m.type === 'youtube');
  // Check if product has its own rating - only show if product has actual reviews
  // Products with 0 reviews but a rating value are showing inherited vendor ratings - hide those
  const hasProductRating = (product.rating ?? 0) > 0 && (product.reviews ?? 0) > 0;
  const hasVendorRating = (product.vendor?.vendor_rating ?? 0) > 0 && (product.vendor?.review_count ?? 0) > 0;
  const hasStock = typeof product.stock === 'number' && product.stock >= 0;
  const hasStrikePrice = product.originalPrice && product.originalPrice > product.price;
  const computedDiscountPercent = hasStrikePrice
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : (product.discountPercent ?? product.discount_percent ?? 0);
  const locationLabel = product.vendor?.business_country || (product as any).vendorCountry || (product as any).vendor_country;

  const couponValue = product.activeCoupon
    ? product.activeCoupon.amount
      ? couponConverted?.converted || couponConverted?.original || `${getCurrencySymbol(product.currency)}${product.activeCoupon.amount}`
      : product.activeCoupon.percent
        ? `${product.activeCoupon.percent}%`
        : undefined
    : undefined;


  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (onProductClick) {
      onProductClick(product);
    }
  };

  // Determine card styling based on deal type
  const getDealStyles = () => {
    switch (product.deal_type) {
      case 'coupon':
        return {
          cardBg: 'bg-gradient-to-br from-orange-50/80 via-white to-amber-50/80 dark:from-orange-950/20 dark:via-slate-800 dark:to-amber-950/20',
          ringColor: 'ring-orange-200/50 dark:ring-orange-800/30 hover:ring-orange-400/60 dark:hover:ring-orange-600/50',
          shadowColor: 'hover:shadow-orange-500/20 dark:hover:shadow-orange-900/30'
        };
      case 'hot_discount':
        return {
          cardBg: 'bg-gradient-to-br from-red-50/80 via-white to-pink-50/80 dark:from-red-950/20 dark:via-slate-800 dark:to-pink-950/20',
          ringColor: 'ring-red-200/50 dark:ring-red-800/30 hover:ring-red-400/60 dark:hover:ring-red-600/50',
          shadowColor: 'hover:shadow-red-500/20 dark:hover:shadow-red-900/30'
        };
      default:
        return {
          cardBg: 'bg-white dark:bg-slate-800',
          ringColor: 'ring-transparent hover:ring-indigo-500/20 dark:hover:ring-indigo-400/20',
          shadowColor: 'hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/20'
        };
    }
  };

  const dealStyles = getDealStyles();

  return (
    <>
      <div
        className={`${dealStyles.cardBg} rounded-lg overflow-hidden shadow-sm hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3)] ${dealStyles.shadowColor} hover:scale-[1.02] transition-all duration-300 group relative pb-2 flex flex-col h-full cursor-pointer ring-1 ${dealStyles.ringColor}`}
        onClick={handleCardClick}
        onMouseEnter={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setIsHovered(true);
          setIsVideoPlaying(false);
          setActiveImageIndex(0);
          if (hasVideo && imageUrls.length === 0) {
            setIsVideoPlaying(true);
          } else if (hasVideo && imageUrls.length > 0) {
            const delay = Math.min(imageUrls.length * 1500, 3000);
            timeoutRef.current = setTimeout(() => {
              setIsVideoPlaying(true);
            }, delay);
          }
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsVideoPlaying(false);
          setActiveImageIndex(0);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = undefined;
          }
        }}
      >
        <div className="relative overflow-hidden bg-gray-50 dark:bg-gray-700 aspect-square w-full">
          {/* Deal Type Gradient Overlay */}
          {product.deal_type === 'coupon' && (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-amber-500/10 pointer-events-none z-10" />
          )}
          {product.deal_type === 'hot_discount' && (
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-pink-500/10 pointer-events-none z-10" />
          )}

          {showVideo && videoMedia ? (
            videoMedia.type === 'youtube' ? (
              <iframe
                src={`${videoMedia.url}${videoMedia.url.includes('?') ? '&' : '?'}autoplay=1&mute=1&controls=0&loop=1&playlist=${videoMedia.url.split('/').pop()}`}
                className="w-full h-full object-cover pointer-events-none"
                allow="autoplay; encrypted-media; picture-in-picture"
                title={product.title}
              />
            ) : (
              <video
                src={videoMedia.url}
                autoPlay
                muted
                loop
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <ResponsiveImage
              src={isHovered && !isVideoPlaying && imageUrls.length ? imageUrls[activeImageIndex] : primaryImage}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 mix-blend-multiply dark:mix-blend-normal"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 250px"
              aspectRatio="square"
              showBlurPlaceholder
            />
          )}

          {/* Top Left Badges */}
          <div className="absolute top-0 left-0 p-2 flex flex-col gap-1 items-start z-20">
            {product.badge && (
              <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md uppercase">
                {product.badge}
              </span>
            )}
            {product.has_quantity_discount && (
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md uppercase flex items-center gap-0.5">
                <span className="material-icons text-[10px]">inventory_2</span> Bulk Deal
              </span>
            )}
            {product.auto_discount_type === 'buy_x_get_y' && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md uppercase flex items-center gap-0.5">
                <span className="material-icons text-[10px]">redeem</span> {`Buy ${product.auto_discount_buy_qty} get ${product.auto_discount_get_qty}`}
              </span>
            )}

          </div>

          {/* Deal Type Specific Badges - Top Right */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-20">
            {product.deal_type === 'coupon' && (
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white px-2 py-1 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-95 animate-pulse">
                <div className="flex items-center gap-1">
                  <span className="material-icons text-[14px]">local_offer</span>
                  <span className="text-xs font-bold">
                    {product.coupon_discount_percent || computedDiscountPercent}% OFF
                  </span>
                </div>
                {product.coupon_name && (
                  <div className="text-[9px] font-semibold opacity-90 text-center">{product.coupon_name}</div>
                )}
              </div>
            )}

            {product.deal_type === 'hot_discount' && (
              <div className="bg-gradient-to-br from-red-500 via-rose-500 to-pink-600 text-white px-2.5 py-1.5 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-95">
                <div className="flex items-center gap-1">
                  <span className="text-[16px]">🔥</span>
                  <span className="text-xs font-bold">HOT DEAL</span>
                </div>
                {(computedDiscountPercent || 0) > 0 && (
                  <div className="text-xl font-black text-center leading-none mt-0.5">
                    -{computedDiscountPercent}%
                  </div>
                )}
              </div>
            )}

            {/* Personalization Indicator */}
            {product.personalization_score && product.personalization_score > 0.5 && (
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 backdrop-blur-sm bg-opacity-90">
                <span className="material-icons text-[10px]">auto_awesome</span>
                FOR YOU
              </div>
            )}
          </div>

          {/* Countdown Timer for Coupon Deals */}
          {product.deal_type === 'coupon' && timeRemaining && (
            <div className="absolute bottom-2 left-2 right-2 z-20">
              <div className="bg-black/50 backdrop-blur-md rounded-lg px-2 py-1.5 text-white">
                <div className="text-[8px] font-semibold opacity-80 text-center mb-0.5">ENDS IN</div>
                <div className="flex items-center justify-center gap-1 text-xs font-bold">
                  {timeRemaining.days > 0 && (
                    <>
                      <div className="flex flex-col items-center">
                        <span className="text-sm leading-none">{timeRemaining.days}</span>
                        <span className="text-[7px] opacity-70">D</span>
                      </div>
                      <span className="opacity-50">:</span>
                    </>
                  )}
                  <div className="flex flex-col items-center">
                    <span className="text-sm leading-none">{String(timeRemaining.hours).padStart(2, '0')}</span>
                    <span className="text-[7px] opacity-70">H</span>
                  </div>
                  <span className="opacity-50">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-sm leading-none">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                    <span className="text-[7px] opacity-70">M</span>
                  </div>
                  <span className="opacity-50">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-sm leading-none">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                    <span className="text-[7px] opacity-70">S</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 mb-2 flex-1 flex flex-col">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={product.title}>
            {product.title}
          </h3>

          {product.lower_than_similar && (
            <div className="flex items-center gap-1 mt-1 mb-0.5">
              <span className="material-icons text-red-500 text-[12px]">trending_down</span>
              <span className="text-[10px] text-red-500 font-bold">Lower than similar items</span>
            </div>
          )}

          <div className="flex items-center justify-between my-1">
            <div className="flex flex-col gap-1">
              {/* Converted Price (Primary) */}
              {mainPrice?.converted || (typeof product.price === 'number' ? `${getCurrencySymbol(product.currency)}${product.price.toFixed(2)}` : null) ? (
                <div className="flex items-baseline text-shop-red dark:text-red-400">
                  <span className="text-xl font-bold">{mainPrice?.converted || `${getCurrencySymbol(product.currency)}${product.price.toFixed(2)}`}</span>
                  {product.sale_unit && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/{product.sale_unit}</span>}
                </div>
              ) : null}
              {/* Original Price (Secondary) */}
              {originalPriceConverted?.converted && (
                <div className="flex items-baseline text-gray-500 dark:text-gray-400 text-sm">
                  <span className="line-through">{originalPriceConverted.converted}</span>
                  <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Original</span>
                </div>
              )}
            </div>
            <button
              className={`h-8 w-8 flex items-center justify-center rounded-full border transition-all shadow-sm ${product.listing_type === 'reservation'
                ? 'border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400'
                : product.listing_type === 'inquiry'
                  ? 'border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white dark:border-purple-400 dark:text-purple-400'
                  : product.deal_type === 'coupon'
                    ? 'border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white dark:border-orange-400 dark:text-orange-400'
                    : product.deal_type === 'hot_discount'
                      ? 'border-red-500 text-red-600 hover:bg-red-500 hover:text-white dark:border-red-400 dark:text-red-400'
                      : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-shop-red hover:text-white hover:border-shop-red dark:hover:bg-shop-red'
                }`}
              onClick={(e) => {
                e.stopPropagation();
                if (product.listing_type === 'reservation' || product.listing_type === 'inquiry') {
                  // For reservation/inquiry, clicking opens the product detail
                  if (onProductClick) onProductClick(product);
                } else {
                  if (onAddToCart) onAddToCart(product, e);
                }
              }}
              title={product.listing_type === 'reservation' ? 'Reserve' : product.listing_type === 'inquiry' ? 'Inquire' : 'Add to Cart'}
            >
              <span className="material-symbols-outlined !text-xl">
                {product.listing_type === 'reservation' ? 'event_available' : product.listing_type === 'inquiry' ? 'chat' : 'add_shopping_cart'}
              </span>
            </button>
          </div>

          {/* Strike price and discount info - only show activeCoupon when NOT already displayed as deal_type badge */}
          {(hasStrikePrice || (product.activeCoupon && product.deal_type !== 'coupon')) && (
            <div className="flex flex-col gap-1 mb-2 text-[11px]">
              {hasStrikePrice && (
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                  <span className="line-through text-slate-400 dark:text-slate-500 text-xs">
                    {originalPriceConverted?.converted || `${getCurrencySymbol(product.currency)}${product.originalPrice?.toFixed(2)}`}
                  </span>
                  {/* Only show discount percent badge when not a coupon deal (already shown on image) */}
                  {computedDiscountPercent !== undefined && product.deal_type !== 'coupon' && (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-[10px]">
                      -{computedDiscountPercent}%
                    </span>
                  )}
                </div>
              )}

              {/* Only show activeCoupon details when not already displayed as deal_type coupon */}
              {product.activeCoupon && couponValue && product.deal_type !== 'coupon' && (
                <div className="flex flex-wrap items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                  <span className="material-icons !text-[14px]">local_offer</span>
                  {product.activeCoupon.label && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-[10px] text-rose-700 dark:text-rose-200">
                      {product.activeCoupon.label}
                    </span>
                  )}
                  <span>{couponValue} off</span>
                  {product.activeCoupon.code && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-[10px] text-rose-700 dark:text-rose-200">
                      {product.activeCoupon.code}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {ranking && (
            <div className="mb-2">
              <span className="text-green-600 dark:text-green-400 text-xs font-bold hover:underline flex items-center gap-0.5">
                #{ranking} Best-Selling Item <span className="font-normal text-slate-500 dark:text-slate-400">in Category</span>
                <span className="material-icons text-[12px] text-slate-400">help</span>
              </span>
            </div>
          )}

          {hasProductRating && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              <span className="material-icons !text-[12px] text-slate-900 dark:text-slate-100">star</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{product.rating?.toFixed(1)}</span>
              <span>({product.reviews})</span>
            </div>
          )}

          {/* Vendor rating removed from product cards - only product-specific ratings should be shown */}

          {(() => {
            const deliveryLabel = product.deliveryTimeEstimate
              || (product.deliveryTimeDays ? `${product.deliveryTimeDays} day${product.deliveryTimeDays === 1 ? '' : 's'}` : undefined)
              || product.deliveryDate;
            const scopeLabel = product.deliveryScope ? product.deliveryScope.replace(/_/g, ' ') : undefined;
            return (product.isExpressDelivery || deliveryLabel || scopeLabel || locationLabel);
          })() && (
              <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-700 dark:text-slate-200 mb-1.5">
                {(product.deliveryTimeEstimate || product.deliveryTimeDays || product.deliveryDate) && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-slate-100 via-white to-slate-100 px-2.75 py-1 font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm dark:from-slate-800/60 dark:via-slate-900/60 dark:to-slate-800/60 dark:text-slate-100 dark:ring-slate-700/70">
                    <span className="material-icons !text-[13px] leading-none text-slate-500 dark:text-slate-300">
                      {product.isExpressDelivery ? 'bolt' : 'local_shipping'}
                    </span>
                    <span className="leading-none">
                      {product.isExpressDelivery ? 'Express' : 'Delivery'} {(() => {
                        const est = product.deliveryTimeEstimate;
                        if (!est) return product.deliveryTimeDays ? `${product.deliveryTimeDays} day${product.deliveryTimeDays === 1 ? '' : 's'}` : product.deliveryDate;
                        // If it's just a number string (e.g. "5"), append "days"
                        if (typeof est === 'string' && /^\d+$/.test(est)) return `${est} days`;
                        return est;
                      })()}
                    </span>
                  </span>
                )}

                {product.deliveryScope && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500/12 via-sky-400/10 to-sky-500/12 px-2.75 py-1 font-semibold text-sky-700 shadow-sm shadow-sky-200/30 ring-1 ring-sky-300/60 backdrop-blur-sm dark:from-sky-900/30 dark:via-sky-800/30 dark:to-sky-900/30 dark:text-sky-100 dark:ring-sky-700/50">
                    <span className="material-icons !text-[13px] leading-none">travel_explore</span>
                    <span className="leading-none">
                      {product.delivery_locations && product.delivery_locations.length > 0
                        ? product.delivery_locations.join(', ')
                        : product.deliveryScope.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
                      }
                    </span>
                  </span>
                )}
                {/* Always show vendor country alongside local/nationwide delivery */}
                {locationLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500/12 via-sky-400/10 to-sky-500/12 px-2.75 py-1 font-semibold text-sky-700 shadow-sm shadow-sky-200/30 ring-1 ring-sky-300/60 backdrop-blur-sm dark:from-sky-900/30 dark:via-sky-800/30 dark:to-sky-900/30 dark:text-sky-100 dark:ring-sky-700/50">
                    <span className="material-icons !text-[13px] leading-none">public</span>
                    <span className="leading-none">{locationLabel}</span>
                  </span>
                )}
              </div>
            )}

          {hasStock && (
            <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-700 dark:text-emerald-200 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500/12 via-emerald-400/10 to-emerald-500/12 px-2.75 py-1 font-semibold text-emerald-700 shadow-sm shadow-emerald-200/30 ring-1 ring-emerald-300/60 backdrop-blur-sm dark:from-emerald-900/30 dark:via-emerald-800/30 dark:to-emerald-900/30 dark:text-emerald-100 dark:ring-emerald-700/50">
                <span className="material-icons !text-[13px] leading-none">inventory_2</span>
                <span className="leading-none">{product.stock} in stock</span>
              </span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex flex-col gap-2 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            {product.description && (
              <p className="text-[10px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-tight mb-1">
                {product.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModal('preview');
                }}
                className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold py-2 rounded hover:bg-black dark:hover:bg-slate-200 transition-colors shadow-sm"
              >
                See preview
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModal('similar');
                }}
                className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 text-xs font-bold py-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                Similar items
              </button>
            </div>
          </div>
        </div>

        {activeModal === 'preview' && <PreviewModal product={product} onClose={closeModal} onProductClick={onProductClick} onAddToCart={onAddToCart} />}
        {activeModal === 'similar' && <SimilarItemsModal product={product} onClose={closeModal} onAddToCart={onAddToCart} />}
      </div>
    </>
  );
};

export default ProductCard;
