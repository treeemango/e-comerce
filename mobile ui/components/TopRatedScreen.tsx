import React, { useState, useEffect } from 'react';
import { fetchTopRatedProducts } from '@/lib/api';
import { ProductCard } from './ProductCard';
import { Product } from '@/types';

interface TopRatedScreenProps {
    onBack: () => void;
    onProductClick: (product: Product) => void;
    onVisualSearch?: (product: Product) => void;
}

export const TopRatedScreen: React.FC<TopRatedScreenProps> = ({
    onBack,
    onProductClick,
    onVisualSearch
}) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);
            try {
                const data = await fetchTopRatedProducts();
                setProducts(data);
            } catch (error) {
                console.error('Failed to load top rated items', error);
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, []);

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
                        Elite Selection
                    </h1>
                    <div className="w-10" />
                </div>

                <div className="px-4 pb-3">
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-400/20">
                            <span className="material-icons text-white">grade</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-500 mb-0.5">Top Tier Quality</p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-600/80 font-medium">Hand-picked items with exceptional ratings</p>
                        </div>
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
                                <ProductCard
                                    product={product}
                                    onProductClick={onProductClick}
                                    onVisualSearch={onVisualSearch}
                                />

                                {/* Rating Badge */}
                                <div className="mt-2.5 px-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 py-1 px-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
                                        <span className="material-icons text-[14px] text-yellow-500">star</span>
                                        <span className="text-[11px] font-black text-yellow-700 dark:text-yellow-500 text-uppercase">
                                            {product.rating?.toFixed(1)} ({product.reviews} REVIEWS)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-icons text-4xl text-gray-400">grade</span>
                        </div>
                        <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">No rated items found</p>
                    </div>
                )}
            </div>
        </div>
    );
};
