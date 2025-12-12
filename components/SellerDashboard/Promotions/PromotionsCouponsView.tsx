
import React, { useState, useEffect } from 'react';
import { fetchCoupons } from '../../../lib/api';

interface PromotionsCouponsViewProps {
    sellerId: string;
    onNavigate?: (tab: string) => void;
}

interface PromoCoupon {
    id: string;
    name: string;
    discountAmount: number;
    status: 'Ongoing' | 'Expired' | 'Upcoming';
    startTime: string;
    endTime: string;
    product: {
        name: string;
        goodsId: string;
        thumbnail: string;
    };
    quantity: number;
    claimed: number;
    used: number;
    estDiscount: number;
}

const PromotionsCouponsView: React.FC<PromotionsCouponsViewProps> = ({ sellerId, onNavigate }) => {
    const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (sellerId) {
                const data = await fetchCoupons(sellerId);

                const mappedCoupons: PromoCoupon[] = data.map((item: any) => ({
                    id: item.id,
                    name: item.code, // Using code as name/title
                    discountAmount: item.discount_value, // Assuming value is amount
                    status: item.status === 'active' ? 'Ongoing' : item.status === 'expired' ? 'Expired' : 'Upcoming',
                    startTime: new Date(item.start_date).toLocaleString(),
                    endTime: new Date(item.end_date).toLocaleString(),
                    product: {
                        name: item.products?.title || 'All Products',
                        goodsId: item.product_id ? item.product_id.substring(0, 10).toUpperCase() : 'N/A',
                        thumbnail: item.products?.featured_image_url || ''
                    },
                    quantity: item.usage_limit || 9999,
                    claimed: item.times_used || 0,
                    used: item.times_used || 0, // Simplified for now
                    estDiscount: (item.discount_value * (item.times_used || 0))
                }));
                setCoupons(mappedCoupons);
            }
            setIsLoading(false);
        };
        loadData();
    }, [sellerId]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>

            <p className="text-sm text-gray-600">
                Set up exclusive product coupons, improve sales competitiveness through seller incentives, attract more customers, and boost sales.
                <a href="#" className="text-orange-500 ml-1 hover:underline">Learn more &gt;</a>
            </p>

            <button
                onClick={() => onNavigate && onNavigate('create-coupon')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors"
            >
                <span className="material-icons">add</span>
                Create new coupon
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
                    <button className="pb-3 border-b-2 border-gray-900 font-bold text-sm text-gray-900">All</button>
                    <button className="pb-3 text-sm text-gray-500 hover:text-gray-700">Ongoing</button>
                    <button className="pb-3 text-sm text-gray-500 hover:text-gray-700">Upcoming</button>
                    <button className="pb-3 text-sm text-gray-500 hover:text-gray-700">Expired</button>
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
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500">Loading coupons...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-white border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Coupon name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-[30%]">Product name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Product quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Claimed/Used</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Estimated total discount amount</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {coupons.map(coupon => (
                                    <tr key={coupon.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-sm font-bold text-gray-900">{coupon.name}</div>
                                            <div className="text-gray-500 text-xs">${coupon.discountAmount.toFixed(2)} off</div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className={`inline-block px-2 py-0.5 border rounded text-[10px] uppercase font-bold mb-1 ${coupon.status === 'Ongoing' ? 'text-green-600 border-green-200 bg-green-50' :
                                                coupon.status === 'Expired' ? 'text-red-500 border-red-200 bg-red-50' :
                                                    'text-gray-500 border-gray-200 bg-gray-50'
                                                }`}>
                                                {coupon.status}
                                            </div>
                                            <div className="text-xs text-gray-500">{coupon.startTime} -</div>
                                            <div className="text-xs text-gray-500">{coupon.endTime}</div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex gap-3">
                                                <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0 border border-gray-200">
                                                    {coupon.product.thumbnail ? (
                                                        <img src={coupon.product.thumbnail} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                                            <span className="material-icons text-xs">image</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-900 line-clamp-2 mb-1">{coupon.product.name}</p>
                                                    <div className="text-[10px] text-gray-400">Goods ID: {coupon.product.goodsId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top text-sm text-gray-900">
                                            {coupon.quantity.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-sm text-gray-900">{coupon.claimed}/{coupon.used}</div>
                                            <div className="text-[10px] text-gray-400">{coupon.claimed === 0 ? '-/-' : `${coupon.claimed}/${coupon.used}`} <span className="material-icons text-[10px]">help_outline</span></div>
                                        </td>
                                        <td className="px-6 py-4 align-top text-sm text-gray-900">
                                            {coupon.estDiscount > 0 ? `$${coupon.estDiscount.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 align-top text-right">
                                            {coupon.status === 'Ongoing' && (
                                                <button className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors">
                                                    Deactivate
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {coupons.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                                            No coupons found. Create one to get started!
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
