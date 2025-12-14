import React, { useEffect, useMemo, useState } from 'react';
import { PromoCoupon, User, UserCoupon } from '../types';
import { claimCoupon, fetchActiveCoupons, fetchUserCoupons } from '../lib/api';
import { getCurrencySymbol } from '@/lib/currency';

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

    const stats = useMemo(() => ({
        active: myCoupons.filter(c => c.status === 'active').length,
        used: myCoupons.filter(c => c.status === 'used').length,
        expired: myCoupons.filter(c => c.status === 'expired').length,
    }), [myCoupons]);

    const formatDiscount = (coupon: PromoCoupon) => {
        if (coupon.discount_amount) return `${getCurrencySymbol('USD')}${coupon.discount_amount}`;
        if (coupon.discount_percentage) return `${coupon.discount_percentage}% OFF`;
        return 'Coupon';
    };

    const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString() : '—';

    const handleCopy = async (code?: string) => {
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            setMessage('Coupon code copied. Paste it at checkout.');
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    const handleClaim = async (couponId: string) => {
        if (!user?.id) {
            setMessage('Sign in to claim coupons and save them to your account.');
            return;
        }
        setClaimingId(couponId);
        const ok = await claimCoupon(couponId, user.id);
        if (ok) {
            setMessage('Coupon saved. Apply it during checkout.');
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
            <div key={coupon.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="text-xs font-semibold uppercase text-orange-600">{formatDiscount(coupon)}</div>
                        <div className="text-lg font-bold text-slate-900">{coupon.name}</div>
                        <div className="text-xs text-gray-500">Code: <span className="font-mono">{coupon.code}</span></div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${badge || couponBadge.active}`}>
                        {status.replace('_', ' ')}
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-base text-gray-400">event</span>
                        Expires {formatDate(coupon.end_time)}
                    </div>
                    {typeof entry.remaining_quantity === 'number' && (
                        <div className="flex items-center gap-1 text-gray-500">
                            <span className="material-icons text-base text-gray-400">confirmation_number</span>
                            {entry.remaining_quantity} left
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">Claimed {formatDate(entry.claimed_at)}{entry.used_at ? ` · Used ${formatDate(entry.used_at)}` : ''}</div>
                    <div className="flex gap-2">
                        <button
                            className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
                            onClick={() => handleCopy(coupon.code)}
                            disabled={isDisabled}
                        >
                            Copy code
                        </button>
                        <button
                            className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-900 disabled:opacity-60"
                            onClick={() => handleCopy(coupon.code)}
                            disabled={isDisabled}
                        >
                            Use at checkout
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderAvailableCoupon = (coupon: PromoCoupon) => {
        const remaining = coupon.total_quantity ? Math.max((coupon.total_quantity ?? 0) - (coupon.claimed_quantity ?? 0), 0) : undefined;
        const isOut = typeof remaining === 'number' && remaining <= 0;
        const isDisabled = claimingId === coupon.id || isOut;

        return (
            <div key={coupon.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="text-xs font-bold uppercase text-orange-700">{formatDiscount(coupon)}</div>
                        <div className="text-lg font-bold text-orange-900">{coupon.name}</div>
                        <div className="text-xs text-orange-800/80">Code: <span className="font-mono">{coupon.code}</span></div>
                    </div>
                    <div className="text-right text-xs text-orange-800">
                        <div className="font-semibold">Ends {formatDate(coupon.end_time)}</div>
                        {typeof remaining === 'number' && <div>{remaining} left</div>}
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-xs text-orange-900/70">Valid from {formatDate(coupon.start_time)}</div>
                    <button
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60"
                        onClick={() => handleClaim(coupon.id)}
                        disabled={isDisabled}
                    >
                        {claimingId === coupon.id ? 'Claiming...' : isOut ? 'All claimed' : 'Claim coupon'}
                    </button>
                </div>
            </div>
        );
    };

    const SkeletonCard = () => (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 animate-pulse h-32" />
    );

    return (
        <div className="space-y-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <span className="material-icons text-base text-orange-500">confirmation_number</span>
                        Coupon codes
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Manage your coupons</h2>
                    <p className="text-sm text-gray-600">Claim, save, and copy coupon codes to use at checkout.</p>
                </div>
                {!user && (
                    <div className="text-sm text-gray-600">Sign in to keep coupons synced to your account.</div>
                )}
            </div>

            {message && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm">{message}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="text-xs text-gray-500">Active</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.active}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="text-xs text-gray-500">Used</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.used}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="text-xs text-gray-500">Expired</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.expired}</div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Saved coupons</h3>
                    {user && (
                        <button
                            className="text-sm text-gray-600 hover:text-orange-600 flex items-center gap-2"
                            onClick={loadMine}
                        >
                            <span className="material-icons text-base">refresh</span>
                            Refresh
                        </button>
                    )}
                </div>
                {!user && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">Sign in to view coupons you have claimed.</div>
                )}
                {user && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loadingMine ? (
                            <>
                                <SkeletonCard />
                                <SkeletonCard />
                            </>
                        ) : myCoupons.length > 0 ? (
                            myCoupons.map(renderSavedCoupon)
                        ) : (
                            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 text-sm">
                                No saved coupons yet. Claim one below to save it to your account.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Available coupons</h3>
                    <span className="text-sm text-gray-500">Active deals you can claim</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loadingActive ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : unclaimedActive.length > 0 ? (
                        unclaimedActive.map(renderAvailableCoupon)
                    ) : (
                        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 text-sm">
                            No active coupons right now. Check back later.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BuyerCouponsView;
