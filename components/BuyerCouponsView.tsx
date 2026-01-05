import React, { useEffect, useMemo, useState } from 'react';
import { PromoCoupon, User, UserCoupon } from '../types';
import { claimCoupon, fetchActiveCoupons, fetchUserCoupons } from '../lib/api';
import { getCurrencySymbol, useCurrencyConverter, getUserCurrency } from '@/lib/currency';
import { useNotifications } from './NotificationContext';

interface BuyerCouponsViewProps {
    user?: User | null;
}

const couponBadge = {
    active: 'bg-green-100 text-green-800 border-green-200',
    upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
    expired: 'bg-red-100 text-red-700 border-red-200',
    used: 'bg-gray-200 text-gray-700 border-gray-300',
    out_of_stock: 'bg-amber-100 text-amber-800 border-amber-200'
};

const BuyerCouponsView: React.FC<BuyerCouponsViewProps> = ({ user }) => {
    const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([]);
    const [activeCoupons, setActiveCoupons] = useState<PromoCoupon[]>([]);
    const [loadingMine, setLoadingMine] = useState(false);
    const [loadingActive, setLoadingActive] = useState(false);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const { showNotification } = useNotifications();

    const loadMine = async () => {
        if (!user?.id) return;
        setLoadingMine(true);
        setMessage(null);
        const data = await fetchUserCoupons(user.id);
        setMyCoupons(data);
        setLoadingMine(false);
    };

    const loadActive = async () => {
        setLoadingActive(true);
        const data = await fetchActiveCoupons();
        setActiveCoupons(data);
        setLoadingActive(false);
    };

    useEffect(() => {
        loadActive();
    }, []);

    useEffect(() => {
        if (user?.id) {
            loadMine();
        } else {
            setMyCoupons([]);
        }
    }, [user?.id]);

    const claimedIds = useMemo(() => new Set(myCoupons.map(c => c.coupon.id)), [myCoupons]);

    // Prepare prices for currency conversion
    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];
        activeCoupons.forEach(c => {
            if (c.discount_amount) {
                vals.push({ id: `active-${c.id}`, amount: c.discount_amount, currency: 'USD' });
            }
        });
        myCoupons.forEach(m => {
            if (m.coupon.discount_amount) {
                vals.push({ id: `my-${m.coupon.id}`, amount: m.coupon.discount_amount, currency: 'USD' });
            }
        });
        return vals;
    }, [activeCoupons, myCoupons]);

    const { convertedValues, isLoading } = useCurrencyConverter(priceValues);

    const stats = useMemo(() => ({
        active: myCoupons.filter(c => c.status === 'active').length,
        used: myCoupons.filter(c => c.status === 'used').length,
        expired: myCoupons.filter(c => c.status === 'expired').length,
    }), [myCoupons]);

    const formatDiscount = (coupon: PromoCoupon, type: 'active' | 'my') => {
        if (coupon.discount_amount) {
            const key = `${type}-${coupon.id}`;
            const converted = convertedValues[key];
            if (converted?.converted) return converted.converted;

            // Fallback while loading
            const symbol = getCurrencySymbol(getUserCurrency());
            if (isLoading) return `${symbol}...`;
            return `${symbol}${coupon.discount_amount}`;
        }
        if (coupon.discount_percentage) return `${coupon.discount_percentage}% OFF`;
        return 'Coupon';
    };

    const getEligibleLink = (coupon: PromoCoupon) => {
        if (coupon.seller_id) {
            return `/?view=vendor-store&vendorId=${coupon.seller_id}`;
        }
        return `/?search=${encodeURIComponent(coupon.name)}`;
    };

    const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString() : '—';

    const handleClaim = async (couponId: string) => {
        if (!user?.id) {
            setMessage('Please sign in to claim coupons.');
            return;
        }
        setClaimingId(couponId);
        const ok = await claimCoupon(couponId, user.id);
        if (ok) {
            showNotification(
                `🎉 Coupon claimed successfully! It will be automatically applied at checkout.`,
                'success',
                10000,
                () => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            );
            await Promise.all([loadMine(), loadActive()]);
        } else {
            setMessage('Could not claim this coupon. It may be used up.');
        }
        setClaimingId(null);
    };

    const unclaimedActive = useMemo(
        () => activeCoupons.filter(c => !claimedIds.has(c.id)),
        [activeCoupons, claimedIds]
    );

    const renderSavedCoupon = (entry: UserCoupon) => {
        const { coupon, status } = entry;
        const badge = couponBadge[status];
        const isDisabled = status === 'expired' || status === 'used' || status === 'out_of_stock';

        return (
            <div key={coupon.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 group transition-all hover:shadow-md hover:border-orange-200">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="text-xs font-black uppercase text-orange-600 tracking-wider mb-1">{formatDiscount(coupon, 'my')}</div>
                        <div className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors uppercase italic">{coupon.name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="material-icons text-[14px] text-gray-400">verified</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Code saved</span>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badge || couponBadge.active}`}>
                        {status.replace('_', ' ')}
                    </div>
                </div>

                {!isDisabled && (
                    <div className="flex flex-col gap-2">
                        <a
                            href={getEligibleLink(coupon)}
                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 transition-colors group/link"
                        >
                            <span className="material-icons text-sm">shopping_bag</span>
                            Shop Eligible Products
                            <span className="material-icons text-[10px] transform group-hover/link:translate-x-0.5 transition-transform">arrow_forward</span>
                        </a>
                    </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-600 border-y border-gray-50 py-3 my-1">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-base text-gray-400">event</span>
                        <span className="font-medium">Expires {formatDate(coupon.end_time)}</span>
                    </div>
                    {typeof entry.remaining_quantity === 'number' && (
                        <div className="flex items-center gap-1 text-orange-600 font-bold">
                            <span className="material-icons text-base">confirmation_number</span>
                            {entry.remaining_quantity} left
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-[10px] font-medium text-gray-400">Claimed {formatDate(entry.claimed_at)}{entry.used_at ? ` · Used ${formatDate(entry.used_at)}` : ''}</div>
                    <div className="flex gap-2">
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-tight transition-all ${isDisabled ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700 ring-1 ring-green-100'}`}>
                            <span className="material-icons text-sm">{isDisabled ? 'block' : 'auto_awesome'}</span>
                            {isDisabled ? 'Not Available' : 'Ready for Checkout'}
                        </span>
                    </div>
                </div>
                {!isDisabled && (
                    <div className="bg-blue-50/50 rounded-lg p-2.5 flex flex-col gap-2 mt-1 border border-blue-100/50">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-blue-500 text-sm">info</span>
                            <span className="text-[10px] font-semibold text-blue-800">Available for items from this seller</span>
                        </div>
                        <a
                            href={getEligibleLink(coupon)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between bg-white px-3 py-1.5 rounded-md border border-blue-100 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all group/shop"
                        >
                            <span className="flex items-center gap-1.5">
                                <span className="material-icons text-xs">shopping_bag</span>
                                Shop Eligible Products
                            </span>
                            <span className="material-icons text-xs transform group-hover/shop:translate-x-0.5 transition-transform">arrow_forward</span>
                        </a>
                    </div>
                )}
            </div>
        );
    };

    const renderAvailableCoupon = (coupon: PromoCoupon) => {
        const remaining = coupon.total_quantity ? Math.max((coupon.total_quantity ?? 0) - (coupon.claimed_quantity ?? 0), 0) : undefined;
        const isOut = typeof remaining === 'number' && remaining <= 0;
        const isDisabled = claimingId === coupon.id || isOut;

        return (
            <div key={coupon.id} className="relative overflow-hidden bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 group transition-all hover:border-orange-500 hover:shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-all" />

                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="text-xs font-black uppercase text-orange-600 tracking-wider mb-1">{formatDiscount(coupon, 'active')}</div>
                        <div className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors uppercase italic">{coupon.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Limited Time Offer</div>
                    </div>
                    <div className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <div className="flex items-center justify-end gap-1">
                            <span className="material-icons text-sm">timer</span>
                            Ends {formatDate(coupon.end_time)}
                        </div>
                        {typeof remaining === 'number' && <div className="text-orange-600 mt-1">{remaining} deals left</div>}
                    </div>
                </div>
                <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valid from {formatDate(coupon.start_time)}</div>
                        <button
                            className="bg-orange-600 hover:bg-orange-700 active:scale-95 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-orange-600/20"
                            onClick={() => handleClaim(coupon.id)}
                            disabled={isDisabled}
                        >
                            {claimingId === coupon.id ? 'Claiming...' : isOut ? 'No more left' : 'Claim now'}
                        </button>
                    </div>
                    {!isOut && (
                        <a
                            href={getEligibleLink(coupon)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors py-1"
                        >
                            <span className="material-icons text-sm">visibility</span>
                            View Eligible Products
                        </a>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <header className="mb-10">
                <div className="flex items-center gap-4 mb-3">
                    <div className="bg-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-600/20">
                        <span className="material-icons text-white text-2xl">local_offer</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Coupon Center</h1>
                        <p className="text-slate-500 font-medium italic uppercase tracking-wider text-[11px]">Claim and save coupons to your account. They will be auto-applied at checkout.</p>
                    </div>
                </div>

                {message && (
                    <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm">
                        <span className="material-icons text-orange-600 mt-0.5">info</span>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-orange-900">{message}</p>
                            {message.includes('saved') && (
                                <a
                                    href="/"
                                    className="inline-flex items-center mt-2 px-4 py-1.5 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all"
                                >
                                    Start Shopping
                                    <span className="material-icons text-xs ml-1">arrow_forward</span>
                                </a>
                            )}
                        </div>
                        <button onClick={() => setMessage(null)} className="text-orange-400 hover:text-orange-600 transition-colors">
                            <span className="material-icons text-sm">close</span>
                        </button>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    {/* Saved Coupons Section */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Saved Coupons</h2>
                                <span className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded-lg text-xs font-black">{stats.active}</span>
                            </div>
                            {loadingMine && <span className="text-[10px] font-black text-orange-400 animate-pulse uppercase tracking-widest">Refreshing...</span>}
                        </div>

                        {!user?.id ? (
                            <div className="bg-slate-50/50 rounded-3xl p-12 border-2 border-dashed border-slate-200 text-center">
                                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
                                    <span className="material-icons text-4xl text-slate-300">account_circle</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 mb-2 uppercase italic">Wallet Offline</h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto mb-6">Sign in to claim and save exclusive coupons for your next purchase.</p>
                            </div>
                        ) : myCoupons.length === 0 && !loadingMine ? (
                            <div className="bg-slate-50/50 rounded-3xl p-12 border-2 border-dashed border-slate-200 text-center">
                                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
                                    <span className="material-icons text-4xl text-slate-300">confirmation_number</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 mb-2 uppercase italic">Empty Wallet</h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto mb-6">You haven't saved any coupons yet. Check the available offers below!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {myCoupons.map(renderSavedCoupon)}
                            </div>
                        )}
                    </section>

                    {/* Available Coupons Section */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Available Deals</h2>
                                <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-xs font-black">{unclaimedActive.length}</span>
                            </div>
                            {loadingActive && <span className="text-[10px] font-black text-orange-400 animate-pulse uppercase tracking-widest">Loading Deals...</span>}
                        </div>

                        {unclaimedActive.length === 0 && !loadingActive ? (
                            <div className="bg-slate-50/50 rounded-3xl p-12 border-2 border-dashed border-slate-200 text-center">
                                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
                                    <span className="material-icons text-4xl text-slate-300">sentiment_dissatisfied</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 mb-2 uppercase italic">Nothing Right Now</h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto mb-6">Check back later for new exclusive deals and upcoming promotions.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {unclaimedActive.map(renderAvailableCoupon)}
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar Stats & Info */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all duration-700" />

                        <div className="relative flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 italic">Wallet Summary</h3>
                            <span className="material-icons text-white/20 group-hover:text-orange-500/50 transition-colors">account_balance_wallet</span>
                        </div>

                        <div className="space-y-4">
                            <div className="group/stat flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm transition-all hover:scale-[1.02] hover:bg-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                                        <span className="material-icons text-sm">confirmation_number</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover/stat:text-slate-200 transition-colors">Ready to Use</span>
                                </div>
                                <span className="text-2xl font-black">{stats.active}</span>
                            </div>

                            <div className="group/stat flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm transition-all hover:scale-[1.02] hover:bg-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                                        <span className="material-icons text-sm">check_circle</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover/stat:text-slate-200 transition-colors">Savings Claimed</span>
                                </div>
                                <span className="text-2xl font-black text-green-400 group-hover/stat:scale-110 transition-transform">{stats.used}</span>
                            </div>

                            <div className="group/stat flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm transition-all hover:scale-[1.02] hover:bg-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-500/20 flex items-center justify-center text-slate-400">
                                        <span className="material-icons text-sm">history</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover/stat:text-slate-400 transition-colors">Expired</span>
                                </div>
                                <span className="text-2xl font-black text-slate-500">{stats.expired}</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 text-center">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                Use your saved coupons <br /> to maximize savings at checkout
                            </p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-white rounded-3xl p-7 border border-orange-100 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-orange-600 flex items-center gap-2 italic">
                            <span className="material-icons text-lg">bolt</span>
                            Smart Checkout
                        </h3>
                        <ul className="space-y-5">
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-orange-600/20">1</div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-800 uppercase italic tracking-tight">Claim Offers</p>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Browse and save deals to your wallet.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-orange-600/20">2</div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-800 uppercase italic tracking-tight">Sync Account</p>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Saved coupons are tied to your personal profile.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-orange-600/20">3</div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-800 uppercase italic tracking-tight">Auto-Apply</p>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Simply shop; we'll apply the best discount for you!</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuyerCouponsView;
