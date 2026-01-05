
import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesBar from './components/FeaturesBar';
import LightningDealsRow from './components/LightningDealsRow';
import DealsNavBar from './components/DealsNavBar';
import ProductSection from './components/ProductSection';
import Footer from './components/Footer';
import FloatingWidget from './components/FloatingWidget';
import { Product, User, LoyaltyProfile, VisualCategory, Breadcrumb, AdminPermissions, UserCoupon, BuyerOrder } from './types';
import { fetchProductsWithVendors, fetchUserLoyaltyProfile, trackSearch, createConversation, ensureSupportConversation, checkAdminPermission, fetchSellerProfile, fetchDealsProducts, fetchNavbarCategories, fetchTopPlatformReviews, DealCategoryNavItem, NavbarCategory, fetchProductById, fetchCategoryBySlug } from '@/lib/api';
import { fetchEventBanner, type EventBannerData, getSectionTitles } from '@/lib/event-banner-service';
import { getEventIconSrc } from '@/lib/event-icons';
import { getCurrentUser, getUserProfile, isAccountBanned, onAuthStateChange, signOut } from './lib/auth';
import { useSEO } from './lib/useSEO';
import { getCategoryPageSEO, getSearchPageSEO, generateItemListSchema, generateReviewCollectionSchema, generateOrganizationRatingSchema, SITE_CONFIG } from './lib/seo-utils';
import { useCountrySEO } from './hooks/useCountrySEO';
import CartSidebar from './components/CartSidebar';
import PlatformReviewsModal from './components/PlatformReviewsModal';
import PlatformReviewsPage from './components/PlatformReviewsPage';
import { Review } from './types';
import VisualSearchSheet from './mobile ui/components/VisualSearchSheet';

// Lazy-loaded components for better code splitting
const BestSellersView = lazy(() => import('./components/BestSellersView'));
const TopRatedView = lazy(() => import('./components/TopRatedView'));
const ProductDetailView = lazy(() => import('./components/ProductDetailView'));
const SellerLoginView = lazy(() => import('./components/SellerLoginView'));
const BuyerAuthView = lazy(() => import('./components/BuyerAuthView'));
const AccountPageView = lazy(() => import('./components/AccountPageView'));
const CheckoutView = lazy(() => import('./components/CheckoutView'));
const OrderConfirmationView = lazy(() => import('./components/OrderConfirmationView'));
const TrackOrderView = lazy(() => import('./components/TrackOrderView'));
const CartView = lazy(() => import('./components/CartView'));
const WishlistView = lazy(() => import('./components/WishlistView'));
const TrendingVendorsSection = lazy(() => import('./components/TrendingVendorsSection'));
const SellerOnboardingView = lazy(() => import('./components/SellerOnboarding/SellerOnboardingView'));
const SellerDashboardLayout = lazy(() => import('./components/SellerDashboard/SellerDashboardLayout'));
const DashboardOverview = lazy(() => import('./components/SellerDashboard/DashboardOverview'));
const AddProductView = lazy(() => import('./components/SellerDashboard/ProductManager/AddProductView'));
const ManageProductsView = lazy(() => import('./components/SellerDashboard/ProductManager/ManageProductsView'));
const AddProductsUploadView = lazy(() => import('./components/SellerDashboard/ProductManager/AddProductsUploadView'));
const PricingHealthView = lazy(() => import('./components/SellerDashboard/PricingHealthView'));
const ProductComplianceView = lazy(() => import('./components/SellerDashboard/ProductManager/ProductComplianceView'));
const ManageOrdersView = lazy(() => import('./components/SellerDashboard/OrderManager/ManageOrdersView'));
const ManageReturnsView = lazy(() => import('./components/SellerDashboard/OrderManager/ManageReturnsView'));
const UploadOrderFilesView = lazy(() => import('./components/SellerDashboard/OrderManager/UploadOrderFilesView'));
const OrderReportsView = lazy(() => import('./components/SellerDashboard/OrderManager/OrderReportsView'));
const PromotionsCouponsView = lazy(() => import('./components/SellerDashboard/Promotions/PromotionsCouponsView'));
const CreateCouponView = lazy(() => import('./components/SellerDashboard/Promotions/CreateCouponView'));
const PromotionalCampaignsView = lazy(() => import('./components/SellerDashboard/Promotions/PromotionalCampaignsView'));
const CreateAutomaticDiscountView = lazy(() => import('./components/SellerDashboard/Promotions/CreateAutomaticDiscountView'));
const PaymentsView = lazy(() => import('./components/SellerDashboard/Finances/PaymentsView'));
const WalletView = lazy(() => import('./components/SellerDashboard/Finances/WalletView'));
const ShippingSettingsView = lazy(() => import('./components/SellerDashboard/Account/ShippingSettingsView'));
const EditShippingTemplateView = lazy(() => import('./components/SellerDashboard/Account/EditShippingTemplateView'));
const SellerProfileView = lazy(() => import('./components/SellerDashboard/Account/SellerProfileView'));
const ReturnSettingsView = lazy(() => import('./components/SellerDashboard/Account/ReturnSettingsView'));
const ChargeMethodView = lazy(() => import('./components/SellerDashboard/Finances/ChargeMethodView'));
const SellerPerformanceView = lazy(() => import('./components/SellerDashboard/Performance/SellerPerformanceView'));
const AppsServiceView = lazy(() => import('./components/SellerDashboard/Apps/AppsServiceView'));
const OrdersView = lazy(() => import('./components/SellerDashboard/OrdersView'));
const SellerMessagesView = lazy(() => import('./components/SellerDashboard/SellerMessagesView'));
const ManageReviewsView = lazy(() => import('./components/SellerDashboard/ManageReviewsView'));
const StoreMediaManager = lazy(() => import('./components/SellerDashboard/Account/StoreMediaManager'));
const InfoPageView = lazy(() => import('./components/InfoPageView'));
const VendorStoreView = lazy(() => import('./components/VendorStoreView'));

// Admin Dashboard Components (lazy)
const AdminDashboardLayout = lazy(() => import('./components/AdminDashboard/AdminDashboardLayout'));
const DisputeManagementView = lazy(() => import('./components/AdminDashboard/OrderManagement/DisputeManagementView'));
const AdminDashboardOverview = lazy(() => import('./components/AdminDashboard/DashboardOverview'));
const ProductApprovalView = lazy(() => import('./components/AdminDashboard/ProductApproval/ProductApprovalView'));
const SellerVerificationView = lazy(() => import('./components/AdminDashboard/SellerVerification/SellerVerificationView'));
const DriverVerificationView = lazy(() => import('./components/AdminDashboard/SellerVerification/DriverVerificationView'));
const PayoutApprovalsView = lazy(() => import('./components/AdminDashboard/Finances/PayoutApprovalsView'));
const UserManagementView = lazy(() => import('./components/AdminDashboard/UserManagement/UserManagementView'));
const OrderManagementView = lazy(() => import('./components/AdminDashboard/OrderManagement/OrderManagementView'));
const ContentManagementView = lazy(() => import('./components/AdminDashboard/ContentManagement/ContentManagementView'));
const ActivityLogView = lazy(() => import('./components/AdminDashboard/ActivityLog/ActivityLogView'));
const FeedbackSupportView = lazy(() => import('./components/AdminDashboard/FeedbackSupportView'));
const ModerationQueueView = lazy(() => import('./components/AdminDashboard/ModerationQueueView'));
const AdminAIControlsView = lazy(() => import('./components/AdminDashboard/AdminAIControlsView'));

// Driver Dashboard (lazy)
const DriverDashboardLayout = lazy(() => import('./components/DriverDashboard/DriverDashboardLayout'));
const WebDriverDashboard = lazy(() => import('./components/DriverDashboard/WebDriverDashboard'));
const WebDriverEarningsView = lazy(() => import('./components/DriverDashboard/WebDriverEarningsView').then(m => ({ default: m.WebDriverEarningsView })));
const WebDriverVehiclesView = lazy(() => import('./components/DriverDashboard/WebDriverVehiclesView').then(module => ({ default: module.WebDriverVehiclesView })));
const WebDriverProfileView = lazy(() => import('./components/DriverDashboard/WebDriverProfileView').then(module => ({ default: module.WebDriverProfileView })));
const DriverLoginView = lazy(() => import('./components/DriverDashboard/DriverLoginView'));
const DriverOnboardingView = lazy(() => import('./components/DriverDashboard/DriverOnboardingView'));
const AdminLoginView = lazy(() => import('./components/AdminDashboard/AdminLoginView'));
const AdminMessagesView = lazy(() => import('./components/AdminDashboard/AdminMessagesView'));

import NotificationSystem from './components/NotificationSystem';
import { WebNotificationWrapper } from './components/WebNotificationWrapper';
import { WriteReviewModal } from './components/WriteReviewModal';
import { useA2HS } from './hooks/useA2HS';
import { useNotifications, NotificationAction } from './components/NotificationContext';

// Loading fallback for Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

const App: React.FC = () => {
  const a2hs = useA2HS();
  const { showNotification } = useNotifications();

  // Initialize country-aware SEO
  const { countryConfig, isLoading: seoLoading } = useCountrySEO({
    pageType: 'home'
  });
  const [currentView, setCurrentView] = useState<'home' | 'five-star' | 'best-selling' | 'deals' | 'event-deals' | 'search-results' | 'product-detail' | 'vendor-store' | 'seller-login' | 'seller-onboarding' | 'seller-dashboard' | 'driver-login' | 'driver-onboarding' | 'driver-dashboard' | 'admin-login' | 'admin-dashboard' | 'buyer-auth' | 'account-page' | 'checkout' | 'cart' | 'order-confirmation' | 'track-order' | 'wishlist' | 'info-page' | 'platform-reviews'>('home');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'products' | 'manage-products' | 'add-products' | 'add-products-upload' | 'pricing-health' | 'product-compliance' | 'orders' | 'promotions' | 'finances' | 'performance' | 'apps' | 'account' | 'settings' | 'messages' | 'create-auto-discount' | 'create-coupon'>('manage-products');
  const [adminTab, setAdminTab] = useState<'overview' | 'products' | 'sellers' | 'drivers' | 'users' | 'orders' | 'moderation' | 'finances' | 'ai' | 'messages' | 'content' | 'activity' | 'feedback'>('overview');
  const [driverTab, setDriverTab] = useState<'jobs' | 'earnings' | 'vehicles' | 'profile'>('jobs');
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | undefined>(undefined);
  const [activeVendorStoreId, setActiveVendorStoreId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [accountPageTitle, setAccountPageTitle] = useState('Followed stores');
  const [products, setProducts] = useState<Product[]>([]);
  const [dealProducts, setDealProducts] = useState<Product[]>([]);
  const [dealCategories, setDealCategories] = useState<DealCategoryNavItem[]>([]);
  const [dealsLoading, setDealsLoading] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyProfile | null>(null);
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([]);
  const [productSectionTitle, setProductSectionTitle] = useState<string | undefined>(undefined);
  const [visualSubcategories, setVisualSubcategories] = useState<VisualCategory[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [previousView, setPreviousView] = useState<string>('');
  const [activeDealsCategoryId, setActiveDealsCategoryId] = useState<string | null>(null);
  const [adminAccessMessage, setAdminAccessMessage] = useState<string | null>(null);
  const [completedOrderInfo, setCompletedOrderInfo] = useState<{ orderId: string; orderNumber?: string; email?: string } | null>(null);
  const [activeInfoPageSlug, setActiveInfoPageSlug] = useState<string>('about');
  const [isActivityHubOpen, setIsActivityHubOpen] = useState(false);
  const [activityHubTab, setActivityHubTab] = useState<'list' | 'promotions' | 'shipping' | 'notifications'>('list');
  const [reviewingProductId, setReviewingProductId] = useState<string | null>(null);
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [isPlatformReviewsOpen, setIsPlatformReviewsOpen] = useState(false);
  const [platformReviews, setPlatformReviews] = useState<Review[]>([]);
  const [hasPlatformReviews, setHasPlatformReviews] = useState(false);

  const latestProductRequestIdRef = useRef<string | null>(null);

  const pendingRoleDeepLinkRef = useRef<{ type: 'chat' | 'order'; id: string } | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const isSellerUser = (u: User | null): boolean => {
    if (!u) return false;
    const role = (u as any)?.role;
    return role === 'seller' || role === 'vendor' || (u as any)?.is_seller === true;
  };

  const handleInstallAppClick = useCallback(async () => {
    try {
      const outcome = await a2hs.promptInstall();
      if (outcome === 'accepted') {
        showNotification('App installed. You can now open it from your home screen.', 'success');
      } else if (outcome === 'dismissed') {
        showNotification('Install dismissed.', 'info');
      } else if (outcome === 'already-installed') {
        showNotification('App is already installed on this device.', 'info');
      } else if (outcome === 'ios-instructions') {
        showNotification('On iPhone/iPad: tap Share, then “Add to Home Screen”.', 'info', 8000);
      } else {
        showNotification('Install is not available yet. Try again after the page finishes loading.', 'info', 8000);
      }
    } catch (e) {
      console.error('Install prompt failed:', e);
      showNotification('Unable to open install prompt.', 'error');
    }
  }, [a2hs, showNotification]);

  const handleSupportClick = useCallback(async () => {
    if (!user?.id) return;

    try {
      const convId = await ensureSupportConversation(user.id);
      if (convId) {
        setActiveConversationId(convId);
        setDashboardTab('messages');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error initiating support:', error);
    }
  }, [user?.id]);

  // Background Sync'd State
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [recentOrders, setRecentOrders] = useState<BuyerOrder[]>([]);

  // Event Banner State (for dynamic section titles)
  const [eventBanner, setEventBanner] = useState<EventBannerData | null>(null);

  const eventSectionTitles = useMemo(() => getSectionTitles(eventBanner || null), [eventBanner]);

  // Fetch event banner on mount for dynamic section titles
  useEffect(() => {
    fetchEventBanner().then(setEventBanner).catch(console.error);
  }, []);

  const isBuyerSurface = (view: typeof currentView) => ![
    'seller-login',
    'seller-onboarding',
    'seller-dashboard',
    'driver-login',
    'driver-onboarding',
    'driver-dashboard',
    'admin-dashboard',
    'admin-login',
    'info-page'
  ].includes(view);
  const [showBuyerAuthModal, setShowBuyerAuthModal] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const dedupeCategories = useCallback((items: DealCategoryNavItem[]) => {
    const unique = new Map<string, DealCategoryNavItem>();

    items.forEach((item, index) => {
      const key = item.categoryId || item.categoryHandle || item.categoryName || `fallback-${index}`;
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    });

    return Array.from(unique.values());
  }, []);

  const dedupeProducts = useCallback((items: Product[]) => {
    const unique = new Map<string, Product>();

    items.forEach((item, index) => {
      const key = item.id?.toString() || `product-${index}`;
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    });

    return Array.from(unique.values());
  }, []);

  // SEO: Compute page metadata based on current view
  const seoConfig = useMemo(() => {
    if (currentView === 'home') {
      return {
        title: 'JuaExpress - Premium Multi-Country E-Commerce Marketplace',
        description: 'Shop JuaExpress for premium electronics, fashion, and home goods across UK and Africa. Experience seamless multi-country shopping with secure payments and ultra-fast delivery.',
        keywords: 'jua, jua express, JuaExpress, online shopping Africa, UK marketplace, Kenya e-commerce, electronics Nairobi, fashion Lagos',


      };
    } else if (currentView === 'five-star') {
      return {
        title: 'Five Star Products',
        description: 'Browse our collection of top-rated 5-star products. Quality guaranteed with verified customer reviews.',
        keywords: 'five star products, top rated, best products, customer reviews',
      };
    } else if (currentView === 'best-selling') {
      return {
        title: 'Best Selling Products',
        description: 'Shop our most popular and best-selling items. Trusted by thousands of satisfied customers.',
        keywords: 'best sellers, popular products, trending items',
      };
    } else if (currentView === 'search-results' && searchQuery) {
      return getSearchPageSEO(searchQuery, products.length);
    } else if (currentView === 'search-results' && productSectionTitle) {
      return getCategoryPageSEO(productSectionTitle, products.length);
    } else if (currentView === 'cart') {
      return {
        title: 'Shopping Cart',
        description: 'Review your cart and proceed to checkout. Secure payment and fast delivery.',
        noindex: true,
      };
    } else if (currentView === 'checkout') {
      return {
        title: 'Checkout',
        description: 'Complete your purchase securely.',
        noindex: true,
      };
    } else if (currentView === 'platform-reviews') {
      const reviews = platformReviews || [];
      const totalReviews = reviews.length;
      const ratingValues = reviews
        .map((r) => Number(r.platform_rating ?? r.rating))
        .filter((n) => Number.isFinite(n) && n > 0);
      const overallRating = ratingValues.length
        ? Math.round((ratingValues.reduce((acc, n) => acc + n, 0) / ratingValues.length) * 10) / 10
        : null;

      const reviewData = reviews.slice(0, 10).map(review => ({
        rating: review.platform_rating || review.rating,
        content: review.platform_feedback || review.content,
        author: review.user_name || 'Verified Buyer',
        datePublished: review.created_at ? new Date(review.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        verified: true,
      }));

      const description = totalReviews > 0 && overallRating !== null
        ? `Read ${totalReviews.toLocaleString()} authentic reviews and feedback from our Pan-African community. Rated ${overallRating}/5 stars — See why thousands trust JuaExpress for their shopping needs.`
        : 'Read authentic reviews and feedback from our Pan-African community.';

      return {
        title: 'Platform Trust & Community Reviews | JuaExpress',
        description,
        keywords: 'JuaExpress reviews, platform rating, customer feedback, verified reviews, African marketplace trust, online shopping reviews',
        url: `${SITE_CONFIG.url}/reviews`,
        structuredData: (totalReviews > 0 && overallRating !== null)
          ? [
            generateOrganizationRatingSchema(reviewData, overallRating, totalReviews),
            generateReviewCollectionSchema(
              'Platform Trust & Community Reviews | JuaExpress',
              description,
              reviewData,
              overallRating,
              totalReviews
            )
          ]
          : [],
      };
    }
    return {};
  }, [currentView, searchQuery, productSectionTitle, products.length, platformReviews]);

  // Apply SEO configuration (hook called at top level)
  useSEO(seoConfig);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await fetchProductsWithVendors();
      setProducts(dedupeProducts(data));
    };
    loadProducts();

    // Check platform review availability (no hardcoded defaults)
    void (async () => {
      try {
        const reviews = await fetchTopPlatformReviews(1);
        setHasPlatformReviews((reviews || []).length > 0);
      } catch (err) {
        console.warn('Unable to check platform review availability:', err);
        setHasPlatformReviews(false);
      }
    })();
    // Auth context will be handled by the auth state listener
  }, [dedupeProducts]);

  // Auth state listener
  const handleDriverDashboardClick = useCallback(() => {
    setCurrentView('driver-login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Check for query parameters on mount to set initial view
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const productId = params.get('product_id');
    const orderId = params.get('order_id');
    const chatId = params.get('chat_id');
    const tabParam = params.get('tab');
    const sectionParam = params.get('section');
    const searchParam = params.get('search');

    const pathnameRaw = window.location.pathname || '/';
    const pathname = pathnameRaw.length > 1 ? pathnameRaw.replace(/\/+$/, '') : '/';
    const pathSlug = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    const infoSlugs = new Set([
      'about',
      'terms',
      'privacy',
      'returns',
      'shipping',
      'protection',
      'contact',
      'sell',
      'affiliate',
      'careers',
      'sustainability',
      'support-center',
      'safety-centre',
      'sitemap',
      'intellectual-property',
      'report-suspicious',
      'company-details',
      'corporate-responsibility',
      'minimum-order'
    ]);

    const productPathMatch = pathname.match(/^\/product\/([^\/]+)$/);
    const categoryPathMatch = pathname.match(/^\/category\/([^\/]+)$/);

    if (productPathMatch?.[1]) {
      const productIdFromPath = decodeURIComponent(productPathMatch[1]);
      const loadDeepLinkProduct = async () => {
        try {
          const product = await fetchProductById(productIdFromPath);
          if (product) {
            setSelectedProduct(product);
            setCurrentView('product-detail');
          }
        } catch (err) {
          console.error('Error loading product from path:', err);
        }
      };
      loadDeepLinkProduct();
    } else if (categoryPathMatch?.[1]) {
      const categorySlugFromPath = decodeURIComponent(categoryPathMatch[1]);
      const loadCategoryFromPath = async () => {
        try {
          // Try fast mapping from navbar RPC first
          const nav = await fetchNavbarCategories();
          const hit = nav.find((c) => (c.category_handle || '').toLowerCase() === categorySlugFromPath.toLowerCase());

          if (hit?.category_id) {
            setActiveCategoryIds([String(hit.category_id)]);
            setProductSectionTitle(hit.category_name || categorySlugFromPath);
            setCurrentView('search-results');
            return;
          }

          // Fallback: lookup shopify_categories by slug
          const category = await fetchCategoryBySlug(categorySlugFromPath);
          if (category?.id) {
            setActiveCategoryIds([String(category.id)]);
            setProductSectionTitle(category.name || categorySlugFromPath);
            setCurrentView('search-results');
            return;
          }

          // Last resort: show a filtered view using slug as the key
          setActiveCategoryIds([categorySlugFromPath]);
          setProductSectionTitle(categorySlugFromPath);
          setCurrentView('search-results');
        } catch (err) {
          console.error('Error loading category from path:', err);
        }
      };
      loadCategoryFromPath();
    } else if (viewParam === 'event-deals') {
      setCurrentView('event-deals');
      setSearchQuery(searchParam || '');
      setSelectedVendorId(undefined);
      setActiveVendorStoreId(null);
      setActiveCategoryIds([]);
      setVisualSubcategories([]);
      setBreadcrumbs([]);
      const eventTitle = params.get('event');
      setProductSectionTitle(eventTitle || 'Event Deals');
    } else if (searchParam) {
      handleSearch(searchParam);
    } else if (chatId) {
      pendingRoleDeepLinkRef.current = { type: 'chat', id: chatId };
      setAccountPageTitle('Messages');
      setCurrentView('account-page');
      setActiveConversationId(chatId === 'inbox' ? null : chatId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewParam === 'platform-reviews') {
      setCurrentView('platform-reviews');
      // Fetch reviews immediately if they are for this page
      const loadPlatformReviews = async () => {
        const reviews = await fetchTopPlatformReviews(40);
        setPlatformReviews(reviews);
      };
      loadPlatformReviews();
    } else if (viewParam === 'seller-login') {
      setCurrentView('seller-login');
    } else if (viewParam === 'seller-onboarding') {
      setCurrentView('seller-onboarding');
    } else if (viewParam === 'wishlist') {
      setCurrentView('wishlist');
    } else if (viewParam === 'deals') {
      setCurrentView('deals');
    } else if (viewParam === 'vendor-store') {
      const vendorId = params.get('vendorId');
      if (vendorId) {
        setActiveVendorStoreId(vendorId);
        setCurrentView('vendor-store');
      }
    } else if (viewParam === 'seller-dashboard') {
      setCurrentView('seller-dashboard');
      if (tabParam) setDashboardTab(tabParam as any);
    } else if (viewParam === 'account-page') {
      setCurrentView('account-page');
      if (sectionParam) setAccountPageTitle(sectionParam);
    } else if (productId) {
      const loadDeepLinkProduct = async () => {
        try {
          const product = await fetchProductById(productId);
          if (product) {
            setSelectedProduct(product);
            setCurrentView('product-detail');
          }
        } catch (err) {
          console.error('Error loading deep link product:', err);
        }
      };
      loadDeepLinkProduct();
    } else if (orderId) {
      pendingRoleDeepLinkRef.current = { type: 'order', id: orderId };
      setAccountPageTitle('Your orders');
      setCurrentView('account-page');
    } else if (!viewParam && !productId && !orderId && !chatId) {
      // Pathname-based routes (for direct visits and indexing)
      if (pathname === '/five-star') {
        setCurrentView('five-star');
      } else if (pathname === '/best-selling') {
        setCurrentView('best-selling');
      } else if (pathname === '/deals') {
        setCurrentView('deals');
      } else if (pathname === '/seller-login') {
        setCurrentView('seller-login');
      } else if (pathname === '/help') {
        setActiveInfoPageSlug('support-center');
        setCurrentView('info-page');
      } else if (infoSlugs.has(pathSlug)) {
        setActiveInfoPageSlug(pathSlug);
        setCurrentView('info-page');
      } else if (pathname.startsWith('/info/')) {
        const infoSlug = pathname.replace('/info/', '');
        if (infoSlugs.has(infoSlug)) {
          setActiveInfoPageSlug(infoSlug);
          setCurrentView('info-page');
        }
      }
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const searchParam = params.get('search');
      const productId = params.get('product_id');
      const orderId = params.get('order_id');
      const chatId = params.get('chat_id');

      const pathnameRaw = window.location.pathname || '/';
      const pathname = pathnameRaw.length > 1 ? pathnameRaw.replace(/\/+$/, '') : '/';
      const pathSlug = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      const infoSlugs = new Set([
        'about',
        'terms',
        'privacy',
        'returns',
        'shipping',
        'protection',
        'contact',
        'sell',
        'affiliate',
        'careers',
        'sustainability',
        'support-center',
        'safety-centre',
        'sitemap',
        'intellectual-property',
        'report-suspicious',
        'company-details',
        'corporate-responsibility',
        'minimum-order'
      ]);

      const productPathMatch = pathname.match(/^\/product\/([^\/]+)$/);
      const categoryPathMatch = pathname.match(/^\/category\/([^\/]+)$/);

      if (productPathMatch?.[1]) {
        const productIdFromPath = decodeURIComponent(productPathMatch[1]);
        (async () => {
          try {
            const product = await fetchProductById(productIdFromPath);
            if (product) {
              setSelectedProduct(product);
              setCurrentView('product-detail');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          } catch (err) {
            console.error('Error loading popstate product from path:', err);
          }
        })();
        return;
      }

      if (categoryPathMatch?.[1]) {
        const categorySlugFromPath = decodeURIComponent(categoryPathMatch[1]);
        (async () => {
          try {
            const nav = await fetchNavbarCategories();
            const hit = nav.find((c) => (c.category_handle || '').toLowerCase() === categorySlugFromPath.toLowerCase());
            if (hit?.category_id) {
              setActiveCategoryIds([String(hit.category_id)]);
              setProductSectionTitle(hit.category_name || categorySlugFromPath);
              setCurrentView('search-results');
              return;
            }

            const category = await fetchCategoryBySlug(categorySlugFromPath);
            if (category?.id) {
              setActiveCategoryIds([String(category.id)]);
              setProductSectionTitle(category.name || categorySlugFromPath);
              setCurrentView('search-results');
              return;
            }

            setActiveCategoryIds([categorySlugFromPath]);
            setProductSectionTitle(categorySlugFromPath);
            setCurrentView('search-results');
          } catch (err) {
            console.error('Error loading popstate category from path:', err);
          }
        })();
        return;
      }

      if (view === 'event-deals') {
        setCurrentView('event-deals');
        setSearchQuery(searchParam || '');
        setSelectedVendorId(undefined);
        setActiveVendorStoreId(null);
        setActiveCategoryIds([]);
        setVisualSubcategories([]);
        setBreadcrumbs([]);
        const eventTitle = params.get('event');
        setProductSectionTitle(eventTitle || 'Event Deals');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (view === 'vendor-store') {
        const vendorId = params.get('vendorId');
        if (vendorId) {
          setActiveVendorStoreId(vendorId);
          setCurrentView('vendor-store');
          return;
        }
      }

      if (searchParam) {
        handleSearch(searchParam);
        return;
      }

      if (chatId) {
        pendingRoleDeepLinkRef.current = { type: 'chat', id: chatId };
        handleInAppDeepLink('chat', chatId);
        return;
      }

      if (view === 'wishlist') {
        setCurrentView('wishlist');
        return;
      }

      if (productId) {
        (async () => {
          try {
            const product = await fetchProductById(productId);
            if (product) {
              setSelectedProduct(product);
              setCurrentView('product-detail');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          } catch (err) {
            console.error('Error loading popstate product:', err);
          }
        })();
        return;
      }

      if (orderId) {
        pendingRoleDeepLinkRef.current = { type: 'order', id: orderId };
        handleInAppDeepLink('order', orderId);
        return;
      }

      if (view === 'platform-reviews') {
        setCurrentView('platform-reviews');
        return;
      }

      // Pathname-based routes (for direct visits)
      if (!view && !searchParam && !productId && !orderId) {
        if (pathname === '/five-star') {
          setCurrentView('five-star');
          return;
        }
        if (pathname === '/best-selling') {
          setCurrentView('best-selling');
          return;
        }
        if (pathname === '/deals') {
          setCurrentView('deals');
          return;
        }
        if (pathname === '/seller-login') {
          setCurrentView('seller-login');
          return;
        }
        if (pathname === '/help') {
          setActiveInfoPageSlug('support-center');
          setCurrentView('info-page');
          return;
        }
        if (infoSlugs.has(pathSlug)) {
          setActiveInfoPageSlug(pathSlug);
          setCurrentView('info-page');
          return;
        }
        if (pathname.startsWith('/info/')) {
          const infoSlug = pathname.replace('/info/', '');
          if (infoSlugs.has(infoSlug)) {
            setActiveInfoPageSlug(infoSlug);
            setCurrentView('info-page');
            return;
          }
        }
      }

      // Default fallback
      setActiveVendorStoreId(null);
      setCurrentView('home');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleInAppDeepLink = useCallback(async (type: 'product' | 'order' | 'chat', id: string) => {
    console.log(`Handling in-app deep link: ${type} ${id}`);
    if (type === 'product') {
      try {
        const product = await fetchProductById(id);
        if (product) {
          setSelectedProduct(product);
          setCurrentView('product-detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (err) {
        console.error('Error handling in-app deep link (product):', err);
      }
    } else if (type === 'order') {
      if (isSellerUser(userRef.current)) {
        setCurrentView('seller-dashboard');
        setDashboardTab('manage-orders');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setAccountPageTitle('Your orders'); // Correct title for BuyerOrdersView
        setCurrentView('account-page');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (type === 'chat') {
      if (isSellerUser(userRef.current)) {
        setCurrentView('seller-dashboard');
        setDashboardTab('messages');
        setActiveConversationId(id && id !== 'inbox' ? id : null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setAccountPageTitle('Messages');
        setCurrentView('account-page');
        setActiveConversationId(id && id !== 'inbox' ? id : null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, []);

  // If the app started via a deep link before auth loaded, re-route once we know we are a seller.
  useEffect(() => {
    if (!isSellerUser(userRef.current)) return;
    const pending = pendingRoleDeepLinkRef.current;
    if (!pending) return;
    pendingRoleDeepLinkRef.current = null;
    handleInAppDeepLink(pending.type, pending.id);
  }, [user?.id, user?.role, handleInAppDeepLink]);

  useEffect(() => {
    console.log('[App.tsx] Registering juax:notification-action listener');
    const handler = (event: Event) => {
      const action = (event as CustomEvent<NotificationAction>).detail;
      console.log('[App.tsx] Received juax:notification-action event:', action);
      if (!action?.target) {
        console.warn('[App.tsx] Action has no target, ignoring');
        return;
      }

      if (action.target === 'wishlist') {
        setCurrentView('wishlist');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (action.target === 'coupons') {
        setAccountPageTitle('Coupons');
        setCurrentView('account-page');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (action.target === 'inventory') {
        setCurrentView('seller-dashboard');
        setDashboardTab('manage-products');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (action.target === 'finances') {
        setCurrentView('seller-dashboard');
        setDashboardTab('finances');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (action.target === 'deals') {
        setCurrentView('deals');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (action.target === 'chat') {
        handleInAppDeepLink('chat', action.id || 'inbox');
        return;
      }

      if (action.target === 'seller-orders') {
        console.log('[App.tsx] Navigating to Seller Dashboard Orders tab');
        setCurrentView('seller-dashboard');
        setDashboardTab('manage-orders'); // Use manage-orders for modern view with Pending/Shipped tabs
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (action.target === 'order') {
        handleInAppDeepLink('order', action.id || '');
        return;
      }


      if (action.target === 'product' && action.id) {
        handleInAppDeepLink('product', action.id);
      }
    };

    window.addEventListener('juax:notification-action', handler as EventListener);
    return () => window.removeEventListener('juax:notification-action', handler as EventListener);
  }, [handleInAppDeepLink]);

  useEffect(() => {
    // Check current session on mount
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const profile = await getUserProfile(currentUser.id);
        if (isAccountBanned(profile)) {
          setAuthNotice('Your account has been banned. Please contact support.');
          await signOut();
          setAuthLoading(false);
          return;
        }

        let role = currentUser.user_metadata?.role || 'buyer';

        // Additional check for sellers logging in via Google who might have a profile but no metadata
        if (role !== 'seller' && role !== 'admin') {
          const sellerProfile = await fetchSellerProfile(currentUser.id);
          if (sellerProfile) {
            role = 'seller';
          }
        }

        setUser({
          id: currentUser.id,
          email: currentUser.email || '',
          name: currentUser.user_metadata?.name,
          avatar_url: currentUser.user_metadata?.avatar_url,
          role: role,
        });

        // Redirect logic on initial load
        const storedContextStr = sessionStorage.getItem('auth_context');
        if (storedContextStr) {
          try {
            const storedContext = JSON.parse(storedContextStr);
            sessionStorage.removeItem('auth_context');

            if (storedContext.view === 'seller-login' || storedContext.view === 'seller-onboarding') {
              if (role === 'seller') {
                setCurrentView('seller-dashboard');
              } else {
                setCurrentView('seller-onboarding');
              }
            }

            if (storedContext.view === 'admin-login') {
              if (role === 'admin') {
                const perms = await checkAdminPermission(currentUser.id);
                if (perms?.is_active) {
                  setAdminPermissions(perms);
                  setAdminTab('overview');
                  setAdminAccessMessage(null);
                  setCurrentView('admin-dashboard');
                  import('@/lib/embedding').then(({ EmbeddingService }) => {
                    EmbeddingService.getInstance().preloadModel();
                  });
                  return;
                }
              }
              setAdminAccessMessage('This is an admin-only area. Please sign in with an admin-approved account.');
              setCurrentView('home');
              return;
            }
          } catch (e) {
            console.error('Error parsing auth context:', e);
          }
        }

        const loyalty = await fetchUserLoyaltyProfile(currentUser.id);
        setLoyaltyProfile(loyalty);
      }
      setAuthLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    // Listen for auth changes
    const authListener = onAuthStateChange(async (event, session) => {
      // Handle both SIGNED_IN and INITIAL_SESSION for page reloads/redirects
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        console.log('Auth event:', event, session.user.id);
        console.log('Initial metadata role:', session.user.user_metadata?.role);

        setAuthNotice(null);

        const profile = await getUserProfile(session.user.id);
        if (isAccountBanned(profile)) {
          setAuthNotice('Your account has been banned. Please contact support.');
          await signOut();
          return;
        }

        // Determine role - trust metadata first, but verify if not "seller" (e.g. Google login)
        let role = session.user.user_metadata?.role || 'buyer';

        // Additional check for sellers logging in via Google who might have a profile but no metadata
        if (role !== 'seller' && role !== 'admin') {
          console.log('Checking seller profile for:', session.user.id);
          const sellerProfile = await fetchSellerProfile(session.user.id);
          console.log('Seller profile result:', !!sellerProfile);
          if (sellerProfile) {
            role = 'seller';
          }
        }

        console.log('Resolved role:', role);

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
          avatar_url: session.user.user_metadata?.avatar_url,
          role: role,
        });

        // Redirect drivers to their dashboard if logging in from driver context
        if (role === 'driver' || role === 'delivery_partner') {
          setCurrentView('driver-dashboard');
        }

        if (isBuyerSurface(currentView)) {
          setShowBuyerAuthModal(false);
        }

        // Check for stored auth context (for seller auth flows)
        const storedContextStr = sessionStorage.getItem('auth_context');
        if (storedContextStr) {
          try {
            const storedContext = JSON.parse(storedContextStr);
            sessionStorage.removeItem('auth_context');
            if (storedContext.view === 'seller-login' || storedContext.view === 'seller-onboarding') {
              // For seller auth, check business profile directly to avoid delays
              console.log('Checking seller profile for auth context redirect:', session.user.id);
              const sellerProfile = await fetchSellerProfile(session.user.id);
              if (sellerProfile) {
                console.log('Seller profile found, redirecting to dashboard');
                setCurrentView('seller-dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              } else {
                console.log('No seller profile, redirecting to onboarding');
                setCurrentView('seller-onboarding');
                return;
              }
            }

            if (storedContext.view === 'admin-login') {
              const perms = await checkAdminPermission(session.user.id);
              if (perms?.is_active) {
                setAdminPermissions(perms);
                setAdminTab('overview');
                setAdminAccessMessage(null);
                setCurrentView('admin-dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }

              setAdminAccessMessage('This is an admin-only area. Please sign in with an admin-approved account.');
              setCurrentView('home');
              return;
            }
          } catch (e) {
            console.error('Error parsing auth context:', e);
          }
        }

        // No automatic dashboard redirects when logging in from the buyer entry point.

      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoyaltyProfile(null);
        setAdminPermissions(null);
        setAdminTab('overview');
        setAdminAccessMessage(null);
        setCurrentView('home'); // Ensure we go home on sign out
        setShowBuyerAuthModal(true);
      }
    });

    // Cleanup subscription
    return () => {
      authListener?.data.subscription.unsubscribe();
    };
  }, []);

  // Keep buyer auth modal aligned with auth state and surface
  useEffect(() => {
    if (authLoading) return;
    if (!user && isBuyerSurface(currentView)) {
      setShowBuyerAuthModal(true);
    } else if (user) {
      setShowBuyerAuthModal(false);
    }
  }, [authLoading, user, currentView]);

  // One Tap disabled for now: keep sign-in user-initiated

  const addToCart = (product: Product, event?: React.MouseEvent | React.TouchEvent) => {
    const currentQty = cartItems.filter(item =>
      item.id.toString() === product.id.toString() && item.variant_id === product.variant_id
    ).length;
    const maxStock = product.stock ?? Infinity;
    if (currentQty >= maxStock) {
      alert('Only ' + maxStock + ' in stock for this item.');
      return;
    }

    // Animation logic
    if (event) {
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const cartIcon = document.getElementById('cart-icon-container');

      if (cartIcon) {
        const cartRect = cartIcon.getBoundingClientRect();

        const startLeft = rect.left + rect.width / 2 - 12;
        const startTop = rect.top + rect.height / 2 - 12;

        const flyingBadge = document.createElement('div');
        flyingBadge.textContent = '1';
        flyingBadge.style.position = 'fixed';
        flyingBadge.style.left = `${startLeft}px`;
        flyingBadge.style.top = `${startTop}px`;
        flyingBadge.style.width = '24px';
        flyingBadge.style.height = '24px';
        flyingBadge.style.borderRadius = '9999px';
        flyingBadge.style.background = '#ef4444';
        flyingBadge.style.color = '#fff';
        flyingBadge.style.display = 'flex';
        flyingBadge.style.alignItems = 'center';
        flyingBadge.style.justifyContent = 'center';
        flyingBadge.style.fontWeight = '800';
        flyingBadge.style.fontSize = '12px';
        flyingBadge.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
        flyingBadge.style.zIndex = '1000';
        flyingBadge.style.pointerEvents = 'none';
        flyingBadge.style.transform = 'scale(1)';
        flyingBadge.style.transition = 'transform 1.4s cubic-bezier(0.2, 1, 0.3, 1), opacity 1.4s ease';

        document.body.appendChild(flyingBadge);

        // Force reflow so the transition fires
        flyingBadge.getBoundingClientRect();

        const destX = cartRect.left + cartRect.width / 2 - startLeft - 12;
        const destY = cartRect.top + cartRect.height / 2 - startTop - 12;

        flyingBadge.style.transform = `translate(${destX}px, ${destY}px) scale(0.4)`;
        flyingBadge.style.opacity = '0';

        setTimeout(() => {
          if (document.body.contains(flyingBadge)) {
            document.body.removeChild(flyingBadge);
          }
          setCartItems(prev => {
            const qty = prev.filter(item =>
              item.id.toString() === product.id.toString() && item.variant_id === product.variant_id
            ).length;
            if (qty >= maxStock) return prev;
            return [...prev, product];
          });
        }, 1400);
      } else {
        setCartItems(prev => {
          const qty = prev.filter(item =>
            item.id.toString() === product.id.toString() && item.variant_id === product.variant_id
          ).length;
          if (qty >= maxStock) return prev;
          return [...prev, product];
        });
      }
    } else {
      setCartItems(prev => {
        const qty = prev.filter(item =>
          item.id.toString() === product.id.toString() && item.variant_id === product.variant_id
        ).length;
        if (qty >= maxStock) return prev;
        return [...prev, product];
      });
    }
  };

  const handleRemoveFromCartLegacy = (productId: number | string, variantId?: string) => {
    setCartItems(prev => prev.filter(item =>
      !(item.id === productId && item.variant_id === variantId)
    ));
  };

  const handleUpdateQuantity = (productId: number | string, delta: number, variantId?: string) => {
    setCartItems(prev => {
      const newItems = [...prev];
      if (delta > 0) {
        const itemToAdd = prev.find(item => item.id === productId && item.variant_id === variantId);
        if (itemToAdd) newItems.push(itemToAdd);
      } else {
        const indexToRemove = newItems.findIndex(item => item.id === productId && item.variant_id === variantId);
        if (indexToRemove !== -1) newItems.splice(indexToRemove, 1);
      }
      return newItems;
    });
  };

  const handleVisitStore = (vendorId: string) => {
    if (!vendorId) return;

    setActiveVendorStoreId(vendorId);
    setCurrentView('vendor-store');
    setSearchQuery('');
    setSelectedVendorId(undefined);

    const url = new URL(window.location.href);
    url.searchParams.set('view', 'vendor-store');
    url.searchParams.set('vendorId', vendorId);
    window.history.pushState({ view: 'vendor-store', vendorId }, '', url.toString());

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHomeClick = () => {
    setCurrentView('home');
    setSearchQuery('');
    setSelectedVendorId(undefined);
    setActiveVendorStoreId(null);
    setBreadcrumbs([]);
    // If we are on a deep link view, clear query params
    if (window.location.search) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFiveStarClick = () => {
    setCurrentView('five-star');
    setSearchQuery('');
    setSelectedVendorId(undefined);
    setActiveVendorStoreId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBestSellingClick = () => {
    setCurrentView('best-selling');
    setSearchQuery('');
    setSelectedVendorId(undefined);
    setActiveVendorStoreId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDealsClick = (categoryId?: string | null) => {
    setCurrentView('deals');
    setSearchQuery('');
    setSelectedVendorId(undefined);
    setActiveVendorStoreId(null);
    setActiveDealsCategoryId(categoryId ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSellerLoginClick = () => {
    setCurrentView('seller-login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedVendorId(undefined);
    setActiveVendorStoreId(null);
    // Reset category navigation state so search results are fresh
    setActiveCategoryIds([]);
    setVisualSubcategories([]);
    setProductSectionTitle(undefined);
    setProductSectionTitle(undefined);
    setCurrentView('search-results');
    setBreadcrumbs([]); // Clear breadcrumbs on search
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Track the search term
    trackSearch(query);
  };

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product-detail');
    setActiveVendorStoreId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const productId = product?.id ? String(product.id) : null;
    if (!productId) return;

    latestProductRequestIdRef.current = productId;
    void (async () => {
      try {
        const hydrated = await fetchProductById(productId);
        if (!hydrated) return;
        if (latestProductRequestIdRef.current !== productId) return;
        setSelectedProduct(hydrated);
      } catch (err) {
        console.error('Error hydrating product on click:', err);
      }
    })();
  }, []);

  const handleRelatedProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product-detail');
    setBreadcrumbs([]); // Clear breadcrumbs on search
    setSearchQuery('');
    setActiveVendorStoreId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const productId = product?.id ? String(product.id) : null;
    if (!productId) return;

    latestProductRequestIdRef.current = productId;
    void (async () => {
      try {
        const hydrated = await fetchProductById(productId);
        if (!hydrated) return;
        if (latestProductRequestIdRef.current !== productId) return;
        setSelectedProduct(hydrated);
      } catch (err) {
        console.error('Error hydrating related product on click:', err);
      }
    })();
  }, []);

  const handleAccountPageClick = (pageTitle: string) => {
    // Special handling for wishlist
    if (pageTitle === 'Saved items') {
      setCurrentView('wishlist');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setAccountPageTitle(pageTitle);
    setCurrentView('account-page');
    setActiveVendorStoreId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckoutClick = () => {
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCartClick = () => {
    setIsCartSidebarOpen(true);
  };

  const handleUpdateCartQuantityDirect = (productId: string, quantity: number) => {
    setCartItems(prev => {
      const remainingItems = prev.filter(item => item.id !== productId);
      const itemsToAdd = prev.filter(item => item.id === productId).slice(0, 1);
      const newItems = [...remainingItems];
      for (let i = 0; i < quantity; i++) {
        if (itemsToAdd[0]) newItems.push(itemsToAdd[0]);
      }
      return newItems;
    });
  };

  const loadDealsData = useCallback(async (categoryId?: string | null) => {
    setDealsLoading(true);
    try {
      const { products: deals, categories } = await fetchDealsProducts(40, categoryId || undefined, user?.id || undefined);
      setDealProducts(deals);

      if (categories && categories.length > 0) {
        setDealCategories(dedupeCategories(categories));
      } else {
        // Fallback to navbar categories if deals RPC returns no categories
        const fallbackNav: NavbarCategory[] = await fetchNavbarCategories();
        const mappedFallback: DealCategoryNavItem[] = (fallbackNav || []).map((c) => ({
          categoryId: c.category_id,
          categoryName: c.category_name,
          categoryHandle: c.category_handle,
          departmentName: c.department_name,
          featuredImageUrl: c.trending_product_image_url || undefined,
          activeDeals: c.product_count,
          finalScore: c.trend_score,
          dealPriority: c.is_hot ? 'hot_deal' : undefined
        }));
        setDealCategories(dedupeCategories(mappedFallback));
      }
    } catch (error) {
      console.error('Error loading deals data', error);
      setDealProducts([]);
    } finally {
      setDealsLoading(false);
    }
  }, [dedupeCategories, user?.id]);

  useEffect(() => {
    if (currentView === 'deals') {
      loadDealsData(activeDealsCategoryId);
    }
  }, [currentView, activeDealsCategoryId, loadDealsData]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price, 0);
  }, [cartItems]);

  const handleSignInClick = () => {
    setPreviousView(currentView);

    // On buyer surfaces show the popover; on seller/admin surfaces route to full auth page
    if (isBuyerSurface(currentView)) {
      setShowBuyerAuthModal(true);
      return;
    }

    setShowBuyerAuthModal(false);
    setCurrentView('buyer-auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOutClick = async () => {
    setAuthNotice(null);
    await signOut();
    setUser(null);
    handleHomeClick();
  };

  const handleAuthSuccess = () => {
    setAuthNotice(null);
    if (showBuyerAuthModal) {
      setShowBuyerAuthModal(false);
    } else {
      handleHomeClick();
    }
  };

  const handleCategoryClick = (categoryIds: string[], title: string, subcategories?: VisualCategory[], newBreadcrumbs?: Breadcrumb[]) => {
    setActiveCategoryIds(categoryIds);
    setProductSectionTitle(title);
    setVisualSubcategories(subcategories || []);
    setBreadcrumbs(newBreadcrumbs || [{ label: 'Home', type: 'home' }, { label: title, type: 'category' }]);
    setSearchQuery('');
    setSelectedVendorId(undefined);
    setCurrentView('search-results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMessageSeller = async (product: Product, initialMessage?: string) => {
    if (!user) {
      handleSignInClick();
      return;
    }

    // Conversations are keyed by the seller's *user id* (products.seller_id / vendors.user_id),
    // not the vendors table primary key (vendors.id).
    let sellerId = product.seller_id || product.vendor?.user_id;

    // If the product object is missing seller_id/vendor.user_id, refetch minimal product data.
    if (!sellerId && product.id) {
      try {
        const fresh = await fetchProductById(product.id.toString());
        sellerId = fresh?.seller_id || fresh?.vendor?.user_id;
      } catch (e) {
        console.warn('[handleMessageSeller] Failed to refetch product for seller_id:', e);
      }
    }

    if (!sellerId) {
      alert('Cannot message this seller.');
      return;
    }

    // Create or get existing conversation
    const conversationId = await createConversation(
      sellerId,
      user.id,
      product.id.toString(),
      `Inquiry about ${product.title}`,
      initialMessage || `Hi, is this item available?`
    );

    if (conversationId) {
      setActiveConversationId(conversationId);
      setAccountPageTitle('Messages');
      setCurrentView('account-page');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleInfoPageClick = (slug: string) => {
    setActiveInfoPageSlug(slug);
    setCurrentView('info-page');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col font-display">
      <NotificationSystem />
      <WebNotificationWrapper
        user={user}
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
        onDeepLink={handleInAppDeepLink}
      />
      {reviewingProductId && (
        <WriteReviewModal
          productId={reviewingProductId}
          userId={user?.id}
          onClose={() => setReviewingProductId(null)}
          onSubmitted={() => setReviewingProductId(null)}
        />
      )}
      {/* Top Banner - Dark Theme (Hide on Seller Login/Auth/Onboarding/Dashboard/Admin) */}
      {currentView !== 'seller-login' && currentView !== 'buyer-auth' && currentView !== 'seller-onboarding' && currentView !== 'seller-dashboard' && currentView !== 'admin-dashboard' && currentView !== 'admin-login' && (
        <div className="bg-black text-white text-xs py-2 hidden sm:block">
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 flex justify-between items-center h-10">

            <div className="flex items-center gap-8 h-full">
              {/* Free Shipping */}
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                <span className="material-icons text-green-500 text-xl">local_shipping</span>
                <div className="flex flex-col leading-none">
                  <span className="font-bold text-green-500 text-[11px] uppercase tracking-wide">Free shipping <span className="material-icons text-[10px] align-middle">chevron_right</span></span>
                  <span className="text-gray-400 text-[10px]">Incredible</span>
                </div>
              </div>

              {/* Price Adjustment */}
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity border-l border-gray-800 pl-8 h-8">
                <span className="material-icons text-yellow-500 text-lg">price_check</span>
                <div className="flex flex-col leading-none">
                  <span className="font-bold text-[11px]">Price adjustment</span>
                  <span className="text-gray-400 text-[10px]">Within 30 days</span>
                </div>
              </div>

              {/* Get App */}
              {a2hs.canShowInstallEntry && (
                <div
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity border-l border-gray-800 pl-8 h-8"
                  onClick={handleInstallAppClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleInstallAppClick();
                    }
                  }}
                >
                  <span className="material-icons text-white text-lg">phone_iphone</span>
                  <span className="font-bold text-[11px]">Get the JuaExpress App</span>
                </div>
              )}
            </div>

            {/* Seller Link */}
            <a
              href="/?view=seller-login"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center bg-gray-900 rounded-full px-1 py-1 pr-4 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer group"
            >
              <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full mr-2">
                Join Now <span className="material-icons text-[10px] align-middle">chevron_right</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] text-gray-400">Start Selling to Millions of</span>
                <span className="text-[10px] font-bold text-white group-hover:text-primary transition-colors">Buyers on JuaExpress</span>
              </div>
            </a>

          </div>
        </div>
      )}

      {adminAccessMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full px-4 sm:px-0">
          <div className="bg-[#0b0b0f] text-white border border-orange-500/60 shadow-2xl rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Admin access only</p>
                <p className="text-xs text-gray-300 leading-relaxed">{adminAccessMessage}</p>
              </div>
              <button
                aria-label="Dismiss admin access message"
                className="text-gray-400 hover:text-white transition-colors"
                onClick={() => setAdminAccessMessage(null)}
              >
                X
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="bg-orange-500 hover:bg-orange-600 text-xs font-bold px-3 py-2 rounded transition-colors"
                onClick={() => {
                  setAdminAccessMessage(null);
                  setCurrentView('admin-login');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Use admin login
              </button>
              <button
                className="bg-gray-800 hover:bg-gray-700 text-xs font-semibold px-3 py-2 rounded transition-colors"
                onClick={() => setAdminAccessMessage(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView !== 'seller-login' && currentView !== 'buyer-auth' && currentView !== 'seller-onboarding' && currentView !== 'seller-dashboard' && currentView !== 'admin-dashboard' && (
        <Header
          onHomeClick={handleHomeClick}
          onFiveStarClick={handleFiveStarClick}
          onBestSellingClick={handleBestSellingClick}
          onSearch={handleSearch}
          onCategoryClick={handleCategoryClick}
          onAccountPageClick={handleAccountPageClick}
          onProductClick={handleProductClick}
          onCheckoutClick={handleCartClick}
          onSignInClick={handleSignInClick}
          onSignOutClick={handleSignOutClick}
          cartItemCount={cartItems.length}
          user={user}
          loyaltyProfile={loyaltyProfile}
          onOpenNotifications={() => {
            setActivityHubTab('notifications');
            setIsActivityHubOpen(true);
          }}
          onCartClick={handleCartClick}
          onCameraClick={() => setIsVisualSearchOpen(true)}
        />
      )}
      <main className={`flex-1 w-full ${currentView !== 'seller-login' && currentView !== 'buyer-auth' && currentView !== 'seller-onboarding' && currentView !== 'seller-dashboard' && currentView !== 'admin-dashboard' && currentView !== 'admin-login' ? `max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 ${(currentView === 'home' || currentView === 'event-deals' || currentView === 'deals') ? 'pt-0 pb-8' : 'py-8'}` : ''}`}>
        {currentView === 'home' && (
          <>
            <HeroSection onProductClick={handleProductClick} />
            <FeaturesBar
              onClick={() => {
                handleInfoPageClick('support-center');
              }}
              hasReviews={true}
            />
            <LightningDealsRow
              userId={user?.id}
              onViewAllDeals={() => handleDealsClick(null)}
              onAddToCart={addToCart}
              onProductClick={handleProductClick}
              eventBanner={eventBanner}
            />
            <ProductSection isFiveStarView={false} onProductClick={handleProductClick} products={products} onAddToCart={addToCart} eventBanner={eventBanner} />
          </>
        )}
        {currentView === 'five-star' && (
          <TopRatedView
            onProductClick={handleProductClick}
            products={products}
            onAddToCart={addToCart}
          />
        )}
        {currentView === 'best-selling' && (
          <BestSellersView
            onProductClick={handleProductClick}
            products={products}
            onAddToCart={addToCart}
          />
        )}
        {currentView === 'deals' && (
          <>
            {eventBanner && eventBanner.eventName !== 'default' && (
              <div
                className="relative left-1/2 -translate-x-1/2 w-screen text-white overflow-hidden"
                style={{
                  background: (eventBanner.backgroundColor && eventBanner.accentColor)
                    ? `linear-gradient(135deg, ${eventBanner.backgroundColor}, ${eventBanner.accentColor})`
                    : 'linear-gradient(135deg, #111827, #fbbf24)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full" />
                <div className="w-full h-20 md:h-24 px-4 sm:px-6 lg:px-8 flex items-center">
                  <div className="mx-auto w-full max-w-7xl flex items-center justify-center">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/20">
                        <img src={getEventIconSrc(eventBanner.iconKey)} alt="" className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/75 leading-none">{eventSectionTitles.lightningDeals.title}</div>
                        <div className="mt-1 text-lg md:text-xl font-extrabold tracking-tight leading-tight">{eventSectionTitles.lightningDeals.headline}</div>
                        <div className="mt-0.5 text-sm text-white/85 leading-snug">{eventSectionTitles.lightningDeals.subtitle}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DealsNavBar
              categories={dealCategories}
              loading={dealsLoading}
              onSelectCategory={(categoryId) => setActiveDealsCategoryId(categoryId)}
            />
            <ProductSection
              title="Top Deals"
              isFiveStarView={false}
              onProductClick={handleProductClick}
              products={dealProducts}
              onAddToCart={addToCart}
              showCategoryPills={false}
              eventBanner={eventBanner}
            />
          </>
        )}
        {currentView === 'search-results' && (
          <ProductSection
            searchQuery={searchQuery}
            initialCategoryIds={activeCategoryIds}
            title={productSectionTitle}
            vendorId={selectedVendorId}
            onProductClick={handleProductClick}
            products={products}
            onAddToCart={addToCart}
            visualCategories={visualSubcategories}
            onCategoryClick={handleCategoryClick}
            breadcrumbs={breadcrumbs}
            onHomeClick={handleHomeClick}
            eventBanner={eventBanner}
          />
        )}

        {currentView === 'event-deals' && (
          <>
            {eventBanner && eventBanner.eventName !== 'default' && (
              <div
                className="relative left-1/2 -translate-x-1/2 w-screen z-20 text-white overflow-hidden"
                style={{
                  background: (eventBanner.backgroundColor && eventBanner.accentColor)
                    ? `linear-gradient(135deg, ${eventBanner.backgroundColor}, ${eventBanner.accentColor})`
                    : 'linear-gradient(135deg, #111827, #fbbf24)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-none" />
                <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-2">
                  <div className="mx-auto w-full max-w-7xl flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/20">
                        <img src={getEventIconSrc(eventBanner.iconKey)} alt="" className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col text-center sm:text-left">
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/70 leading-none">{eventBanner.eventName}</span>
                        <div className="text-sm font-black tracking-tight uppercase mt-0.5 flex flex-wrap items-baseline justify-center sm:justify-start gap-x-2">
                          <span className="line-clamp-1">{eventBanner.headline}</span>
                          <span className="opacity-60 font-bold text-xs lowercase italic hidden lg:inline">— {eventBanner.subheadline}</span>
                        </div>
                      </div>
                    </div>

                    <span className="px-6 py-2 bg-white text-black text-xs font-black rounded-full shadow-xl whitespace-nowrap">
                      {eventBanner.cta}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <ProductSection
              searchQuery={searchQuery}
              title={productSectionTitle || eventBanner?.headline || 'Event Deals'}
              onProductClick={handleProductClick}
              products={products}
              onAddToCart={addToCart}
              eventBanner={eventBanner}
            />
          </>
        )}
        {currentView === 'product-detail' && selectedProduct && (
          <ProductDetailView
            product={selectedProduct}
            onProductClick={handleProductClick}
            onRelatedProductClick={handleRelatedProductClick}
            onAddToCart={addToCart}
            user={user}
            onVisitStore={handleVisitStore}
            breadcrumbs={breadcrumbs}
            onHomeClick={handleHomeClick}
            onCategoryClick={handleCategoryClick}
            onMessageSeller={handleMessageSeller}
          />
        )}
        {currentView === 'vendor-store' && activeVendorStoreId && (
          <VendorStoreView
            vendorId={activeVendorStoreId}
            user={user}
            onBack={() => {
              setActiveVendorStoreId(null);
              setCurrentView('home');
              window.history.replaceState(window.history.state, '', window.location.pathname);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onProductClick={handleProductClick}
            onAddToCart={addToCart}
          />
        )}
        {currentView === 'checkout' && (
          <CheckoutView
            cartItems={cartItems}
            totalAmount={cartSubtotal}
            userId={user?.id}
            onCheckoutComplete={async (orderId, email) => {
              setCartItems([]);
              // Fetch order number for display
              try {
                const { fetchOrderDetails } = await import('./lib/api');
                const orderDetails = await fetchOrderDetails(orderId);
                setCompletedOrderInfo({
                  orderId,
                  orderNumber: orderDetails?.order_number || orderId,
                  email: email || user?.email
                });
              } catch {
                setCompletedOrderInfo({ orderId, email: email || user?.email });
              }
              setCurrentView('order-confirmation');
            }}
          />
        )}
        {currentView === 'order-confirmation' && (
          <OrderConfirmationView
            orderNumber={completedOrderInfo?.orderNumber}
            customerEmail={completedOrderInfo?.email || user?.email || 'your email'}
            onContinueShopping={() => {
              setCompletedOrderInfo(null);
              setCurrentView('home');
            }}
            onTrackOrder={() => {
              setCurrentView('track-order');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        {currentView === 'track-order' && (
          <TrackOrderView
            onBack={() => setCurrentView('home')}
            initialOrderId={completedOrderInfo?.orderId}
            initialEmail={completedOrderInfo?.email || user?.email}
          />
        )}
        {currentView === 'cart' && (
          <CartView
            cartItems={cartItems}
            onRemoveFromCart={handleRemoveFromCartLegacy}
            onUpdateQuantity={handleUpdateQuantity}
            onCheckoutClick={handleCheckoutClick}
            onHomeClick={handleHomeClick}
            userId={user?.id}
          />
        )}
        {currentView === 'wishlist' && user && (
          <WishlistView
            user={user}
            onBack={handleHomeClick}
            onProductClick={handleProductClick}
            onAddToCart={(product) => {
              setCartItems(prev => [...prev, product]);
            }}
          />
        )}
        {currentView === 'account-page' && (
          <AccountPageView
            pageTitle={accountPageTitle}
            onProductClick={handleProductClick}
            user={user}
            onNavigate={handleAccountPageClick}
            onVisitStore={handleVisitStore}
            activeConversationId={activeConversationId}
            onAddToCart={addToCart}
          />
        )}
        {currentView === 'buyer-auth' && (
          <BuyerAuthView
            onAuthSuccess={handleAuthSuccess}
            authContext={previousView === 'seller-login' ? { view: 'seller-onboarding' } : undefined}
            externalError={authNotice || undefined}
            onCreateAccountClick={previousView === 'seller-login' ? () => {
              setCurrentView('seller-onboarding');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } : undefined}
          />
        )}
        {currentView === 'seller-login' && (
          <SellerLoginView
            onSignUpClick={() => {
              if (!user?.id) {
                setAuthNotice('Please sign in as a buyer first to register as a seller.');
                handleSignInClick();
                return;
              }
              setCurrentView('seller-onboarding');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSignInClick={handleSignInClick}
          />
        )}
        {currentView === 'seller-onboarding' && !user?.id && (
          <BuyerAuthView
            onAuthSuccess={handleAuthSuccess}
            authContext={{ view: 'seller-onboarding' }}
            externalError={authNotice || 'Please sign in as a buyer first to register as a seller.'}
          />
        )}
        {currentView === 'seller-onboarding' && user?.id && (
          <SellerOnboardingView
            onComplete={async () => {
              try {
                const sellerProfile = await fetchSellerProfile(user.id);
                if (sellerProfile) {
                  setUser(prev => (prev ? { ...prev, role: 'seller' } : prev));
                }
              } catch {
                // Non-blocking
              }
              setCurrentView('seller-dashboard');
              setDashboardTab('account-profile');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onCancel={() => {
              setCurrentView('seller-login');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        {currentView === 'seller-dashboard' && (
          <SellerDashboardLayout
            activeTab={dashboardTab}
            onTabChange={setDashboardTab}
            user={user}
            onSignOut={handleSignOutClick}
            onSupportClick={handleSupportClick}
          >
            {dashboardTab === 'overview' && <DashboardOverview sellerId={user?.id} />}
            {dashboardTab === 'manage-products' && (
              <ManageProductsView
                sellerId={user?.id || ''}
                onAddProduct={() => setDashboardTab('add-products')}
              />
            )}
            {dashboardTab === 'add-products' && (
              <AddProductView
                sellerId={user?.id || ''}
                onCancel={() => setDashboardTab('manage-products')}
                onSuccess={() => setDashboardTab('manage-products')}
              />
            )}
            {dashboardTab === 'add-products-upload' && <AddProductsUploadView sellerId={user?.id || ''} />}
            {dashboardTab === 'pricing-health' && <PricingHealthView sellerId={user?.id || ''} />}
            {dashboardTab === 'product-compliance' && <ProductComplianceView sellerId={user?.id || ''} />}
            {dashboardTab === 'orders' && <OrdersView sellerId={user?.id} />}
            {dashboardTab === 'manage-orders' && <ManageOrdersView sellerId={user?.id || ''} />}
            {dashboardTab === 'manage-returns' && <ManageReturnsView />}
            {dashboardTab === 'order-reports' && <OrderReportsView />}
            {dashboardTab === 'upload-order-files' && <UploadOrderFilesView />}
            {dashboardTab === 'manage-reviews' && <ManageReviewsView sellerId={user?.id || ''} />}
            {dashboardTab === 'promotions-coupons' && <PromotionsCouponsView sellerId={user?.id || ''} onNavigate={setDashboardTab as any} />}
            {dashboardTab === 'promotions-campaigns' && <PromotionalCampaignsView sellerId={user?.id || ''} />}
            {dashboardTab === 'create-coupon' && (
              <CreateCouponView
                sellerId={user?.id || ''}
                onSuccess={() => setDashboardTab('promotions-coupons')}
                onCancel={() => setDashboardTab('promotions-coupons')}
              />
            )}  {/* Can be linked from internal button */}
            {dashboardTab === 'promotions' && <PromotionalCampaignsView sellerId={user?.id || ''} />} {/* Default promo view */}
            {dashboardTab === 'create-auto-discount' && (
              <CreateAutomaticDiscountView
                sellerId={user?.id || ''}
                onSuccess={() => setDashboardTab('promotions-coupons')}
                onCancel={() => setDashboardTab('promotions-coupons')}
              />
            )}
            {dashboardTab === 'finance-payments' && <PaymentsView sellerId={user?.id || ''} />}
            {dashboardTab === 'finance-wallet' && <WalletView sellerId={user?.id || ''} />}
            {dashboardTab === 'finance-charge-method' && <ChargeMethodView sellerId={user?.id || ''} />}
            {dashboardTab === 'finances' && <WalletView sellerId={user?.id || ''} />}
            {dashboardTab === 'performance' && <SellerPerformanceView />}
            {dashboardTab === 'apps' && <AppsServiceView />}
            {dashboardTab === 'account-shipping' && <ShippingSettingsView sellerId={user?.id || ''} onNavigate={setDashboardTab as any} />}
            {dashboardTab === 'account-shipping-template' && <EditShippingTemplateView sellerId={user?.id || ''} onBack={() => setDashboardTab('account-shipping')} onSave={() => setDashboardTab('account-shipping')} />}
            {dashboardTab === 'account-seller-profile' && <SellerProfileView sellerId={user?.id || ''} />}
            {dashboardTab === 'account-return' && <ReturnSettingsView sellerId={user?.id || ''} />}
            {dashboardTab === 'account-tax' && <SellerProfileView sellerId={user?.id || ''} />} {/* Tax info is in profile */}
            {dashboardTab === 'account-notifications' && <SellerProfileView sellerId={user?.id || ''} />} {/* Notifications in profile */}
            {dashboardTab === 'account-permissions' && <div className="p-8 text-gray-500">User permissions feature coming soon</div>}
            {dashboardTab === 'store-branding' && <StoreMediaManager sellerId={user?.id} userId={user?.id} />}
            {dashboardTab === 'messages' && <SellerMessagesView sellerId={user?.id || ''} onNavigate={setDashboardTab as any} initialConversationId={activeConversationId} />}
          </SellerDashboardLayout>
        )}
        {currentView === 'admin-login' && (
          <AdminLoginView
            onSuccess={(perms) => {
              setAdminPermissions(perms);
              setCurrentView('admin-dashboard');
              setAdminTab('overview');
              // Preload embedding model for admin
              import('@/lib/embedding').then(({ EmbeddingService }) => {
                EmbeddingService.getInstance().preloadModel();
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onCancel={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        {currentView === 'admin-dashboard' && (
          <AdminDashboardLayout
            activeTab={adminTab}
            onTabChange={(tab) => setAdminTab(tab as any)}
            user={user}
            permissions={adminPermissions!}
            onSignOut={handleSignOutClick}
          >
            {adminTab === 'overview' && <AdminDashboardOverview permissions={adminPermissions!} />}
            {adminTab === 'products' && <ProductApprovalView permissions={adminPermissions!} />}
            {adminTab === 'sellers' && <SellerVerificationView permissions={adminPermissions!} />}
            {adminTab === 'drivers' && <DriverVerificationView permissions={adminPermissions!} />}
            {adminTab === 'users' && <UserManagementView permissions={adminPermissions!} />}
            {adminTab === 'orders' && <OrderManagementView />}
            {adminTab === 'disputes' && <DisputeManagementView />}
            {adminTab === 'moderation' && <ModerationQueueView />}
            {adminTab === 'finances' && <PayoutApprovalsView permissions={adminPermissions!} />}
            {adminTab === 'ai' && <AdminAIControlsView permissions={adminPermissions!} />}
            {adminTab === 'messages' && <AdminMessagesView adminId={user?.id || ''} permissions={adminPermissions!} />}
            {adminTab === 'content' && <ContentManagementView permissions={adminPermissions!} />}
            {adminTab === 'activity' && <ActivityLogView permissions={adminPermissions!} />}
            {adminTab === 'feedback' && <FeedbackSupportView />}
          </AdminDashboardLayout>
        )}
        {currentView === 'driver-dashboard' && (
          <DriverDashboardLayout
            activeTab={driverTab}
            onTabChange={setDriverTab}
            user={user}
            onSignOut={handleSignOutClick}
          >
            {driverTab === 'jobs' && <WebDriverDashboard partnerId={user?.id || ''} />}
            {driverTab === 'earnings' && <WebDriverEarningsView partnerId={user?.id || ''} />}
            {driverTab === 'vehicles' && <WebDriverVehiclesView partnerId={user?.id || ''} />}
            {driverTab === 'profile' && <WebDriverProfileView partnerId={user?.id || ''} />}
          </DriverDashboardLayout>
        )}
        {currentView === 'driver-login' && (
          <DriverLoginView
            onSignUpClick={() => setCurrentView('driver-onboarding')}
            onSignInClick={() => {
              sessionStorage.setItem('auth_context', JSON.stringify({ view: 'driver-dashboard' }));
              setCurrentView('buyer-auth');
            }}
          />
        )}
        {currentView === 'driver-onboarding' && (
          <DriverOnboardingView
            onComplete={() => setCurrentView('driver-dashboard')}
            onCancel={() => setCurrentView('home')}
          />
        )}
        {currentView === 'info-page' && (
          <InfoPageView
            slug={activeInfoPageSlug}
            onClose={() => setCurrentView('home')}
            onNavigate={setActiveInfoPageSlug}
          />
        )}
        {currentView === 'platform-reviews' && (
          <PlatformReviewsPage
            reviews={platformReviews}
            onBack={() => {
              if (window.opener) {
                window.close();
              } else {
                handleHomeClick();
              }
            }}
          />
        )}
      </main>
      {showBuyerAuthModal && isBuyerSurface(currentView) && (
        <div className="fixed top-16 right-4 z-[90]">
          <BuyerAuthView
            isModal
            variant="compactPopover"
            onAuthSuccess={() => {
              setAuthNotice(null);
              setShowBuyerAuthModal(false);
            }}
            onClose={() => {
              setAuthNotice(null);
              setShowBuyerAuthModal(false);
            }}
            authContext={previousView === 'seller-login' ? { view: 'seller-onboarding' } : undefined}
            externalError={authNotice || undefined}
          />
        </div>
      )}

      {currentView !== 'seller-login' && currentView !== 'buyer-auth' && currentView !== 'seller-onboarding' && currentView !== 'seller-dashboard' && currentView !== 'admin-dashboard' && currentView !== 'admin-login' && currentView !== 'driver-login' && currentView !== 'driver-onboarding' && currentView !== 'driver-dashboard' && (
        <Footer
          onAdminClick={async () => {
            sessionStorage.setItem('auth_context', JSON.stringify({ view: 'admin-login' }));

            // If user is already validated as admin, take them straight in
            if (user && adminPermissions?.is_active) {
              setAdminTab('overview');
              setAdminAccessMessage(null);
              setCurrentView('admin-dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }

            // If logged in, validate admin permissions immediately
            if (user) {
              const perms = await checkAdminPermission(user.id);
              if (perms?.is_active) {
                setAdminPermissions(perms);
                setAdminTab('overview');
                setAdminAccessMessage(null);
                setCurrentView('admin-dashboard');
                import('@/lib/embedding').then(({ EmbeddingService }) => {
                  EmbeddingService.getInstance().preloadModel();
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }

              setAdminAccessMessage('This is an admin-only area. Please sign in with an admin-approved account.');
              setCurrentView('home');
              return;
            }

            // Otherwise, send to admin login to authenticate
            setCurrentView('admin-login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onDriverClick={handleDriverDashboardClick}
          onSellerClick={() => {
            setCurrentView('seller-login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onInfoPageClick={handleInfoPageClick}
        />
      )}
      {isBuyerSurface(currentView) && (
        <FloatingWidget
          user={user}
          activeConversationId={activeConversationId}
          onRequireAuth={() => setShowBuyerAuthModal(true)}
          userCoupons={userCoupons}
          recentOrders={recentOrders}
          isOpen={isActivityHubOpen}
          onClose={() => setIsActivityHubOpen(false)}
          onOpen={() => setIsActivityHubOpen(true)}
          activePane={activityHubTab}
          onPaneChange={setActivityHubTab}
        />
      )}
      <CartSidebar
        isOpen={isCartSidebarOpen}
        onClose={() => setIsCartSidebarOpen(false)}
        cartItems={cartItems}
        onViewCart={() => {
          setIsCartSidebarOpen(false);
          setCurrentView('cart');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onCheckout={() => {
          setIsCartSidebarOpen(false);
          setCurrentView('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onRemoveItem={(productId) => handleRemoveFromCartLegacy(productId)}
        onUpdateQuantity={handleUpdateCartQuantityDirect}
      />
      <PlatformReviewsModal
        isOpen={isPlatformReviewsOpen}
        onClose={() => setIsPlatformReviewsOpen(false)}
        reviews={platformReviews}
      />
      {isVisualSearchOpen && (
        <VisualSearchSheet
          onClose={() => setIsVisualSearchOpen(false)}
          onSearchResults={(searchQuery, keywords) => {
            setIsVisualSearchOpen(false);
            // Use the AI query for search but don't expose it in the UI
            // Set a visual search flag or use a clean display title
            const internalQuery = searchQuery || keywords.join(' ');
            if (internalQuery) {
              // Perform the search with AI query but show generic title
              setSearchQuery(internalQuery);
              setSelectedVendorId(undefined);
              setActiveCategoryIds([]);
              setVisualSubcategories([]);
              setProductSectionTitle('Visual Search Results');
              setCurrentView('search-results');
              setBreadcrumbs([]);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              trackSearch(internalQuery);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
