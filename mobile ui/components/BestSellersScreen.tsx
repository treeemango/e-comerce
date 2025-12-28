import React, { useState, useEffect } from 'react';
import { BestSellingProduct, fetchBestSellingProducts } from '@/lib/api';
import { ProductCard } from './ProductCard';
import { Product } from '@/types';

interface BestSellersScreenProps {
    onBack: () => void;
    onProductClick: (product: Product) => void;
    onVisualSearch?: (product: Product) => void;
    userId?: string;
}

export const BestSellersScreen: React.FC<BestSellersScreenProps> = ({
    onBack,
    onProductClick,
    onVisualSearch,
    userId
}) => {
    const [activeTab, setActiveTab] = useState<'week' | 'month'>('week');
    const [products, setProducts] = useState<BestSellingProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);
            try {
                const data = await fetchBestSellingProducts(activeTab, userId);
                setProducts(data);
            } catch (error) {
                console.error('Failed to load best sellers', error);
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, [activeTab, userId]);

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 active:scale-95 transition-all"
                    >
                        <span className="material-icons text-gray-700 dark:text-gray-300">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-black tracking-tight text-gray-900 dark:text-white uppercase">
                        Trend Rankings
                    </h1>
                    <div className="w-10" />
                </div>

                {/* Tab Switcher */}
                <div className="px-4 pb-3">
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('week')}
                            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'week'
                                    ? 'bg-white dark:bg-gray-800 text-primary shadow-lg shadow-primary/5'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setActiveTab('month')}
                            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'month'
                                    ? 'bg-white dark:bg-gray-800 text-primary shadow-lg shadow-primary/5'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            Monthly
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pt-2 px-4 pb-24">
                {loading ? (
                    <div className="grid grid-cols-2 gap-4 animate-pulse">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-[4/5] bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-full w-3/4" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-full w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                        {products.map((product, index) => (
                            <div key={product.id} className="relative group">
                                {/* Enhanced Rank Badge */}
                                <div className={`absolute -top-1 -left-1 z-30 w-10 h-10 flex flex-col items-center justify-center rounded-2xl font-black text-white shadow-xl shadow-black/20 border-2 border-white dark:border-gray-900 transform -rotate-12 ${index === 0 ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 scale-110' :
                                        index === 1 ? 'bg-gradient-to-br from-indigo-400 to-blue-600' :
                                            index === 2 ? 'bg-gradient-to-br from-emerald-400 to-teal-600' :
                                                'bg-gray-800 dark:bg-gray-700'
                                    }`}>
                                    <span className="text-[10px] leading-none opacity-80 mb-0.5">Top</span>
                                    <span className="text-base leading-none">{index + 1}</span>
                                </div>

                                <ProductCard
                                    product={product}
                                    onProductClick={onProductClick}
                                    onVisualSearch={onVisualSearch}
                                    showSellerLine={false}
                                />

                                {/* Sales Indicator */}
                                <div className="mt-2.5 px-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 py-1 px-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800/30">
                                        <span className="material-icons text-[14px] text-orange-500">local_fire_department</span>
                                        <span className="text-[11px] font-black text-orange-600 dark:text-orange-400">
                                            {product.total_sold} SOLD
                                        </span>
                                    </div>
                                    {product.is_personalized && (
                                        <span className="material-icons text-[16px] text-primary animate-pulse">auto_awesome</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-icons text-4xl text-gray-400">trending_up</span>
                        </div>
                        <p className="font-bold text-gray-500 uppercase tracking-widest text-xs"> No trending data yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};
