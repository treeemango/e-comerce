import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { Product } from '../types';
import { fetchBestSellingProducts } from '../lib/api';

interface BestSellersViewProps {
   onProductClick: (product: Product) => void;
   products: Product[];
}

const BestSellersView: React.FC<BestSellersViewProps> = ({ onProductClick, products: initialProducts }) => {
   const [products, setProducts] = useState<Product[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

   useEffect(() => {
      const loadBestSellers = async () => {
         setIsLoading(true);
         try {
            const data = await fetchBestSellingProducts(selectedPeriod);
            setProducts(data);
         } catch (error) {
            console.error('Failed to load best sellers:', error);
            setProducts(initialProducts.slice(0, 20));
         } finally {
            setIsLoading(false);
         }
      };
      loadBestSellers();
   }, [selectedPeriod, initialProducts]);

   return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
         {/* Premium Header Section */}
         <div className="relative mb-10 overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-rose-500/20 mix-blend-overlay" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-400 ring-1 ring-orange-500/20">
                     <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
                     </span>
                     Live Rankings
                  </div>
                  <h1 className="text-4xl font-black tracking-tight text-white uppercase sm:text-5xl">
                     Best-Selling <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">Items</span>
                  </h1>
                  <p className="mt-3 max-w-xl text-lg font-medium text-slate-400">
                     Discover what's trending right now. Our most popular products, ranked by real-time sales and customer demand.
                  </p>
               </div>

               <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                  <button
                     onClick={() => setSelectedPeriod('week')}
                     className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${selectedPeriod === 'week'
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                  >
                     Weekly
                  </button>
                  <button
                     onClick={() => setSelectedPeriod('month')}
                     className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${selectedPeriod === 'month'
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                  >
                     Monthly
                  </button>
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
                     {products.map((product, idx) => (
                        <div key={product.id} className="relative group">
                           {/* Rank Badge */}
                           <div className="absolute -top-3 -left-3 z-30 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-black text-white shadow-xl ring-2 ring-white transition-transform group-hover:scale-110 dark:ring-slate-800">
                              #{idx + 1}
                           </div>
                           <ProductCard
                              product={product}
                              onProductClick={onProductClick}
                           />
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                     <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <span className="material-icons text-4xl text-slate-400">trending_up</span>
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white">No items found</h3>
                     <p className="mt-2 text-slate-500">We couldn't find any best-selling items for this period.</p>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default BestSellersView;
