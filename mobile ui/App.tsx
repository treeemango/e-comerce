import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { NewArrivalsScreen } from './components/NewArrivalsScreen';
import { CheckoutSheet } from './components/CheckoutSheet';
import { OrderSuccessSheet } from './components/OrderSuccessSheet';
import TrackOrderSheet from './components/TrackOrderSheet';
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
import { BuyerProfileView } from './components/BuyerProfileView';
import { fetchProducts, fetchNavbarCategories, NavbarCategory, getSellerUnreadCount, fetchRecentViews, createConversation, fetchBuyerOrders, confirmOrderReceiptBuyer, getOrderQRCodeURL, raiseDeliveryDispute, fetchProductById, fetchPlatformReviewCount, ensureSupportConversation, fetchRelatedProducts } from '@/lib/api';
import { Product, Review, UserCoupon, BuyerOrder, RelatedProduct } from '@/types';
import { getCurrentUser, getUserProfile, signOut, AuthUser, signInWithGoogle, isAccountBanned, syncPublicUserProfileFromAuthUser } from '@/lib/auth';
import { MobileNotificationWrapper } from './components/MobileNotificationWrapper';
import type { NotificationAction } from '../components/NotificationContext';
import { formatPrice, getUserCurrency, setUserCurrency } from '@/lib/currency';
import { useNotifications } from '@/components/NotificationContext';
import { playCartAddSound } from '@/lib/sounds';
import NotificationSystem from '@/components/NotificationSystem';
import NotificationInbox from '@/components/NotificationInbox';
import { WriteReviewModal } from '@/components/WriteReviewModal';
import { MobileFeedbackSheet } from './components/MobileFeedbackSheet';
import MobileWriteReviewSheet from './components/MobileWriteReviewSheet';
import { PlatformReviewsView } from './components/PlatformReviewsView';
import { fetchTopPlatformReviews } from '@/lib/api';
import InfoPageView from '../components/InfoPageView';
import OrderTrackingTimeline from './components/OrderTrackingTimeline';
import {
    getExistingPushSubscription,
    getPushSupportStatus,
    removePushSubscriptionFromBackend,
    savePushSubscriptionToBackend,
    subscribeToPush,
    unsubscribeFromPush,
} from '@/lib/push';


import VisualSearchSheet from './components/VisualSearchSheet';
import { MobileCouponsView } from './components/MobileCouponsView';
import { OrderPrice } from '@/components/OrderPrice';
import { detectUserCurrency } from '@/lib/currency-service';
import { trackProductViewAuto } from '@/lib/tracking';
import { useSwipeGesture } from './hooks/useSwipeGesture';
import { fetchEventBanner, type EventBannerData } from '@/lib/event-banner-service';

type AccountSectionKey = 'orders' | 'coupons' | 'credit' | 'reviews' | 'wishlist' | 'stores' | 'history' | 'addresses' | 'support' | 'settings' | 'switch' | 'logout' | 'messages' | 'driver_access' | 'notifications' | 'profile';

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
    const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
    const [trackOrderPrefill, setTrackOrderPrefill] = useState<{ orderId?: string; email?: string }>({});
    const [expandedTrackingOrderId, setExpandedTrackingOrderId] = useState<string | null>(null);
    const [buyerMessageCount, setBuyerMessageCount] = useState(0);
    const [onboardingType, setOnboardingType] = useState<'seller' | 'driver' | null>(null);
    const [cartToast, setCartToast] = useState<{ show: boolean, productName: string } | null>(null);
    const [authToast, setAuthToast] = useState<string | null>(null);
    const [isOrderSuccessOpen, setIsOrderSuccessOpen] = useState(false);
    const [visualSearchProduct, setVisualSearchProduct] = useState<Product | null>(null);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [reviewingProductId, setReviewingProductId] = useState<string | null>(null);
    const [activeSellerConversationId, setActiveSellerConversationId] = useState<string | null>(null);
    const [activeBuyerConversationId, setActiveBuyerConversationId] = useState<string | null>(null);
    const [activeOrderFilter, setActiveOrderFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered'>('all'); // Add filter state
    const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
    const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
    const [showQRCodeOrderId, setShowQRCodeOrderId] = useState<string | null>(null);
    const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
    const [isVisualSearchActive, setIsVisualSearchActive] = useState(false);
    const [disputingOrderId, setDisputingOrderId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
    const [, setPreferredCurrency] = useState(getUserCurrency());
    const [eventBanner, setEventBanner] = useState<EventBannerData | null>(null);
    const [eventDealsTitle, setEventDealsTitle] = useState<string | null>(null);

    const orderedDepartments = useMemo(() => {
        const byId = new Map<string, { id: string; name: string; sort: number }>();

        for (const category of categories) {
            if (!category.department_id) continue;
            const existing = byId.get(category.department_id);
            if (!existing || category.department_sort_order < existing.sort) {
                byId.set(category.department_id, {
                    id: category.department_id,
                    name: category.department_name,
                    sort: category.department_sort_order,
                });
            }
        }

        return Array.from(byId.values())
            .sort((a, b) => a.sort - b.sort)
            .map(({ id, name }) => ({ id, name }));
    }, [categories]);

    const departmentToCategoryIds = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const category of categories) {
            if (!category.department_id || !category.category_id) continue;
            const set = map.get(category.department_id) ?? new Set<string>();
            set.add(category.category_id);
            map.set(category.department_id, set);
        }
        return map;
    }, [categories]);

    const firstDepartmentWithProducts = useMemo(() => {
        if (!orderedDepartments.length) return null;
        if (!products.length) return orderedDepartments[0];

        for (const dept of orderedDepartments) {
            const categoryIds = departmentToCategoryIds.get(dept.id);
            if (!categoryIds || categoryIds.size === 0) continue;
            const hasAny = products.some((p) => p.categoryId && categoryIds.has(String(p.categoryId)));
            if (hasAny) return dept;
        }
        return orderedDepartments[0];
    }, [departmentToCategoryIds, orderedDepartments, products]);

    const { history: notificationHistory } = useNotifications();
    const notificationCount = userProfile?.id
        ? notificationHistory.filter((n) => n.is_read === false || n.is_read === undefined).length
        : 0;

    // Modern Notification & Data Sync State
    const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
    const [recentOrders, setRecentOrders] = useState<BuyerOrder[]>([]);
    const [isFeedbackSheetOpen, setIsFeedbackSheetOpen] = useState(false);
    const [isPlatformReviewsOpen, setIsPlatformReviewsOpen] = useState(false);
    const [platformReviews, setPlatformReviews] = useState<Review[]>([]);
    const [hasPlatformReviews, setHasPlatformReviews] = useState(true);
    const [inspiredProducts, setInspiredProducts] = useState<RelatedProduct[]>([]);
    const [inspiredLoading, setInspiredLoading] = useState(false);

    const [isInfoPageOpen, setIsInfoPageOpen] = useState(false);
    const [activeInfoPageSlug, setActiveInfoPageSlug] = useState<string>('support-center');

    const openDepartmentOverlay = useCallback((departmentId: string, departmentName: string) => {
        setCategoryViewOpen({ departmentId, departmentName });
        setSelectedCategoryForSubs({ id: departmentId, name: departmentName });
        setActiveCategoryId(departmentId);
        setActiveSubcategoryId('all');
    }, []);

    const closeCategoryOverlay = useCallback(() => {
        setCategoryViewOpen(null);
        setSelectedCategoryForSubs(null);
        setActiveSubcategoryId('all');
        setActiveCategoryId('all');
    }, []);

    const shouldIgnoreSwipe = useCallback((e: TouchEvent) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return false;

        // Allow opting out via attribute (useful for carousels/chips)
        if (target.closest('[data-swipe-ignore="true"]')) return true;

        const tag = target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
        if (target.isContentEditable) return true;

        // Avoid fighting with horizontal scrollers/carousels
        let el: HTMLElement | null = target;
        while (el) {
            const style = window.getComputedStyle(el);
            const overflowX = style.overflowX;
            if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 4) {
                return true;
            }
            el = el.parentElement;
        }

        return false;
    }, []);

    const cycleDepartment = useCallback((
        direction: 1 | -1,
        options?: { wrap?: boolean; exitToMainOnRightUnderflow?: boolean }
    ) => {
        if (!orderedDepartments.length) return;

        const wrap = options?.wrap ?? true;
        const exitToMainOnRightUnderflow = options?.exitToMainOnRightUnderflow ?? false;

        const currentId =
            categoryViewOpen?.departmentId ||
            (activeCategoryId !== 'all' && activeCategoryId !== '' ? activeCategoryId : orderedDepartments[0].id);

        let currentIndex = orderedDepartments.findIndex((d) => d.id === currentId);
        if (currentIndex < 0) currentIndex = 0;

        // Special UX: swiping right past the first department exits back to main page
        if (direction === -1 && exitToMainOnRightUnderflow && currentIndex === 0) {
            closeCategoryOverlay();
            return;
        }

        let nextIndex = currentIndex + direction;

        if (wrap) {
            nextIndex = (nextIndex + orderedDepartments.length) % orderedDepartments.length;
        } else {
            nextIndex = Math.min(Math.max(nextIndex, 0), orderedDepartments.length - 1);
        }

        const next = orderedDepartments[nextIndex];
        openDepartmentOverlay(next.id, next.name);
    }, [activeCategoryId, categoryViewOpen?.departmentId, closeCategoryOverlay, openDepartmentOverlay, orderedDepartments]);

    // Swipe shortcut (modern): swipe-left opens category overlay; in overlay swipe cycles chip categories
    useSwipeGesture({
        onSwipeLeft: () => {
            if (selectedProduct || isAccountOpen || isSearchOpen) return;

            if (categoryViewOpen) {
                cycleDepartment(1, { wrap: true });
                return;
            }

            if (activeTab === 'home' && orderedDepartments.length) {
                setSearchQuery(null);
                setActiveAccountSection(null);
                const first = firstDepartmentWithProducts ?? orderedDepartments[0];
                openDepartmentOverlay(first.id, first.name);
            }
        },
        onSwipeRight: () => {
            if (selectedProduct || isAccountOpen || isSearchOpen) return;
            if (categoryViewOpen) {
                cycleDepartment(-1, { wrap: false, exitToMainOnRightUnderflow: true });
            }
        },
        // Allow right-swipe anywhere (not just from left edge) for chip cycling
        minEdgeOffset: 99999,
        shouldIgnore: shouldIgnoreSwipe
    });

    const refreshUserProfile = useCallback(async () => {
        const user = await getCurrentUser();
        if (user?.id) {
            await syncPublicUserProfileFromAuthUser(user);
            const profile = await getUserProfile(user.id);

            if (isAccountBanned(profile)) {
                await signOut();
                setUserProfile(null);
                setAuthToast('Your account has been banned.');
                setTimeout(() => setAuthToast(null), 3500);
                return;
            }

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

                // Check review availability
                fetchPlatformReviewCount().then(count => setHasPlatformReviews(count > 0));
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
        fetchEventBanner().then(setEventBanner).catch(console.error);
    }, []);

    // Auto-detect and persist currency preference for mobile users
    useEffect(() => {
        const syncCurrencyPreference = async () => {
            try {
                const detected = await detectUserCurrency();
                const current = getUserCurrency();

                if (detected && detected !== current) {
                    setUserCurrency(detected);
                    setPreferredCurrency(detected);
                } else {
                    setPreferredCurrency(current);
                }
            } catch (error) {
                console.error('Error auto-detecting currency for mobile:', error);
            }
        };

        syncCurrencyPreference();
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

    // Load inspired products when browsing history section is opened - match ALL items
    useEffect(() => {
        const loadInspiredProducts = async () => {
            if (activeAccountSection === 'history' && recentViews.length > 0) {
                setInspiredLoading(true);
                try {
                    // Fetch related products for ALL browsing history items
                    const allRelated: RelatedProduct[] = [];
                    const seenIds = new Set<string>();

                    // Add viewed product IDs to exclude them from results
                    recentViews.forEach(rv => seenIds.add(String(rv.id)));

                    // Fetch similar products for each viewed item (limit to first 5 for performance)
                    const itemsToCheck = recentViews.slice(0, 5);

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

                    // Limit to 12 products
                    setInspiredProducts(allRelated.slice(0, 12));
                } catch (error) {
                    console.error('Error loading inspired products:', error);
                    setInspiredProducts([]);
                } finally {
                    setInspiredLoading(false);
                }
            }
        };
        loadInspiredProducts();
    }, [activeAccountSection, recentViews]);

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
        // Handle initial URL state for deep linking
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        const infoSlug = params.get('slug');
        const productId = params.get('product_id');
        const orderId = params.get('order_id');
        const vendorId = params.get('vendorId');
        const chatId = params.get('chat_id');
        const searchParam = params.get('search');
        const viewDeal = params.get('view') === 'deals';
        const viewEventDeals = params.get('view') === 'event-deals';

        if (view === 'info-page') {
            setActiveInfoPageSlug(infoSlug || 'support-center');
            setIsInfoPageOpen(true);
        } else if (view === 'platform-reviews') {
            const loadReviews = async () => {
                const reviews = await fetchTopPlatformReviews(20);
                setPlatformReviews(reviews);
                setIsPlatformReviewsOpen(true);
            };
            loadReviews();
        } else if (view === 'vendor-store' && vendorId) {
            setSelectedVendorId(vendorId);
        } else if (chatId) {
            const role = userProfile?.role?.toString?.().toLowerCase?.();
            const sellerRoles = new Set(['seller', 'vendor', 'admin', 'staff']);
            const isSeller = !!role && sellerRoles.has(role);
            if (isSeller) {
                setActiveTab('you');
                setSellerView('dashboard');
                setIsAccountOpen(false);
                setActiveSellerConversationId(chatId || 'inbox');
            } else {
                setIsAccountOpen(false);
                setActiveAccountSection('messages');
                setActiveBuyerConversationId(chatId === 'inbox' ? null : chatId);
            }
        } else if (viewDeal) {
            setActiveTab('deals');
        } else if (viewEventDeals) {
            const eventTitle = params.get('event') || 'Event Deals';
            const search = params.get('search') || params.get('event') || '';
            setEventDealsTitle(eventTitle);
            if (search) handleSearch(search);
        } else if (productId) {
            // Deep link to product
            const loadDeepLinkProduct = async () => {
                try {
                    const product = await fetchProductById(productId);
                    if (product) {
                        setSelectedProduct(product);
                    }
                } catch (err) {
                    console.error('Error loading deep link product:', err);
                }
            };
            loadDeepLinkProduct();
        } else if (searchParam) {
            handleSearch(searchParam);
        } else if (orderId) {
            // Deep link to order details (via Account > Orders)
            // We set the active account section to orders.
            // Ideally we would also scroll to the order or open it, but switching view is a good start.
            setIsAccountOpen(false);
            setActiveAccountSection('orders');
        }
    }, [userProfile]);

    useEffect(() => {
        const onPopState = (event: PopStateEvent) => {
            const view = (event.state as any)?.view;

            // Support direct back/forward navigation for event-deals deep links
            {
                const params = new URLSearchParams(window.location.search);
                const urlView = params.get('view');
                if (urlView === 'event-deals') {
                    const eventTitle = params.get('event') || 'Event Deals';
                    const search = params.get('search') || params.get('event') || '';
                    setEventDealsTitle(eventTitle);
                    if (search) {
                        handleSearch(search);
                        return;
                    }
                }
            }

            if (selectedProduct) {
                setSelectedProduct(null);
                return;
            }
            if (isSearchOpen) {
                setIsSearchOpen(false);
                setSearchQuery(null);
                setEventDealsTitle(null);
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
            if (isPlatformReviewsOpen) {
                setIsPlatformReviewsOpen(false);
                setPlatformReviews([]);
                return;
            }

            if (isInfoPageOpen) {
                setIsInfoPageOpen(false);
                return;
            }

            if (view === 'info-page') {
                const slug = (event.state as any)?.slug;
                setActiveInfoPageSlug(typeof slug === 'string' ? slug : 'support-center');
                setIsInfoPageOpen(true);
                return;
            }
            if (view === 'platform-reviews') {
                setIsPlatformReviewsOpen(false); // Close if popping state back from it? Or open?
                // Actually popstate handles "going back". If we go back to a state where view is NOT platform-reviews, we should close it.
                // If we popstate TO platform-reviews, we should open it.
            }

            if (isPlatformReviewsOpen && view !== 'platform-reviews') {
                setIsPlatformReviewsOpen(false);
                setPlatformReviews([]);
                return;
            }

            if (view === 'platform-reviews') {
                // Creating an async wrapper to fetch reviews if opened via history navigation
                const loadReviews = async () => {
                    const reviews = await fetchTopPlatformReviews(20);
                    setPlatformReviews(reviews);
                    setIsPlatformReviewsOpen(true);
                };
                loadReviews();
                return;
            }

            if (typeof view === 'string') {
                setActiveTab(view);
            }
        };

        window.addEventListener('popstate', onPopState);
        window.history.replaceState({ view: activeTab }, '', window.location.href);
        return () => window.removeEventListener('popstate', onPopState);
    }, [activeTab, isAccountOpen, isSearchOpen, onboardingType, selectedProduct, isPlatformReviewsOpen, isInfoPageOpen]);

    const openInfoPage = useCallback((slug: string) => {
        setActiveInfoPageSlug(slug);
        setIsInfoPageOpen(true);
        window.history.pushState({ view: 'info-page', slug }, '', `?view=info-page&slug=${encodeURIComponent(slug)}`);
    }, []);

    const handleInAppDeepLink = useCallback(async (type: 'product' | 'order' | 'chat', id: string) => {
        console.log(`Handling in-app deep link: ${type} ${id}`);
        const role = userProfile?.role?.toString?.().toLowerCase?.();
        const sellerRoles = new Set(['seller', 'vendor', 'admin', 'staff']);
        const isSeller = !!role && sellerRoles.has(role);

        if (type === 'product') {
            try {
                const product = await fetchProductById(id);
                if (product) {
                    setSelectedProduct(product);
                    // Also close any overlays that might block view
                    setIsAccountOpen(false);
                    setIsSearchOpen(false);
                }
            } catch (err) {
                console.error('Error handling in-app deep link (product):', err);
            }
        } else if (type === 'order') {
            if (isSeller) {
                setActiveTab('you');
                setSellerView('dashboard');
                setIsAccountOpen(false);
            } else {
                setIsAccountOpen(false);
                setActiveAccountSection('orders');
                // If we supported expanding order details directly, we would do it here.
            }
        } else if (type === 'chat') {
            if (isSeller) {
                setActiveTab('you');
                setSellerView('dashboard');
                setIsAccountOpen(false);
                setActiveSellerConversationId(id || 'inbox');
            } else {
                setIsAccountOpen(false);
                setActiveAccountSection('messages');
                setActiveBuyerConversationId(id === 'inbox' ? null : id);
            }
        }
    }, [userProfile]);

    useEffect(() => {
        const handler = (event: Event) => {
            const action = (event as CustomEvent<NotificationAction>).detail;
            if (!action?.target) return;

            if (action.target === 'wishlist') {
                setIsAccountOpen(false);
                setActiveAccountSection('wishlist');
                return;
            }

            if (action.target === 'coupons') {
                setIsAccountOpen(false);
                setActiveAccountSection('coupons');
                return;
            }

            if (action.target === 'inventory') {
                setActiveTab('you');
                setSellerView('dashboard');
                setIsAccountOpen(false);
                return;
            }

            if (action.target === 'finances') {
                setActiveTab('you');
                setSellerView('dashboard');
                setIsAccountOpen(false);
                // SellerDashboard might have internal state for tabs, but 'you' + 'dashboard' is the entry point
                return;
            }

            if (action.target === 'deals') {
                setActiveTab('deals');
                return;
            }

            if (action.target === 'chat') {
                handleInAppDeepLink('chat', action.id || 'inbox');
                return;
            }

            if (action.target === 'seller-orders') {
                // Navigate to seller dashboard 'you' tab which shows SellerDashboard
                setActiveTab('you');
                setSellerView('dashboard');
                setIsAccountOpen(false);
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

    const isDeliveredLike = (status?: string) => {
        const normalized = status?.toLowerCase();
        return normalized === 'delivered' || normalized === 'completed';
    };

    const handleConfirmReceipt = async (orderId: string) => {
        if (!window.confirm('Are you sure you have received your parcel? This will release funds to the seller.')) return;

        setConfirmingOrderId(orderId);
        try {
            const res = await confirmOrderReceiptBuyer(orderId);
            if (res.success) {
                // Refresh data immediately
                refreshUserProfile();
                {
                    const updatedOrders = await fetchBuyerOrders(userProfile?.id ?? null);
                    setRecentOrders(updatedOrders);

                    // Web parity: remind buyer to rate & review right after confirming delivery.
                    alert('Delivery confirmed! Please rate and review your items.');

                    // Modern assist: offer to open the review sheet immediately.
                    const updated = updatedOrders.find(o => o.id === orderId);
                    const firstProductId = updated?.items?.[0]?.product_id;
                    if (firstProductId && window.confirm('Would you like to rate your purchase now?')) {
                        setReviewingProductId(firstProductId);
                        setReviewingOrderId(orderId);
                    }
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

    // Load orders when the Orders section is opened (supports both authenticated and guest sessions).
    useEffect(() => {
        if (activeAccountSection !== 'orders') return;

        let cancelled = false;
        (async () => {
            const orders = await fetchBuyerOrders(userProfile?.id ?? null);
            if (!cancelled) setRecentOrders(orders);
        })();

        return () => {
            cancelled = true;
        };
    }, [activeAccountSection, userProfile?.id]);

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
                        <div className="mb-3">
                            <button
                                onClick={() => {
                                    setTrackOrderPrefill({ orderId: '', email: userProfile?.email || '' });
                                    setIsTrackOrderOpen(true);
                                }}
                                className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold text-[11px] uppercase tracking-widest active:scale-95 transition-all"
                            >
                                Track Order
                            </button>
                        </div>

                        {/* Order Filters */}
                        <div className="flex items-center gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
                            {['all', 'pending', 'shipped', 'delivered'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveOrderFilter(filter as any)}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeOrderFilter === filter
                                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3">
                            {recentOrders
                                .filter(order => {
                                    if (activeOrderFilter === 'all') return true;
                                    const status = order.status?.toLowerCase() || '';
                                    if (activeOrderFilter === 'pending') {
                                        return status === 'pending' || status === 'processing' || status === 'confirmed';
                                    }
                                    if (activeOrderFilter === 'shipped') {
                                        return status === 'shipped';
                                    }
                                    if (activeOrderFilter === 'delivered') {
                                        return status === 'delivered' || status === 'completed';
                                    }
                                    return true;
                                })
                                .length > 0 ? (
                                recentOrders
                                    .filter(order => {
                                        if (activeOrderFilter === 'all') return true;
                                        const status = order.status?.toLowerCase() || '';
                                        if (activeOrderFilter === 'pending') {
                                            return status === 'pending' || status === 'processing' || status === 'confirmed';
                                        }
                                        if (activeOrderFilter === 'shipped') {
                                            return status === 'shipped';
                                        }
                                        if (activeOrderFilter === 'delivered') {
                                            return status === 'delivered' || status === 'completed';
                                        }
                                        return true;
                                    })
                                    .map((order, idx) => {
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
                                                            <OrderPrice amount={order.total_amount} currency={order.currency || 'USD'} />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setTrackOrderPrefill({
                                                                        orderId: order.id,
                                                                        email: userProfile?.email || order.customer_email || ''
                                                                    });
                                                                    setIsTrackOrderOpen(true);
                                                                }}
                                                                className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-orange-100"
                                                            >
                                                                Track
                                                            </button>

                                                            {isDeliveredLike(order.status) && (
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
                                                    </div>

                                                    {(order.status?.toLowerCase() === 'shipped' || isDeliveredLike(order.status)) && (
                                                        <button
                                                            onClick={() =>
                                                                setExpandedTrackingOrderId(prev => (prev === order.id ? null : order.id))
                                                            }
                                                            className="mt-3 flex items-center gap-2 text-orange-600 hover:text-orange-700 transition-colors"
                                                        >
                                                            <span className="material-icons text-base">local_shipping</span>
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                                                {expandedTrackingOrderId === order.id ? 'Close Details' : 'Track Order'}
                                                            </span>
                                                        </button>
                                                    )}

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
                                                                            <span className="material-icons text-gray-400 text-sm">confirmation_number</span>
                                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Waybill</span>
                                                                        </div>
                                                                        <p className="text-xs font-bold text-gray-900 dark:text-white text-right max-w-[55%] truncate">
                                                                            {order.parcel_details?.waybill_number || order.tracking_number || 'N/A'}
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

                                                                {/* Transport Fee + Seller Payment Instructions (matches web BuyerOrdersView) */}
                                                                {(order.fulfillment_type === 'local_parcel' ||
                                                                    order.shipping_method === 'local_parcel' ||
                                                                    order.logistics_meta?.provider === 'local_parcel' ||
                                                                    order.logistics_meta?.confirmed_transport_fee !== undefined) && (
                                                                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white shadow-lg shadow-orange-500/20">
                                                                            <div className="flex items-center justify-between">
                                                                                <div>
                                                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100">Transport Fee</p>
                                                                                    <p className="text-2xl font-black mt-1">
                                                                                        {typeof order.logistics_meta?.confirmed_transport_fee === 'number' && order.logistics_meta.confirmed_transport_fee > 0
                                                                                            ? `KSh ${order.logistics_meta.confirmed_transport_fee.toLocaleString()}`
                                                                                            : 'Fee TBD'}
                                                                                    </p>
                                                                                    <p className="text-[10px] text-orange-100 font-bold mt-1">Payable on collection</p>
                                                                                </div>
                                                                                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                                                                                    <span className="material-icons text-white text-xl">payments</span>
                                                                                </div>
                                                                            </div>

                                                                            {order.logistics_meta?.payment_details && (
                                                                                <div className="mt-3 bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <span className="material-icons text-white text-sm">account_balance_wallet</span>
                                                                                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-100">Payment Info</span>
                                                                                    </div>
                                                                                    <p className="text-sm font-bold text-white">{order.logistics_meta.payment_details}</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {expandedTrackingOrderId === order.id && (
                                                        <OrderTrackingTimeline order={order} />
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
                if (!userProfile?.id) return null;
                return (
                    <MobileCouponsView
                        user={userProfile as any}
                        onBack={() => setActiveAccountSection(null)}
                    />
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
                const reviewableItems = recentOrders
                    .filter(order => order.status === 'delivered')
                    .flatMap(order => (order.items || []).map(item => ({ ...item, orderId: order.id })));

                return (
                    <AccountSection title="Your reviews" description="Rate recent purchases" onBack={() => setActiveAccountSection(null)}>
                        <div className="flex flex-col gap-3">
                            {reviewableItems.length > 0 ? (
                                reviewableItems.map((item, idx) => (
                                    <div key={item.id || idx} className="flex gap-3 p-3 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                                        <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.product_title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                                                    <span className="material-icons text-gray-400">inventory_2</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="mb-2">
                                                <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Review Title</span>
                                                <div className="text-sm font-semibold text-black dark:text-white line-clamp-1">{item.product_title}</div>
                                            </div>

                                            <div>
                                                <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Your Experience</span>
                                                <button
                                                    onClick={() => {
                                                        setReviewingProductId(item.product_id);
                                                        setReviewingOrderId(item.orderId);
                                                    }}
                                                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-orange-600 transition-colors"
                                                >
                                                    <span className="material-icons text-xs">edit_note</span>
                                                    Write a review
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center bg-white dark:bg-surface-dark rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                    <span className="material-icons text-gray-300 text-4xl mb-2">rate_review</span>
                                    <p className="text-sm text-gray-500">No reviewable items found. Items appear here after they are delivered.</p>
                                </div>
                            )}
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
                            <div className="space-y-6">
                                {/* Recently Viewed Grid */}
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

                                {/* You might also like - based on browsing */}
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
                                                    onProductClick={handleProductClick}
                                                    onVisualSearch={setVisualSearchProduct}
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
                        <div className="flex flex-col gap-4 p-1">
                            <div className="rounded-2xl p-4 bg-white dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="text-lg font-bold text-black dark:text-white">Need help?</div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Chat with seller success or open a support ticket.</div>
                                <div className="mt-4 flex gap-2">
                                    <button className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold">Start chat</button>
                                    <button className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-black dark:text-white">Call us</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ icon: 'school', label: 'Seller academy' }, { icon: 'live_help', label: 'FAQ' }, { icon: 'policy', label: 'Policies' }].map((item) => {
                                    const isPolicies = item.label === 'Policies';
                                    return (
                                        <button
                                            key={item.label}
                                            type="button"
                                            onClick={isPolicies ? () => openInfoPage('support-center') : undefined}
                                            disabled={!isPolicies}
                                            className={`rounded-2xl p-3 bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 flex items-start gap-2 text-left ${isPolicies ? 'hover:bg-gray-50 active:scale-95 transition' : 'opacity-80 cursor-default'}`}
                                        >
                                            <span className="material-icons-outlined text-primary">{item.icon}</span>
                                            <div className="text-sm font-semibold text-black dark:text-white leading-tight">{item.label}</div>
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setIsFeedbackSheetOpen(true)}
                                    className="rounded-2xl p-3 bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 flex items-start gap-2 text-left w-full hover:bg-gray-50 active:scale-95 transition"
                                >
                                    <span className="material-icons-outlined text-primary">bug_report</span>
                                    <div className="text-sm font-semibold text-black dark:text-white leading-tight">Report an issue / Feedback</div>
                                </button>
                            </div>
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
                            setActiveBuyerConversationId(null);
                            // Refresh count when coming back
                            getSellerUnreadCount(userProfile.id).then(setBuyerMessageCount);
                        }}
                        activeConversationId={activeBuyerConversationId}
                    />
                );
            }
            case 'profile': {
                if (!userProfile) return null;
                return (
                    <BuyerProfileView
                        user={userProfile}
                        onBack={() => setActiveAccountSection(null)}
                        onUpdate={refreshUserProfile}
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
                        <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                            {(() => {
                                const support = getPushSupportStatus();
                                const vapid = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY as string | undefined;
                                const canConfigure = support.supported && !!vapid;

                                const ensurePushConfigured = () => {
                                    if (support.supported === false) {
                                        alert(support.reason);
                                        return false;
                                    }
                                    if (!vapid) {
                                        alert('Push notifications are not configured for this project.');
                                        return false;
                                    }
                                    return true;
                                };

                                const handleToggle = async () => {
                                    try {
                                        if (!ensurePushConfigured()) return;

                                        const existing = await getExistingPushSubscription();
                                        if (existing) {
                                            const endpoint = existing.endpoint;
                                            await unsubscribeFromPush();
                                            // If the user is signed out, we can still remove the subscription locally.
                                            // Backend cleanup requires auth, so skip it for guests.
                                            if (userProfile?.id) {
                                                await removePushSubscriptionFromBackend(endpoint);
                                            }
                                            alert('Push notifications disabled on this device.');
                                            return;
                                        }

                                        // Saving the subscription is user-scoped in the backend.
                                        // If the user is a guest, launch sign-in and continue if successful.
                                        if (!userProfile?.id) {
                                            await signInWithGoogle({ view: 'buyer-auth' });
                                            await refreshUserProfile();
                                        }

                                        if (!userProfile?.id) {
                                            alert('Please sign in to enable push notifications.');
                                            return;
                                        }

                                        const sub = await subscribeToPush(vapid!);
                                        await savePushSubscriptionToBackend(sub);
                                        alert('Push notifications enabled on this device.');
                                    } catch (e: any) {
                                        let message = e?.message || 'Unable to update push notifications.';

                                        // If we get "Unexpected token <", it's usually because the proxy is misconfigured
                                        // or the server returned an HTML error page (like a 404) instead of JSON.
                                        if (message.includes('Unexpected token <') || message.includes('is not valid JSON')) {
                                            const isProd = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
                                            message = isProd
                                                ? 'Production config error: The app received HTML instead of JSON. Ensure VITE_SUPABASE_URL is an absolute URL in your production environment variables.'
                                                : 'Server configuration error: Received HTML instead of JSON. Please ensure the Supabase proxy is configured in your dev server.';
                                        }

                                        // Supabase Functions returns a generic message for any non-2xx response.
                                        // Common cause here is missing auth (guest user), so map to a friendlier prompt.
                                        if (message.includes('non-2xx status code')) {
                                            alert(userProfile?.id
                                                ? 'Unable to update push notifications right now. Please try again.'
                                                : 'Please sign in to enable push notifications.');
                                            return;
                                        }

                                        alert(message.includes('VAPID')
                                            ? 'Push notifications are not configured for this project.'
                                            : message);
                                    }
                                };

                                return (
                                    <div
                                        className="flex items-start justify-between gap-3"
                                        role="button"
                                        tabIndex={0}
                                        onClick={handleToggle}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleToggle();
                                            }
                                        }}
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm font-black text-black dark:text-white">Web push notifications</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Enable Android push alerts (requires permission).
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggle();
                                                }}
                                                disabled={!canConfigure}
                                                className="px-4 py-2 rounded-full bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Toggle
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

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
        setIsVisualSearchActive(false); // Reset visual search flag
        setEventDealsTitle(null);
        setActiveTab('home');

        // Clear search params from URL so reload doesn't restore search
        const url = new URL(window.location.href);
        url.searchParams.delete('search');
        url.searchParams.delete('event');
        url.searchParams.delete('view'); // In case it was view=deals etc
        window.history.replaceState({ view: 'home' }, '', url.pathname);
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

        // Provide feedback
        setCartToast({ show: true, productName: product.title });
        setTimeout(() => setCartToast(null), 3000);
        playCartAddSound();

        // Haptic feedback if available
        if ('vibrate' in navigator) {
            navigator.vibrate(20);
        }
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

    const latestProductRequestIdRef = useRef<string | null>(null);

    const handleProductClick = useCallback((product: Product) => {
        const productId = product?.id ? String(product.id) : null;

        if (productId) {
            void trackProductViewAuto(productId);
        }

        // Optimistic: open immediately, then hydrate full gallery/media
        setSelectedProduct(product);

        if (!productId) return;
        latestProductRequestIdRef.current = productId;
        void (async () => {
            try {
                const hydrated = await fetchProductById(productId);
                if (!hydrated) return;
                if (latestProductRequestIdRef.current !== productId) return;
                setSelectedProduct(hydrated);
            } catch (err) {
                console.error('Error hydrating product on click (mobile):', err);
            }
        })();
    }, []);

    const handleSellerSupportClick = async () => {
        if (!userProfile?.id) return;
        try {
            const conversationId = await ensureSupportConversation(userProfile.id);
            if (conversationId) {
                setActiveSellerConversationId(conversationId);
            }
        } catch (error) {
            console.error('Failed to initiate support chat:', error);
            alert('Could not start support chat. Please try again later.');
        }
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
        setActiveCategoryId(categoryId);
        setActiveSubcategoryId('all');
    };

    const handleSelectSubcategory = (subcategoryId: string) => {
        setActiveSubcategoryId(subcategoryId);
    };

    const filteredProducts = products.filter(p => {
        // First filter by selected department/category
        if (activeCategoryId !== 'all' && activeCategoryId !== '') {
            const departmentCategoryIds = departmentToCategoryIds.get(activeCategoryId);
            if (departmentCategoryIds) {
                // activeCategoryId is a department id
                if (!p.categoryId || !departmentCategoryIds.has(String(p.categoryId))) return false;
            } else {
                // activeCategoryId is a category/subcategory id
                if (String(p.categoryId) !== activeCategoryId) return false;
            }
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
                        const url = new URL(window.location.href);
                        url.searchParams.delete('view');
                        url.searchParams.delete('vendorId');
                        window.history.replaceState({ view: activeTab }, '', url.pathname);
                    }}
                    onProductClick={handleProductClick}
                    onVisualSearch={setVisualSearchProduct}
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
                    notificationCount={notificationCount}
                    cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                    isVisualSearch={isVisualSearchActive}
                    eventBanner={eventDealsTitle ? eventBanner : null}
                    headerTitleOverride={eventDealsTitle || undefined}
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
                        eventBanner={eventBanner}
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
            case 'new':
                return (
                    <NewArrivalsScreen
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
                        sellerId={userProfile?.id || ''}
                        userName={userProfile?.name || userProfile?.email || 'Seller'}
                        storeName={storeName || 'Marketplace Seller'}
                        onSignOut={handleSellerSignOut}
                        onSwitchAccount={() => setSellerView('guest')}
                        onCreateProduct={() => setActiveAccountSection('orders')}
                        onOpenMessages={() => setIsAccountOpen(true)}
                        onOpenOrders={() => setActiveAccountSection('orders')}
                        onOpenPayouts={() => setActiveAccountSection('credit')}
                        onClose={() => setActiveTab('home')}
                        onSupportClick={handleSellerSupportClick}
                        initialConversationId={activeSellerConversationId}
                    />
                ) : (
                    <SellerAccess
                        onLogin={handleSellerAuth}
                        onSignup={() => {
                            if (!userProfile?.id) {
                                setAuthToast('Please sign in as a buyer first to register as a seller.');
                                setTimeout(() => setAuthToast(null), 3500);
                                setIsAccountOpen(true);
                                return;
                            }
                            setOnboardingType('seller');
                        }}
                        onBackToShop={() => setActiveTab('home')}
                    />
                );
            }



            case 'messages': {
                if (userProfile?.id) {
                    return (
                        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark">
                            <BuyerMessagesView
                                userId={userProfile.id}
                                onBack={() => setActiveTab('home')}
                                activeConversationId={activeBuyerConversationId}
                            />
                        </div>
                    );
                }
                // Show login prompt if not authenticated
                return (
                    <div className="flex flex-col items-center justify-center h-full p-8 bg-background-light dark:bg-background-dark">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <span className="material-icons-round text-5xl text-primary">chat</span>
                        </div>
                        <h2 className="text-2xl font-black text-black dark:text-white mb-2 text-center">Messages</h2>
                        <p className="text-center text-gray-500 mb-8 max-w-xs">
                            Sign in to chat with sellers, ask questions about products, and track your conversations.
                        </p>
                        <button
                            onClick={async () => {
                                await signInWithGoogle({ view: 'buyer-auth' });
                                await refreshUserProfile();
                            }}
                            className="w-full max-w-xs py-4 bg-primary hover:bg-orange-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/30 active:scale-95 transition-all"
                        >
                            Sign In to Chat
                        </button>
                    </div>
                );
            }

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
                                    onPlatformReviewsClick={() => openInfoPage('support-center')}
                                    hasPlatformReviews={hasPlatformReviews}
                                    eventBanner={eventBanner}
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
                onDeepLink={handleInAppDeepLink}
            />

            {isTrackOrderOpen && (
                <TrackOrderSheet
                    onClose={() => setIsTrackOrderOpen(false)}
                    initialOrderId={trackOrderPrefill.orderId || ''}
                    initialEmail={trackOrderPrefill.email || userProfile?.email || ''}
                />
            )}
            {/* Category View Overlay - Full Screen */}
            {categoryViewOpen && (
                <div className="absolute inset-0 z-50 bg-background-light dark:bg-background-dark flex flex-col">
                    {/* Category View Header */}
                    <div className="flex-shrink-0 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 px-3 py-1.5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    closeCategoryOverlay();
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

                    {/* Scrollable Content: category chips + subcategories + products */}
                    <div className="flex-grow overflow-y-auto bg-background-light dark:bg-background-dark">
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

                        <HomeView
                            products={filteredProducts}
                            onProductClick={handleProductClick}
                            showPromotions={false}
                            onVisualSearch={setVisualSearchProduct}
                            onPlatformReviewsClick={() => openInfoPage('support-center')}
                            hasPlatformReviews={hasPlatformReviews}
                        />
                    </div>
                </div>
            )}
            {/* Product Details Overlay - Full Screen */}
            {selectedProduct && (
                <ProductDetails
                    product={selectedProduct}
                    onBack={() => {
                        setSelectedProduct(null);
                        const url = new URL(window.location.href);
                        url.searchParams.delete('product_id');
                        window.history.replaceState({ view: activeTab }, '', url.pathname);
                    }}
                    onProductClick={handleProductClick}
                    onVisualSearch={setVisualSearchProduct}
                    onAddToCart={() => addToCart(selectedProduct)}
                    onBuyNow={() => {
                        addToCart(selectedProduct);
                        openCheckout();
                    }}
                    onMessageSeller={handleMessageSeller}
                    user={userProfile as any}
                    cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                    onGoToCart={() => {
                        setSelectedProduct(null);
                        setActiveTab('cart');
                    }}
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
                    notificationCount={notificationCount}
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
                        onNotificationClick={() => setActiveAccountSection('notifications')}
                        onCategoryClick={(categoryIds, title, subcategories) => {
                            // Use the first category ID as the main department ID
                            if (categoryIds.length > 0) {
                                setCategoryViewOpen({ departmentId: categoryIds[0], departmentName: title });
                                setActiveCategoryId(categoryIds[0]);
                                setSelectedCategoryForSubs({ id: categoryIds[0], name: title });
                                setActiveSubcategoryId('all');
                            }
                        }}
                        userAvatar={userProfile?.avatar_url}
                        userName={userProfile?.name || userProfile?.email}
                        notificationCount={notificationCount}
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
                        setCategoryViewOpen(null); // Reset category overlay search/results when switching tabs

                        // Reset category state when going to home
                        if (tab === 'home') {
                            setActiveCategoryId('all');
                            setSelectedCategoryForSubs(null);
                            setActiveSubcategoryId('all');
                        }

                        setActiveTab(tab);
                        window.history.pushState({ view: tab }, '', window.location.href);
                    }}
                    cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                    messageCount={buyerMessageCount}
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
                        setActiveTab('you');
                        window.history.pushState({ view: 'you' }, '', window.location.href);
                        setSellerView('dashboard');
                    }}
                    onCancel={() => setOnboardingType(null)}
                />
            )}
            {/* {onboardingType === 'driver' && (
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
                        // Use the AI query for search but don't expose it in the UI
                        const internalQuery = searchQuery || keywords.join(' ');
                        if (internalQuery) {
                            // Store internally for search but don't display
                            setSearchQuery(internalQuery);
                            setIsVisualSearchActive(true); // Mark as visual search
                            setActiveTab('search_results');
                        }
                    }}
                />
            )}
            {/* Cart Toast Notification */}
            {cartToast && (
                <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom-full duration-300">
                    <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-emerald-500/50 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="material-icons text-lg">shopping_cart</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Added to Cart</span>
                                <span className="text-xs font-bold truncate max-w-[180px]">{cartToast.productName}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setCartToast(null);
                                setActiveTab('cart');
                            }}
                            className="bg-white text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-sm"
                        >
                            View Cart
                        </button>
                    </div>
                </div>
            )}


            {/* Auth Toast Notification */}
            {authToast && (
                <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom-full duration-300">
                    <div className="bg-red-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-red-500/50 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="material-icons text-lg">block</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Account</span>
                                <span className="text-xs font-bold truncate max-w-[220px]">{authToast}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setAuthToast(null)}
                            className="bg-white text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-sm"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
            <MobileFeedbackSheet
                isOpen={isFeedbackSheetOpen}
                onClose={() => setIsFeedbackSheetOpen(false)}
            />

            {isInfoPageOpen && (
                <div className="absolute inset-0 z-[120] bg-white overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <InfoPageView
                        slug={activeInfoPageSlug}
                        onClose={() => {
                            setIsInfoPageOpen(false);
                            // Clear deep-link params so reload doesn't restore info page
                            const url = new URL(window.location.href);
                            url.searchParams.delete('view');
                            url.searchParams.delete('slug');
                            window.history.replaceState({ view: activeTab }, '', url.pathname);
                        }}
                        onNavigate={(slug) => {
                            setActiveInfoPageSlug(slug);
                            window.history.pushState({ view: 'info-page', slug }, '', `?view=info-page&slug=${encodeURIComponent(slug)}`);
                        }}
                    />
                </div>
            )}

            {isPlatformReviewsOpen && (
                <PlatformReviewsView
                    onBack={() => {
                        setIsPlatformReviewsOpen(false);
                        setPlatformReviews([]);
                        // Go back in history if possible, or replace state to home
                        if (window.history.length > 1) {
                            window.history.back();
                        } else {
                            window.history.pushState({ view: 'home' }, '', '/');
                            setActiveTab('home');
                        }
                    }}
                    reviews={platformReviews}
                />
            )}
        </div>
    );
};

export default App;
