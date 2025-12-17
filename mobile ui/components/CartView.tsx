import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface CartViewProps {
    cartItems: Product[];
    recommendations: Product[];
    onProductClick: (product: Product) => void;
}

export const CartView: React.FC<CartViewProps> = ({ cartItems, recommendations, onProductClick }) => {
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

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const savings = cartItems.reduce((sum, item) => {
        const original = item.originalPrice || item.price;
        return sum + Math.max((original || 0) - (item.price || 0), 0);
    }, 0);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark pb-36">
            {/* Header Area */}
            <div className="bg-surface-light dark:bg-surface-dark sticky top-0 z-30 shadow-sm">
                <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 cursor-pointer">
                        <span className="material-icons-round text-black dark:text-white">check_circle</span>
                        <span className="font-bold text-black dark:text-white text-base">All</span>
                    </div>
                    <span className="font-bold text-black dark:text-white text-lg">Cart ({cartItems.length})</span>
                    <button className="text-black dark:text-white">
                        <span className="material-icons-outlined">more_horiz</span>
                    </button>
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark">
                    <div className="flex items-center gap-1 text-banner-green dark:text-green-400 font-bold text-xs">
                        <span className="material-icons-round text-sm">check_circle</span>
                        Free shipping
                    </div>
                    <span className="text-gray-400 text-xs font-medium">Incredible</span>
                </div>
                <div className="flex gap-3 px-3 py-2 bg-white dark:bg-surface-dark">
                    <button className="rounded-full border border-black dark:border-white px-3 py-1 text-xs font-bold text-black dark:text-white">All (1)</button>
                    <button className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1 text-xs font-medium text-gray-500">Selected (1)</button>
                </div>
            </div>

            {/* Cart Items */}
            {cartItems.map((item, idx) => (
                <div key={item.id ?? idx} className="bg-surface-light dark:bg-surface-dark mt-2 p-3 flex gap-3">
                    <div className="flex items-center cursor-pointer">
                        <span className="material-icons-round text-black dark:text-white text-xl">check_circle</span>
                    </div>
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-md flex-shrink-0 overflow-hidden border border-gray-100 dark:border-gray-700">
                        <img src={item.image} className="w-full h-full object-cover" alt={item.title} />
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-1">
                                <p className="text-xs text-black dark:text-white line-clamp-1 leading-tight">{item.title}</p>
                                <button className="text-gray-400 hover:text-red-500">
                                    <span className="material-icons-outlined text-lg">delete</span>
                                </button>
                            </div>
                            <div className="text-[10px] text-price-red font-bold mb-1">
                                {item.deal_type === 'coupon' && item.activeCoupon?.label ? item.activeCoupon.label : item.deal_type === 'flash_sale' ? 'Flash sale' : item.badge}
                            </div>
                        </div>

                        <div className="flex justify-between items-end">
                            <div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-base font-bold text-price-red">{formatPrice(item.price, item.currency)}</span>
                                    {item.originalPrice && (
                                        <span className="text-xs text-gray-400 line-through">{formatPrice(item.originalPrice, item.currency)}</span>
                                    )}
                                    {item.discountPercent && (
                                        <span className="text-[10px] text-price-red border border-price-red px-0.5 rounded ml-1 font-bold">-{item.discountPercent}%</span>
                                    )}
                                </div>
                                {item.deliveryTimeEstimate && (
                                    <div className="text-[10px] text-gray-500 flex items-center gap-0.5 mt-0.5">
                                        {item.deliveryTimeEstimate}
                                    </div>
                                )}
                            </div>
                            <div className="border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 flex items-center gap-2 cursor-pointer bg-white dark:bg-black">
                                <span className="text-xs font-medium text-black dark:text-white">1</span>
                                <span className="material-icons-outlined text-[12px] text-gray-500">expand_more</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Unavailable */}
            <div className="bg-surface-light dark:bg-surface-dark mt-2 p-3">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-black dark:text-white">Unavailable item (1)</span>
                    <button className="text-xs text-gray-500 flex items-center hover:text-black dark:hover:text-white">
                        See all <span className="material-icons-outlined text-xs">chevron_right</span>
                    </button>
                </div>
                <div className="flex flex-col items-start gap-2">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden relative border border-gray-100 dark:border-gray-700">
                        <img src="https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=150&q=80" className="w-full h-full object-cover opacity-60 grayscale" alt="PC" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[9px] text-center font-bold py-0.5">Sold out</div>
                    </div>
                    <button className="border border-gray-300 dark:border-gray-600 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 text-black dark:text-white bg-white dark:bg-black font-medium">
                        Similar <span className="material-icons-outlined text-[12px]">expand_more</span>
                    </button>
                </div>
            </div>

            <div className="px-3 py-2 text-[10px] text-gray-400 leading-tight">
                <span className="material-icons-outlined text-[12px] align-middle mr-1">info</span>
                Item availability and pricing are not guaranteed until payment is final.
            </div>

            {/* Payment & Security */}
            <div className="bg-surface-light dark:bg-surface-dark mt-2 p-3">
                <div className="flex items-center gap-3 mb-4 overflow-hidden">
                    <span className="text-sm font-bold whitespace-nowrap text-black dark:text-white">We accept</span>
                    <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                        {['PayPal', 'VISA', 'Mastercard', 'Amex', 'Discover', 'Maestro'].map(type => (
                            <div key={type} className="h-5 px-1 bg-white border border-gray-200 rounded flex items-center justify-center min-w-[30px]">
                                {/* Using text as placeholder for icons to avoid external assets issues */}
                                <span className="text-[8px] font-bold text-blue-800">{type}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                    <div className="flex flex-col items-center text-center gap-1">
                        <span className="material-icons-round text-banner-green dark:text-green-400 text-xl">verified_user</span>
                        <span className="text-[10px] text-gray-500 leading-tight">Safe Payment Options</span>
                    </div>
                    <div className="flex flex-col items-center text-center gap-1">
                        <span className="material-icons-round text-banner-green dark:text-green-400 text-xl">lock</span>
                        <span className="text-[10px] text-gray-500 leading-tight">Secure privacy</span>
                    </div>
                    <div className="flex flex-col items-center text-center gap-1">
                        <span className="material-icons-round text-banner-green dark:text-green-400 text-xl">shield</span>
                        <span className="text-[10px] text-gray-500 leading-tight">JuaExpress Purchase Protection</span>
                    </div>
                    <div className="flex flex-col items-center text-center gap-1">
                        <span className="material-icons-round text-banner-green dark:text-green-400 text-xl">local_shipping</span>
                        <span className="text-[10px] text-gray-500 leading-tight">Delivery guarantee</span>
                    </div>
                </div>
            </div>

            {/* Recommended */}
            <div className="bg-surface-light dark:bg-surface-dark mt-2">
                <div className="flex items-center gap-6 px-3 pt-3 pb-1 border-b border-gray-100 dark:border-gray-800 text-sm overflow-x-auto hide-scrollbar">
                    <button className="font-bold border-b-2 border-black dark:border-white pb-1 whitespace-nowrap text-black dark:text-white">Recommended</button>
                    <button className="text-gray-500 pb-1 whitespace-nowrap hover:text-black dark:hover:text-white transition-colors">Beauty & Health</button>
                    <button className="text-gray-500 pb-1 whitespace-nowrap hover:text-black dark:hover:text-white transition-colors">Women's Clothing</button>
                </div>
                <div className="grid grid-cols-2 gap-1 p-1 bg-background-light dark:bg-background-dark">
                    {recommendations.slice(0, 4).map(product => (
                        <ProductCard key={product.id} product={product} onClick={() => onProductClick(product)} />
                    ))}
                </div>
            </div>

            {/* Bottom Checkout Bar */}
            <div className="fixed bottom-[50px] left-0 right-0 bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 p-2 z-40 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex flex-col items-start ml-2">
                    <div className="text-lg font-bold text-black dark:text-white flex items-center gap-1 leading-none">
                        {formatPrice(subtotal, cartItems[0]?.currency)} <span className="material-icons-outlined text-sm text-gray-500">expand_less</span>
                    </div>
                    <div className="text-price-red text-xs font-bold mt-0.5">{savings > 0 ? `${formatPrice(savings, cartItems[0]?.currency)} saved` : ''}</div>
                </div>
                <button className="bg-primary hover:bg-orange-600 text-white font-bold rounded-full px-10 py-2.5 shadow-md transition-colors text-sm">
                    Checkout ({cartItems.length})
                </button>
            </div>
        </div>
    );
};
