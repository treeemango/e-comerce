import React, { useState, useEffect } from 'react';
import { Product, User } from '../types';
import TrendingVendorsSection from './TrendingVendorsSection';
import ProductCard from './ProductCard';
import { getFollowedStores, fetchRecentViews, fetchRelatedProducts, RecentViewProduct, RelatedProduct } from '../lib/api';
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

const AccountPageView: React.FC<AccountPageViewProps> = ({ pageTitle, onProductClick, user, onNavigate, onVisitStore, activeConversationId }) => {
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
            const related = await fetchRelatedProducts(String(data[0].id));
            const combined = [...related.same, ...related.similar].slice(0, 8);
            setInspiredProducts(combined);
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
                              <div className="flex justify-between text-xs text-gray-500 mb-3">
                                 <span>{store.follower_count?.toLocaleString()} followers</span>
                                 <span className="flex items-center gap-1"><span className="material-icons text-xs text-yellow-500">star</span> {store.rating?.toFixed(1)}</span>
                              </div>
                              <button
                                 onClick={() => onVisitStore?.(store.vendor_id)}
                                 className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                 Visit Store
                              </button>
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
         {/* Sidebar Navigation */}
         <div className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-24">
               <div className="mb-6 flex items-center gap-3 px-4">
                  <div className="w-10 h-10 rounded-full bg-[#8B735B] flex items-center justify-center text-white text-lg font-bold">
                     {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'K'}
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                     {user?.name || user?.email || 'Guest'}
                  </span>
               </div>
               <nav className="space-y-1">
                  {sidebarItems.map((item) => (
                     <button
                        key={item.label}
                        onClick={() => handleNavigation(item.label)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${item.label === pageTitle
                           ? 'bg-gray-100 dark:bg-gray-800 text-slate-900 dark:text-white'
                           : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
                           }`}
                     >
                        <span className="material-icons text-[20px] opacity-70 w-6 text-left">{item.icon}</span>
                        <span>{item.label}</span>
                     </button>
                  ))}
               </nav>
            </div>
         </div>

         {/* Main Content Area */}
         <div className="flex-1 min-w-0">
            {/* Breadcrumbs */}
            <div className="text-xs text-gray-500 mb-6 flex items-center gap-1">
               <span className="hover:underline cursor-pointer" onClick={() => handleNavigation('Followed stores')}>Home</span>
               <span className="material-icons text-[10px]">chevron_right</span>
               <span className="text-slate-900 dark:text-white font-medium">{pageTitle}</span>
            </div>

            {renderContent()}
         </div>
      </div>
   );
};

export default AccountPageView;