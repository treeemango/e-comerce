import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { Product } from '../types';
import { fetchTopRatedProducts } from '../lib/api';

interface TopRatedViewProps {
    onProductClick: (product: Product) => void;
    products: Product[];
    onAddToCart: (product: Product, event?: React.MouseEvent | React.TouchEvent) => void;
}

const TopRatedView: React.FC<TopRatedViewProps> = ({ onProductClick, products: initialProducts, onAddToCart }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadTopRated = async () => {
            setIsLoading(true);
            try {
                const data = await fetchTopRatedProducts();
                setProducts(data);
            } catch (error) {
                console.error('Failed to load top rated:', error);
                setProducts(initialProducts.filter(p => p.rating >= 4.5).slice(0, 20));
            } finally {
                setIsLoading(false);
            }
        };
        loadTopRated();
    }, [initialProducts]);

    return (
        <div className="max-w-screen-2xl mx-auto px-4 py-8">
            {/* Premium Header Section */}
            <div className="relative mb-10 overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-400 ring-1 ring-yellow-500/20">
                            <span className="material-icons text-sm">grade</span>
                            Elite Selection
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-white uppercase sm:text-5xl">
                            5-Star <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">Rated</span>
                        </h1>
                        <p className="mt-3 max-w-xl text-lg font-medium text-slate-400">
                            The gold standard of quality. Explore products hand-picked by our community for their exceptional value and performance.
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full">
                {/* Product Grid */}
                <div className="w-full">
                    {isLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
                            {[...Array(14)].map((_, i) => (
                                <div key={i} className="animate-pulse space-y-4">
                                    <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4" />
                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : products.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-6 gap-y-10">
                            {products.map((product) => (
                                <div key={product.id} className="relative group">
                                    <ProductCard
                                        product={product}
                                        onProductClick={onProductClick}
                                        onAddToCart={onAddToCart}
                                    />
                                    {/* Rating Overlay */}
                                    <div className="mt-3 flex items-center justify-between px-1">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                                            <span className="material-icons text-[14px] text-yellow-500">star</span>
                                            <span className="text-[11px] font-black text-yellow-700 dark:text-yellow-500 uppercase">
                                                {product.rating?.toFixed(1)} ({product.reviews} reviews)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <span className="material-icons text-4xl text-slate-400">grade</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">No items found</h3>
                            <p className="mt-2 text-slate-500">We couldn't find any 5-star rated items at the moment.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopRatedView;
