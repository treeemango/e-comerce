import React, { useState, useEffect } from 'react';
import { Product } from '@/types';

interface ProductCardProps {
    product: Product;
    onClick?: () => void;
    onAddToCart?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onAddToCart }) => {
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
            onClick={onClick}
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

                {/* Bottom Left - Brand/Seller - Show only on press/hover */}
                {product.brand_name && (
                    <div className={`absolute bottom-2 left-2 transition-all duration-300 ${isPressed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                        <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                            {product.brand_name}
                        </span>
                    </div>
                )}

                {/* Bottom Right - Delivery & Stock - Show only on press/hover */}
                <div className={`absolute bottom-2 right-2 flex flex-col gap-1 items-end transition-all duration-300 ${isPressed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
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
                <div className="text-sm text-text-primary-light dark:text-text-primary-dark line-clamp-2 leading-tight mb-2 font-medium">
                    {product.title}
                </div>

                {/* Rating & Reviews */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} className={`material-icons-round text-xs ${i < Math.floor(product.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}>star</span>
                            ))}
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                            {product.reviews || 0}
                        </span>
                    </div>

                    {/* Seller Rating Badge */}
                    {product.seller_rating && (
                        <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
                            <span className="material-icons-round text-green-600 text-xs">verified</span>
                            <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                                {product.seller_rating.toFixed(1)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Delivery Info */}
                {(product.free_delivery || product.delivery_time_estimate) && (
                    <div className="flex items-center gap-1 mb-2">
                        {product.free_delivery && (
                            <span className="text-xs text-green-600 font-semibold">🚚 FREE delivery</span>
                        )}
                        {product.delivery_time_estimate && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                • {product.delivery_time_estimate}
                            </span>
                        )}
                    </div>
                )}

                {/* Price Section */}
                <div className="mb-2 pr-10">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatPrice(product.price || 0, product.currency)}
                        </span>
                        {product.originalPrice && (
                            <span className="text-sm line-through text-gray-500">
                                {formatPrice(product.originalPrice, product.currency)}
                            </span>
                        )}
                    </div>

                    {/* Savings */}
                    {savings > 0 && (
                        <div className="text-sm text-green-600 font-semibold mb-1">
                            Save {formatPrice(savings, product.currency)}
                        </div>
                    )}

                    {/* Stock Status */}
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        {isLowStock ? (
                            <span className="text-orange-600 font-medium">Only {product.stock} left in stock!</span>
                        ) : product.in_stock === false ? (
                            <span className="text-red-600 font-medium">Out of stock</span>
                        ) : product.stock ? (
                            <span>{product.stock} in stock</span>
                        ) : (
                            <span>In stock</span>
                        )}
                    </div>
                </div>

                {/* Modern Cart Button - Bottom Right - Small Circular Icon */}
                {onAddToCart && (
                    <button
                        className="absolute bottom-2.5 right-2 w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 flex items-center justify-center hover:border-primary hover:bg-primary/5 active:scale-90 transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic();
                            onAddToCart(product);
                        }}
                        aria-label="Add to cart"
                    >
                        <span className="material-icons-outlined text-gray-500 dark:text-gray-400 text-[18px]">add_shopping_cart</span>
                    </button>
                )}
            </div>
        </div>
    );
};
