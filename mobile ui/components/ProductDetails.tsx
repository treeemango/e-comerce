import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface ProductDetailsProps {
    product: Product;
    onBack: () => void;
    onProductClick: (product: Product) => void;
    recommendations: Product[];
}

interface TouchPosition {
    x: number;
    y: number;
    time: number;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ product, onBack, onProductClick, recommendations }) => {
    const [currentImage, setCurrentImage] = useState(0);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [touchStart, setTouchStart] = useState<TouchPosition | null>(null);
    const [touchEnd, setTouchEnd] = useState<TouchPosition | null>(null);

    const imageContainerRef = useRef<HTMLDivElement>(null);

    const images = useMemo(() => {
        const gallery = Array.isArray(product.gallery_media)
            ? product.gallery_media
                  .map((m) => m.image_url || m.thumbnail_url)
                  .filter((src): src is string => !!src)
            : [];
        const unique = Array.from(new Set([product.image, ...gallery].filter(Boolean)));
        return unique.length ? unique : [''];
    }, [product.gallery_media, product.image]);

    // Minimum swipe distance and max time for swipe detection
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        setTouchStart({
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        });
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchStart) return;

        const touch = e.touches[0];
        setTouchEnd({
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        });
    }, [touchStart]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!touchStart || !touchEnd) {
            setTouchStart(null);
            setTouchEnd(null);
            return;
        }

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        const elapsedTime = touchEnd.time - touchStart.time;

        // Check if it's a horizontal swipe (not vertical scroll)
        const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
        const isValidSwipe = Math.abs(distanceX) > minSwipeDistance && elapsedTime < maxSwipeTime;

        if (isHorizontalSwipe && isValidSwipe && !isTransitioning) {
            if (distanceX > 0) {
                // Swipe left - next image
                navigateToImage(currentImage + 1);
            } else {
                // Swipe right - previous image
                navigateToImage(currentImage - 1);
            }
        }

        setTouchStart(null);
        setTouchEnd(null);
    }, [touchStart, touchEnd, currentImage, isTransitioning]);

    const navigateToImage = useCallback((newIndex: number) => {
        if (newIndex < 0 || newIndex >= images.length || isTransitioning) return;

        setIsTransitioning(true);
        setCurrentImage(newIndex);

        // Reset transition state after animation
        setTimeout(() => setIsTransitioning(false), 300);
    }, [images.length, isTransitioning]);

    const formatPrice = (price: number, currency?: string) => {
        try {
            return new Intl.NumberFormat('en', {
                style: 'currency',
                currency: currency || 'USD',
                maximumFractionDigits: 2,
            }).format(price);
        } catch (e) {
            return `${currency ? currency + ' ' : ''}${price}`;
        }
    };

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImage((prev) => (prev + 1) % images.length);
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-black overflow-y-auto pb-24 animate-in slide-in-from-right duration-200">
            {/* Custom Header for PDP */}
            <header className="sticky top-0 z-40 bg-white dark:bg-surface-dark shadow-sm border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between px-3 py-3 gap-2 max-w-[520px] mx-auto">
                    <button
                        className="flex items-center gap-1 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
                        onClick={onBack}
                        aria-label="Go back"
                    >
                        <span className="material-icons-outlined text-black dark:text-white text-xl">arrow_back_ios_new</span>
                    </button>

                    <div className="flex-1 max-w-xs">
                        <div className="w-full flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-2">
                            <span className="material-icons-outlined text-gray-400 text-base mr-2 flex-shrink-0">search</span>
                            <span className="text-sm text-gray-500 truncate">Search JuaExpress</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <span className="material-icons-outlined text-black dark:text-white text-xl">format_list_bulleted</span>
                        </button>
                        <button className="relative min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <span className="material-icons-outlined text-black dark:text-white text-xl">shopping_cart</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Image Section */}
            <div
                ref={imageContainerRef}
                className="relative aspect-[3/4] w-full bg-gray-100 dark:bg-gray-800 cursor-pointer touch-manipulation select-none"
                onClick={() => setIsImageViewerOpen(true)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    touchAction: 'pan-y pinch-zoom', // Allow vertical scroll and zoom but prevent horizontal scroll
                }}
            >
                {images[0] && (
                    <img
                        src={images[currentImage % images.length]}
                        alt={product.title}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                            isTransitioning ? 'opacity-80' : 'opacity-100'
                        }`}
                        style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                        }}
                    />
                )}

                {/* Share Icon */}
                <button className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10">
                    <span className="material-icons-outlined text-xl">ios_share</span>
                </button>

                {/* Swipe Indicators */}
                {images.length > 1 && (
                    <>
                        {/* Left Arrow Indicator */}
                        {currentImage > 0 && (
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10">
                                <span className="material-icons-outlined text-sm">chevron_left</span>
                            </div>
                        )}

                        {/* Right Arrow Indicator */}
                        {currentImage < images.length - 1 && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10">
                                <span className="material-icons-outlined text-sm">chevron_right</span>
                            </div>
                        )}

                        {/* Dots Indicator */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
                            {images.slice(0, 5).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        idx === currentImage ? 'bg-white' : 'bg-white/50'
                                    }`}
                                />
                            ))}
                            {images.length > 5 && (
                                <span className="text-white/70 text-xs ml-1">+{images.length - 5}</span>
                            )}
                        </div>
                    </>
                )}

                {/* Video Play Button */}
                {product.video && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse">
                            <span className="material-icons-round text-white text-4xl ml-1">play_arrow</span>
                        </div>
                    </div>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-md z-10">
                    {currentImage + 1}/{images.length}
                </div>

                {/* Swipe Hint */}
                {images.length > 1 && !isTransitioning && (
                    <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs opacity-70 z-10">
                        Swipe to view more
                    </div>
                )}
            </div>

            {/* Deal Banner */}
            {(product.activeCoupon || product.deal_type) && (
                <div className="bg-gradient-to-r from-red-700 to-red-600 px-3 py-2 text-white flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                        <span className="font-black text-sm italic">{product.deal_type === 'coupon' ? 'Coupon applied' : 'Limited deal'}</span>
                        {product.activeCoupon?.label && (
                            <span className="text-xs font-semibold opacity-90">{product.activeCoupon.label}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1">
                            <span className="material-icons-outlined text-sm">check</span>
                            {product.deliveryText || 'Fast delivery'}
                        </div>
                        {product.activeCoupon?.endsAt && (
                            <div className="flex items-center gap-1">
                                <span className="material-icons-outlined text-sm">schedule</span>
                                Ends soon
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Info */}
            <div className="bg-surface-light dark:bg-surface-dark p-3 mb-2">
                {/* Shipping Truck Line */}
                {product.deliveryTimeEstimate && (
                    <div className="flex items-start gap-1 text-banner-green dark:text-green-400 text-xs font-bold mb-2">
                        <span className="material-icons-round text-sm mt-0.5">local_shipping</span>
                        <span className="leading-tight">
                            {product.deliveryTimeEstimate}
                        </span>
                    </div>
                )}

                {/* Title */}
                <h1 className="text-sm font-normal text-black dark:text-white leading-snug mb-2">
                    {product.title}
                </h1>

                {/* Sales Stats */}
                <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mb-3">
                    {typeof product.stock === 'number' && (
                        <span>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
                    )}
                    {product.vendor?.business_name && (
                        <>
                            <span className="w-px h-3 bg-gray-300"></span>
                            <div className="flex items-center gap-1">
                                Sold by {product.vendor.business_name}
                                <span className="material-icons-outlined text-black dark:text-white text-sm">store</span>
                            </div>
                        </>
                    )}
                    <span className="w-px h-3 bg-gray-300"></span>
                    <div className="flex items-center gap-0.5 font-bold text-black dark:text-white">
                        {product.rating?.toFixed?.(1) ?? '4.0'}
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map(i => (
                                <span key={i} className={`material-icons-round text-[10px] ${i <= Math.round(product.rating ?? 0) ? 'text-black dark:text-white' : 'text-gray-300'}`}>star</span>
                            ))}
                        </div>
                    </div>
                    {product.reviews ? <span>({product.reviews} reviews)</span> : null}
                </div>

                {/* Price */}
                <div className="flex items-end gap-2 mb-2">
                    <span className="text-2xl font-bold text-price-red">{formatPrice(product.price, product.currency)}</span>
                    {product.originalPrice && (
                        <span className="text-sm text-gray-400 line-through mb-1">{formatPrice(product.originalPrice, product.currency)}</span>
                    )}
                    {product.discountPercent && (
                        <span className="text-xs text-price-red border border-price-red px-1 py-0.5 rounded mb-1 font-bold">-{product.discountPercent}%</span>
                    )}
                </div>
            </div>

            {/* Select Option Preview */}
            <div className="bg-surface-light dark:bg-surface-dark p-3 mb-2 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-gray-800">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-black dark:text-white">Select Size</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="material-icons-outlined text-sm">straighten</span>
                    Size guide
                    <span className="material-icons-outlined text-sm">chevron_right</span>
                </div>
            </div>

            {/* Horizontal Scroll Images Preview (Variations) */}
            <div className="bg-surface-light dark:bg-surface-dark p-3 mb-2">
                <h3 className="text-sm font-bold text-black dark:text-white mb-2">Colour: <span className="font-normal text-gray-500">Multi</span></h3>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                    {images.map((img, idx) => (
                        <div key={idx} onClick={() => setCurrentImage(idx)} className={`w-16 h-16 flex-shrink-0 rounded border-2 overflow-hidden cursor-pointer ${currentImage % images.length === idx ? 'border-primary' : 'border-transparent'}`}>
                            <img src={img} className="w-full h-full object-cover" alt="" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Shop Info */}
            {product.vendor?.business_name && (
                <div className="bg-surface-light dark:bg-surface-dark p-3 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-xs font-bold">
                            {product.vendor.business_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-black dark:text-white">{product.vendor.business_name}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                {product.vendor.review_count ? <span>{product.vendor.review_count} reviews</span> : null}
                                {product.vendor.vendor_rating ? <span>{product.vendor.vendor_rating.toFixed(1)} rating</span> : null}
                            </div>
                        </div>
                    </div>
                    <button className="border border-black dark:border-white rounded-full px-3 py-1 text-xs font-bold text-black dark:text-white">
                        Visit store
                    </button>
                </div>
            )}

            {/* Recommendations */}
            <div className="mt-2">
                <div className="p-3 bg-surface-light dark:bg-surface-dark">
                    <h3 className="font-bold text-black dark:text-white">You may also like</h3>
                </div>
                <div className="grid grid-cols-2 gap-1 px-1">
                    {recommendations.slice(0, 6).map(item => (
                        <ProductCard key={item.id} product={item} onClick={() => onProductClick(item)} />
                    ))}
                </div>
            </div>

            {/* Floating Cart Icon (Bottom Right) */}
            <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-1">
                {product.deliveryText && (
                    <div className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">{product.deliveryText}</div>
                )}
                <div className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-100 relative">
                    <span className="material-icons-outlined text-green-600 text-2xl">shopping_cart</span>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 p-2 px-3 pb-safe z-50 flex items-center gap-3">
                <div className="flex flex-col items-center gap-0.5 text-black dark:text-white px-2">
                    <span className="material-icons-outlined text-xl">storefront</span>
                    <span className="text-[10px]">Shop</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 text-black dark:text-white px-2">
                    <span className="material-icons-outlined text-xl">chat_bubble_outline</span>
                    <span className="text-[10px]">Chat</span>
                </div>
                <button className="flex-grow bg-primary hover:bg-orange-600 text-white font-bold rounded-full py-3 text-sm shadow-md transition-colors">
                    Select an option
                </button>
            </div>

            {/* Full Screen Image Viewer Overlay */}
            {isImageViewerOpen && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col justify-between animate-in fade-in duration-200">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between p-4 text-white absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
                        <button onClick={(e) => { e.stopPropagation(); setIsImageViewerOpen(false); }}>
                            <span className="material-icons-outlined text-2xl">close</span>
                        </button>
                        <span className="font-bold text-lg">{currentImage + 1}/{images.length}</span>
                        <button>
                            <span className="material-icons-outlined text-2xl">ios_share</span>
                        </button>
                    </div>

                    {/* Main Image/Video Area */}
                    <div className="flex-grow flex items-center justify-center relative w-full h-full bg-black">
                        {/* Check if current image is a video */}
                        {(() => {
                            const currentMedia = product.gallery_media?.[currentImage];
                            const isYouTubeVideo = currentMedia?.type === 'youtube' || currentMedia?.video_url?.includes('youtube.com') || currentMedia?.video_url?.includes('youtu.be');
                            const videoUrl = currentMedia?.video_url || (isYouTubeVideo ? currentMedia?.image_url : null);

                            if (isYouTubeVideo && videoUrl) {
                                // Extract YouTube video ID
                                const videoId = videoUrl.includes('youtube.com/watch?v=')
                                    ? videoUrl.split('v=')[1]?.split('&')[0]
                                    : videoUrl.includes('youtu.be/')
                                        ? videoUrl.split('youtu.be/')[1]?.split('?')[0]
                                        : null;

                                if (videoId) {
                                    return (
                                        <iframe
                                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&loop=1&playlist=${videoId}&modestbranding=1&rel=0`}
                                            className="w-full h-full max-w-screen max-h-screen"
                                            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                                            allowFullScreen
                                            title="Product video"
                                        />
                                    );
                                }
                            }

                            // Regular image
                            return (
                                <img
                                    src={images[currentImage]}
                                    className="w-full h-auto max-h-screen object-contain"
                                    alt="Full view"
                                />
                            );
                        })()}

                        {/* Click zones for simple navigation (only for images, not videos) */}
                        <div
                            className="absolute inset-y-0 left-0 w-1/3 z-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrevImage(e as any);
                            }}
                        />
                        <div
                            className="absolute inset-y-0 right-0 w-1/3 z-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNextImage(e as any);
                            }}
                        />

                        {/* Navigation arrows for images */}
                        {images.length > 1 && (
                            <>
                                {currentImage > 0 && (
                                    <button
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePrevImage(e as any);
                                        }}
                                        aria-label="Previous image"
                                    >
                                        <span className="material-icons text-2xl">chevron_left</span>
                                    </button>
                                )}
                                {currentImage < images.length - 1 && (
                                    <button
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNextImage(e as any);
                                        }}
                                        aria-label="Next image"
                                    >
                                        <span className="material-icons text-2xl">chevron_right</span>
                                    </button>
                                )}
                            </>
                        )}

                        {/* Bottom info overlay inside image area */}
                        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold whitespace-nowrap border border-white/10 z-10">
                            {product.title} - Image {currentImage + 1} of {images.length}
                        </div>
                    </div>

                    {/* Floating Cart (Specific to this view) */}
                    <div className="absolute bottom-20 right-4 z-20 flex flex-col items-end gap-1">
                        <div className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">Free shipping</div>
                        <div className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-100 relative">
                            <span className="material-icons-outlined text-green-600 text-2xl">shopping_cart</span>
                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">1</span>
                        </div>
                    </div>

                    {/* Bottom Button Area */}
                    <div className="bg-black p-4 pb-8 z-20">
                        <button className="w-full bg-primary hover:bg-orange-600 text-white font-bold text-lg py-3 rounded-full transition-colors shadow-lg">
                            Add to cart
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
