import React, { useEffect, useState } from 'react';
import { FollowedStore } from '../types';
import { getFollowedStores, unfollowStore } from '../lib/api';
import { getCurrencySymbol } from '@/lib/currency';

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

    if (!userId) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">Please sign in to view your followed stores.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    if (stores.length === 0) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">You haven't followed any stores yet.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6">Followed Stores</h2>
            <div className="grid gap-6">
                {stores.map((store) => (
                    <div key={store.vendor_id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold mb-2">{store.business_name}</h3>
                                {store.business_description && (
                                    <p className="text-gray-600 mb-4">{store.business_description}</p>
                                )}

                                <div className="flex gap-6 text-sm text-gray-500 mb-4">
                                    <span>★ {store.vendor_rating?.toFixed(1)} ({store.review_count} reviews)</span>
                                    <span>{store.total_products} products</span>
                                    <span>{store.business_country}</span>
                                </div>

                                {store.latest_products && store.latest_products.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-medium mb-2">Latest Products</h4>
                                        <div className="grid grid-cols-4 gap-4">
                                            {store.latest_products.map((product) => (
                                                <div
                                                    key={product.id}
                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => onProductClick?.(product.id)}
                                                >
                                                    <img
                                                        src={product.image}
                                                        alt={product.title}
                                                        className="w-full h-24 object-cover rounded mb-2"
                                                    />
                                                    <div className="text-sm truncate">{product.title}</div>
                                                    <div className="font-semibold">{getCurrencySymbol('USD')}{product.price}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 text-sm text-gray-500">
                                    Following since {new Date(store.followed_at).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                                <button
                                    onClick={() => onProductClick?.(store.vendor_id)}
                                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                                >
                                    Visit Store
                                </button>
                                <button
                                    onClick={() => handleUnfollow(store.vendor_id)}
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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
