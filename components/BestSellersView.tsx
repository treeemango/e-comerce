import React, { useState, useEffect, useCallback } from 'react';
import { PRODUCTS } from '../constants';
import ProductCard from './ProductCard';
import { Product } from '../types';
import { fetchBestSellingItems, fetchRecommendedItems } from '../lib/api';
import { getCurrencySymbol } from '@/lib/currency';

interface BestSellersViewProps {
   onProductClick: (product: Product) => void;
   products: Product[];
   cartItems: Product[];
   onCartClick: () => void;
}

const BestSellersView: React.FC<BestSellersViewProps> = ({ onProductClick, products: initialProducts, cartItems, onCartClick }) => {
   const [products, setProducts] = useState<Product[]>(initialProducts);
   const [isLoading, setIsLoading] = useState(false);
   const [selectedPeriod, setSelectedPeriod] = useState('week');

   useEffect(() => {
      const loadBestSellers = async () => {
         setIsLoading(true);
         const data = await fetchBestSellingItems(selectedPeriod);
         setProducts(data.length > 0 ? data : initialProducts);
         setIsLoading(false);
      };
      loadBestSellers();
   }, [selectedPeriod, initialProducts]);

   const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
   const freeShippingThreshold = 50;
   const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
   const shippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

   return (
      <div className="container mx-auto px-4 py-6">
         {/* Header */}
         <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Best-Selling Items</h1>
            <div className="flex items-center gap-3">
               <button
                  onClick={() => setSelectedPeriod('week')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${selectedPeriod === 'week'
                     ? 'bg-primary text-white'
                     : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                     }`}
               >
                  <span>Week</span>
               </button>
               <button
                  onClick={() => setSelectedPeriod('month')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${selectedPeriod === 'month'
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                     }`}
               >
                  <span>Month</span>
               </button>
            </div>
         </div>

         <div className="flex flex-col lg:flex-row gap-6">

            {/* Product Grid */}
            <div className="flex-1">
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {isLoading ? (
                     <div className="col-span-full py-12 text-center text-slate-500">
                        Loading products...
                     </div>
                  ) : products.length > 0 ? (
                     products.map((product, idx) => (
                        <ProductCard
                           key={product.id}
                           product={product}
                           ranking={product.saleRank || idx + 1}
                           showLocalBadge={true}
                           onProductClick={onProductClick}
                        />
                     ))
                  ) : (
                     <div className="col-span-full py-12 text-center text-slate-500">
                        No products found for this period.
                     </div>
                  )}
               </div>
            </div>

            {/* Right Sidebar - Sticky Cart/Checkout */}
            <div className="w-full lg:w-80 flex-shrink-0">
               <div className="sticky top-24 space-y-4">

                  {/* Checkout Card */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                     <div className="bg-shop-red text-white text-center py-2 rounded mb-4 font-bold flex items-center justify-center gap-2">
                        <span className="material-icons text-sm">shopping_cart</span> Subtotal
                     </div>

                     <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">{getCurrencySymbol(cartItems[0]?.currency)}{subtotal.toFixed(2)}</div>
                     </div>

                     <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded mb-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-green-700 dark:text-green-400 mb-1">
                           <span className="material-icons text-sm">check</span> Free shipping
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                           <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${shippingProgress}%` }}></div>
                        </div>
                        {remainingForFreeShipping > 0 && (
                           <div className="text-xs text-orange-600 mt-1 text-center">
                              Add {getCurrencySymbol(cartItems[0]?.currency)}{remainingForFreeShipping.toFixed(2)} for free shipping
                           </div>
                        )}
                     </div>

                     {subtotal >= 10 ? (
                        <button
                           onClick={onCartClick}
                           className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-full mb-3 transition-colors shadow-lg shadow-orange-500/30"
                        >
                           Checkout
                        </button>
                     ) : (
                        <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-full mb-3 transition-colors shadow-lg shadow-orange-500/30 opacity-50 cursor-not-allowed">
                           £10.00 Min. to checkout
                        </button>
                     )}

                     <button
                        onClick={onCartClick}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                     >
                        Go to cart
                     </button>
                  </div>

                  {/* Selection Card (Mini Cart Items) */}
                  {cartItems.length > 0 && (
                     <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                           <div className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800 dark:text-white">
                              <span className="material-icons text-slate-900 dark:text-white">check_circle</span> Select all ({cartItems.length})
                           </div>
                           <span className="material-icons text-slate-400 text-sm">arrow_drop_up</span>
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                           {cartItems.map((item, idx) => (
                              <div key={`${item.id}-${idx}`} className="flex items-center gap-3">
                                 <span className="material-icons text-slate-900 dark:text-white text-sm">check_circle</span>
                                 <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <h4 className="text-xs text-gray-700 dark:text-gray-300 truncate mb-0.5">{item.title}</h4>
                                    <div className="flex items-baseline gap-1">
                                       <span className="text-orange-500 font-bold text-sm">{getCurrencySymbol(item.currency)}{item.price.toFixed(2)}</span>
                                    </div>
                                    <div className="text-xs text-gray-400">Qty: 1</div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

               </div>
            </div>

         </div>
      </div>
   );
};

export default BestSellersView;
