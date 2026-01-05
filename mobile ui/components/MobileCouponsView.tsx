import React, { useMemo, useState, useEffect } from 'react';
import { PromoCoupon, UserCoupon, User } from '@/types';
import { fetchActiveCoupons, fetchUserCoupons, claimCoupon } from '@/lib/api';
import { useCurrencyConverter, getCurrencySymbol, getUserCurrency } from '@/lib/currency';
import { useNotifications } from '@/components/NotificationContext';
import { AccountSection } from './AccountSection';

interface MobileCouponsViewProps {
    user: User | null;
    onBack: () => void;
}

export const MobileCouponsView: React.FC<MobileCouponsViewProps> = ({ user, onBack }) => {
    const { showNotification } = useNotifications();
    const [activeCoupons, setActiveCoupons] = useState<PromoCoupon[]>([]);
    const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([]);
    const [loadingMine, setLoadingMine] = useState(false);
    const [loadingActive, setLoadingActive] = useState(false);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const loadMine = async () => {
        if (!user) return;
        setLoadingMine(true);
        try {
            const data = await fetchUserCoupons(user.id);
            setMyCoupons(data);
        } catch (err) {
            console.error('Failed to load user coupons:', err);
        } finally {
            setLoadingMine(false);
        }
    };

    const loadActive = async () => {
        setLoadingActive(true);
        try {
            const data = await fetchActiveCoupons();
            setActiveCoupons(data);
        } catch (err) {
            console.error('Failed to load active coupons:', err);
        } finally {
            setLoadingActive(false);
        }
    };

    useEffect(() => {
        loadActive();
        if (user) loadMine();
    }, [user]);

    const priceValues = useMemo(() => {
        const vals: { amount: number; currency: string; key: string }[] = [];
        activeCoupons.forEach(c => {
            if (c.discount_amount) {
                vals.push({ amount: c.discount_amount, currency: 'USD', key: `active-${c.id}` });
            }
        });
        myCoupons.forEach(c => {
            if (c.discount_amount) {
                vals.push({ amount: c.discount_amount, currency: 'USD', key: `my-${c.id}` });
            }
        });
        return vals;
    }, [activeCoupons, myCoupons]);

    const { convertedValues, isLoading: isConverting } = useCurrencyConverter(priceValues);

    const formatDiscount = (coupon: PromoCoupon | UserCoupon['coupon'], type: 'active' | 'my', id: string) => {
        if (coupon.discount_amount) {
            const key = `${type}-${id}`;
            const converted = convertedValues[key];
            if (converted?.converted) return converted.converted;

            const symbol = getCurrencySymbol(getUserCurrency());
            if (isConverting) return `${symbol}...`;
            return `${symbol}${coupon.discount_amount}`;
        }
        if (coupon.discount_percentage) return `${coupon.discount_percentage}% OFF`;
        return 'Coupon';
    };

    const getEligibleLink = (coupon: PromoCoupon | UserCoupon['coupon']) => {
        if (coupon.seller_id) {
            return `/?view=vendor-store&vendorId=${coupon.seller_id}`;
        }
        return `/?search=${encodeURIComponent(coupon.name)}`;
    };

    const handleClaim = async (couponId: string) => {
        if (!user) {
            showNotification('Please log in to claim coupons.', 'error');
            return;
        }
        setClaimingId(couponId);
        try {
            const ok = await claimCoupon(couponId, user.id);
            if (ok) {
                showNotification(
                    '🎉 Coupon claimed successfully! It will be automatically applied at checkout.',
                    'success',
                    8000
                );
                await Promise.all([loadMine(), loadActive()]);
            } else {
                showNotification('Could not claim coupon. It may have reached its limit or is no longer available.', 'error');
            }
        } catch (err) {
            console.error('Error claiming coupon:', err);
            showNotification('An error occurred while claiming the coupon. Please try again.', 'error');
        } finally {
            setClaimingId(null);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'No expiry';
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderCouponCard = (coupon: PromoCoupon, isClaimed: boolean) => {
        const isOut = coupon.total_quantity && coupon.claimed_quantity >= coupon.total_quantity;

        return (
            <div key={coupon.id} className="relative bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden group active:scale-[0.98] transition-transform">
                <div className="absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 bg-primary/5 rounded-full blur-2xl" />

                <div className="flex justify-between items-start mb-3 relative">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 truncate">{coupon.name}</h4>
                        <div className="text-2xl font-black text-black dark:text-white tracking-tight">
                            {formatDiscount(coupon, 'active', coupon.id)}
                        </div>
                    </div>
                    {isClaimed ? (
                        <div className="bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg flex items-center gap-1">
                            <span className="material-icons text-xs">check_circle</span>
                            <span className="text-[9px] font-black uppercase tracking-tighter">Saved</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => handleClaim(coupon.id)}
                            disabled={claimingId === coupon.id || isOut}
                            className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {claimingId === coupon.id ? '...' : isOut ? 'Ended' : 'Claim'}
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-2 pt-3 border-t border-gray-50 dark:border-gray-800">
                    <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>Expires {formatDate(coupon.end_time)}</span>
                        {coupon.total_quantity && (
                            <span className="text-primary">{Math.max(0, coupon.total_quantity - coupon.claimed_quantity)} left</span>
                        )}
                    </div>

                    <a
                        href={getEligibleLink(coupon)}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 group/link"
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-xs text-gray-400">shopping_bag</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Shop eligible items</span>
                        </div>
                        <span className="material-icons text-xs text-primary group-hover/link:translate-x-0.5 transition-transform">arrow_forward</span>
                    </a>
                </div>
            </div>
        );
    };

    const savedCoupons = myCoupons.filter(c => c.status === 'active' && !c.used_at);
    const isLoadingData = loadingMine || loadingActive;

    if (isLoadingData && activeCoupons.length === 0 && myCoupons.length === 0) {
        return (
            <AccountSection title="Coupons" onBack={onBack}>
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">Loading your rewards...</p>
                </div>
            </AccountSection>
        );
    }

    return (
        <AccountSection
            title="Rewards & Coupons"
            description="Claimed offers are auto-applied at checkout"
            onBack={onBack}
            accent="bg-primary/10 text-primary"
        >
            <div className="space-y-6">
                {/* Removed message display as per instruction's implied change to use showNotification */}

                {/* Wallet Highlights */}
                <div className="bg-slate-900 rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-primary/10 rounded-full blur-3xl" />
                    <div className="relative flex justify-between items-center">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary italic mb-1">Coupon Wallet</p>
                            <h3 className="text-2xl font-black">{savedCoupons.length} Active</h3>
                        </div>
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                            <span className="material-icons text-primary">confirmation_number</span>
                        </div>
                    </div>
                </div>

                {/* Section: Your Saved Coupons */}
                {savedCoupons.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ready to Use</h3>
                            <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Auto-applied</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {savedCoupons.map(mc => (
                                <div key={mc.id} className="relative bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate">{mc.coupon.name}</h4>
                                            <div className="text-2xl font-black text-black dark:text-white tracking-tight">
                                                {formatDiscount(mc.coupon, 'my', mc.id)}
                                            </div>
                                        </div>
                                        <div className="text-primary">
                                            <span className="material-icons">task_alt</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-3 border-t border-gray-50 dark:border-gray-800">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Expires {formatDate(mc.coupon.end_time)}</p>
                                        <a
                                            href={getEligibleLink(mc.coupon)}
                                            className="flex items-center justify-between bg-primary/5 p-2.5 rounded-xl border border-primary/10 group/shop"
                                        >
                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Shop Eligible Products</span>
                                            <span className="material-icons text-xs text-primary group-hover/shop:translate-x-0.5 transition-transform">arrow_forward</span>
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section: Available Offers */}
                <div className="space-y-3 pb-8">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Available Offers</h3>
                    {isLoadingData ? (
                        <div className="grid grid-cols-1 gap-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : activeCoupons.filter(c => !myCoupons.some(mc => mc.coupon_id === c.id)).length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {activeCoupons
                                .filter(c => !myCoupons.some(mc => mc.coupon_id === c.id))
                                .map(c => renderCouponCard(c, false))}
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                            <span className="material-icons text-gray-300 text-4xl mb-2">local_activity</span>
                            <p className="text-xs text-gray-500 font-medium">No new offers available right now. Check back later!</p>
                        </div>
                    )}
                </div>
            </div>
        </AccountSection>
    );
};
