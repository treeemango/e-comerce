import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '@/types';
import ProductCard from './ProductCard';
import { fetchRelatedProducts, RelatedProduct } from '../lib/api';

interface SimilarItemsModalProps {
  product: Product;
  onClose: () => void;
  onProductClick?: (product: Product) => void;
}

type SortOption = 'best_match' | 'popular' | 'price_low' | 'price_high';

const SimilarItemsModal: React.FC<SimilarItemsModalProps> = ({ product, onClose, onProductClick }) => {
  const [activeTab, setActiveTab] = useState<'same' | 'similar'>('same');
  const [sortBy, setSortBy] = useState<SortOption>('best_match');
  const [sameItems, setSameItems] = useState<RelatedProduct[]>([]);
  const [similarItems, setSimilarItems] = useState<RelatedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const loadRelatedProducts = async () => {
      setIsLoading(true);
      try {
        const { same, similar } = await fetchRelatedProducts(product.id.toString());
        setSameItems(same);
        setSimilarItems(similar);

        // Auto-switch tab if no same items but similar items exist
        if (same.length === 0 && similar.length > 0) {
          setActiveTab('similar');
        }
      } catch (error) {
        console.error('Error loading related products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (product?.id) {
      loadRelatedProducts();
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [product]);

  const getSortedProducts = (products: RelatedProduct[]) => {
    const sorted = [...products];
    switch (sortBy) {
      case 'best_match':
        return sorted.sort((a, b) => b.similarity_score - a.similarity_score);
      case 'popular':
        return sorted.sort((a, b) => b.reviews - a.reviews);
      case 'price_low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_high':
        return sorted.sort((a, b) => b.price - a.price);
      default:
        return sorted;
    }
  };

  const displayedProducts = getSortedProducts(activeTab === 'same' ? sameItems : similarItems);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative bg-gray-100 dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

        <header className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => setActiveTab('same')}
              className={`text-base font-medium transition-colors relative pb-1 ${activeTab === 'same'
                ? 'text-gray-900 dark:text-white font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              Exact matches
              {activeTab === 'same' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 dark:bg-white rounded-full"></span>
              )}
              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                {sameItems.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('similar')}
              className={`text-base font-medium transition-colors relative pb-1 ${activeTab === 'similar'
                ? 'text-gray-900 dark:text-white font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              More like this
              {activeTab === 'similar' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 dark:bg-white rounded-full"></span>
              )}
              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                {similarItems.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSortBy('best_match')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${sortBy === 'best_match'
                  ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                  }`}
              >
                Best matches
              </button>
              <button
                onClick={() => setSortBy('popular')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${sortBy === 'popular'
                  ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                  }`}
              >
                Popular
              </button>
              <button
                onClick={() => setSortBy(sortBy === 'price_low' ? 'price_high' : 'price_low')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-1 ${sortBy.startsWith('price')
                  ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                  }`}
              >
                Price
                {sortBy === 'price_low' && <span className="material-icons text-sm">arrow_upward</span>}
                {sortBy === 'price_high' && <span className="material-icons text-sm">arrow_downward</span>}
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="material-icons text-2xl">close</span>
            </button>
          </div>
        </header>

        <main className="flex-grow p-6 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : displayedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedProducts.map((prod) => {
                console.log(`[SimilarItemsModal] Rendering product ${prod.id}. Vendor:`, prod.vendor);
                return (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onProductClick={(p) => {
                      onClose();
                      onProductClick?.(p);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <span className="material-icons text-6xl mb-4">image_search</span>
              <p className="text-lg">No {activeTab} items found.</p>
            </div>
          )}
        </main>
      </div>
    </div>,
    document.body
  );
};

export default SimilarItemsModal;
