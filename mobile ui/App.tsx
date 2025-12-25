import React, { useCallback, useEffect, useState } from 'react';
import './mobile.css';
import { Header } from './components/Header';
import { TopAppBanner } from './components/TopAppBanner';
import { CategoryNav } from './components/CategoryNav';
import { SubcategoryCarousel } from './components/SubcategoryCarousel';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { CategoryView } from './components/CategoryView';
import { CategoriesPage } from './components/CategoriesPage';
import { SearchOverlay } from './components/SearchOverlay';
import { SearchResults } from './components/SearchResults';
import { AccountOverlay } from './components/AccountOverlay';
import { CartView } from './components/CartView';
import { MobileDealsPage } from './components/MobileDealsPage'; // Import new page
import { BestSellersScreen } from './components/BestSellersScreen';
import { TopRatedScreen } from './components/TopRatedScreen';
import { CheckoutSheet } from './components/CheckoutSheet';
import { OrderSuccessSheet } from './components/OrderSuccessSheet';
import { ProductDetails } from './components/ProductDetails';
import SimilarItemsView from './components/SimilarItemsView';
import { AccountSection } from './components/AccountSection';
import { SellerAccess } from './components/SellerAccess';
import { SellerDashboard } from './components/SellerDashboard';
import { DriverAccess } from './components/DriverAccess';
import { DriverDashboard } from './components/DriverDashboard';
import { DriverOnboardingView } from './components/DriverOnboardingView';
import { BuyerMessagesView } from './components/BuyerMessagesView';
import { WishlistView } from './components/WishlistView';
import { FollowedStoresView } from './components/FollowedStoresView';
import { SellerOnboardingView } from './components/SellerOnboardingView';
import { ProductCard } from './components/ProductCard';
import { VendorProfileView } from './components/VendorProfileView';
import { fetchProducts, fetchNavbarCategories, NavbarCategory, getSellerUnreadCount, fetchRecentViews, createConversation, fetchBuyerOrders, confirmOrderReceiptBuyer, getOrderQRCodeURL, raiseDeliveryDispute } from '@/lib/api';
import { Product } from '@/types';
import { getCurrentUser, getUserProfile, signOut, AuthUser, signInWithGoogle } from '@/lib/auth';
import { MobileNotificationWrapper } from './components/MobileNotificationWrapper';
import { UserCoupon, BuyerOrder } from '@/types';
import { formatPrice } from '@/lib/currency';
import { useNotifications } from '@/components/NotificationContext';
import NotificationSystem from '@/components/NotificationSystem';
import NotificationInbox from '@/components/NotificationInbox';
import { WriteReviewModal } from '@/components/WriteReviewModal';
import MobileWriteReviewSheet from './components/MobileWriteReviewSheet';
import VisualSearchSheet from './components/VisualSearchSheet';

type AccountSectionKey = 'orders' | 'coupons' | 'credit' | 'reviews' | 'wishlist' | 'stores' | 'history' | 'addresses' | 'support' | 'settings' | 'switch' | 'logout' | 'messages' | 'driver_access' | 'notifications';

type CartItem = {
    product: Product;
    quantity: number;
    variant_id?: string;
};

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>('home');
    const [products, setProducts] = useState<Product[]>([]);
    const [recentViews, setRecentViews] = useState<Product[]>([]);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [categories, setCategories] = useState<NavbarCategory[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<AuthUser | null>(null);
    const [activeAccountSection, setActiveAccountSection] = useState<AccountSectionKey | null>(null);
    const [sellerView, setSellerView] = useState<'guest' | 'dashboard'>('guest');
    const [driverView, setDriverView] = useState<'guest' | 'dashboard'>('guest');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [selectedCategoryForSubs, setSelectedCategoryForSubs] = useState<{ id: string; name: string } | null>(null);
    const [activeSubcategoryId, setActiveSubcategoryId] = useState<string>('all');
    const [categoryViewOpen, setCategoryViewOpen] = useState<{ departmentId: string; departmentName: string } | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [buyerMessageCount, setBuyerMessageCount] = useState(0);
    const [onboardingType, setOnboardingType] = useState<'seller' | 'driver' | null>(null);
    const [isOrderSuccessOpen, setIsOrderSuccessOpen] = useState(false);
    const [visualSearchProduct, setVisualSearchProduct] = useState<Product | null>(null);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [reviewingProductId, setReviewingProductId] = useState<string | null>(null);
    const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
    const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
    const [showQRCodeOrderId, setShowQRCodeOrderId] = useState<string | null>(null);
    const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
    const [disputingOrderId, setDisputingOrderId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

    // Modern Notification & Data Sync State
    const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
    const [recentOrders, setRecentOrders] = useState<BuyerOrder[]>([]);
    const { history } = useNotifications();

    const refreshUserProfile = useCallback(async () => {
        const user = await getCurrentUser();
        if (user?.id) {
            const profile = await getUserProfile(user.id);
            setUserProfile(profile || {
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.name,
                avatar_url: user.user_metadata?.avatar_url,
                role: user.user_metadata?.role,
            });
        } else {
            setUserProfile(null);
        }
    }, []);

    React.useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [fetchedProducts, fetchedCategories] = await Promise.all([
                    fetchProducts(),
                    fetchNavbarCategories()
                ]);
                setProducts(fetchedProducts);
                setCartItems([]);
                setCategories(fetchedCategories);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const loadRecentViews = async () => {
            if (userProfile?.id) {
                const data = await fetchRecentViews(userProfile.id);
                setRecentViews(data);
            }
        };
        loadRecentViews();
    }, [userProfile?.id]);

    // Load buyer orders - Moved to MobileNotificationWrapper for background sync

    useEffect(() => {
        refreshUserProfile();
    }, [refreshUserProfile]);

    useEffect(() => {
        const role = userProfile?.role?.toString?.().toLowerCase?.();

        // Handle seller roles
        const sellerRoles = ['seller', 'vendor', 'admin', 'staff'];
        setSellerView(role && sellerRoles.includes(role) ? 'dashboard' : 'guest');

        // Handle driver roles
        const driverRoles = ['driver', 'delivery_partner'];
        setDriverView(role && driverRoles.includes(role) ? 'dashboard' : 'guest');

        if (userProfile?.id) {
            getSellerUnreadCount(userProfile.id).then(setBuyerMessageCount);
        }
    }, [userProfile]);

    useEffect(() => {
        const onPopState = (event: PopStateEvent) => {
            const view = (event.state as any)?.view;
            if (selectedProduct) {
                setSelectedProduct(null);
                return;
            }
            if (isSearchOpen) {
                setIsSearchOpen(false);
                setSearchQuery(null);
                return;
            }
            if (isAccountOpen) {
                setIsAccountOpen(false);
                return;
            }
            if (onboardingType) {
                setOnboardingType(null);
                return;
            }
            if (isOrderSuccessOpen) {
                setIsOrderSuccessOpen(false);
                return;
            }
            if (typeof view === 'string') {
                setActiveTab(view);
            }
        };

        window.addEventListener('popstate', onPopState);
        window.history.replaceState({ view: activeTab }, '', window.location.href);
        return () => window.removeEventListener('popstate', onPopState);
    }, [activeTab, isAccountOpen, isSearchOpen, onboardingType, selectedProduct]);

    const handleConfirmReceipt = async (orderId: string) => {
        if (!window.confirm('Are you sure you have received your parcel? This will release funds to the seller.')) return;

        setConfirmingOrderId(orderId);
        try {
            const res = await confirmOrderReceiptBuyer(orderId);
            if (res.success) {
                // Refresh data immediately
                refreshUserProfile();
                if (userProfile?.id) {
                    const updatedOrders = await fetchBuyerOrders(userProfile.id);
                    setRecentOrders(updatedOrders);
                }
            } else {
                alert(res.message || 'Failed to confirm receipt.');
            }
        } catch (err) {
            console.error('Error confirming receipt:', err);
            alert('An error occurred.');
        } finally {
            setConfirmingOrderId(null);
        }
    };

    const handleRaiseDispute = async () => {
        if (!disputingOrderId) return;
        if (!disputeReason.trim()) {
            alert('Please provide a reason for the dispute.');
            return;
        }

        setIsSubmittingDispute(true);
        try {
            const res = await raiseDeliveryDispute(disputingOrderId, disputeReason);
            if (res.success) {
                alert('Dispute raised successfully. Escrow funds have been frozen while we investigate.');
                setDisputingOrderId(null);
                setDisputeReason('');
                refreshUserProfile();
            } else {
                alert(res.message || 'Failed to raise dispute.');
            }
        } catch (err) {
            console.error('Error raising dispute:', err);
            alert('An error occurred.');
        } finally {
            setIsSubmittingDispute(false);
        }
    };


    const renderAccountSection = (key: AccountSectionKey) => {
        switch (key) {
            case 'orders': {
                return (
                    <AccountSection title="Your orders" description="Track and manage your recent purchases" onBack={() => setActiveAccountSection(null)}>
                        <div className="flex flex-col gap-3">
                            {recentOrders.length > 0 ? (
                                recentOrders.map((order, idx) => {
                                    const shippedDate = order.shipped_at ? new Date(order.shipped_at) : null;
                                    const diffDays = shippedDate ? (new Date().getTime() - shippedDate.getTime()) / (1000 * 3600 * 24) : 0;
                                    const canDispute = order.status === 'shipped' && diffDays >= 5;

                                    return (
                                        <div key={order.id || idx} className="flex gap-3 p-3 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                                            <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                                                {order.items?.[0]?.image_url ? (
                                                    <img src={order.items[0].image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                                                        <span className="material-icons text-gray-400">inventory_2</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div className="text-sm font-semibold text-black dark:text-white truncate">Order #{order.id.slice(0, 8)}</div>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                        order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {order.status?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                                    {order.items?.[0]?.product_title || 'Order items'}
                                                    {order.items && order.items.length > 1 && ` +${order.items.length - 1} more`}
                                                </div>
                                                <div className="flex justify-between items-end mt-1">
                                                    <div className="text-sm font-bold text-price-red">
                                                        {formatPrice(order.total_amount, order.currency || 'USD')}
                                                    </div>
                                                    {order.status === 'delivered' && (
                                                        <button
                                                            onClick={() => {
                                                                console.log('Review Clicked:', { orderId: order.id, items: order.items });
                                                                const pid = order.items?.[0]?.product_id;
                                                                console.log('Target Product ID:', pid);
                                                                if (!pid) alert('Error: Product ID missing from order item. ' + JSON.stringify(order.items?.[0] || {}));
                                                                setReviewingProductId(pid || null);
                                                                setReviewingOrderId(order.id);
                                                            }}
                                                            className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-orange-100"
                                                        >
                                                            {order.items && order.items.length > 1 ? 'Review Items' : 'Review'}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Confirm Delivery button for ALL shipped orders */}
                                                {order.status === 'shipped' && !(order.fulfillment_type === 'local_parcel' || order.shipping_method === 'local_parcel') && (
                                                    <div className="mt-4 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 overflow-hidden shadow-lg p-4">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                                                                <span className="material-icons text-white text-lg">local_shipping</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-emerald-800 dark:text-emerald-200 font-bold text-sm">Order Shipped</p>
                                                                <p className="text-emerald-600 dark:text-emerald-400 text-[10px]">Confirm when you receive your package</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleConfirmReceipt(order.id)}
                                                            disabled={confirmingOrderId === order.id}
                                                            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
                                                        >
                                                            {confirmingOrderId === order.id ? 'Confirming...' : '✓ I Have Received My Order'}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Local parcel collection section with OTP */}
                                                {(order.fulfillment_type === 'local_parcel' || order.shipping_method === 'local_parcel') && order.status === 'shipped' && (
                                                    <div className="mt-4 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-yellow-900/20 rounded-2xl border border-orange-200 dark:border-orange-800 overflow-hidden shadow-lg">
                                                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                                                <span className="material-icons text-white text-lg">directions_bus</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-bold text-xs">📦 Parcel Ready for Collection</p>
                                                                <p className="text-orange-100 text-[10px]">Show the OTP code to collect</p>
                                                            </div>
                                                        </div>

                                                        <div className="p-4 space-y-3">
                                                            <div className="bg-white dark:bg-black/20 rounded-xl p-4 border-2 border-dashed border-orange-200 dark:border-orange-700 text-center">
                                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                                                                    Collection Code (OTP)
                                                                </p>
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    {(order.delivery_otp || '----').split('').map((digit, i) => (
                                                                        <span key={i} className="w-11 h-12 bg-gradient-to-b from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-center text-2xl font-black shadow-lg shadow-orange-500/30">
                                                                            {digit}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-2">
                                                                    🔐 Share only with parcel agent
                                                                </p>
                                                            </div>

                                                            {showQRCodeOrderId === order.id ? (
                                                                <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                                                                    <div className="p-2 bg-white rounded-xl border border-orange-100 shadow-xl mb-2">
                                                                        <img
                                                                            src={getOrderQRCodeURL(order.delivery_otp) || ''}
                                                                            alt="Collection QR Code"
                                                                            className="w-40 h-40"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setShowQRCodeOrderId(null)}
                                                                        className="text-orange-600 font-bold text-[10px] uppercase tracking-widest"
                                                                    >
                                                                        Hide QR Code
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-2">
                                                                    <button
                                                                        onClick={() => handleConfirmReceipt(order.id)}
                                                                        disabled={confirmingOrderId === order.id}
                                                                        className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-orange-600/30 active:scale-95 transition-all"
                                                                    >
                                                                        {confirmingOrderId === order.id ? 'Confirming...' : 'I Have Received My Parcel'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setShowQRCodeOrderId(order.id)}
                                                                        className="w-full py-3 bg-white border border-orange-500 text-orange-600 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
                                                                    >
                                                                        Show Collection QR
                                                                    </button>
                                                                </div>
                                                            )}

                                                            <div className="space-y-2">
                                                                <div className="bg-white dark:bg-black/20 rounded-lg p-3 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="material-icons text-gray-400 text-sm">local_shipping</span>
                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Service</span>
                                                                    </div>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                                                                        {order.parcel_details?.company || order.carrier || 'Standard Parcel'}
                                                                    </p>
                                                                </div>
                                                                <div className="bg-white dark:bg-black/20 rounded-lg p-3 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="material-icons text-gray-400 text-sm">location_on</span>
                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Pickup</span>
                                                                    </div>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white text-right max-w-[50%]">
                                                                        {order.parcel_details?.collection_point || order.shipping_additional_info || 'Contact carrier'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {canDispute && (
                                                    <button
                                                        onClick={() => setDisputingOrderId(order.id)}
                                                        className="mt-3 w-full py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-rose-100 shadow-sm active:scale-95 transition-all text-center"
                                                    >
                                                        Dispute: Not Received
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center bg-white dark:bg-surface-dark rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                    <span className="material-icons text-gray-300 text-4xl mb-2">local_shipping</span>
                                    <p className="text-sm text-gray-500">No recent orders found</p>
                                </div>
                            )}

                            {disputingOrderId && (
                                <div className="fixed inset-0 z-[110] flex items-end justify-center">
                                    <div className="absolute inset-0 bg-black/60" onClick={() => setDisputingOrderId(null)} />
                                    <div className="relative w-full bg-white dark:bg-surface-dark rounded-t-[2rem] p-8 animate-in slide-in-from-bottom duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />
                                        <h2 className="text-xl font-black text-black dark:text-white mb-2 tracking-tight">Raise a Dispute</h2>
                                        <p className="text-sm text-gray-500 mb-6 font-medium">Tell us why you're disputing this delivery. Escrow funds will be frozen during investigation.</p>

                                        <textarea
                                            value={disputeReason}
                                            onChange={(e) => setDisputeReason(e.target.value)}
                                            placeholder="e.g. It's been 5 days and I still haven't received my items..."
                                            className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 min-h-[120px] mb-6 dark:text-white"
                                        />

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setDisputingOrderId(null)}
                                                className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleRaiseDispute}
                                                disabled={isSubmittingDispute}
                                                className="flex-1 py-4 bg-price-red text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-price-red/30 active:scale-95 transition-all"
                                            >
                                                {isSubmittingDispute ? 'Submitting...' : 'Submit Dispute'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </AccountSection>
                );
            }
            case 'coupons': {
                return (
                    <AccountSection title="Coupons" description="View and apply your coupons" onBack={() => setActiveAccountSection(null)}>
                        <div className="flex flex-col gap-3">
                            {userCoupons.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {userCoupons.map((userCoupon, idx) => (
                                        <div key={userCoupon.id || idx} className="relative overflow-hidden group">
                                            <div className="flex bg-gradient-to-br from-orange-500 to-primary text-white rounded-2xl shadow-lg border border-primary/20">
                                                <div className="flex-1 p-4 border-r border-dashed border-white/30">
                                                    <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">{userCoupon.coupon.name}</div>
                                                    <div className="text-2xl font-black mt-1">
                                                        {userCoupon.coupon.discount_percentage
                                                            ? `${userCoupon.coupon.discount_percentage}% OFF`
                                                            : formatPrice(userCoupon.coupon.discount_amount || 0, 'USD') + ' OFF'
                                                        }
                                                    </div>
                                                    <div className="text-[10px] mt-2 bg-white/20 inline-block px-1.5 py-0.5 rounded backdrop-blur-sm">
                                                        Code: {userCoupon.coupon.code}
                                                    </div>
                                                </div>
                                                <div className="w-20 flex flex-col items-center justify-center p-2 bg-black/5 hover:bg-black/10 transition">
                                                    <span className="material-icons text-xl mb-1">qr_code_2</span>
                                                    <div className="text-[9px] font-bold uppercase">U%SAME%</div>
                                                </div>
                                            </div>
                                            {/* Decorative punch holes */}
                                            <div className="absolute top-1/2 -left-2 w-4 h-4 rounded-full bg-background-light dark:bg-background-dark -translate-y-1/2"></div>
                                            <div className="absolute top-1/2 -right-2 w-4 h-4 rounded-full bg-background-light dark:bg-background-dark -translate-y-1/2"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 bg-white dark:bg-surface-dark text-center">
                                    <span className="material-icons text-gray-300 text-4xl mb-2">confirmation_number</span>
                                    <p className="text-sm text-gray-500">No coupons yet. Check deals and promotions to earn rewards.</p>
                                </div>
                            )}
                        </div>
                    </AccountSection>
                );
            }
            case 'credit': {
                return (
                    <AccountSection title="Credit balance" description="Your wallet overview" onBack={() => setActiveAccountSection(null)}>
                        <div className="rounded-2xl p-4 bg-black text-white shadow-md flex flex-col gap-2">
                            <div className="text-sm opacity-80">Available balance</div>
                            <div className="text-3xl font-black">$0.00</div>
                            <div className="flex gap-2">
                                <button className="flex-1 bg-white text-black rounded-full py-2 font-bold">Top up</button>
                                <button className="flex-1 border border-white/40 rounded-full py-2 font-bold">Withdraw</button>
                            </div>
                        </div>
                    </AccountSection>
                );
            }
            case 'reviews': {
                return (
                    <AccountSection title="Your reviews" description="Rate recent purchases" onBack={() => setActiveAccountSection(null)}>
                        <div className="flex flex-col gap-3">
                            {products.slice(0, 3).map((p, idx) => (
                                <div key={p.id ?? idx} className="flex gap-3 p-3 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                        <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-black dark:text-white line-clamp-2">{p.title}</div>
                                        <button className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary">Write a review</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AccountSection>
                );
            }
            case 'wishlist': {
                if (!userProfile?.id) return null;
                return (
                    <WishlistView
                        userId={userProfile.id}
                        onBack={() => setActiveAccountSection(null)}
                        onProductClick={handleProductClick}
                        onAddToCart={addToCart}
                        onVisualSearch={setVisualSearchProduct}
                    />
                );
            }
            case 'stores': {
                if (!userProfile?.id) return null;
                return (
                    <FollowedStoresView
                        userId={userProfile.id}
                        onBack={() => setActiveAccountSection(null)}
                        onVisitStore={(vendorId) => {
                            setSelectedVendorId(vendorId);
                            setActiveAccountSection(null);
                        }}
                    />
                );
            }
            case 'history': {
                return (
                    <AccountSection title="Browsing history" description="Recently viewed items" onBack={() => setActiveAccountSection(null)}>
                        {recentViews.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {recentViews.map((p, idx) => (
                                    <ProductCard
                                        key={p.id ?? idx}
                                        product={p}
                                        onProductClick={handleProductClick}
                                        onVisualSearch={setVisualSearchProduct}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-gray-800">
                                <span className="material-icons-outlined text-4xl text-gray-300 mb-2">history</span>
                                <div className="text-sm text-gray-500">Your browsing history is empty. Start shopping to see items here!</div>
                            </div>
                        )}
                    </AccountSection>
                );
            }
            case 'addresses': {
                return (
                    <AccountSection title="Addresses" description="Delivery locations" onBack={() => setActiveAccountSection(null)}>
                        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 bg-white dark:bg-surface-dark text-center text-sm text-gray-600 dark:text-gray-300">
                            No addresses yet.
                            <div>
                                <button className="mt-3 px-4 py-2 bg-primary text-white rounded-full font-bold">Add address</button>
                            </div>
                        </div>
                    </AccountSection>
                );
            }
            case 'support': {
                return (
                    <AccountSection title="Customer support" description="We are here to help" onBack={() => setActiveAccountSection(null)}>
                        <div className="flex flex-col gap-3">
                            <button className="w-full px-4 py-3 rounded-xl bg-primary text-white font-bold shadow-md">Start chat</button>
                            <button className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 font-bold text-black dark:text-white">Call support</button>
                            <div className="text-xs text-gray-500">Average response time: &lt; 5 minutes</div>
                        </div>
                    </AccountSection>
                );
            }
            case 'settings': {
                return (
                    <AccountSection title="Settings" description="Personalize your experience" onBack={() => setActiveAccountSection(null)}>
                        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800">
                            {[
                                'Notifications',
                                'Language',
                                'Currency',
                                'Privacy',
                            ].map((label) => (
                                <button key={label} className="w-full text-left px-4 py-3 text-sm font-semibold text-black dark:text-white flex items-center justify-between">
                                    {label}
                                    <span className="material-icons-outlined text-gray-400">chevron_right</span>
                                </button>
                            ))}
                        </div>
                    </AccountSection>
                );
            }
            case 'switch': {
                return (
                    <AccountSection title="Switch accounts" description="Change or add another account" onBack={() => setActiveAccountSection(null)}>
                        <div className="flex flex-col gap-3">
                            <button className="w-full px-4 py-3 rounded-full bg-black text-white font-bold">Add account</button>
                            <button className="w-full px-4 py-3 rounded-full border border-gray-300 dark:border-gray-700 font-bold text-black dark:text-white">Continue as guest</button>
                        </div>
                    </AccountSection>
                );
            }
            case 'driver_access': {
                return (
                    <DriverAccess
                        onLogin={handleDriverAuth}
                        onSignup={() => setOnboardingType('driver')}
                        onBackToShop={() => setActiveAccountSection(null)}
                    />
                );
            }
            case 'messages': {
                if (!userProfile?.id) return null;
                return (
                    <BuyerMessagesView
                        userId={userProfile.id}
                        onBack={() => {
                            setActiveAccountSection(null);
                            // Refresh count when coming back
                            getSellerUnreadCount(userProfile.id).then(setBuyerMessageCount);
                        }}
                    />
                );
            }
            case 'notifications': {
                return (
                    <AccountSection
                        title="Notifications"
                        description="Your activity and alerts"
                        onBack={() => setActiveAccountSection(null)}
                        accent="bg-blue-500/10 text-blue-500"
                    >
                        <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 h-[60vh]">
                            <NotificationInbox compact />
                        </div>
                    </AccountSection>
                );
            }
            default:
                return null;
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setIsSearchOpen(false);
        setActiveTab('search_results');
    };

    const handleBackFromSearch = () => {
        setSearchQuery(null);
        setActiveTab('home');
    };

    const addToCart = (product: Product, quantity: number = 1) => {
        setCartItems((prev) => {
            const variant_id = product.variant_id;
            const existingIndex = prev.findIndex((item) =>
                item.product.id === product.id && item.variant_id === variant_id
            );

            if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + quantity };
                return next;
            }
            return [...prev, { product, quantity, variant_id }];
        });
    };

    const updateCartQuantity = (productId: string | number | undefined, quantity: number, variantId?: string) => {
        setCartItems((prev) => prev
            .map((item) =>
                (item.product.id === productId && item.variant_id === variantId)
                    ? { ...item, quantity: Math.max(1, quantity) }
                    : item
            )
            .filter((item) => item.quantity > 0));
    };

    const removeFromCart = (productId: string | number | undefined, variantId?: string) => {
        setCartItems((prev) => prev.filter((item) =>
            !(item.product.id === productId && item.variant_id === variantId)
        ));
    };

    const openCheckout = () => setIsCheckoutOpen(true);
    const closeCheckout = () => setIsCheckoutOpen(false);

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
    };

    const handleNavigateToCategories = (departmentId: string) => {
        setSelectedDepartmentId(departmentId);
        setActiveTab('categories');
        window.history.pushState({ view: 'categories', department: departmentId }, '', window.location.href);
    };

    const handleCategoryClick = (categoryId: string, categoryName: string) => {
        // Open category results in a new overlay page
        setCategoryViewOpen({ departmentId: categoryId, departmentName: categoryName });
        setSelectedCategoryForSubs({ id: categoryId, name: categoryName });
        setActiveSubcategoryId('all');
    };

    const handleSelectSubcategory = (subcategoryId: string) => {
        setActiveSubcategoryId(subcategoryId);
    };

    const filteredProducts = products.filter(p => {
        // First filter by main category (navbar)
        if (activeCategoryId !== 'all' && activeCategoryId !== '' && p.categoryId !== activeCategoryId) {
            return false;
        }

        // Then filter by subcategory if selected
        if (selectedCategoryForSubs && activeSubcategoryId !== 'all' && activeSubcategoryId !== '') {
            // Logic: if subcategory is selected, p.categoryId must match subcategoryId
            // Note: In our SQL logic, products belong to subcategories (which have parent categories)
            // So we just check if product's categoryId matches the selected subcategory ID
            return p.categoryId === activeSubcategoryId;
        }

        return true;
    });

    const handleCategorySelect = (categoryId: string) => {
        setActiveCategoryId(categoryId);
        setActiveTab('home'); // Go back to home with filtered products
        window.history.pushState({ view: 'home', category: categoryId }, '', window.location.href);
    };

    const handlePlaceOrder = () => {
        setCartItems([]);
        closeCheckout();
        setActiveTab('home');
        // Optional: show success toast
    };


    const handleSellerAuth = async () => {
        await signInWithGoogle({ view: 'seller-auth' });
        await refreshUserProfile();
        setSellerView('dashboard');
    };

    const handleSellerSignOut = async () => {
        await signOut();
        setUserProfile(null);
        setSellerView('guest');
        setActiveTab('home');
    };

    const handleDriverAuth = async () => {
        await signInWithGoogle({ view: 'driver-auth' });
        await refreshUserProfile();
        setDriverView('dashboard');
    };

    const handleDriverSignOut = async () => {
        await signOut();
        setUserProfile(null);
        setDriverView('guest');
        setActiveTab('home');
    };

    const handleMessageSeller = async (product: Product, initialMessage: string) => {
        if (!userProfile) {
            alert('Please sign in to message the seller');
            return;
        }

        try {
            const sellerId = product.seller_id || product.vendor?.vendor_id;
            if (!sellerId) {
                alert('Seller information not found');
                return;
            }

            const conversationId = await createConversation(
                sellerId.toString(),
                userProfile.id,
                product.id.toString(),
                `Inquiry: ${product.title}`,
                initialMessage
            );

            if (conversationId) {
                alert('Message sent successfully!');
                // Close PDP and navigate to messages
                setSelectedProduct(null);
                setActiveAccountSection('messages');
            } else {
                alert('Failed to start conversation. Please try again.');
            }
        } catch (error) {
            console.error('Error messaging seller:', error);
            alert('An error occurred while sending your message.');
        }
    };

    const renderContent = () => {
        if (activeAccountSection) {
            return renderAccountSection(activeAccountSection);
        }

        if (selectedVendorId) {
            return (
                <VendorProfileView
                    vendorId={selectedVendorId}
                    onBack={() => {
                        setSelectedVendorId(null);
                        // Optional: trigger refresh or something if needed
                    }}
                    onProductClick={handleProductClick}
                />
            );
        }

        if (searchQuery) {
            return (
                <SearchResults
                    query={searchQuery}
                    results={products}
                    onBack={handleBackFromSearch}
                    onUserClick={() => setIsAccountOpen(true)}
                    onProductClick={handleProductClick}
                    onVisualSearch={setVisualSearchProduct}
                    userAvatar={userProfile?.avatar_url}
                    userName={userProfile?.name || userProfile?.email}
                    notificationCount={history.length + userCoupons.length}
                    cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                />
            );
        }

        switch (activeTab) {
            case 'cart':
                return (
                    <CartView
                        cartItems={cartItems}
                        recommendations={products.slice(0, 4)}
                        onProductClick={handleProductClick}
                        onUpdateQuantity={updateCartQuantity}
                        onRemove={removeFromCart}
                        onCheckout={openCheckout}
                        onVisualSearch={setVisualSearchProduct}
                    />
                );
            case 'deals':
                return (
                    <MobileDealsPage
                        onBack={() => setActiveTab('home')}
                        onProductClick={handleProductClick}
                        onVisualSearch={setVisualSearchProduct}
                    />
                );
            case 'best_sellers':
                return (
                    <BestSellersScreen
                        onBack={() => setActiveTab('home')}
                        onProductClick={handleProductClick}
                        onVisualSearch={setVisualSearchProduct}
                        userId={userProfile?.id}
                    />
                );
            case 'top_rated':
                return (
                    <TopRatedScreen
                        onBack={() => setActiveTab('home')}
                        onProductClick={handleProductClick}
                        onVisualSearch={setVisualSearchProduct}
                    />
                );
            case 'categories':
                return (
                    <CategoriesPage
                        selectedDepartmentId={selectedDepartmentId}
                        onSelectCategory={handleCategorySelect}
                        onBack={() => {
                            setActiveTab('home');
                            setSelectedDepartmentId('');
                            window.history.pushState({ view: 'home' }, '', window.location.href);
                        }}
                    />
                );
            case 'you': {
                const role = userProfile?.role?.toString?.().toLowerCase?.();
                const storeName = (userProfile as any)?.user_metadata?.business_name || (userProfile as any)?.business_name;

                // Check if user is a driver
                if (role === 'driver' || role === 'delivery_partner') {
                    return driverView === 'dashboard' ? (
                        <DriverDashboard
                            partnerId={userProfile?.id || ''}
                            driverName={userProfile?.name || userProfile?.email || 'Driver'}
                            onSignOut={handleDriverSignOut}
                        />
                    ) : (
                        <DriverAccess
                            onLogin={handleDriverAuth}
                            onBackToShop={() => setActiveTab('home')}
                        />
                    );
                }

                // Otherwise, show seller dashboard
                return sellerView === 'dashboard' ? (
                    <SellerDashboard
                        sellerId={userProfile?.id}
                        userName={userProfile?.name || userProfile?.email}
                        storeName={storeName || 'Marketplace Seller'}
                        onSignOut={handleSellerSignOut}
                        onSwitchAccount={() => setSellerView('guest')}
                        onCreateProduct={() => setActiveAccountSection('orders')}
                        onOpenMessages={() => setIsAccountOpen(true)}
                        onOpenOrders={() => setActiveAccountSection('orders')}
                        onOpenPayouts={() => setActiveAccountSection('credit')}
                    />
                ) : (
                    <SellerAccess
                        onLogin={handleSellerAuth}
                        onSignup={() => setOnboardingType('seller')}
                        onBackToShop={() => setActiveTab('home')}
                    />
                );
            }
            case 'support':
                return (
                    <div className="p-4 flex flex-col gap-4 bg-background-light dark:bg-background-dark min-h-screen">
                        <div className="rounded-2xl p-4 bg-white dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="text-lg font-bold text-black dark:text-white">Need help?</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Chat with seller success or open a support ticket.</div>
                            <div className="mt-4 flex gap-2">
                                <button className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold">Start chat</button>
                                <button className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-black dark:text-white">Call us</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[{ icon: 'school', label: 'Seller academy' }, { icon: 'live_help', label: 'FAQ' }, { icon: 'policy', label: 'Policies' }, { icon: 'bug_report', label: 'Report an issue' }].map((item) => (
                                <div key={item.label} className="rounded-2xl p-3 bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 flex items-start gap-2">
                                    <span className="material-icons-outlined text-primary">{item.icon}</span>
                                    <div className="text-sm font-semibold text-black dark:text-white leading-tight">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'home':
            default:
                return (
                    <>
                        <CategoryNav
                            activeCategoryId={activeCategoryId}
                            onSelectCategory={setActiveCategoryId}
                            onNavigateToCategories={handleNavigateToCategories}
                            onCategoryClick={handleCategoryClick}
                        />
                        {selectedCategoryForSubs && (
                            <SubcategoryCarousel
                                categoryId={selectedCategoryForSubs.id}
                                categoryName={selectedCategoryForSubs.name}
                                onSelectSubcategory={handleSelectSubcategory}
                                activeSubcategoryId={activeSubcategoryId}
                            />
                        )}
                        <main className="flex-grow">
                            {loading ? (
                                <div className="flex justify-center items-center h-40">Loading...</div>
                            ) : (
                                <HomeView
                                    products={filteredProducts}
                                    onProductClick={handleProductClick}
                                    showPromotions={activeCategoryId === 'all' && (!selectedCategoryForSubs || activeSubcategoryId === 'all')}
                                    onViewAllDeals={() => setActiveTab('deals')}
                                    onVisualSearch={setVisualSearchProduct}
                                    onFilterClick={setActiveTab}
                                />
                            )}
                        </main>
                    </>
                );
        }
    };

    return (
        <div className="mobile-shell flex flex-col min-h-screen h-screen overflow-hidden relative bg-background-light dark:bg-background-dark">
            <NotificationSystem />
            <MobileNotificationWrapper
                user={userProfile as any}
                onDataUpdate={useCallback((coupons: UserCoupon[], orders: BuyerOrder[]) => {
                    setUserCoupons(coupons);
                    setRecentOrders(orders);
                }, [])}
                onReviewPrompt={(orderId) => {
                    const order = recentOrders.find(o => o.id === orderId);
                    if (order && order.items?.[0]) {
                        setReviewingProductId(order.items[0].product_id);
                    }
                }}
            />
            {/* Category View Overlay - Full Screen */}
            {categoryViewOpen && (
                <div className="absolute inset-0 z-50 bg-background-light dark:bg-background-dark flex flex-col">
                    {/* Category Navigation */}
                    <CategoryNav
                        activeCategoryId={activeCategoryId}
                        onSelectCategory={setActiveCategoryId}
                        onNavigateToCategories={handleNavigateToCategories}
                        onCategoryClick={handleCategoryClick}
                    />

                    {/* Category View Header */}
                    <div className="flex-shrink-0 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 px-3 py-1.5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setCategoryViewOpen(null);
                                    setSelectedCategoryForSubs(null);
                                    setActiveSubcategoryId('all');
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <span className="material-icons-outlined text-2xl text-gray-700 dark:text-gray-300">arrow_back</span>
                            </button>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                {categoryViewOpen.departmentName}
                            </h1>
                        </div>
                    </div>

                    {/* Subcategory Carousel */}
                    {selectedCategoryForSubs && (
                        <SubcategoryCarousel
                            categoryId={selectedCategoryForSubs.id}
                            categoryName={selectedCategoryForSubs.name}
                            onSelectSubcategory={handleSelectSubcategory}
                            activeSubcategoryId={activeSubcategoryId}
                        />
                    )}

                    {/* Category Products */}
                    <div className="flex-grow overflow-y-auto bg-background-light dark:bg-background-dark">
                        <HomeView
                            products={filteredProducts}
                            onProductClick={handleProductClick}
                            showPromotions={false}
                            onVisualSearch={setVisualSearchProduct}
                        />
                    </div>
                </div>
            )}
            {/* Product Details Overlay - Full Screen */}
            {selectedProduct && (
                <ProductDetails
                    product={selectedProduct}
                    onBack={() => setSelectedProduct(null)}
                    onProductClick={handleProductClick}
                    onVisualSearch={setVisualSearchProduct}
                    onAddToCart={() => addToCart(selectedProduct)}
                    onBuyNow={() => {
                        addToCart(selectedProduct);
                        openCheckout();
                    }}
                    onMessageSeller={handleMessageSeller}
                    user={userProfile as any}
                    onVisitStore={(vendorId) => {
                        setSelectedProduct(null);
                        setSelectedVendorId(vendorId);
                    }}
                />
            )}

            {/* Account Overlay */}
            {isAccountOpen && (
                <AccountOverlay
                    onClose={() => setIsAccountOpen(false)}
                    userName={userProfile?.name || userProfile?.email}
                    avatarUrl={userProfile?.avatar_url}
                    messageCount={userProfile ? buyerMessageCount : undefined}
                    notificationCount={history.length}
                    userCoupons={userCoupons}
                    recentOrders={recentOrders}
                    onSignIn={async () => {
                        await signInWithGoogle({ view: 'buyer-auth' });
                        await refreshUserProfile();
                        setIsAccountOpen(false);
                    }}
                    onSignOut={async () => {
                        await signOut();
                        setUserProfile(null);
                        setSellerView('guest');
                        setIsAccountOpen(false);
                    }}
                    onNavigate={(section) => {
                        setIsAccountOpen(false);
                        setActiveAccountSection(section as AccountSectionKey);
                    }}
                />
            )}

            {/* Search Overlay */}
            {isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} onSearch={handleSearch} />}

            {/* Main Header - Hidden when product details or certain overlays are active */}
            {!selectedProduct && !selectedVendorId && !searchQuery && activeTab !== 'cart' && (
                <div className="flex-shrink-0 z-30 bg-white dark:bg-surface-dark">
                    <TopAppBanner />
                    <Header
                        onSearchClick={() => setIsSearchOpen(true)}
                        onCameraClick={() => setIsVisualSearchOpen(true)}
                        onUserClick={() => setIsAccountOpen(true)}
                        userAvatar={userProfile?.avatar_url}
                        userName={userProfile?.name || userProfile?.email}
                        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                        notificationCount={history.length + userCoupons.length}
                    />
                </div>
            )}

            {/* Main Content */}
            <div className="mobile-scroll flex-grow overflow-y-auto bg-background-light dark:bg-background-dark scroll-smooth">
                {renderContent()}
            </div>

            {/* Bottom Navigation - Hidden when product details is active */}
            {!selectedProduct && !selectedVendorId && (
                <BottomNav
                    activeTab={activeTab}
                    onTabChange={(tab) => {
                        setSearchQuery(null);
                        setActiveAccountSection(null);

                        // Reset category state when going to home
                        if (tab === 'home') {
                            setActiveCategoryId('all');
                            setSelectedCategoryForSubs(null);
                            setActiveSubcategoryId('all');
                            setCategoryViewOpen(null);
                        }

                        setActiveTab(tab);
                        window.history.pushState({ view: tab }, '', window.location.href);
                    }}
                    cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                    notificationCount={userCoupons.length}
                />
            )}

            {reviewingProductId && (
                <WriteReviewModal
                    productId={reviewingProductId}
                    userId={userProfile?.id}
                    orderId={reviewingOrderId || undefined}
                    onClose={() => {
                        setReviewingProductId(null);
                        setReviewingOrderId(null);
                    }}
                    onSubmitted={() => {
                        setReviewingProductId(null);
                        setReviewingOrderId(null);
                        refreshUserProfile();
                    }}
                />
            )}

            {isCheckoutOpen && (
                <CheckoutSheet
                    items={cartItems}
                    userId={userProfile?.id}
                    onClose={closeCheckout}
                    onPlaceOrder={() => {
                        setCartItems([]);
                        closeCheckout();
                        setIsOrderSuccessOpen(true);
                    }}
                />
            )}

            {isOrderSuccessOpen && (
                <OrderSuccessSheet
                    email={userProfile?.email || 'customer@example.com'}
                    onClose={() => setIsOrderSuccessOpen(false)}
                />
            )}

            {/* Onboarding Overlays */}
            {onboardingType === 'seller' && (
                <SellerOnboardingView
                    userId={userProfile?.id}
                    onComplete={async () => {
                        setOnboardingType(null);
                        await refreshUserProfile();
                        setSellerView('dashboard');
                    }}
                    onCancel={() => setOnboardingType(null)}
                />
            )}
            {onboardingType === 'driver' && (
                <DriverOnboardingView
                    onComplete={async () => {
                        setOnboardingType(null);
                        await refreshUserProfile();
                        setDriverView('dashboard');
                    }}
                    onCancel={() => setOnboardingType(null)}
                />
            )}

            {/* Visual Search Results View */}
            {visualSearchProduct && (
                <SimilarItemsView
                    product={visualSearchProduct}
                    onClose={() => setVisualSearchProduct(null)}
                    onProductClick={(p) => {
                        setVisualSearchProduct(null);
                        handleProductClick(p);
                    }}
                />
            )}

            {/* Mobile Write Review Sheet */}
            {reviewingProductId && (
                <MobileWriteReviewSheet
                    productId={reviewingProductId}
                    userId={userProfile?.id}
                    orderId={reviewingOrderId || undefined}
                    onClose={() => {
                        setReviewingProductId(null);
                        setReviewingOrderId(null);
                    }}
                    onSubmitted={() => {
                        setReviewingProductId(null);
                        setReviewingOrderId(null);
                        refreshUserProfile();
                    }}
                />
            )}

            {/* Visual Search Sheet */}
            {isVisualSearchOpen && (
                <VisualSearchSheet
                    onClose={() => setIsVisualSearchOpen(false)}
                    onSearchResults={(searchQuery, keywords) => {
                        setIsVisualSearchOpen(false);
                        // Use the AI-generated search query to search products
                        if (searchQuery) {
                            setSearchQuery(searchQuery);
                            setActiveTab('search_results');
                        }
                    }}
                />
            )}
        </div>
    );
};

export default App;
