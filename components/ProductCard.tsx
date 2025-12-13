import React, { useState, useRef } from 'react';
import { Product } from '@/types';
import PreviewModal from './PreviewModal';
import SimilarItemsModal from './SimilarItemsModal';
import { formatPriceParts, getCurrencySymbol } from '@/lib/currency';

interface ProductCardProps {
  product: Product;
  ranking?: number;
  showLocalBadge?: boolean;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product, event?: React.MouseEvent | React.TouchEvent) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, ranking, showLocalBadge, onProductClick, onAddToCart }) => {
  const [activeModal, setActiveModal] = useState<'preview' | 'similar' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const closeModal = () => setActiveModal(null);

  const validMedia = product.media?.filter(m => m.url) || [];
  const hasVideo = validMedia.some(m => m.type === 'video' || m.type === 'youtube');
  const imageUrls = Array.from(new Set([
    product.image,
    ...validMedia.filter(m => m.type !== 'video' && m.type !== 'youtube').map(m => m.url)
  ]));

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

  const showVideo = isHovered && hasVideo && isVideoPlaying;
  const videoMedia = validMedia.find(m => m.type === 'video' || m.type === 'youtube');

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={`star-${i}`} className="material-icons text-yellow-400 !text-sm">star</span>);
    }
    if (hasHalf) {
      stars.push(<span key="star-half" className="material-icons text-yellow-400 !text-sm">star_half</span>);
    }
    const remaining = 5 - Math.ceil(rating);
    for (let i = 0; i < remaining; i++) {
      stars.push(<span key={`star-empty-${i}`} className="material-icons text-slate-300 dark:text-slate-600 !text-sm">star</span>);
    }
    return stars;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    // Tracking is now handled in ProductDetailView.tsx to avoid duplicates

    if (onProductClick) {
      onProductClick(product);
    }
  };

  return (
    <>
      <div
        className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3)] hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/20 hover:scale-[1.02] transition-all duration-300 group relative pb-2 flex flex-col h-full cursor-pointer ring-1 ring-transparent hover:ring-indigo-500/20 dark:hover:ring-indigo-400/20"
        onClick={handleCardClick}
        onMouseEnter={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setIsHovered(true);
          setIsVideoPlaying(false);
          setActiveImageIndex(0);
          if (hasVideo && imageUrls.length === 0) {
            setIsVideoPlaying(true);
          } else if (hasVideo && imageUrls.length > 0) {
            // Cap the delay to max 3 seconds to ensure video is indefinitely reachable
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
        <div className="relative overflow-hidden bg-gray-50 dark:bg-gray-700 aspect-square">
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
            <img
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 mix-blend-multiply dark:mix-blend-normal"
              src={isHovered && !isVideoPlaying && imageUrls.length ? imageUrls[activeImageIndex] : product.image}
              loading="lazy"
            />
          )}
          <div className="absolute top-0 left-0 p-2 flex flex-col gap-1 items-start">
            {product.badge && (
              <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md uppercase">
                {product.badge}
              </span>
            )}
            {showLocalBadge && (
              <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md uppercase flex items-center gap-0.5">
                <span className="material-icons text-[10px]">local_shipping</span> Local
              </span>
            )}
            {product.activeCoupon && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md uppercase flex items-center gap-0.5">
                <span className="material-icons text-[10px]">local_offer</span>
                {product.activeCoupon.amount ? `$${product.activeCoupon.amount} OFF` : `${product.activeCoupon.percent}% OFF`}
              </span>
            )}
          </div>
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
            <div className="flex items-baseline text-shop-red dark:text-red-400">
              <span className="text-xl font-bold">{getCurrencySymbol(product.currency)}{Math.floor(product.price || 0)}</span>
              <span className="text-sm ml-0.5">.{(product.price || 0).toFixed(2).split('.')[1]}</span>
            </div>
            <button
              className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-shop-red hover:text-white hover:border-shop-red dark:hover:bg-shop-red transition-colors shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (onAddToCart) onAddToCart(product, e);
              }}
            >
              <span className="material-symbols-outlined !text-xl">add_shopping_cart</span>
            </button>
          </div>

          {product.originalPrice && product.originalPrice > product.price && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Was {getCurrencySymbol(product.currency)}{product.originalPrice.toFixed(2)} • <span className="text-green-600 dark:text-green-400 font-semibold">
                Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
              </span>
            </div>
          )}

          {ranking ? (
            <div className="mb-2">
              <span className="text-green-600 dark:text-green-400 text-xs font-bold hover:underline flex items-center gap-0.5">
                #{ranking} Best-Selling Item <span className="font-normal text-slate-500 dark:text-slate-400">in Category</span>
                <span className="material-icons text-[12px] text-slate-400">help</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-2">
              <div className="flex mr-1">
                {renderStars(product.rating)}
              </div>
              <span>({product.reviews})</span>
            </div>
          )}

          {product.vendor && (
            <div className="mb-2">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate">
                  {product.vendor.business_name}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 ml-auto">
                  {product.vendor.business_country}
                </span>
              </div>

              {product.vendor.vendor_rating > 0 && (
                <div className="flex items-center gap-1 mb-1">
                  <div className="flex">
                    {renderStars(product.vendor.vendor_rating)}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    ({product.vendor.review_count})
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    {product.vendor.completed_orders}+ orders
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1 mt-1 mb-2">
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="material-icons text-green-600 dark:text-green-400 !text-[12px]">
                    local_shipping
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {product.vendor.delivery_speed}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-[9px] text-slate-500 dark:text-slate-400">
                  {product.vendor.response_time && (
                    <span className="flex items-center gap-0.5">
                      <span className="material-icons !text-[10px]">chat</span>
                      {product.vendor.response_time}
                    </span>
                  )}
                  {product.vendor.seller_since && (
                    <span className="flex items-center gap-0.5">
                      <span className="material-icons !text-[10px]">calendar_today</span>
                      {product.vendor.seller_since}
                    </span>
                  )}
                  {product.vendor.total_products > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="material-icons !text-[10px]">inventory_2</span>
                      {product.vendor.total_products} item{product.vendor.total_products !== 1 ? 's' : ''}
                    </span>
                  )}
                  {product.vendor.order_completion_rate > 0 && (
                    <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                      <span className="material-icons !text-[10px]">check_circle</span>
                      {product.vendor.order_completion_rate.toFixed(0)}% complete
                    </span>
                  )}
                  {product.vendor.cancellation_rate !== null && product.vendor.cancellation_rate > 0 && (
                    <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                      <span className="material-icons !text-[10px]">warning</span>
                      {product.vendor.cancellation_rate.toFixed(0)}% cancelled
                    </span>
                  )}
                </div>
              </div>

              {product.vendor.badges && product.vendor.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.vendor.badges.slice(0, 3).map((badge, idx) => {
                    const getBadgeStyle = (category: string) => {
                      switch (category) {
                        case 'trust': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
                        case 'community': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
                        case 'growth': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
                        default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
                      }
                    };

                    const getBadgeIcon = (name: string) => {
                      switch (name) {
                        case 'verified_seller': return 'verified';
                        case 'platform_pioneer': return 'rocket_launch';
                        case 'rising_star': return 'trending_up';
                        default: return 'military_tech';
                      }
                    };

                    return (
                      <span
                        key={idx}
                        className={`text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${getBadgeStyle(badge.badge_category)}`}
                        title={badge.description}
                      >
                        <span className="material-icons !text-[10px]">{getBadgeIcon(badge.badge_name)}</span>
                        {badge.badge_name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    );
                  })}
                </div>
              )}
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

        {activeModal === 'preview' && <PreviewModal product={product} onClose={closeModal} />}
        {activeModal === 'similar' && <SimilarItemsModal product={product} onClose={closeModal} />}
      </div>
    </>
  );
};

export default ProductCard;
