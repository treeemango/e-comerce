import React, { useState, useEffect } from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { fetchRelatedProducts, RelatedProduct } from '@/lib/api';

interface SimilarItemsViewProps {
    product: Product;
    onClose: () => void;
    onProductClick: (product: Product) => void;
}

type TabType = 'same' | 'similar';
type SortOption = 'best_match' | 'popular' | 'price_low' | 'price_high';

const SimilarItemsView: React.FC<SimilarItemsViewProps> = ({
    product,
    onClose,
    onProductClick,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('same');
    const [sortBy, setSortBy] = useState<SortOption>('best_match');
    const [sameItems, setSameItems] = useState<RelatedProduct[]>([]);
    const [similarItems, setSimilarItems] = useState<RelatedProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const { same, similar } = await fetchRelatedProducts(product.id.toString());
                setSameItems(same);
                setSimilarItems(similar);

                if (same.length === 0 && similar.length > 0) {
                    setActiveTab('similar');
                }
            } catch (error) {
                console.error('Error fetching visual search results:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [product.id]);

    const getSortedProducts = (products: RelatedProduct[]) => {
        const sorted = [...products];
        switch (sortBy) {
            case 'best_match':
                return sorted.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
            case 'popular':
                return sorted.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
            case 'price_low':
                return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
            case 'price_high':
                return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
            default:
                return sorted;
        }
    };

    const displayedProducts = getSortedProducts(activeTab === 'same' ? sameItems : similarItems);

    return (
        <div className="fixed inset-0 z-[100] bg-background-light dark:bg-background-dark flex flex-col animate-in slide-in-from-right duration-300">
            {/* Modern Sticky Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-icons-outlined text-2xl">arrow_back</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <img src={product.image} alt="" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1 max-w-[150px]">
                            {product.title}
                        </h1>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <span className="material-icons">close</span>
                </button>
            </header>

            {/* Animated Tabs */}
            <div className="bg-white dark:bg-surface-dark px-4 pt-2">
                <div className="flex relative border-b border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => setActiveTab('same')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'same' ? 'text-primary' : 'text-gray-500'
                            }`}
                    >
                        Exact matches
                        <span className="ml-1 text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                            {sameItems.length}
                        </span>
                        {activeTab === 'same' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in duration-200" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('similar')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'similar' ? 'text-primary' : 'text-gray-500'
                            }`}
                    >
                        More like this
                        <span className="ml-1 text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                            {similarItems.length}
                        </span>
                        {activeTab === 'similar' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in duration-200" />
                        )}
                    </button>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="bg-white dark:bg-surface-dark px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800">
                <button
                    onClick={() => setSortBy('best_match')}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${sortBy === 'best_match'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                        }`}
                >
                    Best matches
                </button>
                <button
                    onClick={() => setSortBy('popular')}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${sortBy === 'popular'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                        }`}
                >
                    Popular
                </button>
                <div className="flex gap-1">
                    <button
                        onClick={() => setSortBy('price_low')}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${sortBy === 'price_low'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                            }`}
                    >
                        Price <span className="material-icons text-[10px] leading-none">arrow_upward</span>
                    </button>
                    <button
                        onClick={() => setSortBy('price_high')}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${sortBy === 'price_high'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                            }`}
                    >
                        Price <span className="material-icons text-[10px] leading-none">arrow_downward</span>
                    </button>
                </div>
            </div>

            {/* Results Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-background-dark">
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : displayedProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 pb-8">
                        {displayedProducts.map((p) => (
                            <ProductCard
                                key={p.id}
                                product={p as any}
                                onProductClick={onProductClick}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <span className="material-icons-outlined text-6xl mb-4 opacity-20">inventory_2</span>
                        <p className="text-base font-medium">No results found for this selection</p>
                        <button
                            onClick={onClose}
                            className="mt-4 text-primary font-bold text-sm"
                        >
                            Try another product
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimilarItemsView;
