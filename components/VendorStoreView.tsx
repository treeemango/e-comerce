import React, { useEffect, useMemo, useState } from 'react';
import { Product, User, MediaItem } from '@/types';
import ProductCard from './ProductCard';
import { fetchFilteredProducts, fetchVendorFullProfile, getFollowStatus, toggleFollowStore, type VendorFullProfile } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { VerificationBadge } from './VerificationBadge';

interface VendorStoreViewProps {
  vendorId: string;
  onBack: () => void;
  onProductClick: (p: Product) => void;
  onAddToCart?: (product: Product, event?: React.MouseEvent | React.TouchEvent) => void;
  user?: User | null;
}

const emptyFilters = {
  category_ids: [],
  brand_ids: [],
  price_min: null,
  price_max: null,
  delivery_locations: [],
  attributes: {},
};

const VendorStoreView: React.FC<VendorStoreViewProps> = ({ vendorId, onBack, onProductClick, onAddToCart, user }) => {
  const [vendor, setVendor] = useState<VendorFullProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [selectedCertificate, setSelectedCertificate] = useState<MediaItem | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'about'>('products');

  const storeIdForFollow = vendor?.vendor_id;

  const storeSinceYear = useMemo(() => {
    const since = vendor?.seller_since || vendor?.join_date;
    if (!since) return undefined;
    const dt = new Date(since);
    return Number.isFinite(dt.getTime()) ? dt.getFullYear() : undefined;
  }, [vendor?.seller_since, vendor?.join_date]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        console.log('[VendorStoreView] Loading vendor data for ID:', vendorId);
        const [authUser, profile, storeProducts] = await Promise.all([
          getCurrentUser(),
          fetchVendorFullProfile(vendorId),
          fetchFilteredProducts('', emptyFilters as any, vendorId),
        ]);

        console.log('[VendorStoreView] Loaded profile:', profile);
        console.log('[VendorStoreView] Profile badges:', profile?.badges);

        if (cancelled) return;

        setVendor(profile);
        setProducts(storeProducts);

        const resolvedStoreId = profile?.vendor_id;
        if (authUser?.id && resolvedStoreId) {
          const followStatus = await getFollowStatus(authUser.id, resolvedStoreId);
          if (cancelled) return;
          if (followStatus) {
            setIsFollowing(Boolean(followStatus.is_following));
            setFollowerCount(Number(followStatus.follower_count ?? 0));
          }
        } else {
          setFollowerCount(Number(profile?.follower_count ?? 0));
        }
      } catch (e) {
        console.error('Failed to load vendor store', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const handleFollowToggle = async () => {
    const authUser = await getCurrentUser();
    if (!authUser?.id) {
      alert('Please sign in to follow stores');
      return;
    }

    if (!storeIdForFollow) return;

    setIsFollowLoading(true);
    try {
      const result = await toggleFollowStore(authUser.id, storeIdForFollow);
      if (result?.success) {
        setIsFollowing(Boolean(result.is_following));
        setFollowerCount(Number(result.follower_count ?? 0));
      }
    } catch (e) {
      console.error('Error toggling follow:', e);
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-gray-400">Loading Store...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <h3 className="text-xl font-black text-slate-900 dark:text-white">Store not found</h3>
        <button onClick={onBack} className="mt-4 text-orange-500 font-bold uppercase tracking-widest">
          Go Back
        </button>
      </div>
    );
  }

  const certificates = vendor.certificates || [];

  return (
    <div className="w-full">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl h-56 sm:h-64 bg-gradient-to-br from-orange-400 to-rose-500">
        {vendor.banner_url ? (
          <img src={vendor.banner_url} alt="" className="w-full h-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-4 left-4">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white backdrop-blur font-bold text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <span className="material-icons-round text-sm">arrow_back</span>
            Back
          </button>
        </div>
      </div>

      {/* Store Info Card */}
      <div className="relative -mt-14 sm:-mt-16 px-2 sm:px-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl shadow-black/5 border border-white dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="-mt-12 sm:-mt-14">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white dark:bg-slate-800 p-1 shadow-lg overflow-hidden border-2 border-white dark:border-gray-700">
                  {vendor.logo_url ? (
                    <img src={vendor.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <div className="w-full h-full bg-orange-50 flex items-center justify-center text-orange-500 font-black text-3xl rounded-2xl">
                      {vendor.business_name?.[0]?.toUpperCase?.() || 'S'}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight truncate">
                    {vendor.business_name}
                  </h1>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-[12px] text-blue-500">public</span>
                    {vendor.business_country || 'Independent Seller'}
                  </span>
                  {storeSinceYear ? <span className="w-1 h-1 bg-gray-300 rounded-full" /> : null}
                  {storeSinceYear ? <span>Since {storeSinceYear}</span> : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <button
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                className={
                  `px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-[0.99] flex items-center gap-2 ` +
                  (isFollowing
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200'
                    : 'bg-black dark:bg-white text-white dark:text-black')
                }
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

              {user?.role === 'admin' ? (
                <div className="hidden sm:flex px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-xs font-bold">
                  Admin
                </div>
              ) : null}
            </div>
          </div>

          {vendor.business_description ? (
            <p className="mt-5 text-sm text-slate-600 dark:text-slate-200 leading-relaxed">
              {vendor.business_description}
            </p>
          ) : null}

          {/* Vendor Badges Section */}
          {vendor.badges && vendor.badges.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {vendor.badges.map((badge, idx) => {
                // Get badge identifier (badge_type or badge_name)
                const badgeKey = badge.badge_type || badge.badge_name || '';

                // Official badge configuration based on badge_type slugs
                const badgeConfig: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
                  // Official Badge 2030 Types
                  speed_dove: { icon: 'flight', label: 'Speed Dove', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800' },
                  new_seller: { icon: 'fiber_new', label: 'New Seller', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
                  free_delivery: { icon: 'local_shipping', label: 'Free Delivery', bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
                  nationwide_delivery: { icon: 'public', label: 'Nationwide Delivery', bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
                  trusted_shipper: { icon: 'verified_user', label: 'Trusted Shipper', bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
                  experienced_shipper: { icon: 'workspace_premium', label: 'Experienced Shipper', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
                  // Additional common badge types
                  rising_star: { icon: 'trending_up', label: 'Rising Star', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
                  verified_seller: { icon: 'verified', label: 'Verified Seller', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
                  top_rated: { icon: 'star', label: 'Top Rated', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
                  fast_shipper: { icon: 'bolt', label: 'Fast Shipper', bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
                  trusted_seller: { icon: 'verified_user', label: 'Trusted Seller', bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
                  high_volume: { icon: 'trending_up', label: 'High Volume', bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
                };
                const config = badgeConfig[badgeKey] || {
                  icon: badge.badge_icon || 'military_tech',
                  label: badge.badge_name || badge.badge_label || (badgeKey ? badgeKey.replace(/_/g, ' ') : 'Badge'),
                  bg: 'bg-gray-50 dark:bg-gray-800',
                  text: 'text-gray-600 dark:text-gray-400',
                  border: 'border-gray-200 dark:border-gray-700'
                };

                return (
                  <div
                    key={(badgeKey || 'badge') + idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${config.bg} ${config.text} ${config.border}`}
                    title={badge.description || badge.badge_description || ''}
                  >
                    {badge.badge_icon_url ? (
                      <img
                        src={badge.badge_icon_url}
                        alt={config.label}
                        className="w-4 h-4 object-contain"
                        onError={(e) => {
                          // Fallback to material icon if image fails
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="material-icons text-sm">{config.icon}</span>
                    )}
                    <span className="text-[11px] font-bold uppercase tracking-wide">{config.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats Grid */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-4">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="material-icons text-amber-500">star</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Rating</span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{(vendor.vendor_rating ?? 0).toFixed(1)}</div>
              <div className="text-[11px] font-bold text-gray-500">{vendor.review_count ?? 0} reviews</div>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-4">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="material-icons text-blue-500">groups</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Followers</span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {followerCount >= 1000 ? `${(followerCount / 1000).toFixed(1)}k` : followerCount}
              </div>
              <div className="text-[11px] font-bold text-gray-500">Community</div>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-4">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="material-icons text-emerald-500">inventory_2</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Products</span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{products.length}</div>
              <div className="text-[11px] font-bold text-gray-500">In store</div>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 p-4">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="material-icons text-purple-500">shopping_bag</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Orders</span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {(vendor.completed_orders ?? 0) >= 1000 ? `${((vendor.completed_orders ?? 0) / 1000).toFixed(1)}k` : (vendor.completed_orders ?? 0)}
              </div>
              <div className="text-[11px] font-bold text-gray-500">Completed</div>
            </div>
          </div>

          {/* Certificates Section */}
          {certificates.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-icons text-emerald-500">verified_user</span>
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Verified & Licensed</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                  {certificates.length} {certificates.length === 1 ? 'Document' : 'Documents'}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {certificates.map((cert, idx) => (
                  <button
                    key={cert.id || idx}
                    onClick={() => setSelectedCertificate(cert)}
                    className="flex-shrink-0 group relative overflow-hidden rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-emerald-400 transition-all"
                  >
                    <img
                      src={cert.url}
                      alt={cert.name || 'Certificate'}
                      className="w-32 h-24 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2 right-2 text-white text-[10px] font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {cert.name || 'View Document'}
                    </div>
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-icons text-emerald-600 text-sm">zoom_in</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 px-2 sm:px-4">
        <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-3 text-sm font-black uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'products'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-3 text-sm font-black uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'about'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            About
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' && (
        <div className="mt-6 px-2 sm:px-4">
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center bg-white dark:bg-slate-800">
              <span className="material-icons text-4xl text-gray-300">storefront</span>
              <p className="mt-3 text-sm font-bold text-gray-600 dark:text-gray-200">No products found for this store yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {products.map((p, idx) => (
                <ProductCard
                  key={p.id?.toString?.() || idx}
                  product={p}
                  onProductClick={() => onProductClick(p)}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="mt-6 px-2 sm:px-4 space-y-6">
          {/* Store Policies */}
          {(vendor.return_policy || vendor.shipping_policy) && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Store Policies</h3>

              {vendor.shipping_policy && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons text-blue-500 text-lg">local_shipping</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Shipping Policy</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{vendor.shipping_policy}</p>
                </div>
              )}

              {vendor.return_policy && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons text-orange-500 text-lg">assignment_return</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Return Policy</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{vendor.return_policy}</p>
                </div>
              )}
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Store Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-icons text-gray-400">location_on</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{vendor.business_country || 'Location not specified'}</span>
              </div>
              {storeSinceYear && (
                <div className="flex items-center gap-3">
                  <span className="material-icons text-gray-400">calendar_today</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Member since {storeSinceYear}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Certificate Lightbox Modal */}
      {selectedCertificate && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedCertificate(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-icons text-emerald-500">verified</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedCertificate.name || 'Certificate'}</span>
              </div>
              <button
                onClick={() => setSelectedCertificate(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="material-icons text-gray-600 dark:text-gray-300">close</span>
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              <img
                src={selectedCertificate.url}
                alt={selectedCertificate.name || 'Certificate'}
                className="w-full h-auto rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorStoreView;
