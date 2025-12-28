import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '@/types';
import { playCartAddSound } from '@/lib/sounds';
import { useCurrencyConverter, formatPrice as currencyFormatPrice } from '@/lib/currency';

interface ProductCardProps {
    product: Product;
    onProductClick?: (product: Product) => void;
    onVisualSearch?: (product: Product) => void;
    onAddToCart?: (product: Product, event?: React.MouseEvent | React.TouchEvent) => void;
    showSellerLine?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onProductClick, onVisualSearch, onAddToCart, showSellerLine = false }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isPressed, setIsPressed] = useState(false);

    // Currency conversion for product prices
    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];
        vals.push({ id: 'current-price', amount: product.price || 0, currency: product.currency || 'USD' });
        if (product.originalPrice) {
            vals.push({ id: 'original-price', amount: product.originalPrice, currency: product.currency || 'USD' });
        }
        return vals;
    }, [product.price, product.originalPrice, product.currency]);

    const { convertedValues, preferredCurrency } = useCurrencyConverter(priceValues);

    const getConvertedPrice = (id: string, fallback: number) => {
        return convertedValues[id]?.converted ?? currencyFormatPrice(fallback, preferredCurrency);
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
            className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden relative group shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] border border-gray-100/50 dark:border-gray-800/50"
            onClick={() => onProductClick?.(product)}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseEnter={handleHoverStart}
            onMouseLeave={handlePressEnd}
        >
            {/* Image Container */}
            <div className="aspect-[4/5] overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
                <img
                    src={product.image || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&q=80&w=400'}
                    alt={product.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />

                {/* Simplified Badges - Top Left */}
                <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10 transition-transform duration-300">
                    {discountPercent > 0 && (
                        <div className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">
                            -{discountPercent}%
                        </div>
                    )}
                    {dealBadge && (
                        <div className={`${dealBadge.color} text-white text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm`}>
                            <span className="material-icons-round text-[10px]">{dealBadge.icon}</span>
                            {dealBadge.text}
                        </div>
                    )}
                </div>

                {/* Visual Search - Bottom Left */}
                <div className="absolute bottom-3 left-3 z-10">
                    <button
                        className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-90 transition-all border border-black/5"
                        onClick={(e) => {
                            e.stopPropagation();
                            onVisualSearch?.(product);
                        }}
                    >
                        <span className="material-icons-round text-gray-900 text-lg">center_focus_weak</span>
                    </button>
                </div>

                {/* Featured/Hot Indicator - Bottom Right */}
                <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1 items-end">
                    {product.is_featured && (
                        <div className="bg-amber-400 text-amber-950 p-1.5 rounded-xl shadow-lg backdrop-blur-md flex items-center justify-center">
                            <span className="material-icons-round text-sm">auto_awesome</span>
                        </div>
                    )}
                    {isLowStock && (
                        <div className="bg-orange-500/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                            FEW LEFT
                        </div>
                    )}
                </div>

                {/* Out of Stock Overlay */}
                {product.in_stock === false && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
                        <div className="bg-white/90 text-black text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl uppercase tracking-widest">
                            Sold Out
                        </div>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-3.5 space-y-2">
                {/* Seller & Rating Line */}
                <div className={`flex items-center ${showSellerLine ? 'justify-between' : 'justify-end'}`}>
                    {showSellerLine && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[60%]">
                            {product.brand_name?.toLowerCase() === 'unbranded' ? '' : (product.brand_name || product.vendor?.business_name || 'Verified Seller')}
                        </span>
                    )}
                    {(product.rating ?? 0) > 0 && (
                        <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded-lg border border-gray-100 dark:border-white/5">
                            <span className="material-icons-round text-[10px] text-amber-400">star</span>
                            <span className="text-[10px] font-black dark:text-gray-200">{product.rating.toFixed(1)}</span>
                        </div>
                    )}
                </div>

                {/* Title */}
                <div className="text-[13px] text-gray-700 dark:text-gray-300 line-clamp-2 leading-[1.3] font-medium min-h-[2.6em]">
                    {product.title}
                </div>

                {/* Price & Action */}
                <div className="flex items-end justify-between gap-2 pt-1">
                    <div className="flex flex-col">
                        {product.originalPrice && (
                            <span className="text-[10px] line-through text-gray-400 mb-0.5">
                                {getConvertedPrice('original-price', product.originalPrice)}
                            </span>
                        )}
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-red-600 dark:text-red-500 leading-none">
                                {getConvertedPrice('current-price', product.price || 0)}
                            </span>
                            {product.sale_unit && (
                                <span className="text-[9px] font-bold text-gray-400 uppercase">/{product.sale_unit}</span>
                            )}
                        </div>
                    </div>

                    {onAddToCart && (!product.listing_type || product.listing_type === 'direct_purchase') && (
                        <button
                            className="w-10 h-10 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 active:scale-90 transition-transform flex items-center justify-center"
                            onClick={(e) => {
                                e.stopPropagation();
                                playCartAddSound();
                                triggerHaptic();
                                onAddToCart(product);
                            }}
                        >
                            <span className="material-icons-round text-xl">add_shopping_cart</span>
                        </button>
                    )}
                </div>

                {/* Delivery Info */}
                {(() => {
                    const freeDelivery = (product as any).free_delivery ?? (product as any).freeDelivery;
                    const deliveryEstimate = (product as any).delivery_time_estimate ?? (product as any).deliveryTimeEstimate;
                    const deliveryDays = (product as any).delivery_time_days ?? (product as any).deliveryTimeDays;
                    const isExpress = (product as any).is_express_delivery ?? (product as any).isExpressDelivery;

                    const deliveredIn =
                        deliveryEstimate ||
                        (typeof deliveryDays === 'number'
                            ? `${deliveryDays} day${deliveryDays === 1 ? '' : 's'}`
                            : (isExpress ? '1-2 days' : undefined));

                    if (!freeDelivery && !deliveredIn) return null;

                    return (
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 pt-1">
                            {freeDelivery && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400">
                                    <span className="material-icons-outlined text-xs">local_shipping</span>
                                    <span>Free Shipping</span>
                                </div>
                            )}
                            {deliveredIn && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                    <span className="material-icons-outlined text-xs">local_shipping</span>
                                    <span>Delivered in {deliveredIn}</span>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};
