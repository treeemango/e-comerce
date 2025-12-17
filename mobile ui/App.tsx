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
import { ProductDetails } from './components/ProductDetails';
import { AccountSection } from './components/AccountSection';
import { SellerAccess } from './components/SellerAccess';
import { SellerDashboard } from './components/SellerDashboard';
import { fetchProducts, fetchNavbarCategories, NavbarCategory } from '@/lib/api';
import { Product } from '@/types';
import { getCurrentUser, getUserProfile, signOut, AuthUser, signInWithGoogle } from '@/lib/auth';

type AccountSectionKey = 'orders' | 'coupons' | 'credit' | 'reviews' | 'stores' | 'history' | 'addresses' | 'support' | 'settings' | 'switch' | 'logout';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>('home');
    const [products, setProducts] = useState<Product[]>([]);
    const [cartItems, setCartItems] = useState<Product[]>([]);
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
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [selectedCategoryForSubs, setSelectedCategoryForSubs] = useState<{ id: string; name: string } | null>(null);
    const [activeSubcategoryId, setActiveSubcategoryId] = useState<string>('all');
    const [categoryViewOpen, setCategoryViewOpen] = useState<{ departmentId: string; departmentName: string } | null>(null);

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
                setCartItems(fetchedProducts.slice(0, 2));
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
        refreshUserProfile();
    }, [refreshUserProfile]);

    useEffect(() => {
        const role = userProfile?.role?.toString?.().toLowerCase?.();
        const sellerRoles = ['seller', 'vendor', 'admin', 'staff'];
        setSellerView(role && sellerRoles.includes(role) ? 'dashboard' : 'guest');
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
            if (typeof view === 'string') {
                setActiveTab(view);
            }
        };

        window.addEventListener('popstate', onPopState);
        window.history.replaceState({ view: activeTab }, '', window.location.href);
        return () => window.removeEventListener('popstate', onPopState);
    }, [activeTab, isAccountOpen, isSearchOpen, selectedProduct]);



    const renderAccountSection = (key: AccountSectionKey) => {
        switch (key) {
            case 'orders': {
                return (
                    <AccountSection title="Your orders" description="Track and manage your recent purchases" onBack={() => setActiveAccountSection(null)}>
                        <div className="flex flex-col gap-3">
                            {products.slice(0, 4).map((item, idx) => (
                                <div key={item.id ?? idx} className="flex gap-3 p-3 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-black dark:text-white line-clamp-2">{item.title}</div>
                                        <div className="text-xs text-gray-500 mt-1">Arriving soon</div>
                                        <div className="text-sm font-bold text-price-red mt-1">{new Intl.NumberFormat('en', { style: 'currency', currency: item.currency || 'USD' }).format(item.price)}</div>
                                    </div>
                                    <button className="text-xs font-bold text-primary">Details</button>
                                </div>
                            ))}
                        </div>
                    </AccountSection>
                );
            }
            case 'coupons': {
                return (
                    <AccountSection title="Coupons" description="View and apply your coupons" onBack={() => setActiveAccountSection(null)}>
                        <div className="flex flex-col gap-3">
                            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 bg-white dark:bg-surface-dark text-center text-sm text-gray-600 dark:text-gray-300">
                                No coupons yet. Check deals and promotions to earn rewards.
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {['New User', 'Flash Sale', 'Loyalty'].map((label, idx) => (
                                    <div key={label} className="rounded-xl p-3 bg-gradient-to-br from-primary/90 to-orange-500 text-white shadow-md">
                                        <div className="text-xs uppercase tracking-wide">{label}</div>
                                        <div className="text-lg font-black">${idx === 0 ? '5' : idx === 1 ? '10' : '15'} off</div>
                                        <div className="text-[11px] opacity-90">Apply at checkout</div>
                                    </div>
                                ))}
                            </div>
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
            case 'stores': {
                return (
                    <AccountSection title="Followed stores" description="Your saved shops" onBack={() => setActiveAccountSection(null)}>
                        <div className="grid grid-cols-2 gap-3">
                            {products.slice(0, 4).map((p, idx) => (
                                <div key={p.id ?? idx} className="bg-white dark:bg-surface-dark rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200">
                                        {(p.vendor?.business_name || 'Store').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="text-sm font-semibold text-black dark:text-white truncate">{p.vendor?.business_name || 'Store name'}</div>
                                    <button className="text-xs font-bold text-primary text-left">Visit store</button>
                                </div>
                            ))}
                        </div>
                    </AccountSection>
                );
            }
            case 'history': {
                return (
                    <AccountSection title="Browsing history" description="Recently viewed items" onBack={() => setActiveAccountSection(null)}>
                        <div className="grid grid-cols-2 gap-2">
                            {products.slice(0, 6).map((p, idx) => (
                                <div key={p.id ?? idx} className="bg-white dark:bg-surface-dark rounded-lg p-2 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className="aspect-square rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-[11px] text-gray-700 dark:text-gray-300 line-clamp-2 mt-1">{p.title}</div>
                                </div>
                            ))}
                        </div>
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

    const renderContent = () => {
        if (activeAccountSection) {
            return renderAccountSection(activeAccountSection);
        }

        if (searchQuery) {
            return (
                <SearchResults
                    query={searchQuery}
                    results={products}
                    onBack={handleBackFromSearch}
                    onUserClick={() => setIsAccountOpen(true)}
                    onProductClick={handleProductClick}
                />
            );
        }

        switch (activeTab) {
            case 'cart':
                return <CartView cartItems={cartItems} recommendations={products.slice(0, 4)} onProductClick={handleProductClick} />;
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
                const storeName = (userProfile as any)?.user_metadata?.business_name || (userProfile as any)?.business_name;
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
                        onSignup={handleSellerAuth}
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
                                />
                            )}
                        </main>
                    </>
                );
        }
    };

    return (
        <div className="mobile-shell flex flex-col min-h-screen h-screen overflow-hidden relative bg-background-light dark:bg-background-dark">
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
                    <div className="flex-shrink-0 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 px-3 py-3">
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
                    recommendations={products.slice(0, 4)}
                />
            )}

            {/* Account Overlay */}
            {isAccountOpen && (
                <AccountOverlay
                    onClose={() => setIsAccountOpen(false)}
                    userName={userProfile?.name || userProfile?.email}
                    avatarUrl={userProfile?.avatar_url}
                    messageCount={userProfile ? 0 : undefined}
                    couponCount={userProfile ? 0 : undefined}
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
            {!selectedProduct && !searchQuery && activeTab !== 'cart' && (
                <div className="flex-shrink-0 z-30 bg-white dark:bg-surface-dark">
                    <TopAppBanner />
                    <Header
                        onSearchClick={() => setIsSearchOpen(true)}
                        onUserClick={() => setIsAccountOpen(true)}
                    />
                </div>
            )}

            {/* Main Content */}
            <div className="mobile-scroll flex-grow overflow-y-auto bg-background-light dark:bg-background-dark scroll-smooth">
                {renderContent()}
            </div>

            {/* Bottom Navigation - Hidden when product details is active */}
            {!selectedProduct && (
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
                    cartCount={cartItems.length}
                    notificationCount={0} // TODO: Add notification count from API
                />
            )}
        </div>
    );
};

export default App;
