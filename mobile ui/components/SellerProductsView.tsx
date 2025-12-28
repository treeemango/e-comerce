import React, { useState, useMemo } from 'react';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { useCurrencyConverter, formatPrice } from '@/lib/currency';

interface SellerProductsViewProps {
    products: Product[];
    onCreateProduct?: () => void;
    onDiscountProduct?: (product: Product) => void;
    onBulkPricing?: (product: Product) => void;
    loading?: boolean;
}

export const SellerProductsView: React.FC<SellerProductsViewProps> = ({
    products,
    onCreateProduct,
    onDiscountProduct,
    onBulkPricing,
    loading
}) => {
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'out_of_stock'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProducts = useMemo(() => {
        let result = products;

        // Status filter
        if (activeTab === 'active') {
            result = result.filter(item => (item.stock || 0) > 0);
        } else if (activeTab === 'out_of_stock') {
            result = result.filter(item => (item.stock || 0) <= 0);
        }

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.title.toLowerCase().includes(q) ||
                (item.sku && item.sku.toLowerCase().includes(q))
            );
        }

        return result;
    }, [products, activeTab, searchQuery]);

    const getStatusColor = (product: Product) => {
        if ((product.stock || 0) <= 0) return 'bg-red-100 text-red-700';
        if (product.stock && product.stock < 5) return 'bg-orange-100 text-orange-700';
        return 'bg-emerald-100 text-emerald-700';
    };

    const getStatusLabel = (product: Product) => {
        if ((product.stock || 0) <= 0) return 'Out of Stock';
        if (product.stock && product.stock < 5) return 'Low Stock';
        return 'Active';
    };

    // Currency conversion for product prices
    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];
        filteredProducts.forEach((item, idx) => {
            vals.push({ id: `product-${idx}`, amount: item.price || 0, currency: item.currency || 'USD' });
        });
        return vals;
    }, [filteredProducts]);

    const { convertedValues, preferredCurrency } = useCurrencyConverter(priceValues);

    const getConvertedPrice = (idx: number, fallback: number) => {
        return convertedValues[`product-${idx}`]?.converted ?? formatPrice(fallback, preferredCurrency);
    };

    return (
        <div className="pb-24 bg-gray-50 dark:bg-black min-h-screen">
            {/* Premium Header & Search */}
            <div className="bg-white dark:bg-gray-900 sticky top-0 z-10 px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Products</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{products.length} Items</p>
                    </div>
                    <button
                        onClick={onCreateProduct}
                        className="flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-primary/30 active:scale-95 transition-transform"
                    >
                        <span className="material-icons-round text-sm">add</span>
                        Add New
                    </button>
                </div>

                {/* Premium Search */}
                <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-gray-400 text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Search products, SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-400"
                    />
                </div>

                {/* Premium Tabs */}
                <div className="flex gap-1 overflow-x-auto hide-scrollbar pb-1">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'active', label: 'Active' },
                        { id: 'out_of_stock', label: 'Out of Stock' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`whitespace-nowrap px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="px-5 py-4 space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-4 rounded-2xl animate-pulse h-32" />
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
                            <span className="material-icons-outlined text-4xl">inventory_2</span>
                        </div>
                        <div>
                            <div className="font-bold text-gray-900">No products found</div>
                            <div className="text-sm text-gray-500 px-10">Start by adding your first product to see it here.</div>
                        </div>
                    </div>
                ) : (
                    filteredProducts.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4 active:scale-[0.98] transition-all" onClick={() => onDiscountProduct?.(item)}>
                            {/* Product Image */}
                            <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden relative">
                                {item.image ? (
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <span className="material-icons text-2xl">image</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-sm text-gray-900 line-clamp-1 leading-snug">{item.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase", getStatusColor(item))}>
                                                    {getStatusLabel(item)}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-medium">SKU: {item.sku || '—'}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDiscountProduct?.(item);
                                            }}
                                            className="text-gray-400 hover:text-black p-1 -mr-1"
                                        >
                                            <span className="material-icons-outlined text-lg">edit</span>
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                        <span className="material-icons text-[10px]">folder</span>
                                        {item.categoryName || 'Uncategorized'}
                                    </div>
                                </div>

                                <div className="flex items-end justify-between mt-2">
                                    <div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Price</div>
                                        <div className="font-black text-gray-900">{getConvertedPrice(filteredProducts.indexOf(item), item.price || 0)}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onBulkPricing?.(item);
                                            }}
                                            className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-tight flex items-center gap-1"
                                        >
                                            <span className="material-icons text-xs">sell</span>
                                            Bulk Pricing
                                        </button>
                                        <div className="text-right flex flex-col items-end">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stock</div>
                                            <div className={cn("font-black", (item.stock || 0) > 0 ? 'text-emerald-600' : 'text-red-600')}>
                                                {item.stock ?? 0}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


