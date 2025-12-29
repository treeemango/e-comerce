import React, { useState, useEffect } from 'react';
import { Product } from '@/types';
import { fetchVendorFullProfile, fetchFilteredProducts, VendorFullProfile, getFollowStatus, toggleFollowStore } from '@/lib/api';
import { ProductCard } from './ProductCard';
import { cn } from '@/lib/utils';
import { AuthUser, getCurrentUser } from '@/lib/auth';
import { playFollowSound, playUnfollowSound } from '@/lib/sounds';

interface VendorProfileViewProps {
    vendorId: string;
    onBack: () => void;
    onProductClick: (p: Product) => void;
}

export const VendorProfileView: React.FC<VendorProfileViewProps> = ({ vendorId, onBack, onProductClick }) => {
    const [vendor, setVendor] = useState<VendorFullProfile | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [currentUser, profileData, productsData] = await Promise.all([
                    getCurrentUser(),
                    fetchVendorFullProfile(vendorId),
                    fetchFilteredProducts('', {
                        category_ids: [],
                        brand_ids: [],
                        price_min: null,
                        price_max: null,
                        delivery_locations: [],
                        attributes: {}
                    }, vendorId)
                ]);

                setUser(currentUser);
                setVendor(profileData);
                setProducts(productsData);

                if (currentUser && profileData) {
                    const followStatus = await getFollowStatus(currentUser.id, vendorId);
                    if (followStatus) {
                        setIsFollowing(followStatus.is_following);
                        setFollowerCount(followStatus.follower_count);
                    }
                } else if (profileData) {
                    setFollowerCount(profileData.follower_count || 0);
                }
            } catch (error) {
                console.error('Failed to load vendor data', error);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [vendorId]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleFollowToggle = async () => {
        if (!user) {
            alert('Please sign in to follow stores');
            return;
        }

        setIsFollowLoading(true);
        try {
            const result = await toggleFollowStore(user.id, vendorId);
            if (result?.success) {
                setIsFollowing(result.is_following);
                setFollowerCount(result.follower_count);

                // Play sound based on action
                if (result.is_following) {
                    playFollowSound();
                } else {
                    playUnfollowSound();
                }
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        } finally {
            setIsFollowLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-black pt-20 flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-gray-400">Loading Store...</p>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-black pt-20 px-6 text-center">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Store not found</h3>
                <button onClick={onBack} className="mt-4 text-orange-500 font-bold uppercase tracking-tighter">Go Back</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black pb-20">
            {/* Header Sticky Bar */}
            <div className={cn(
                "fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-4 h-16 flex items-center justify-between",
                scrolled ? "bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm" : "bg-transparent"
            )}>
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 dark:bg-black/20 rounded-full backdrop-blur-md transition-all active:scale-90"
                >
                    <span className={cn("material-icons", scrolled ? "text-gray-900 dark:text-white" : "text-white")}>arrow_back</span>
                </button>
                <div className={cn(
                    "flex-1 px-4 transition-all duration-300",
                    scrolled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                )}>
                    <h1 className="font-black text-gray-900 dark:text-white text-sm truncate">{vendor.business_name}</h1>
                </div>
                <button className="w-10 h-10 flex items-center justify-center bg-white/20 dark:bg-black/20 rounded-full backdrop-blur-md transition-all active:scale-90">
                    <span className={cn("material-icons", scrolled ? "text-gray-900 dark:text-white" : "text-white")}>share</span>
                </button>
            </div>

            {/* Banner Section */}
            <div className="relative h-48 w-full overflow-hidden">
                {vendor.banner_url ? (
                    <img src={vendor.banner_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-400 to-rose-500" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            {/* Profile Info Card */}
            <div className="relative px-6 -mt-16">
                <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-xl shadow-black/5 border border-white dark:border-gray-800">
                    <div className="flex items-start justify-between mb-4">
                        <div className="relative -mt-16">
                            <div className="w-24 h-24 rounded-3xl bg-white dark:bg-surface-dark p-1 shadow-lg overflow-hidden border-2 border-white dark:border-gray-800">
                                {vendor.logo_url ? (
                                    <img src={vendor.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <div className="w-full h-full bg-orange-50 flex items-center justify-center text-orange-500 font-black text-3xl">
                                        {vendor.business_name?.[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleFollowToggle}
                            disabled={isFollowLoading}
                            className={cn(
                                "px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2",
                                isFollowing
                                    ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                    : "bg-black dark:bg-white text-white dark:text-black"
                            )}
                        >
                            {isFollowLoading ? (
                                <div className="w-3 h-3 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                            ) : isFollowing ? (
                                <span className="material-icons text-sm text-emerald-500">check_circle</span>
                            ) : (
                                <span className="material-icons text-sm">add</span>
                            )}
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                    </div>

                    <div className="mb-6 text-left">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-1">
                            {vendor.business_name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1">
                                <span className="material-icons text-xs text-blue-500">public</span>
                                {vendor.business_country || 'Independent Seller'}
                            </span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>Since {new Date(vendor.seller_since || Date.now()).getFullYear()}</span>
                        </div>

                        {/* Vendor Badges Section */}
                        {vendor.badges && vendor.badges.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {vendor.badges.map((badge, idx) => {
                                    const badgeKey = badge.badge_type || badge.badge_name || '';
                                    const badgeConfig: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
                                        speed_dove: { icon: 'flight', label: 'Speed Dove', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800' },
                                        new_seller: { icon: 'fiber_new', label: 'New Seller', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
                                        free_delivery: { icon: 'local_shipping', label: 'Free Delivery', bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
                                        nationwide_delivery: { icon: 'public', label: 'Nationwide Delivery', bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
                                        trusted_shipper: { icon: 'verified_user', label: 'Trusted Shipper', bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
                                        experienced_shipper: { icon: 'workspace_premium', label: 'Experienced Shipper', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
                                        rising_star: { icon: 'trending_up', label: 'Rising Star', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
                                        verified_seller: { icon: 'verified', label: 'Verified Seller', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
                                    };
                                    const config = badgeConfig[badgeKey] || {
                                        icon: badge.badge_icon || 'military_tech',
                                        label: badge.badge_name || badge.badge_label || (badgeKey ? badgeKey.replace(/_/g, ' ') : 'Badge'),
                                        bg: 'bg-gray-50 dark:bg-white/5',
                                        text: 'text-gray-600 dark:text-gray-400',
                                        border: 'border-gray-200 dark:border-white/10'
                                    };

                                    return (
                                        <div
                                            key={(badgeKey || 'badge') + idx}
                                            className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border", config.bg, config.text, config.border)}
                                            title={badge.description || badge.badge_description || ''}
                                        >
                                            {badge.badge_icon_url ? (
                                                <img
                                                    src={badge.badge_icon_url}
                                                    alt={config.label}
                                                    className="w-4 h-4 object-contain"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <span className="material-icons text-sm">{config.icon}</span>
                                            )}
                                            <span className="text-[10px] font-black uppercase tracking-widest">{config.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Stats Grid (2x2) */}
                    <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-50 dark:border-gray-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                                <span className="material-icons text-amber-500 text-lg">star</span>
                            </div>
                            <div>
                                <div className="font-black text-base text-gray-900 dark:text-white leading-none mb-0.5">{vendor.vendor_rating?.toFixed(1) || '0.0'}</div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Rating</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                <span className="material-icons text-blue-500 text-lg">shopping_bag</span>
                            </div>
                            <div>
                                <div className="font-black text-base text-gray-900 dark:text-white leading-none mb-0.5">{vendor.completed_orders || 0}</div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Orders</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                                <span className="material-icons text-orange-500 text-lg">groups</span>
                            </div>
                            <div>
                                <div className="font-black text-base text-gray-900 dark:text-white leading-none mb-0.5">
                                    {followerCount >= 1000 ? `${(followerCount / 1000).toFixed(1)}k` : followerCount}
                                </div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Followers</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                <span className="material-icons text-emerald-500 text-lg">inventory_2</span>
                            </div>
                            <div>
                                <div className="font-black text-base text-gray-900 dark:text-white leading-none mb-0.5">{vendor.total_products || 0}</div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Products</div>
                            </div>
                        </div>
                    </div>

                    {/* Documents & Certificates Section */}
                    {vendor.certificates && vendor.certificates.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Business Authentication</h4>
                                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-100 dark:border-blue-500/20">Verified</span>
                            </div>
                            <div className="flex flex-col gap-2 text-left">
                                {vendor.certificates.map((cert) => (
                                    <div key={cert.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                            <span className="material-icons text-blue-500">verified_user</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-gray-900 dark:text-white truncate">{cert.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Publicly Registered Store</p>
                                        </div>
                                        <button className="p-2 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/10 active:scale-90 transition-all">
                                            <span className="material-icons text-sm text-gray-600 dark:text-gray-400">visibility</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="mt-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                        {vendor.business_description || 'No description available.'}
                    </p>
                </div>
            </div>

            {/* Products Section */}
            <div className="mt-8 px-4">
                <div className="flex items-center justify-between mb-6 px-2">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Store Products</h3>
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{products.length} Items Available</p>
                    </div>
                    <button className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <span className="material-icons text-sm">filter_list</span>
                    </button>
                </div>

                {products.length === 0 ? (
                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800">
                        <span className="material-icons text-4xl text-gray-200 mb-4">inventory_2</span>
                        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">No products yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {products.map((p, idx) => (
                            <ProductCard
                                key={p.id || idx}
                                product={p}
                                onProductClick={onProductClick}
                                showSellerLine={false}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
