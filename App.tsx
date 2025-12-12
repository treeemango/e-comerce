
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesBar from './components/FeaturesBar';
import ProductSection from './components/ProductSection';
import BestSellersView from './components/BestSellersView';
import ProductDetailView from './components/ProductDetailView';
import SellerLoginView from './components/SellerLoginView';
import BuyerAuthView from './components/BuyerAuthView';
import AccountPageView from './components/AccountPageView';
import Footer from './components/Footer';
import FloatingWidget from './components/FloatingWidget';
import CheckoutView from './components/CheckoutView';
import CartView from './components/CartView';
import TrendingVendorsSection from './components/TrendingVendorsSection';
import SellerOnboardingView from './components/SellerOnboarding/SellerOnboardingView';
import SellerDashboardLayout from './components/SellerDashboard/SellerDashboardLayout';
import DashboardOverview from './components/SellerDashboard/DashboardOverview';
import AddProductView from './components/SellerDashboard/ProductManager/AddProductView';
import ManageProductsView from './components/SellerDashboard/ProductManager/ManageProductsView';
import AddProductsUploadView from './components/SellerDashboard/ProductManager/AddProductsUploadView';
import PricingHealthView from './components/SellerDashboard/PricingHealthView';
import ProductComplianceView from './components/SellerDashboard/ProductManager/ProductComplianceView';
import ManageOrdersView from './components/SellerDashboard/OrderManager/ManageOrdersView';
import ManageReturnsView from './components/SellerDashboard/OrderManager/ManageReturnsView';
import UploadOrderFilesView from './components/SellerDashboard/OrderManager/UploadOrderFilesView';
import OrderReportsView from './components/SellerDashboard/OrderManager/OrderReportsView';
import PromotionsCouponsView from './components/SellerDashboard/Promotions/PromotionsCouponsView';
import CreateCouponView from './components/SellerDashboard/Promotions/CreateCouponView';
import PromotionalCampaignsView from './components/SellerDashboard/Promotions/PromotionalCampaignsView';
import PaymentsView from './components/SellerDashboard/Finances/PaymentsView';
import ShippingSettingsView from './components/SellerDashboard/Account/ShippingSettingsView';
import EditShippingTemplateView from './components/SellerDashboard/Account/EditShippingTemplateView';
import SellerProfileView from './components/SellerDashboard/Account/SellerProfileView';
import ReturnSettingsView from './components/SellerDashboard/Account/ReturnSettingsView';
import ChargeMethodView from './components/SellerDashboard/Finances/ChargeMethodView';
import SellerPerformanceView from './components/SellerDashboard/Performance/SellerPerformanceView';
import AppsServiceView from './components/SellerDashboard/Apps/AppsServiceView';
import OrdersView from './components/SellerDashboard/OrdersView';
import SellerMessagesView from './components/SellerDashboard/SellerMessagesView';
import { Product, User, LoyaltyProfile, VisualCategory, Breadcrumb, AdminPermissions } from './types';
import { fetchProductsWithVendors, fetchUserLoyaltyProfile, trackSearch, createConversation, checkAdminPermission, fetchSellerProfile } from './lib/api';
import { getCurrentUser, onAuthStateChange, signOut } from './lib/auth';
import { useSEO } from './lib/useSEO';
import { getCategoryPageSEO, getSearchPageSEO, generateItemListSchema } from './lib/seo-utils';

// Admin Dashboard Components
import AdminDashboardLayout from './components/AdminDashboard/AdminDashboardLayout';
import { default as AdminDashboardOverview } from './components/AdminDashboard/DashboardOverview';
import ProductApprovalView from './components/AdminDashboard/ProductApproval/ProductApprovalView';
import SellerVerificationView from './components/AdminDashboard/SellerVerification/SellerVerificationView';
import UserManagementView from './components/AdminDashboard/UserManagement/UserManagementView';
import OrderManagementView from './components/AdminDashboard/OrderManagement/OrderManagementView';
import ContentManagementView from './components/AdminDashboard/ContentManagement/ContentManagementView';
import ActivityLogView from './components/AdminDashboard/ActivityLog/ActivityLogView';
import AdminLoginView from './components/AdminDashboard/AdminLoginView';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'five-star' | 'best-selling' | 'search-results' | 'product-detail' | 'seller-login' | 'seller-onboarding' | 'seller-dashboard' | 'admin-login' | 'admin-dashboard' | 'buyer-auth' | 'account-page' | 'checkout' | 'cart'>('home');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'products' | 'manage-products' | 'add-products' | 'add-products-upload' | 'pricing-health' | 'product-compliance' | 'orders' | 'promotions' | 'finances' | 'performance' | 'apps' | 'account' | 'settings' | 'messages'>('manage-products');
  const [adminTab, setAdminTab] = useState<'overview' | 'products' | 'sellers' | 'users' | 'orders' | 'content' | 'activity'>('overview');
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | undefined>(undefined);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [accountPageTitle, setAccountPageTitle] = useState('Followed stores');
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyProfile | null>(null);
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([]);
  const [productSectionTitle, setProductSectionTitle] = useState<string | undefined>(undefined);
  const [visualSubcategories, setVisualSubcategories] = useState<VisualCategory[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [previousView, setPreviousView] = useState<string>('');
  const [adminAccessMessage, setAdminAccessMessage] = useState<string | null>(null);

  // SEO: Compute page metadata based on current view
  const seoConfig = useMemo(() => {
    if (currentView === 'home') {
      return {
        title: 'JuaExpress - Your African Shopping Destination',
        description: 'Discover thousands of quality products on JuaExpress. Shop electronics, fashion, home goods, and more with fast delivery across Africa.',
        keywords: 'online shopping, e-commerce, African marketplace, Kenya shopping',
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
    }
    return {};
  }, [currentView, searchQuery, productSectionTitle, products.length]);

  // Apply SEO configuration (hook called at top level)
  useSEO(seoConfig);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await fetchProductsWithVendors();
      setProducts(data);
    };
    loadProducts();
    // Auth context will be handled by the auth state listener
  }, []);

  // Auth state listener
  useEffect(() => {
    // Check current session on mount
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
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
        // Check for stored auth context (from before OAuth redirect)
        const storedContextStr = sessionStorage.getItem('auth_context');
        if (storedContextStr) {
          try {
            const storedContext = JSON.parse(storedContextStr);
            sessionStorage.removeItem('auth_context'); // Clear it

            if (storedContext.view === 'seller-login' || storedContext.view === 'seller-onboarding') {
              // User intended to login as seller
              if (role === 'seller') {
                setCurrentView('seller-dashboard');
              } else {
                // They logged in via seller portal but don't have a seller role yet -> Onboarding
                // UNLESS they actually have a profile that we missed? (Checked above)
                // If check above passed/failed, we trust 'role' variable now.
                // If role is still buyer, but they came from seller login -> Onboarding
                setCurrentView('seller-onboarding');
              }
              // Skip other checks
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

        // Load loyalty profile for logged-in user if not redirected to dashboard immediately (or always)
        const loyalty = await fetchUserLoyaltyProfile(currentUser.id);
        setLoyaltyProfile(loyalty);

        // Check for admin permissions (This block was redundant/confusing in previous code if we handle role above, removing redundancy)
        // Kept loyalty
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
      }
    });

    // Cleanup subscription
    return () => {
      authListener?.data.subscription.unsubscribe();
    };
  }, []);

  const addToCart = (product: Product, event?: React.MouseEvent | React.TouchEvent) => {
    const currentQty = cartItems.filter(item => item.id.toString() === product.id.toString()).length;
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
            const qty = prev.filter(item => item.id.toString() === product.id.toString()).length;
            if (qty >= maxStock) return prev;
            return [...prev, product];
          });
        }, 1400);
      } else {
        setCartItems(prev => {
          const qty = prev.filter(item => item.id.toString() === product.id.toString()).length;
          if (qty >= maxStock) return prev;
          return [...prev, product];
        });
      }
    } else {
      setCartItems(prev => {
        const qty = prev.filter(item => item.id.toString() === product.id.toString()).length;
        if (qty >= maxStock) return prev;
        return [...prev, product];
      });
    }
  };

  const handleRemoveFromCart = (productId: number) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    setCartItems(prev => {
      const newItems = [...prev];
      if (delta > 0) {
        const itemToAdd = prev.find(item => item.id === productId);
        if (itemToAdd) newItems.push(itemToAdd);
      } else {
        const indexToRemove = newItems.findIndex(item => item.id === productId);
        if (indexToRemove !== -1) newItems.splice(indexToRemove, 1);
      }
      return newItems;
    });
  };

  const handleVisitStore = (vendorId: string) => {
    const vendorProduct = products.find(p => p.vendor?.vendor_id === vendorId);
    if (vendorProduct?.vendor?.business_name) {
      // Use user_id (seller_id) for filtering as products table uses seller_id
      const filterId = vendorProduct.vendor.user_id || vendorId;
      setSelectedVendorId(filterId);
      setSearchQuery('');
      setCurrentView('search-results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleHomeClick = () => {
    setCurrentView('home');
    setSearchQuery('');
    setSelectedVendorId(undefined);
    setBreadcrumbs([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFiveStarClick = () => {
    setCurrentView('five-star');
    setSearchQuery('');
    setSelectedVendorId(undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBestSellingClick = () => {
    setCurrentView('best-selling');
    setSearchQuery('');
    setSelectedVendorId(undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSellerLoginClick = () => {
    setCurrentView('seller-login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedVendorId(undefined);
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

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRelatedProductClick = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product-detail');
    setBreadcrumbs([]); // Clear breadcrumbs on search
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAccountPageClick = (pageTitle: string) => {
    setAccountPageTitle(pageTitle);
    setCurrentView('account-page');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckoutClick = () => {
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCartClick = () => {
    setCurrentView('cart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price, 0);
  }, [cartItems]);

  const handleSignInClick = () => {
    setPreviousView(currentView);
    setCurrentView('buyer-auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOutClick = async () => {
    await signOut();
    setUser(null);
    handleHomeClick();
  };

  const handleAuthSuccess = () => {
    handleHomeClick();
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
    if (!product.vendor?.user_id && !product.vendor?.vendor_id) {
      alert('Cannot message this seller.');
      return;
    }

    // Try to find seller_id, fallback to vendor_id if user_id is missing (though user_id is the seller's uuid)
    // In types.ts: user_id?: string; // The seller_id from products
    const sellerId = product.vendor.user_id || product.vendor.vendor_id;

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
    } else {
      alert('Failed to start conversation. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-display">
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
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity border-l border-gray-800 pl-8 h-8">
                <span className="material-icons text-white text-lg">phone_iphone</span>
                <span className="font-bold text-[11px]">Get the JuaExpress App</span>
              </div>
            </div>

            {/* Seller Link */}
            <div
              className="hidden md:flex items-center bg-gray-900 rounded-full px-1 py-1 pr-4 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer group"
              onClick={handleSellerLoginClick}
            >
              <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full mr-2">
                Join Now <span className="material-icons text-[10px] align-middle">chevron_right</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] text-gray-400">Start Selling to Millions of</span>
                <span className="text-[10px] font-bold text-white group-hover:text-primary transition-colors">Buyers on JuaExpress</span>
              </div>
            </div>

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
          onCheckoutClick={handleCartClick}
          onSignInClick={handleSignInClick}
          onSignOutClick={handleSignOutClick}
          cartItemCount={cartItems.length}
          user={user}
          loyaltyProfile={loyaltyProfile}
        />
      )}
      <main className={`flex-1 w-full ${currentView !== 'seller-login' && currentView !== 'buyer-auth' && currentView !== 'seller-onboarding' && currentView !== 'seller-dashboard' && currentView !== 'admin-dashboard' && currentView !== 'admin-login' ? 'max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}`}>
        {currentView === 'home' && (
          <>
            <HeroSection />
            <FeaturesBar />
            <ProductSection isFiveStarView={false} onProductClick={handleProductClick} products={products} onAddToCart={addToCart} />
          </>
        )}
        {currentView === 'five-star' && (
          <ProductSection isFiveStarView={true} onProductClick={handleProductClick} products={products} onAddToCart={addToCart} />
        )}
        {currentView === 'best-selling' && (
          <BestSellersView
            onProductClick={handleProductClick}
            products={products}
            cartItems={cartItems}
            onCartClick={handleCartClick}
          />
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
          />
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
        {currentView === 'checkout' && (
          <CheckoutView
            cartItems={cartItems}
            totalAmount={cartSubtotal}
            userId={user?.id}
            onCheckoutComplete={() => {
              setCartItems([]);
              setCurrentView('home');
            }}
          />
        )}
        {currentView === 'cart' && (
          <CartView
            cartItems={cartItems}
            onRemoveFromCart={handleRemoveFromCart}
            onUpdateQuantity={handleUpdateQuantity}
            onCheckoutClick={handleCheckoutClick}
            onHomeClick={handleHomeClick}
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
          />
        )}
        {currentView === 'buyer-auth' && (
          <BuyerAuthView
            onSuccess={handleAuthSuccess}
            authContext={previousView === 'seller-login' ? { view: 'seller-onboarding' } : undefined}
          />
        )}
        {currentView === 'seller-login' && (
          <SellerLoginView
            onSignUpClick={() => {
              setCurrentView('seller-onboarding');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSignInClick={handleSignInClick}
          />
        )}
        {currentView === 'seller-onboarding' && (
          <SellerOnboardingView
            onComplete={() => {
              setCurrentView('seller-dashboard'); // Navigate to dashboard on success
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
            {dashboardTab === 'add-products-upload' && <AddProductsUploadView />}
            {dashboardTab === 'pricing-health' && <PricingHealthView sellerId={user?.id || ''} />}
            {dashboardTab === 'product-compliance' && <ProductComplianceView sellerId={user?.id || ''} />}
            {dashboardTab === 'orders' && <OrdersView sellerId={user?.id} />}
            {dashboardTab === 'manage-orders' && <ManageOrdersView sellerId={user?.id || ''} />}
            {dashboardTab === 'manage-returns' && <ManageReturnsView />}
            {dashboardTab === 'order-reports' && <OrderReportsView />}
            {dashboardTab === 'upload-order-files' && <UploadOrderFilesView />}
            {dashboardTab === 'promotions-coupons' && <PromotionsCouponsView sellerId={user?.id || ''} onNavigate={setDashboardTab as any} />}
            {dashboardTab === 'promotions-campaigns' && <PromotionalCampaignsView sellerId={user?.id || ''} />}
            {dashboardTab === 'create-coupon' && <CreateCouponView />}  {/* Can be linked from internal button */}
            {dashboardTab === 'promotions' && <PromotionalCampaignsView sellerId={user?.id || ''} />} {/* Default promo view */}
            {dashboardTab === 'finance-payments' && <PaymentsView sellerId={user?.id || ''} />}
            {dashboardTab === 'finance-charge-method' && <ChargeMethodView sellerId={user?.id || ''} />}
            {dashboardTab === 'finances' && <PaymentsView sellerId={user?.id || ''} />}
            {dashboardTab === 'performance' && <SellerPerformanceView />}
            {dashboardTab === 'apps' && <AppsServiceView />}
            {dashboardTab === 'account-shipping' && <ShippingSettingsView sellerId={user?.id || ''} onNavigate={setDashboardTab as any} />}
            {dashboardTab === 'account-shipping-template' && <EditShippingTemplateView sellerId={user?.id || ''} onBack={() => setDashboardTab('account-shipping')} onSave={() => setDashboardTab('account-shipping')} />}
            {dashboardTab === 'account-seller-profile' && <SellerProfileView sellerId={user?.id || ''} />}
            {dashboardTab === 'account-profile' && <SellerProfileView sellerId={user?.id || ''} />} {/* Mapped to Seller Profile for now */}
            {dashboardTab === 'account-return' && <ReturnSettingsView sellerId={user?.id || ''} />}
            {dashboardTab === 'account-tax' && <SellerProfileView sellerId={user?.id || ''} />} {/* Tax info is in profile */}
            {dashboardTab === 'account-notifications' && <SellerProfileView sellerId={user?.id || ''} />} {/* Notifications in profile */}
            {dashboardTab === 'account-permissions' && <div className="p-8 text-gray-500">User permissions feature coming soon</div>}
            {dashboardTab === 'account' && <SellerProfileView sellerId={user?.id || ''} />}
            {dashboardTab === 'messages' && <SellerMessagesView sellerId={user?.id || ''} />}
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
            {adminTab === 'users' && <UserManagementView permissions={adminPermissions!} />}
            {adminTab === 'orders' && <OrderManagementView />}
            {adminTab === 'content' && <ContentManagementView permissions={adminPermissions!} />}
            {adminTab === 'activity' && <ActivityLogView />}
          </AdminDashboardLayout>
        )}
      </main>
      {currentView !== 'seller-login' && currentView !== 'buyer-auth' && currentView !== 'seller-onboarding' && currentView !== 'seller-dashboard' && currentView !== 'admin-dashboard' && currentView !== 'admin-login' && (
        <Footer onAdminClick={async () => {
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
        }} />
      )}
      <FloatingWidget />
    </div>
  );
};

export default App;
