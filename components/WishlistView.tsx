import React, { useState, useEffect } from 'react';
import { Product, User, RelatedProduct } from '../types';
import { getWishlist, removeFromWishlist, WishlistProduct, fetchRelatedProducts } from '../lib/api';
import ProductCard from './ProductCard';

interface WishlistViewProps {
    user: User;
    onBack: () => void;
    onProductClick: (product: Product) => void;
    onAddToCart?: (product: Product) => void;
}

const WishlistView: React.FC<WishlistViewProps> = ({
    user,
    onBack,
    onProductClick,
    onAddToCart
}) => {
    const [wishlistItems, setWishlistItems] = useState<WishlistProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
    const [inspiredProducts, setInspiredProducts] = useState<RelatedProduct[]>([]);
    const [inspiredLoading, setInspiredLoading] = useState(false);

    useEffect(() => {
        loadWishlist();
    }, [user.id]);

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

                    setInspiredProducts(allRelated.slice(0, 12));
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
            const items = await getWishlist(user.id);
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
            const success = await removeFromWishlist(user.id, productId);
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

    const handleAddToCart = (product: Product) => {
        if (onAddToCart) {
            onAddToCart(product);
        }
    };

    return (
        <div className="py-2">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Go back"
                    >
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase">
                            <span className="material-icons text-shop-red">favorite</span>
                            My Wishlist
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Saved for later • <span className="font-bold text-slate-700 dark:text-slate-200">{wishlistItems.length}</span> items
                        </p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                    <p className="mt-4 text-slate-500 dark:text-slate-400">Loading your wishlist...</p>
                </div>
            ) : wishlistItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                        <span className="material-icons text-5xl text-slate-300 dark:text-slate-600">favorite_border</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your wishlist is empty</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
                        Items you save will appear here. Start browsing and tap the heart icon on products you love!
                    </p>
                    <button
                        onClick={onBack}
                        className="px-8 py-3 bg-shop-red hover:bg-red-600 text-white font-bold rounded-full transition-colors shadow-lg"
                    >
                        Start Shopping
                    </button>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Wishlist Items Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
                        {wishlistItems.map((product) => (
                            <div key={product.id} className="relative group">
                                <ProductCard
                                    product={product}
                                    onProductClick={() => onProductClick(product)}
                                    showVendorMeta={false}
                                />
                                {/* Remove from wishlist button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(product.id.toString());
                                    }}
                                    disabled={removingIds.has(product.id.toString())}
                                    className="absolute top-2 right-2 z-20 w-8 h-8 bg-white/95 dark:bg-slate-800/95 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/40 hover:scale-110 active:scale-95"
                                    title="Remove from wishlist"
                                >
                                    <span className={`material-icons text-red-500 text-lg ${removingIds.has(product.id.toString()) ? 'animate-pulse' : ''}`}>
                                        close
                                    </span>
                                </button>
                                {/* Added date badge */}
                                <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <span className="bg-black/60 backdrop-blur-sm text-[8px] text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold shadow-sm">
                                        Saved {new Date(product.added_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* You might also like section */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-icons text-primary text-2xl">favorite</span>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">You might also like</h2>
                        </div>

                        {inspiredLoading ? (
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse aspect-[3/4]"></div>
                                ))}
                            </div>
                        ) : inspiredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
                                {inspiredProducts.map((product, idx) => (
                                    <ProductCard
                                        key={product.id ?? idx}
                                        product={product as Product}
                                        onProductClick={onProductClick}
                                        onAddToCart={onAddToCart}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                Check back later for more recommendations
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WishlistView;
