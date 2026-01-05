import React, { useEffect, useState, useMemo } from 'react';
import { FollowedStore } from '../types';
import { getFollowedStores, unfollowStore } from '../lib/api';
import { getCurrencySymbol, useCurrencyConverter } from '@/lib/currency';

interface FollowedStoresViewProps {
    userId?: string;
    onProductClick?: (productId: string) => void;
}

const FollowedStoresView: React.FC<FollowedStoresViewProps> = ({ userId, onProductClick }) => {
    const [stores, setStores] = useState<FollowedStore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const loadStores = async () => {
            setLoading(true);
            const result = await getFollowedStores(userId);
            if (result?.success) {
                setStores(result.data);
            }
            setLoading(false);
        };

        loadStores();
    }, [userId]);

    const handleUnfollow = async (storeId: string) => {
        if (!userId) return;

        await unfollowStore(userId, storeId);
        setStores(prev => prev.filter(store => store.vendor_id !== storeId));
    };

    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];
        stores.forEach(store => {
            store.latest_products?.forEach(product => {
                vals.push({ id: `store-${store.vendor_id}-prod-${product.id}`, amount: product.price, currency: 'USD' });
            });
        });
        return vals;
    }, [stores]);

    const { convertedValues } = useCurrencyConverter(priceValues);

    if (!userId) {
        return (
            <div className="p-8 text-center text-slate-500">
                <span className="material-icons text-4xl mb-4">account_circle</span>
                <p>Please sign in to view your followed stores.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Loading your favorite stores...</p>
            </div>
        );
    }

    if (stores.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <span className="material-icons text-4xl text-slate-300 mb-4">storefront</span>
                <h3 className="text-lg font-bold text-slate-900 mb-1 uppercase tracking-tight">No Followed Stores</h3>
                <p className="text-slate-500 text-sm">Start following vendors to keep up with their latest products!</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h2 className="text-3xl font-black mb-10 text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                <span className="bg-orange-600 p-2 rounded-xl shadow-lg">
                    <span className="material-icons text-white text-2xl">favorite</span>
                </span>
                Favorite Stores
            </h2>
            <div className="grid gap-8">
                {stores.map((store) => (
                    <div key={store.vendor_id} className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-all duration-700" />

                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            {store.logo_url && (
                                <div className="flex-shrink-0">
                                    <img
                                        src={store.logo_url}
                                        alt={store.business_name}
                                        className="w-20 h-20 rounded-2xl object-cover border border-gray-100 shadow-sm"
                                    />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <h3 className="text-2xl font-black mb-2 text-slate-900 group-hover:text-orange-600 transition-colors uppercase italic truncate">{store.business_name}</h3>
                                {store.business_description && (
                                    <p className="text-slate-500 text-sm mb-6 line-clamp-2 leading-relaxed">{store.business_description}</p>
                                )}

                                <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-6">
                                    <span className="flex items-center gap-1.5 text-slate-900">
                                        <span className="material-icons text-[16px] text-orange-500">star</span>
                                        {store.vendor_rating?.toFixed(1)} ({store.review_count} reviews)
                                    </span>
                                    <span className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{store.total_products} products</span>
                                    <span className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100 flex items-center gap-1">
                                        <span className="material-icons text-[14px]">public</span>
                                        {store.business_country}
                                    </span>
                                </div>

                                {store.latest_products && store.latest_products.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 italic">Latest Drops</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {store.latest_products.map((product) => {
                                                const converted = convertedValues[`store-${store.vendor_id}-prod-${product.id}`];
                                                return (
                                                    <div
                                                        key={product.id}
                                                        className="cursor-pointer group/item"
                                                        onClick={() => onProductClick?.(product.id)}
                                                    >
                                                        <div className="relative aspect-square mb-3 overflow-hidden rounded-2xl bg-slate-50">
                                                            <img
                                                                src={product.image}
                                                                alt={product.title}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                                                            />
                                                        </div>
                                                        <div className="text-[11px] font-bold text-slate-900 truncate uppercase mb-1">{product.title}</div>
                                                        <div className="text-xs font-black text-orange-600 uppercase tracking-tight">
                                                            {converted?.converted || `${getCurrencySymbol('USD')}${product.price}`}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 pt-4 border-t border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                    Subscribed since {new Date(store.followed_at).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col gap-3 items-end w-full md:w-auto mt-4 md:mt-0">
                                <a
                                    href={`/?view=vendor-store&vendorId=${store.vendor_id}`}
                                    className="flex-1 md:w-full px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all text-center italic"
                                >
                                    Visit Store
                                </a>
                                <button
                                    onClick={() => handleUnfollow(store.vendor_id)}
                                    className="px-6 py-3 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all italic border border-slate-100"
                                >
                                    Unfollow
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FollowedStoresView;
