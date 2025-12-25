import React, { useEffect, useRef } from 'react';
import { Product } from '../types';
import { getCurrencySymbol } from '@/lib/currency';

interface CartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: Product[];
    onViewCart: () => void;
    onCheckout: () => void;
    onRemoveItem: (productId: string) => void;
    onUpdateQuantity: (productId: string, quantity: number) => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({
    isOpen,
    onClose,
    cartItems,
    onViewCart,
    onCheckout,
    onRemoveItem,
    onUpdateQuantity
}) => {
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
    const freeShippingThreshold = 50;
    const shippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
    const currency = cartItems[0]?.currency || 'GBP';
    const symbol = getCurrencySymbol(currency);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sidebar Drawer */}
            <div
                ref={sidebarRef}
                className={`fixed top-0 right-0 z-[70] h-full w-[450px] bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-baseline gap-2">
                            <span className="material-icons text-2xl text-slate-400">shopping_cart</span>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Subtotal</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <span className="material-icons text-slate-400">close</span>
                        </button>
                    </div>

                    <div className="text-center mb-8">
                        <span className="text-4xl font-black text-slate-900 dark:text-white font-mono">
                            {symbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Shipping Bar */}
                    <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                <span className="material-icons text-sm">check_circle</span>
                                Free shipping
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">Goal: {symbol}50</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                                style={{ width: `${shippingProgress}%` }}
                            />
                        </div>
                    </div>

                    <div className="mt-8 space-y-3">
                        <button
                            onClick={onCheckout}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20"
                        >
                            Checkout ({cartItems.length})
                        </button>
                        <button
                            onClick={onViewCart}
                            className="w-full border-2 border-slate-100 dark:border-slate-800 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Go to cart
                        </button>
                    </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <div className="flex items-center justify-between">
                        <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                            <span className="material-icons text-lg">check_circle</span>
                            Select all ({cartItems.length})
                        </button>
                    </div>

                    <div className="space-y-6">
                        {cartItems.map((item) => (
                            <div key={item.id} className="flex gap-4 group">
                                <div className="relative">
                                    <button className="absolute top-0 -left-1 z-10 h-6 w-6 bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                        <span className="material-icons text-xs">check</span>
                                    </button>
                                    <div className="h-24 w-24 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mb-1">{item.title}</h4>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-lg font-black text-rose-500">{symbol}{item.price}</span>
                                        {item.originalPrice && (
                                            <span className="text-xs text-slate-400 line-through">{symbol}{item.originalPrice}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                            <button
                                                onClick={() => onUpdateQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
                                                className="h-7 w-7 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <span className="material-icons text-sm">remove</span>
                                            </button>
                                            <span className="w-8 text-center text-sm font-black text-slate-900 dark:text-white">{item.quantity || 1}</span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.id, (item.quantity || 1) + 1)}
                                                className="h-7 w-7 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <span className="material-icons text-sm">add</span>
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => onRemoveItem(item.id)}
                                            className="text-slate-400 hover:text-rose-500 transition-colors"
                                        >
                                            <span className="material-icons text-lg">delete_outline</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {cartItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                                <span className="material-icons text-6xl mb-4">shopping_basket</span>
                                <p className="font-bold">Your basket is empty</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Section (Security Badges) */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="material-icons text-sm">verified_user</span>
                            Secure Payment
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="material-icons text-sm">cached</span>
                            30-Day Returns
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CartSidebar;
