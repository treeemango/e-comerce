import React, { useState, useEffect } from 'react';
import { Product } from '@/types';

interface ProductCardProps {
    product: Product;
    onProductClick?: (product: Product) => void;
    onVisualSearch?: (product: Product) => void;
    onAddToCart?: (product: Product, event?: React.MouseEvent | React.TouchEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onProductClick, onVisualSearch, onAddToCart }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isPressed, setIsPressed] = useState(false);

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

    // Haptic feedback function gated by user activation to avoid browser intervention warnings
    const triggerHaptic = () => {
        if ('vibrate' in navigator && navigator.userActivation?.isActive) {
            navigator.vibrate(10);
        }
    };

    // Handle touch/press start
    const handlePressStart = () => {
        setIsPressed(true);
        triggerHaptic();
    };

    // Handle hover start (no haptic to keep browsers happy)
    const handleHoverStart = () => {
        setIsPressed(true);
    };

    // Handle touch/press end
    const handlePressEnd = () => {
        setIsPressed(false);
    };

    // Countdown timer for deals
    useEffect(() => {
        const endTime = product.coupon_end || product.deal_end;
        if (!endTime) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const end = new Date(endTime).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('Ended');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 24) {
                const days = Math.floor(hours / 24);
                setTimeLeft(`${days}d ${hours % 24}h`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m`);
            } else {
                setTimeLeft(`${minutes}m`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [product.coupon_end, product.deal_end]);

    const getDealBadge = () => {
        const dealType = product.deal_type;
        switch (dealType) {
            case 'coupon':
                return { text: 'COUPON', color: 'bg-purple-600', icon: 'local_offer' };
            case 'flash_sale':
                return { text: 'FLASH', color: 'bg-red-600', icon: 'flash_on' };
            case 'lightning_deal':
                return { text: 'LIGHTNING', color: 'bg-yellow-500', icon: 'bolt' };
            case 'hot_discount':
                return { text: 'HOT DEAL', color: 'bg-red-500', icon: 'whatshot' };
            case 'discount':
                return { text: 'SALE', color: 'bg-green-600', icon: 'discount' };
            default:
                return null;
        }
    };

    const dealBadge = getDealBadge();
    const savings = product.originalPrice && product.price ?
        product.originalPrice - product.price : 0;
    const discountPercent = product.discountPercent ||
        (product.originalPrice && product.price ?
            Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0);

    const hasGallery = product.gallery_media && product.gallery_media.length > 1;
    const isLowStock = product.stock && product.stock <= 5 && product.stock > 0;
    const isNew = product.is_new || (product.created_at &&
        new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    return (
        <div
            className="bg-surface-light dark:bg-surface-dark rounded-md overflow-hidden relative group shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer active:scale-95"
            onClick={() => onProductClick?.(product)}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseEnter={handleHoverStart}
            onMouseLeave={handlePressEnd}
        >
            {/* Image Container */}
            <div className="aspect-square overflow-hidden bg-gray-200 dark:bg-gray-800 relative">
                <img
                    src={product.image || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&q=80&w=400'}
                    alt={product.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                />

                {/* Visual Search Button - Bottom Left */}
                <div className="absolute bottom-3 left-3 z-10">
                    <div
                        className="w-8 h-8 rounded-full bg-[#fff] flex items-center justify-center cursor-pointer shadow-[0_2px_6px_2px_rgba(0,0,0,0.12)] active:scale-95 transition-transform"
                        onClick={(e) => {
                            e.stopPropagation();
                            onVisualSearch?.(product);
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            {/* Four Corner Brackets */}
                            <path d="M7 3H5c-1.1 0-2 .9-2 2v2" />
                            <path d="M17 3h2c1.1 0 2 .9 2 2v2" />
                            <path d="M21 17v2c0 1.1-.9 2-2 2h-2" />
                            <path d="M3 17v2c0 1.1.9 2 2 2h2" />
                            {/* Central Lens */}
                            <circle cx="12" cy="12" r="3.2" />
                            <path d="M14.5 14.5L15.5 15.5" />
                        </svg>
                    </div>
                </div>

                {/* Top Left Badges - Show only on press/hover */}
                <div className={`absolute top-2 left-2 flex flex-col gap-1 transition-all duration-300 ${isPressed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                    {/* Deal Badge */}
                    {dealBadge && (
                        <div className={`${dealBadge.color} text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg`}>
                            <span className="material-icons-round text-[10px]">{dealBadge.icon}</span>
                            {dealBadge.text}
                        </div>
                    )}

                    {/* New Badge */}
                    {isNew && (
                        <div className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                            NEW
                        </div>
                    )}

                    {/* Featured Badge */}
                    {product.is_featured && (
                        <div className="bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                            ⭐ FEATURED
                        </div>
                    )}
                    {/* Bulk Deal Badge */}
                    {product.has_quantity_discount && (
                        <div className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                            <span className="material-icons-round text-[10px]">groups</span>
                            BULK DEAL
                        </div>
                    )}
                    {/* Buy X Get Y Badge */}
                    {product.auto_discount_type === 'buy_x_get_y' && (
                        <div className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                            <span className="material-icons-round text-[10px]">redeem</span>
                            {`BUY ${product.auto_discount_buy_qty} GET ${product.auto_discount_get_qty}`}
                        </div>
                    )}
                </div>

                {/* Top Right Badges - Show only on press/hover */}
                <div className={`absolute top-2 right-2 flex flex-col gap-1 items-end transition-all duration-300 ${isPressed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                    {/* Gallery Indicator */}
                    {hasGallery && (
                        <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            📷 {product.gallery_media.length}
                        </div>
                    )}

                    {/* Discount Badge */}
                    {discountPercent > 0 && (
                        <div className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                            -{discountPercent}%
                        </div>
                    )}
                </div>

                {/* Countdown Timer - Show only on press/hover */}
                {timeLeft && timeLeft !== 'Ended' && (
                    <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isPressed ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                        <div className="bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            ⏰ {timeLeft} left
                        </div>
                    </div>
                )}

                {/* Bottom Left - Brand/Seller - REMOVED from here to avoid collision with Visual Search */}

                {/* Bottom Right - Brand, Delivery & Stock - Show only on press/hover */}
                <div className={`absolute bottom-2 right-2 flex flex-col gap-1 items-end transition-all duration-300 ${isPressed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    {/* Brand Name */}
                    {product.brand_name && (
                        <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-medium mb-1">
                            {product.brand_name}
                        </span>
                    )}

                    {/* Free Delivery */}
                    {product.free_delivery && (
                        <div className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                            🚚 FREE
                        </div>
                    )}

                    {/* Express Delivery */}
                    {product.is_express_delivery && (
                        <div className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                            🚀 EXPRESS
                        </div>
                    )}

                    {/* Low Stock Warning */}
                    {isLowStock && (
                        <div className="bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                            Only {product.stock} left!
                        </div>
                    )}
                </div>

                {/* Out of Stock Overlay */}
                {product.in_stock === false && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg">
                            OUT OF STOCK
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3 relative">
                {/* Title */}
                <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-tight mb-2 font-normal">
                    {product.title}
                </div>

                {/* Rating & Reviews */}
                {((product.rating ?? 0) > 0 && (product.reviews ?? 0) > 0) && (
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1 text-[11px]">
                            <span className="material-icons !text-[12px] text-gray-900 dark:text-gray-100">star</span>
                            <span className="font-bold text-text-primary-light dark:text-text-primary-dark">{product.rating?.toFixed(1)}</span>
                            <span className="text-gray-500 font-medium">({product.reviews || 0})</span>
                        </div>

                        {/* Seller Badges Line */}
                        <div className="flex items-center gap-2">
                            {/* Years Badge */}
                            <div className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                {product.seller_since ? `${new Date().getFullYear() - new Date(product.seller_since).getFullYear()}YRS` : '1YR'}
                            </div>

                            {/* Seller Rating Badge */}
                            {product.seller_rating && (
                                <div className="flex items-center gap-1 bg-[#127FFF]/10 dark:bg-[#127FFF]/20 px-1.5 py-0.5 rounded-full">
                                    <span className="material-icons-round text-[#127FFF] text-xs">verified</span>
                                    <span className="text-xs text-[#127FFF] font-bold">
                                        Verified
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Delivery Info */}
                {(product.free_delivery || product.delivery_time_estimate || product.deliveryScope || (product.delivery_locations && product.delivery_locations.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-2 text-[10.5px] mb-2">
                        {(product.free_delivery || product.delivery_time_estimate) && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-slate-100 via-white to-slate-100 px-2.75 py-1 font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm dark:from-slate-800/60 dark:via-slate-900/60 dark:to-slate-800/60 dark:text-slate-100 dark:ring-slate-700/70">
                                <span className="material-icons !text-[13px] leading-none text-slate-500 dark:text-slate-300">
                                    {product.is_express_delivery ? 'bolt' : 'local_shipping'}
                                </span>
                                <span className="leading-none">
                                    {product.free_delivery ? 'Free Delivery' : `Delivery ${product.delivery_time_estimate}`}
                                </span>
                            </span>
                        )}

                        {(product.deliveryScope || (product.delivery_locations && product.delivery_locations.length > 0)) && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500/12 via-sky-400/10 to-sky-500/12 px-2.75 py-1 font-semibold text-sky-700 shadow-sm shadow-sky-200/30 ring-1 ring-sky-300/60 backdrop-blur-sm dark:from-sky-900/30 dark:via-sky-800/30 dark:to-sky-900/30 dark:text-sky-100 dark:ring-sky-700/50">
                                <span className="material-icons !text-[13px] leading-none">travel_explore</span>
                                <span className="leading-none">
                                    {product.delivery_locations && product.delivery_locations.length > 0
                                        ? product.delivery_locations.join(', ')
                                        : product.deliveryScope === 'nationwide' ? 'Nationwide' : 'Local'}
                                </span>
                            </span>
                        )}
                    </div>
                )}


                {/* Price Section */}
                <div className="mb-2 pr-10 relative">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-lg font-black text-gray-900 dark:text-white">
                            {formatPrice(product.price || 0, product.currency)}
                        </span>
                        {product.sale_unit && <span className="text-xs text-gray-500 dark:text-gray-400">/{product.sale_unit}</span>}
                        {product.originalPrice && (
                            <span className="text-sm line-through text-gray-500">
                                {formatPrice(product.originalPrice, product.currency)}
                            </span>
                        )}
                    </div>
                    {onAddToCart && (
                        <button
                            className="absolute -right-2 top-0 h-10 w-10 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg active:scale-90 transition-transform z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(product);
                            }}
                        >
                            <span className="material-icons text-xl">add_shopping_cart</span>
                        </button>
                    )}
                    {/* Stock & MOQ Info */}
                    <div className="flex flex-col gap-1 text-[11px] text-slate-500 mt-1">
                        {product.stock ? (
                            <span>{product.stock} {product.sale_unit || 'pieces'} (MOQ)</span>
                        ) : (
                            <span>1 piece (MOQ)</span>
                        )}
                    </div>

                    {/* Savings */}
                    {savings > 0 && (
                        <div className="text-[11px] text-green-600 font-bold mt-1">
                            Save {formatPrice(savings, product.currency)}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
