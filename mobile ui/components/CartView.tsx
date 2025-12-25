import React from 'react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';
import { applyPromotionsToCart, PromotionsResult } from '@/lib/promotions';

interface CartItem {
    product: Product;
    quantity: number;
    variant_id?: string;
}

interface CartViewProps {
    cartItems: CartItem[];
    recommendations: Product[];
    onProductClick: (product: Product) => void;
    onUpdateQuantity: (productId: string | number | undefined, quantity: number, variantId?: string) => void;
    onRemove: (productId: string | number | undefined, variantId?: string) => void;
    onCheckout: () => void;
    onVisualSearch?: (product: Product) => void;
}

export const CartView: React.FC<CartViewProps> = ({ cartItems, recommendations, onProductClick, onUpdateQuantity, onRemove, onCheckout, onVisualSearch }) => {
    const [promoResult, setPromoResult] = React.useState<PromotionsResult | null>(null);
    const [selectedItems, setSelectedItems] = React.useState<Set<string | number | undefined>>(new Set());
    const [activeRecTab, setActiveRecTab] = React.useState<string>('Recommended');

    // Initialize all items as selected
    React.useEffect(() => {
        setSelectedItems(new Set(cartItems.map(item => item.product.id)));
    }, [cartItems]);

    React.useEffect(() => {
        const applyPromos = async () => {
            const result = await applyPromotionsToCart(cartItems);
            setPromoResult(result);
        };
        applyPromos();
    }, [cartItems]);

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

    const toggleItemSelection = (productId: string | number | undefined) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(productId)) {
            newSelected.delete(productId);
        } else {
            newSelected.add(productId);
        }
        setSelectedItems(newSelected);
    };

    const toggleAllSelection = () => {
        if (selectedItems.size === cartItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(cartItems.map(item => item.product.id)));
        }
    };

    // Get unavailable items (out of stock)
    const unavailableItems = cartItems.filter(item =>
        typeof item.product.stock === 'number' && item.product.stock <= 0
    );
    const availableItems = cartItems.filter(item =>
        typeof item.product.stock !== 'number' || item.product.stock > 0
    );

    // Dynamic recommendation categories based on actual product categories
    const recCategories = React.useMemo(() => {
        const categories = new Set<string>();
        recommendations.forEach(p => {
            if (p.category) categories.add(p.category);
        });
        return ['Recommended', ...Array.from(categories).slice(0, 3)];
    }, [recommendations]);

    const filteredRecommendations = React.useMemo(() => {
        if (activeRecTab === 'Recommended') return recommendations;
        return recommendations.filter(p => p.category === activeRecTab);
    }, [recommendations, activeRecTab]);

    const subtotal = promoResult?.subtotal || cartItems.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
    const totalSavings = promoResult?.totalSavings || 0;
    const finalTotal = promoResult?.finalTotal || subtotal;
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 pb-40">
            {/* Modern Header with Glassmorphism */}
            <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between px-4 py-4">
                    <button
                        onClick={toggleAllSelection}
                        className="flex items-center gap-2 group"
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${selectedItems.size === cartItems.length
                            ? 'bg-gradient-to-r from-primary to-orange-500 shadow-lg shadow-orange-200 dark:shadow-orange-900/30'
                            : 'border-2 border-gray-300 dark:border-gray-600'
                            }`}>
                            {selectedItems.size === cartItems.length && (
                                <span className="material-icons-round text-white text-sm animate-[scale-in_0.2s_ease-out]">check</span>
                            )}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">All</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                            Cart
                        </span>
                        <span className="bg-gradient-to-r from-primary to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                            {totalItems}
                        </span>
                    </div>
                    <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-icons-outlined text-gray-600 dark:text-gray-400">more_horiz</span>
                    </button>
                </div>

                {/* Free Shipping Banner */}
                {totalItems > 0 && (
                    <div className="mx-4 mb-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-700/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
                                    <span className="material-icons-round text-white text-sm">local_shipping</span>
                                </div>
                                <div>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Free Shipping!</span>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500">On your entire order</p>
                                </div>
                            </div>
                            <span className="material-icons-round text-emerald-500 text-lg animate-pulse">verified</span>
                        </div>
                    </div>
                )}

                {/* Selection Pills */}
                <div className="flex gap-2 px-4 pb-3">
                    <button className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 ${selectedItems.size === cartItems.length
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                        All ({availableItems.length})
                    </button>
                    <button className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 ${selectedItems.size > 0 && selectedItems.size < cartItems.length
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                        }`}>
                        Selected ({selectedItems.size})
                    </button>
                </div>
            </div>

            {/* Empty Cart State */}
            {cartItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 px-8">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-6">
                        <span className="material-icons-round text-6xl text-gray-400 dark:text-gray-500">shopping_cart</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                        Explore our products and add items to your cart to get started!
                    </p>
                </div>
            )}

            {/* Cart Items */}
            <div className="px-4 py-2 space-y-3">
                {availableItems.map((item, idx) => {
                    const stock = item.product.stock;
                    const remaining = typeof stock === 'number' ? Math.max(stock - item.quantity, 0) : null;
                    const barPct = typeof stock === 'number' && stock > 0 ? Math.max(Math.min((remaining! / stock) * 100, 100), 0) : 100;
                    const isLow = typeof remaining === 'number' && remaining <= 3;
                    const isSelected = selectedItems.has(item.product.id);
                    const resultInfo = promoResult?.items.find(pi => pi.product.id === item.product.id);

                    return (
                        <div
                            key={item.product.id ?? idx}
                            className={`bg-white dark:bg-gray-800/50 rounded-3xl p-4 backdrop-blur-sm border transition-all duration-300 ${isSelected
                                ? 'border-primary/30 shadow-lg shadow-orange-100 dark:shadow-orange-900/10'
                                : 'border-gray-100 dark:border-gray-700/50'
                                }`}
                            style={{ animation: `fadeSlideUp 0.3s ease-out ${idx * 0.05}s both` }}
                        >
                            <div className="flex gap-4">
                                {/* Selection Checkbox */}
                                <button
                                    onClick={() => toggleItemSelection(item.product.id)}
                                    className="flex-shrink-0 mt-1"
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${isSelected
                                        ? 'bg-gradient-to-r from-primary to-orange-500 shadow-md'
                                        : 'border-2 border-gray-300 dark:border-gray-600'
                                        }`}>
                                        {isSelected && (
                                            <span className="material-icons-round text-white text-sm">check</span>
                                        )}
                                    </div>
                                </button>

                                {/* Product Image */}
                                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 shadow-md"
                                    onClick={() => onProductClick(item.product)}>
                                    <img
                                        src={item.product.image}
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                                        alt={item.product.title}
                                    />
                                </div>

                                {/* Product Info */}
                                <div className="flex-grow min-w-0 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug pr-2">
                                                {item.product.title}
                                            </p>
                                            <button
                                                className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                                                onClick={() => onRemove(item.product.id, item.variant_id)}
                                            >
                                                <span className="material-icons-outlined text-gray-400 group-hover:text-red-500 text-lg transition-colors">delete</span>
                                            </button>
                                        </div>

                                        {/* Promotions/Badges */}
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {resultInfo?.appliedPromotions.map((promo, pidx) => (
                                                <span
                                                    key={pidx}
                                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${promo.type === 'quantity_discount'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                        }`}
                                                >
                                                    {promo.description}
                                                </span>
                                            ))}
                                            {!resultInfo?.appliedPromotions.length && item.product.badge && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                                    {item.product.deal_type === 'coupon' && item.product.activeCoupon?.label
                                                        ? item.product.activeCoupon.label
                                                        : item.product.deal_type === 'flash_sale'
                                                            ? 'Flash sale'
                                                            : item.product.badge}
                                                </span>
                                            )}
                                        </div>

                                        {/* Modern Stock Indicator Position */}
                                        {typeof stock === 'number' && (
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between text-[10px] font-bold mb-1.5 px-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                        <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock Status</span>
                                                    </div>
                                                    <span className={isLow ? 'text-orange-600 dark:text-orange-400 font-black' : 'text-gray-900 dark:text-white'}>
                                                        {remaining} items left
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden shadow-inner">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ease-out ${isLow
                                                            ? 'bg-gradient-to-r from-orange-400 to-red-500'
                                                            : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                                                            }`}
                                                        style={{ width: `${barPct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Price and Quantity */}
                                    <div className="flex flex-wrap justify-between items-end gap-3">
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-lg font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
                                                    {formatPrice(resultInfo ? resultInfo.discountedPrice : item.product.price, item.product.currency)}
                                                </span>
                                                {(item.product.originalPrice || resultInfo) && (
                                                    <span className="text-xs text-gray-400 line-through">
                                                        {formatPrice(resultInfo ? resultInfo.originalPrice : (item.product.originalPrice || 0), item.product.currency)}
                                                    </span>
                                                )}
                                            </div>
                                            {(item.product.discountPercent || resultInfo) && (
                                                <span className="inline-block text-[10px] text-white bg-gradient-to-r from-red-500 to-pink-500 px-2 py-0.5 rounded-full font-bold mt-1 shadow-sm">
                                                    -{resultInfo && resultInfo.originalPrice > 0 ? Math.round((1 - resultInfo.discountedPrice / resultInfo.originalPrice) * 100) : (item.product.discountPercent || 0)}% OFF
                                                </span>
                                            )}
                                        </div>

                                        {/* Quantity Control */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-sm">
                                                <button
                                                    aria-label="Decrease quantity"
                                                    className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors active:scale-95"
                                                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.variant_id)}
                                                >
                                                    <span className="material-icons-round text-lg">remove</span>
                                                </button>
                                                <span className="w-10 text-center font-bold text-gray-900 dark:text-white text-sm">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    aria-label="Increase quantity"
                                                    className={`w-8 h-8 flex items-center justify-center transition-colors active:scale-95 ${typeof stock === 'number' && item.quantity >= stock
                                                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                        }`}
                                                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.variant_id)}
                                                    disabled={typeof stock === 'number' && item.quantity >= stock}
                                                >
                                                    <span className="material-icons-round text-lg">add</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Item Total for BOGO */}
                                    {resultInfo && resultInfo.appliedPromotions.some(p => p.description.toLowerCase().includes('buy')) && (
                                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1">
                                            <span className="material-icons-round text-sm">savings</span>
                                            Item total: {formatPrice(resultInfo.total, item.product.currency)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div >

            {/* Unavailable Items Section - Dynamic */}
            {
                unavailableItems.length > 0 && (
                    <div className="mx-4 mt-4 bg-white dark:bg-gray-800/50 rounded-3xl p-4 border border-gray-100 dark:border-gray-700/50">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <span className="material-icons-round text-gray-400">remove_shopping_cart</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    Unavailable ({unavailableItems.length})
                                </span>
                            </div>
                            {unavailableItems.length > 1 && (
                                <button className="text-xs text-primary font-medium flex items-center hover:underline">
                                    See all <span className="material-icons-outlined text-sm">chevron_right</span>
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                            {unavailableItems.map((item, idx) => (
                                <div key={item.product.id ?? idx} className="flex-shrink-0">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden relative bg-gray-100 dark:bg-gray-700">
                                        <img
                                            src={item.product.image}
                                            className="w-full h-full object-cover opacity-50 grayscale"
                                            alt={item.product.title}
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                            <span className="text-white text-[10px] font-bold">Sold out</span>
                                        </div>
                                    </div>
                                    <button
                                        className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1.5 text-[10px] flex items-center justify-center gap-1 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        onClick={() => onVisualSearch?.(item.product)}
                                    >
                                        Similar <span className="material-icons-outlined text-xs">search</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Info Notice */}
            <div className="mx-4 mt-4 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-start gap-2">
                    <span className="material-icons-round text-blue-500 text-sm mt-0.5">info</span>
                    <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
                        Item availability and pricing are not guaranteed until payment is final.
                    </p>
                </div>
            </div>

            {/* Payment & Security */}
            <div className="mx-4 mt-4 bg-white dark:bg-gray-800/50 rounded-3xl p-4 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">We accept</span>
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                        {['PayPal', 'VISA', 'Mastercard', 'Amex', 'Discover', 'Maestro'].map(type => (
                            <div key={type} className="h-7 px-3 bg-gradient-to-b from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center shadow-sm">
                                <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300">{type}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {[
                        { icon: 'verified_user', label: 'Safe Payment' },
                        { icon: 'lock', label: 'Secure Privacy' },
                        { icon: 'shield', label: 'Purchase Protection' },
                        { icon: 'local_shipping', label: 'Delivery Guarantee' },
                    ].map(({ icon, label }) => (
                        <div key={icon} className="flex flex-col items-center text-center gap-2">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                                <span className="material-icons-round text-emerald-500 dark:text-emerald-400">{icon}</span>
                            </div>
                            <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight font-medium">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recommended Products - Dynamic Categories */}
            {
                recommendations.length > 0 && (
                    <div className="mt-4">
                        <div className="px-4 py-3">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3">You might also like</h3>
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                                {recCategories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveRecTab(cat)}
                                        className={`rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all duration-300 ${activeRecTab === cat
                                            ? 'bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 shadow-lg'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 px-2 pb-4">
                            {filteredRecommendations.slice(0, 6).map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onProductClick={onProductClick}
                                    onVisualSearch={onVisualSearch}
                                />
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Bottom Checkout Bar - Modern Design */}
            <div className="fixed bottom-[50px] left-0 right-0 z-40">
                <div className="mx-3 mb-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-black/10 dark:shadow-black/30 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                                    {formatPrice(finalTotal, cartItems[0]?.product.currency)}
                                </span>
                                {totalSavings > 0 && (
                                    <button className="flex items-center text-gray-400">
                                        <span className="material-icons-round text-sm">expand_less</span>
                                    </button>
                                )}
                            </div>
                            {totalSavings > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="material-icons-round text-emerald-500 text-sm">savings</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                        Saving {formatPrice(totalSavings, cartItems[0]?.product.currency)}
                                    </span>
                                </div>
                            )}
                        </div>
                        <button
                            className={`relative overflow-hidden rounded-full px-8 py-3 font-bold text-white shadow-lg transition-all duration-300 active:scale-95 ${availableItems.length > 0 && selectedItems.size > 0
                                ? 'bg-gradient-to-r from-primary to-orange-500 hover:shadow-xl hover:shadow-orange-200 dark:hover:shadow-orange-900/30'
                                : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                }`}
                            onClick={onCheckout}
                            disabled={availableItems.length === 0 || selectedItems.size === 0}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Checkout
                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                                    {selectedItems.size}
                                </span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes scale-in {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }
            `}</style>
        </div >
    );
};
