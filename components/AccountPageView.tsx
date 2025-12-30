import React, { useState, useEffect } from 'react';
import { Product, User } from '../types';
import TrendingVendorsSection from './TrendingVendorsSection';
import ProductCard from './ProductCard';
import { getFollowedStores, fetchRecentViews, fetchRelatedProducts, RecentViewProduct } from '../lib/api';
import { RelatedProduct } from '../types';
import { getCurrencySymbol } from '@/lib/currency';
import MessagesView from './MessagesView';
import BuyerCouponsView from './BuyerCouponsView';
import BuyerOrdersView from './BuyerOrdersView';
import BuyerReviewsView from './BuyerReviewsView';
import BuyerProfileView from './BuyerProfileView';
import BuyerNotificationsView from './BuyerNotificationsView';

interface AccountPageViewProps {
   pageTitle: string;
   onProductClick?: (product: Product) => void;
   user?: User | null;
   onNavigate?: (pageTitle: string) => void;
   onVisitStore?: (vendorId: string) => void;
   activeConversationId?: string | null;
   onAddToCart?: (product: Product, event?: React.MouseEvent | React.TouchEvent) => void;
}

interface FollowedVendor {
   vendor_id: string;
   business_name: string;
   shop_name?: string;
   logo_url?: string;
   rating?: number;
   review_count?: number;
   is_verified?: boolean;
   follower_count?: number;
   followed_at: string;
}

const AccountPageView: React.FC<AccountPageViewProps> = ({ pageTitle, onProductClick, user, onNavigate, onVisitStore, activeConversationId, onAddToCart }) => {
   const [followedStores, setFollowedStores] = useState<FollowedVendor[]>([]);
   const [loading, setLoading] = useState(true);
   const [recentViews, setRecentViews] = useState<RecentViewProduct[]>([]);
   const [inspiredProducts, setInspiredProducts] = useState<RelatedProduct[]>([]);

   const sidebarItems = [
      { icon: 'receipt_long', label: 'Your orders' },
      { icon: 'rate_review', label: 'Your reviews' },
      { icon: 'mail', label: 'Messages' },
      { icon: 'person_outline', label: 'Your profile' },
      { icon: 'confirmation_number', label: 'Coupon codes' },
      { icon: 'account_balance_wallet', label: 'Credit balance' },
      { icon: 'storefront', label: 'Followed stores' },
      { icon: 'history', label: 'Browsing history' },
      { icon: 'location_on', label: 'Addresses' },
      { icon: 'verified_user', label: 'Account security' },
      { icon: 'security', label: 'Permissions' },
      { icon: 'notifications_none', label: 'Notifications' },
   ];

   useEffect(() => {
      if (pageTitle === 'Followed stores' && user?.id) {
         loadFollowedStores();
      } else if (pageTitle === 'Browsing history' && user?.id) {
         loadBrowsingHistory();
      } else {
         setLoading(false);
      }
   }, [pageTitle, user]);

   const loadFollowedStores = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
         const result = await getFollowedStores(user.id, 50, 0);
         if (result?.success && result.data) {
            setFollowedStores(result.data);
         }
      } catch (error) {
         console.error('Error loading followed stores:', error);
      } finally {
         setLoading(false);
      }
   };

   const loadBrowsingHistory = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
         const data = await fetchRecentViews();
         setRecentViews(data);

         if (data.length > 0) {
            // Fetch related products for ALL browsing history items (up to 5)
            const allRelated: RelatedProduct[] = [];
            const seenIds = new Set<string>();

            // Add viewed product IDs to exclude them from results
            data.forEach(rv => seenIds.add(String(rv.id)));

            // Fetch similar products for each viewed item
            const itemsToCheck = data.slice(0, 5);

            for (const viewedProduct of itemsToCheck) {
               const related = await fetchRelatedProducts(String(viewedProduct.id));
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
         } else {
            setInspiredProducts([]);
         }
      } catch (error) {
         console.error('Error loading history:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleNavigation = (label: string) => {
      if (onNavigate) {
         onNavigate(label);
      }
   };

   const renderContent = () => {
      // 0. Messages Logic
      if (pageTitle === 'Messages') {
         if (!user) return <div>Please sign in to view messages.</div>;
         return (
            <MessagesView
               user={user}
               activeConversationId={activeConversationId}
            />
         );
      }

      if (pageTitle === 'Your profile') {
         return <BuyerProfileView user={user} />;
      }

      if (pageTitle === 'Your reviews') {
         return <BuyerReviewsView user={user} />;
      }

      if (pageTitle === 'Your orders') {
         return <BuyerOrdersView user={user} />;
      }

      if (pageTitle === 'Coupon codes') {
         return <BuyerCouponsView user={user} />;
      }

      if (pageTitle === 'Notifications') {
         return <BuyerNotificationsView user={user} />;
      }

      // 1. Followed Stores Logic
      if (pageTitle === 'Followed stores') {
         // Show loading
         if (loading) {
            return (
               <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
               </div>
            );
         }

         // Show Followed Stores if exist
         if (followedStores.length > 0) {
            return (
               <div className="space-y-8">
                  {/* Recommendation above user list */}
                  <TrendingVendorsSection userId={user?.id} limit={4} />

                  <div>
                     <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                        Your Followed Stores ({followedStores.length})
                     </h2>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {followedStores.map((store) => (
                           <div key={store.vendor_id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-orange-500 transition-all cursor-pointer">
                              <div className="flex items-center gap-3 mb-3">
                                 {store.logo_url ? (
                                    <img src={store.logo_url} alt={store.business_name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" />
                                 ) : (
                                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                       <span className="material-icons text-orange-500">storefront</span>
                                    </div>
                                 )}
                                 <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{store.business_name}</h3>
                                    {store.is_verified && <div className="text-blue-500 text-xs flex items-center gap-1"><span className="material-icons text-xs">verified</span> Verified</div>}
                                 </div>
                              </div>
                              <div className="flex justify-between items-center text-xs mb-3">
                                 <span className="text-gray-500">{store.follower_count?.toLocaleString()} followers</span>
                                 <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                                    <span className="material-icons text-[14px] text-slate-900 dark:text-slate-100">star</span>
                                    {store.rating?.toFixed(1) || '0.0'}
                                 </span>
                              </div>
                              <a
                                 href={`/?view=vendor-store&vendorId=${store.vendor_id}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors block text-center"
                              >
                                 Visit Store
                              </a>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            );
         }

         // Empty State -> Show Trending Vendors Fallback
         return (
            <div className="space-y-8">
               <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 text-center border border-dashed border-gray-300 dark:border-gray-700">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                     <span className="material-icons text-3xl text-gray-400">storefront</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No followed stores yet</h3>
                  <p className="text-gray-500 text-sm mb-0">Follow stores to get updates on new products and exclusive deals.</p>
               </div>

               {/* Fallback to Trending Vendors */}
               <TrendingVendorsSection userId={user?.id} limit={12} />
            </div>
         );
      }

      // 2. Browsing History Logic
      if (pageTitle === 'Browsing history') {
         return (
            <div className="space-y-10">
               <div>
                  <div className="flex items-center justify-between mb-4">
                     <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Browsing History</h2>
                     <p className="text-sm text-gray-500">Last 5 items you viewed</p>
                  </div>

                  {loading ? (
                     <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
                     </div>
                  ) : recentViews.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {recentViews.map(product => (
                           <ProductCard
                              key={product.id}
                              product={product}
                              onProductClick={onProductClick}
                              onAddToCart={onAddToCart}
                           />
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-12 text-gray-500">
                        <span className="material-icons text-4xl mb-2">history</span>
                        <p>No browsing history yet.</p>
                     </div>
                  )}
               </div>

               {inspiredProducts.length > 0 && (
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Inspired by your browsing</h3>
                        <span className="text-sm text-gray-500">Fresh picks based on what you viewed</span>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {inspiredProducts.map((item) => (
                           <ProductCard
                              key={`${item.id}-${item.relation_type}`}
                              product={item as Product}
                              onProductClick={onProductClick}
                              onAddToCart={onAddToCart}
                           />
                        ))}
                     </div>
                  </div>
               )}
            </div>
         );
      }

      // 3. Placeholder Logic for other sections
      return (
         <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
               <span className="material-icons text-4xl text-gray-400 dark:text-gray-500">
                  {sidebarItems.find(i => i.label === pageTitle)?.icon || 'construction'}
               </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{pageTitle}</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
               This section is under construction. Check back later for updates to your {pageTitle.toLowerCase()}.
            </p>
         </div>
      );
   };

   return (
      <div className="flex flex-col md:flex-row gap-8 max-w-screen-2xl mx-auto pb-12">
         {/* Premium Sidebar Navigation */}
         <div className="w-full md:w-72 flex-shrink-0">
            <div className="sticky top-24">
               {/* Profile Card */}
               <div className="mb-6 p-5 bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-primary/30">
                        {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'G'}
                     </div>
                     <div>
                        <span className="font-black text-slate-900 dark:text-white block">
                           {user?.name || user?.email || 'Guest'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Premium Member</span>
                     </div>
                  </div>
               </div>

               <nav className="space-y-1 bg-white dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                  {sidebarItems.map((item) => (
                     <button
                        key={item.label}
                        onClick={() => handleNavigation(item.label)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${item.label === pageTitle
                           ? 'bg-primary text-white shadow-md shadow-primary/20'
                           : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
                           }`}
                     >
                        <span className={`material-icons-round text-lg w-6 text-left ${item.label === pageTitle ? 'text-white' : 'opacity-70'}`}>{item.icon}</span>
                        <span className="font-bold">{item.label}</span>
                     </button>
                  ))}
               </nav>
            </div>
         </div>

         {/* Main Content Area */}
         <div className="flex-1 min-w-0">
            {/* Premium Breadcrumbs */}
            <div className="text-xs text-gray-500 mb-6 flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 px-4 py-2 rounded-xl w-fit">
               <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => handleNavigation('Followed stores')}>Home</span>
               <span className="material-icons-round text-[10px]">chevron_right</span>
               <span className="text-slate-900 dark:text-white font-black">{pageTitle}</span>
            </div>

            {renderContent()}
         </div>
      </div>
   );
};

export default AccountPageView;