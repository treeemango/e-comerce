import React, { useState, useEffect } from 'react';
import { fetchCoupons, fetchAutomaticDiscounts, updateCoupon, deleteCoupon, updateAutomaticDiscount, deleteAutomaticDiscount } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { PromoCoupon, AutomaticDiscount } from '../../../types';

interface PromotionsCouponsViewProps {
    sellerId: string;
    onNavigate?: (tab: string) => void;
}

const PromotionsCouponsView: React.FC<PromotionsCouponsViewProps> = ({ sellerId, onNavigate }) => {
    const [mainTab, setMainTab] = useState<'coupons' | 'automatic'>('coupons');
    const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
    const [autoDiscounts, setAutoDiscounts] = useState<AutomaticDiscount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusTab, setStatusTab] = useState<'All' | 'Ongoing' | 'Upcoming' | 'Expired'>('All');

    const loadData = async () => {
        setIsLoading(true);
        if (sellerId) {
            if (mainTab === 'coupons') {
                const data = await fetchCoupons(sellerId);
                setCoupons(data);
            } else {
                const data = await fetchAutomaticDiscounts(sellerId);
                setAutoDiscounts(data);
            }
        }
        setIsLoading(false);
    };

    const handleToggleCoupon = async (coupon: PromoCoupon) => {
        const newStatus = coupon.status === 'Deactivated' ? 'Ongoing' : 'Deactivated';
        const success = await updateCoupon(coupon.id, { status: newStatus });
        if (success) loadData();
    };

    const handleDeleteCoupon = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this coupon?')) {
            const success = await deleteCoupon(id);
            if (success) loadData();
        }
    };

    const handleToggleAutoDiscount = async (discount: AutomaticDiscount) => {
        const newStatus = discount.status === 'deactivated' ? 'active' : 'deactivated';
        const success = await updateAutomaticDiscount(discount.id, { status: newStatus });
        if (success) loadData();
    };

    const handleDeleteAutoDiscount = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this automatic discount?')) {
            const success = await deleteAutomaticDiscount(id);
            if (success) loadData();
        }
    };

    useEffect(() => {
        loadData();
    }, [sellerId, mainTab]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>

            <p className="text-sm text-gray-600">
                Set up exclusive product coupons, improve sales competitiveness through seller incentives, attract more customers, and boost sales.
                <a href="#" className="text-orange-500 ml-1 hover:underline">Learn more &gt;</a>
            </p>

            <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setMainTab('coupons')}
                    className={cn(
                        "pb-4 text-sm font-bold transition-all border-b-2 px-4",
                        mainTab === 'coupons' ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    Seller Coupons
                </button>
                <button
                    onClick={() => setMainTab('automatic')}
                    className={cn(
                        "pb-4 text-sm font-bold transition-all border-b-2 px-4",
                        mainTab === 'automatic' ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    Automatic Discounts
                </button>
            </div>

            <button
                onClick={() => onNavigate && onNavigate(mainTab === 'coupons' ? 'create-coupon' : 'create-auto-discount')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-orange-500/10 active:scale-95"
            >
                <span className="material-icons">add</span>
                {mainTab === 'coupons' ? 'Create new coupon' : 'Define automatic discount'}
            </button>

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 mb-2">
                        <span className="material-icons">trending_up</span>
                    </div>
                    <p className="text-xs font-bold text-gray-800">Product sale promotions</p>
                </div>
                <div className="flex flex-col items-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 mb-2">
                        <span className="material-icons">ads_click</span>
                    </div>
                    <p className="text-xs font-bold text-gray-800">Extra traffic through search referrals</p>
                </div>
                <div className="flex flex-col items-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 mb-2">
                        <span className="material-icons">sell</span>
                    </div>
                    <p className="text-xs font-bold text-gray-800">Discounts displayed on product detail pages</p>
                </div>
            </div>

            {/* Content Area */}
            <div className="space-y-4">
                {/* Tabs */}
                <div className="flex items-center gap-6 border-b border-gray-200">
                    {(['All', 'Ongoing', 'Upcoming', 'Expired'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setStatusTab(tab)}
                            className={cn(
                                "pb-3 text-sm transition-all border-b-2 px-1",
                                statusTab === tab ? "border-gray-900 font-bold text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                    <div className="flex-1 text-right">
                        <a href="#" className="text-orange-500 text-xs hover:underline">View created history &gt;</a>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex justify-end gap-3">
                    <div className="relative">
                        <input type="text" placeholder="Date created" className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm w-40 text-gray-500" disabled />
                        <span className="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">calendar_today</span>
                    </div>
                    <div className="relative">
                        <input type="text" placeholder="Search Goods ID" className="pl-3 pr-8 py-1.5 border border-gray-300 rounded text-sm w-64 focus:outline-none focus:border-orange-500" />
                        <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            Loading promotions...
                        </div>
                    ) : mainTab === 'coupons' ? (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Coupon name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[30%]">Product info</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Quota</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Claimed/Used</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {coupons
                                    .filter(c => statusTab === 'All' || c.status === statusTab)
                                    .map(coupon => (
                                        <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                                <div className="text-sm font-bold text-gray-900">{coupon.name}</div>
                                                <div className="text-gray-500 text-xs mt-1">
                                                    {coupon.code && <span className="font-mono bg-gray-100 px-1 rounded mr-1 border border-gray-200">{coupon.code}</span>}
                                                    <span className="text-orange-600 font-bold">
                                                        {coupon.discount_amount ? `$${coupon.discount_amount} off` : `${coupon.discount_percentage}% off`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className={`inline-flex px-2 py-0.5 border rounded-full text-[10px] uppercase font-black mb-1 ${coupon.status === 'Ongoing' ? 'text-green-600 border-green-200 bg-green-50' :
                                                    coupon.status === 'Expired' ? 'text-red-500 border-red-200 bg-red-50' :
                                                        'text-gray-500 border-gray-200 bg-gray-50'
                                                    }`}>
                                                    {coupon.status}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-medium mt-1">
                                                    {new Date(coupon.start_time).toLocaleDateString()} - {new Date(coupon.end_time).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="text-xs text-gray-500 font-medium italic">Store-wide promotion</div>
                                            </td>
                                            <td className="px-6 py-4 align-top text-sm text-gray-900 font-medium">
                                                {coupon.total_quantity?.toLocaleString() || 'Unlimited'}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="text-sm font-bold text-gray-900">{coupon.claimed_quantity} / {coupon.used_quantity}</div>
                                                <div className="w-20 h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                                    <div
                                                        className="h-full bg-orange-500"
                                                        style={{ width: `${Math.min((coupon.used_quantity / (coupon.total_quantity || 1)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleCoupon(coupon)}
                                                        className={cn(
                                                            "text-xs font-bold",
                                                            coupon.status === 'Deactivated' ? "text-green-600 hover:text-green-800" : "text-amber-600 hover:text-amber-800"
                                                        )}
                                                    >
                                                        {coupon.status === 'Deactivated' ? 'Activate' : 'Deactivate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCoupon(coupon.id)}
                                                        className="text-xs font-bold text-red-600 hover:text-red-800"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                {coupons.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                                            No coupons found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Discount rule</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Requirement</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Period</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {autoDiscounts
                                    .filter(d => {
                                        if (statusTab === 'All') return true;
                                        if (statusTab === 'Ongoing') return d.status === 'active';
                                        if (statusTab === 'Upcoming') return d.status === 'scheduled';
                                        if (statusTab === 'Expired') return d.status === 'expired';
                                        return true;
                                    })
                                    .map(discount => (
                                        <tr key={discount.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-gray-900">{discount.name}</div>
                                                <div className="text-xs text-orange-600 font-bold mt-1">
                                                    {discount.discount_type === 'percentage' ? `${discount.discount_value}% OFF` :
                                                        discount.discount_type === 'fixed_amount' ? `$${discount.discount_value} OFF` :
                                                            `BUY ${discount.buy_qty} GET ${discount.get_qty} FREE`}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={cn(
                                                    "inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase border",
                                                    discount.status === 'active' ? "bg-green-50 text-green-600 border-green-200" :
                                                        discount.status === 'scheduled' ? "bg-blue-50 text-blue-600 border-blue-200" :
                                                            "bg-gray-50 text-gray-500 border-gray-200"
                                                )}>
                                                    {discount.status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {discount.min_requirement_value > 0 ? `Orders over $${discount.min_requirement_value}` : 'No minimum'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-500 font-medium">
                                                    {new Date(discount.starts_at).toLocaleDateString()} - {new Date(discount.ends_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleAutoDiscount(discount)}
                                                        className={cn(
                                                            "text-xs font-bold",
                                                            discount.status === 'deactivated' ? "text-green-600 hover:text-green-800" : "text-amber-600 hover:text-amber-800"
                                                        )}
                                                    >
                                                        {discount.status === 'deactivated' ? 'Activate' : 'Deactivate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAutoDiscount(discount.id)}
                                                        className="text-xs font-bold text-red-600 hover:text-red-800"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                {autoDiscounts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                                            No automatic discounts defined yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PromotionsCouponsView;
