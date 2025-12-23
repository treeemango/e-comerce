import React, { useState, useEffect } from 'react';
import { getFollowedStores } from '@/lib/api';
import { FollowedStore } from '@/types';

interface FollowedStoresViewProps {
    userId: string;
    onBack: () => void;
    onVisitStore: (vendorId: string) => void;
}

export const FollowedStoresView: React.FC<FollowedStoresViewProps> = ({
    userId,
    onBack,
    onVisitStore
}) => {
    const [stores, setStores] = useState<FollowedStore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStores = async () => {
            setLoading(true);
            try {
                const result = await getFollowedStores(userId);
                if (result?.success) {
                    setStores(result.data);
                }
            } catch (error) {
                console.error('Failed to load followed stores', error);
            } finally {
                setLoading(false);
            }
        };

        loadStores();
    }, [userId]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black">
            {/* Header */}
            <header className="flex-shrink-0 bg-white dark:bg-surface-dark px-4 py-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white active:scale-90 transition-all"
                >
                    <span className="material-icons">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Followed stores</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your saved shops</p>
                </div>
            </header>

            {/* Content */}
            <div className="flex-grow overflow-y-auto px-4 py-6">
                {/* Visual Banner Match */}
                <div className="mb-6 -mx-1 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/50">
                    <p className="text-sm font-black text-price-red dark:text-red-400 uppercase tracking-tight">Your saved shops</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="mt-4 text-xs font-black uppercase tracking-widest text-gray-400">Loading Stores...</p>
                    </div>
                ) : stores.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
                            <span className="material-icons text-4xl text-gray-300">storefront</span>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">No stores followed</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                            Discover amazing sellers and follow them to see them here.
                        </p>
                        <button
                            onClick={onBack}
                            className="mt-8 px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-black rounded-2xl shadow-lg uppercase tracking-widest text-xs active:scale-95 transition-all"
                        >
                            Start Discovering
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {stores.map((store) => (
                            <div
                                key={store.vendor_id}
                                className="bg-white dark:bg-surface-dark rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-3 group active:scale-[0.98] transition-all"
                            >
                                <div className="w-14 h-14 rounded-3xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700 shadow-inner">
                                    {store.logo_url ? (
                                        <img src={store.logo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-black text-gray-400 uppercase">
                                            {store.business_name.slice(0, 2)}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900 dark:text-white text-base leading-tight mb-1 truncate">
                                        {store.business_name}
                                    </h4>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                        <span className="material-icons text-orange-500 text-[10px]">star</span>
                                        {store.rating || '4.8'}
                                        <span className="w-1 h-1 bg-gray-300 rounded-full mx-0.5" />
                                        {store.total_products}+ Items
                                    </div>
                                </div>
                                <button
                                    onClick={() => onVisitStore(store.vendor_id)}
                                    className="mt-1 text-xs font-black text-price-red dark:text-red-400 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all"
                                >
                                    Visit store
                                    <span className="material-icons text-[12px]">arrow_forward</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
