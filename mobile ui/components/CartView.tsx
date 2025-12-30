import React, { useMemo, useState, useEffect } from 'react';
import { Product, RelatedProduct } from '../../types';
import { ProductCard } from './ProductCard';
import { applyPromotionsToCart, PromotionsResult } from '@/lib/promotions';
import { useCurrencyConverter, formatPrice as currencyFormatPrice } from '@/lib/currency';
import { fetchRelatedProducts } from '@/lib/api';

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
    const [curatedProducts, setCuratedProducts] = useState<RelatedProduct[]>([]);
    const [curatedLoading, setCuratedLoading] = useState(false);

    // Initialize all items as selected
    React.useEffect(() => {
        setSelectedItems(new Set(cartItems.map(item => item.product.id)));
    }, [cartItems]);

    // Load AI-curated products based on cart items
    useEffect(() => {
        const loadCuratedProducts = async () => {
            if (cartItems.length > 0) {
                setCuratedLoading(true);
                try {
                    const allRelated: RelatedProduct[] = [];
                    const seenIds = new Set<string>();

                    cartItems.forEach(ci => seenIds.add(String(ci.product.id)));

                    const itemsToCheck = cartItems.slice(0, 3);

                    for (const item of itemsToCheck) {
                        const related = await fetchRelatedProducts(String(item.product.id));
                        const combined = [...related.same, ...related.similar];

                        for (const product of combined) {
                            const productId = String(product.id);
                            if (!seenIds.has(productId)) {
                                seenIds.add(productId);
                                allRelated.push(product);
                            }
                        }
                    }

                    setCuratedProducts(allRelated.slice(0, 8));
                } catch (error) {
                    console.error('Error loading curated products:', error);
                } finally {
                    setCuratedLoading(false);
                }
            }
        };
        loadCuratedProducts();
    }, [cartItems]);

    React.useEffect(() => {
        const applyPromos = async () => {
            const result = await applyPromotionsToCart(cartItems);
            setPromoResult(result);
        };
        applyPromos();
    }, [cartItems]);

    const subtotal = promoResult?.subtotal || cartItems.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
    const totalSavings = promoResult?.totalSavings || 0;
    const finalTotal = promoResult?.finalTotal || subtotal;
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Currency conversion for all price values
    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];
        cartItems.forEach((item, idx) => {
            const currency = item.product.currency || 'USD';
            vals.push({ id: `item-${idx}`, amount: item.product.price || 0, currency });
            if (item.product.originalPrice) {
                vals.push({ id: `item-${idx}-original`, amount: item.product.originalPrice, currency });
            }
            const resultInfo = promoResult?.items.find(pi => pi.product.id === item.product.id);
            if (resultInfo) {
                vals.push({ id: `item-${idx}-discounted`, amount: resultInfo.discountedPrice, currency });
                vals.push({ id: `item-${idx}-savings`, amount: resultInfo.originalPrice - resultInfo.discountedPrice, currency });
            }
        });
        vals.push({ id: 'finalTotal', amount: finalTotal, currency: cartItems[0]?.product.currency || 'USD' });
        vals.push({ id: 'totalSavings', amount: totalSavings, currency: cartItems[0]?.product.currency || 'USD' });
        return vals;
    }, [cartItems, promoResult, finalTotal, totalSavings]);

    const { convertedValues, preferredCurrency } = useCurrencyConverter(priceValues);

    const getPrice = (id: string, fallback: number) => {
        return convertedValues[id]?.converted ?? currencyFormatPrice(fallback, preferredCurrency);
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

    const unavailableItems = cartItems.filter(item =>
        typeof item.product.stock === 'number' && item.product.stock <= 0
    );
    const availableItems = cartItems.filter(item =>
        typeof item.product.stock !== 'number' || item.product.stock > 0
    );

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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-48">
            {/* Premium Glass Header */}
            <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-black/70 border-b border-gray-100 dark:border-gray-900">
                <div className="flex items-center justify-between px-5 py-4">
                    <button
                        onClick={toggleAllSelection}
                        className="flex items-center gap-2.5 active:scale-95 transition-transform"
                    >
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-300 border-2 ${selectedItems.size === cartItems.length
                            ? 'bg-primary border-primary shadow-[0_0_12px_rgba(255,107,0,0.3)]'
                            : 'border-gray-200 dark:border-gray-700'
                            }`}>
                            {selectedItems.size === cartItems.length && (
                                <span className="material-icons-round text-white text-[14px]">check</span>
                            )}
                        </div>
                        <span className="text-[13px] font-black uppercase tracking-widest text-gray-800 dark:text-gray-200">Select All</span>
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Your Bag</span>
                        <span className="text-[15px] font-black text-black dark:text-white uppercase tracking-tight">
                            {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                        </span>
                    </div>
                    <button className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 active:scale-90 transition-transform">
                        <span className="material-icons-round text-gray-800 dark:text-white text-lg">more_horiz</span>
                    </button>
                </div>

                {/* Integrated Shipping Progress */}
                {totalItems > 0 && (
                    <div className="px-5 pb-4">
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/10 dark:border-emerald-500/20 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-round text-emerald-500 text-lg">local_shipping</span>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Elite Delivery Status</span>
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest animate-pulse">Unlocked</span>
                            </div>
                            <div className="h-1.5 w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                                <div className="h-full w-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Cart Items Feed */}
            <div className="p-4 space-y-4">
                {availableItems.map((item, idx) => {
                    const stock = item.product.stock;
                    const remaining = typeof stock === 'number' ? Math.max(stock - item.quantity, 0) : null;
                    const isLow = typeof remaining === 'number' && remaining <= 3;
                    const isSelected = selectedItems.has(item.product.id);
                    const resultInfo = promoResult?.items.find(pi => pi.product.id === item.product.id);

                    return (
                        <div
                            key={item.product.id ?? idx}
                            className={`group relative overflow-hidden bg-white dark:bg-gray-900/40 rounded-[28px] border transition-all duration-500 ${isSelected
                                ? 'border-primary shadow-[0_8px_24px_rgba(255,107,0,0.08)]'
                                : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                                }`}
                            style={{ animation: `fadeSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) ${idx * 0.1}s both` }}
                        >
                            <div className="p-4 flex gap-4">
                                {/* Detached Checkbox */}
                                <div className="flex flex-col justify-start pt-1">
                                    <button
                                        onClick={() => toggleItemSelection(item.product.id)}
                                        className="relative active:scale-90 transition-transform"
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${isSelected
                                            ? 'bg-primary border-primary shadow-lg shadow-primary/20'
                                            : 'border-gray-200 dark:border-gray-700'
                                            }`}>
                                            {isSelected && (
                                                <span className="material-icons-round text-white text-[16px]">check</span>
                                            )}
                                        </div>
                                    </button>
                                </div>

                                {/* Premium Image Container */}
                                <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-gray-50 dark:bg-black/20 flex-shrink-0"
                                    onClick={() => onProductClick(item.product)}>
                                    <img
                                        src={item.product.image}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        alt={item.product.title}
                                    />
                                    {isLow && (
                                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase rounded-md shadow-lg">
                                            Low Stock
                                        </div>
                                    )}
                                </div>

                                {/* Refined Typography & Controls */}
                                <div className="flex-grow min-w-0 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight truncate">
                                                {item.product.title}
                                            </p>
                                            <button
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-black/40 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-90"
                                                onClick={() => onRemove(item.product.id, item.variant_id)}
                                            >
                                                <span className="material-icons-round text-lg">close</span>
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {resultInfo?.appliedPromotions.map((promo, pidx) => (
                                                <span
                                                    key={pidx}
                                                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-emerald-500/10"
                                                >
                                                    {promo.description}
                                                </span>
                                            ))}
                                            {item.product.badge && !resultInfo?.appliedPromotions.length && (
                                                <span className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-primary/20">
                                                    {item.product.badge}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between mt-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[17px] font-black text-gray-900 dark:text-white">
                                                    {resultInfo ? getPrice(`item-${idx}-discounted`, resultInfo.discountedPrice) : getPrice(`item-${idx}`, item.product.price || 0)}
                                                </span>
                                                {item.product.originalPrice && (
                                                    <span className="text-[11px] text-gray-400 line-through font-medium">
                                                        {getPrice(`item-${idx}-original`, item.product.originalPrice)}
                                                    </span>
                                                )}
                                            </div>
                                            {resultInfo && resultInfo.originalPrice > resultInfo.discountedPrice && (
                                                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-tight">
                                                    Saving {getPrice(`item-${idx}-savings`, resultInfo.originalPrice - resultInfo.discountedPrice)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Tactile Quantity Control */}
                                        <div className="flex items-center bg-gray-100 dark:bg-black p-1 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-inner">
                                            <button
                                                className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors active:scale-75"
                                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.variant_id)}
                                            >
                                                <span className="material-icons-round text-lg">remove</span>
                                            </button>
                                            <span className="w-8 text-center text-[13px] font-black text-gray-900 dark:text-white">
                                                {item.quantity}
                                            </span>
                                            <button
                                                className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors active:scale-75"
                                                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.variant_id)}
                                                disabled={typeof stock === 'number' && item.quantity >= stock}
                                            >
                                                <span className="material-icons-round text-lg">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Empty State Illustration */}
                {cartItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-1000">
                        {/* Large Minimalist Empty Bag Icon */}
                        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900/50 rounded-full scale-100"></div>
                            <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800/20 rounded-full scale-90 blur-xl"></div>
                            <span className="material-icons-round text-7xl text-gray-300 dark:text-gray-700 relative z-10">shopping_bag</span>
                        </div>

                        <h3 className="text-[20px] font-black text-black dark:text-white uppercase tracking-widest mb-3">Bag is empty</h3>
                        <p className="text-[13px] text-gray-400 font-medium text-center px-16 leading-relaxed mb-10 max-w-[320px]">
                            Discover our curated selection and add items
                            to your collection.
                        </p>
                    </div>
                )}
            </div>

            {/* Curated for You - AI-powered */}
            <div className="mt-8 px-4 pb-12">
                <div className="flex items-center gap-3 mb-6 px-1">
                    <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-800"></div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Curated for You</span>
                    <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-800"></div>
                </div>

                {curatedLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse aspect-[3/4]"></div>
                        ))}
                    </div>
                ) : curatedProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {curatedProducts.slice(0, 6).map(product => (
                            <ProductCard
                                key={product.id}
                                product={product as Product}
                                onProductClick={onProductClick}
                                onVisualSearch={onVisualSearch}
                            />
                        ))}
                    </div>
                ) : recommendations.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {recommendations.slice(0, 4).map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onProductClick={onProductClick}
                                onVisualSearch={onVisualSearch}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 text-xs text-gray-400">
                        Check back later for recommendations
                    </div>
                )}
            </div>

            {/* Detached Floating Checkout Action */}
            {totalItems > 0 && (
                <div className="fixed bottom-24 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom-12 duration-1000">
                    <div className="glass-morphism bg-white/80 dark:bg-black/80 backdrop-blur-2xl rounded-[32px] border border-gray-100/50 dark:border-gray-800/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-5 overflow-hidden">
                        {/* Glow effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-primary/20 blur-3xl -z-10 rounded-full"></div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Value</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[24px] font-black text-black dark:text-white tracking-tight">
                                        {getPrice('finalTotal', finalTotal)}
                                    </span>
                                </div>
                                {totalSavings > 0 && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                                            Saved {getPrice('totalSavings', totalSavings)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                className={`relative group h-14 px-8 rounded-2xl font-black text-[14px] uppercase tracking-widest transition-all duration-300 active:scale-95 ${availableItems.length > 0 && selectedItems.size > 0
                                    ? 'bg-primary text-white shadow-[0_12px_24px_rgba(255,107,0,0.3)] hover:shadow-[0_12px_32px_rgba(255,107,0,0.4)]'
                                    : 'bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed'
                                    }`}
                                onClick={onCheckout}
                                disabled={availableItems.length === 0 || selectedItems.size === 0}
                            >
                                <div className="flex items-center gap-2.5">
                                    <span>Checkout</span>
                                    <span className="material-icons-round text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .glass-morphism {
                    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                }
            `}</style>
        </div>
    );
};
