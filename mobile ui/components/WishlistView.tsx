import React, { useState, useEffect } from 'react';
import { Product, RelatedProduct } from '@/types';
import { getWishlist, removeFromWishlist, WishlistProduct, fetchRelatedProducts } from '@/lib/api';
import { ProductCard } from './ProductCard';
import { formatPrice } from '@/lib/currency';

interface WishlistViewProps {
    userId: string;
    onBack: () => void;
    onProductClick: (product: Product) => void;
    onAddToCart: (product: Product) => void;
    onVisualSearch?: (product: Product) => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
    userId,
    onBack,
    onProductClick,
    onAddToCart,
    onVisualSearch
}) => {
    const [wishlistItems, setWishlistItems] = useState<WishlistProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
    const [inspiredProducts, setInspiredProducts] = useState<RelatedProduct[]>([]);
    const [inspiredLoading, setInspiredLoading] = useState(false);

    useEffect(() => {
        loadWishlist();
    }, [userId]);

    // Load inspired products based on wishlist items
    useEffect(() => {
        const loadInspiredProducts = async () => {
            if (wishlistItems.length > 0) {
                setInspiredLoading(true);
                try {
                    const allRelated: RelatedProduct[] = [];
                    const seenIds = new Set<string>();

                    wishlistItems.forEach(wi => seenIds.add(String(wi.id)));

                    const itemsToCheck = wishlistItems.slice(0, 5);

                    for (const item of itemsToCheck) {
                        const related = await fetchRelatedProducts(String(item.id));
                        const combined = [...related.same, ...related.similar];

                        for (const product of combined) {
                            const productId = String(product.id);
                            if (!seenIds.has(productId)) {
                                seenIds.add(productId);
                                allRelated.push(product);
                            }
                        }
                    }

                    setInspiredProducts(allRelated.slice(0, 8));
                } catch (error) {
                    console.error('Error loading inspired products:', error);
                } finally {
                    setInspiredLoading(false);
                }
            }
        };
        loadInspiredProducts();
    }, [wishlistItems]);

    const loadWishlist = async () => {
        setIsLoading(true);
        try {
            const items = await getWishlist(userId);
            setWishlistItems(items);
        } catch (error) {
            console.error('Error loading wishlist:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (productId: string) => {
        setRemovingIds(prev => new Set(prev).add(productId));
        try {
            const success = await removeFromWishlist(userId, productId);
            if (success) {
                setWishlistItems(prev => prev.filter(item => item.id !== productId));
            }
        } catch (error) {
            console.error('Error removing from wishlist:', error);
        } finally {
            setRemovingIds(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-1 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <span className="material-icons-outlined text-gray-700 dark:text-gray-300">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-lg font-black text-black dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <span className="material-icons text-price-red text-xl">favorite</span>
                        My Wishlist
                    </h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {wishlistItems.length} Saved Items
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pt-2 px-4 pb-24">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mb-3"></div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading your items...</p>
                    </div>
                ) : wishlistItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                        <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-6 border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <span className="material-icons text-4xl text-gray-300 dark:text-gray-600">favorite_border</span>
                        </div>
                        <h2 className="text-xl font-black text-black dark:text-white mb-2 uppercase tracking-tight">Wishlist is empty</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-[240px]">
                            Items you save will appear here. Start browsing and tap the heart icon!
                        </p>
                        <button
                            onClick={onBack}
                            className="mt-8 px-8 py-3 bg-primary text-white font-black rounded-full shadow-lg shadow-primary/20 uppercase tracking-widest text-sm active:scale-95 transition-all"
                        >
                            Start Shopping
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Wishlist Items Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-6 w-full">
                            {wishlistItems.map((product) => (
                                <div key={product.id} className="relative group w-full min-w-0">
                                    <ProductCard
                                        product={product}
                                        onProductClick={() => onProductClick(product)}
                                        onVisualSearch={onVisualSearch}
                                        showSellerLine={false}
                                    />
                                    {/* Remove from wishlist button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(product.id.toString());
                                        }}
                                        disabled={removingIds.has(product.id.toString())}
                                        className="absolute top-2 right-2 z-20 w-8 h-8 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center transition-all hover:bg-red-50 dark:hover:bg-red-900/40 active:scale-90"
                                    >
                                        <span className={`material-icons text-red-500 text-sm ${removingIds.has(product.id.toString()) ? 'animate-spin' : ''}`}>
                                            {removingIds.has(product.id.toString()) ? 'refresh' : 'close'}
                                        </span>
                                    </button>
                                    {/* Added date badge */}
                                    <div className="absolute top-2 left-2 z-20 pointer-events-none">
                                        <span className="bg-black/50 backdrop-blur-sm text-[7px] text-white px-1.5 py-0.5 rounded shadow-sm font-black uppercase tracking-widest">
                                            Saved {new Date(product.added_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* You might also like section */}
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="material-icons text-primary text-xl">favorite</span>
                                <h3 className="font-black text-base tracking-tight">You might also like</h3>
                            </div>

                            {inspiredLoading ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse aspect-[3/4]"></div>
                                    ))}
                                </div>
                            ) : inspiredProducts.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {inspiredProducts.map((p, idx) => (
                                        <ProductCard
                                            key={p.id ?? idx}
                                            product={p as Product}
                                            onProductClick={onProductClick}
                                            onVisualSearch={onVisualSearch}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-xs text-gray-400">
                                    Check back later for more recommendations
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
