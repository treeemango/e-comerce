
import React, { useState } from 'react';

const CreateCouponView: React.FC = () => {
    const [couponName, setCouponName] = useState('');

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="text-xs text-gray-500 mb-2">
                Coupon <span className="mx-1">&gt;</span> <span className="text-gray-900 font-medium">Create new coupon</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create new coupon</h1>

            <div className="flex gap-6 items-start">
                <div className="flex-1 space-y-6">
                    {/* Settings Panel */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900">Coupon settings</h3>
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded text-xs text-gray-700 flex items-start gap-2">
                                <span className="material-icons text-orange-500 text-sm mt-0.5">info</span>
                                You can set a no-threshold coupon which can only be applied to a single product.
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-bold text-gray-900">Coupon name</label>
                            </div>
                            <p className="text-xs text-gray-500">Enter a name for the coupon with less than 50 characters.The coupon name will not be visible to customers.</p>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={couponName}
                                    onChange={(e) => setCouponName(e.target.value)}
                                    placeholder="Enter"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">0/50</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">Schedule</label>
                            <p className="text-xs text-gray-500">Select a duration of between 1-90 days.</p>
                            <div className="flex items-center gap-2">
                                <input type="datetime-local" className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 w-1/2" />
                                <span className="text-gray-400">-</span>
                                <input type="datetime-local" className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 w-1/2" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">Coupon Validity</label>
                            <p className="text-xs text-gray-500">The validity is calculated from when the user receives the coupon.</p>
                            <p className="text-xs text-orange-500 font-medium">Valid for 24 hours once claimed</p>
                        </div>
                    </div>

                    {/* Product Select Panel */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                        <div className="space-y-1">
                            <h3 className="font-bold text-gray-900">Select product with coupons</h3>
                            <p className="text-xs text-gray-500">Relevant products and the number of coupons are recommended based on product strategies. Sellers are advised to refer to these recommendations.</p>
                        </div>

                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-orange-500">0 selected products / 18 in total</h4>
                            <div className="flex gap-2">
                                <select className="border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-600">
                                    <option>Created date(descending)</option>
                                </select>
                                <div className="relative">
                                    <input type="text" placeholder="Search product name, Goods ID" className="border border-gray-300 rounded pl-3 pr-8 py-1.5 text-xs w-64" />
                                    <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                </div>
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="w-8 px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Product Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Discount</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">Base price</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">Quantity</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">Coupon quantity</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-4 py-4 align-top"><input type="checkbox" className="rounded border-gray-300" /></td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                                    <img src="https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=80" alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-900 line-clamp-2 max-w-[200px]">Roll over image to zoom in Set of 2 Silver Breastfeeding Caps, Nipple...</p>
                                                    <div className="text-[10px] text-gray-400 mt-1">Goods ID: 603233170868549</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-middle">
                                            <div className="flex items-center gap-1 text-sm font-bold text-red-500">
                                                <span className="material-icons text-sm">monetization_on</span> Money off
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-middle text-right text-xs text-gray-900">
                                            $15.70 - $19.10
                                        </td>
                                        <td className="px-4 py-4 align-middle text-right text-xs text-gray-900">
                                            400
                                        </td>
                                        <td className="px-4 py-4 align-middle text-right">
                                            <input type="text" placeholder="-" className="border border-gray-300 rounded px-2 py-1 text-xs w-16 text-center" />
                                        </td>
                                        <td className="px-4 py-4 align-middle text-right">
                                            <span className="text-xs text-gray-400">View</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Preview Sidebar */}
                <div className="w-80 space-y-4">
                    <h3 className="font-bold text-gray-900">Buyer browsing example</h3>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="aspect-square bg-gray-100 relative">
                            <img src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400" alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                                Bought in the last 24 hours
                            </div>
                        </div>
                        <div className="p-3">
                            <div className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 w-fit px-1 rounded mb-1">
                                <span className="material-icons text-[10px]">local_shipping</span> Free shipping from shop provider
                            </div>
                            <p className="text-xs font-medium text-gray-900 line-clamp-2 mb-2">
                                Trendy Dermis Crocodile Print Shoulder Bag, Solid Color Crossbody Bag, Perfect Sling Bag For Wom...
                            </p>

                            {/* Coupon Ticket */}
                            <div className="bg-white border border-red-200 rounded border-l-4 border-l-red-500 p-2 shadow-sm mb-2 flex justify-between items-center">
                                <div>
                                    <div className="text-sm font-bold text-gray-900">Extra $3.00 off &gt;</div>
                                    <div className="text-[10px] text-gray-500">Expires in 2 days</div>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-sm font-bold text-gray-900">$24.99</span>
                                <span className="text-xs text-red-500">Extra$3.00 off &gt;</span>
                                <span className="text-[10px] text-gray-500">Pay $21.99 Today</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCouponView;
