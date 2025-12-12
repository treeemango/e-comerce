
import React, { useState, useEffect } from 'react';
import { fetchPricingSuggestions } from '../../lib/api';

interface PricingHealthViewProps {
    sellerId: string;
}

interface PricingItem {
    id: string;
    pricingId: string;
    dateCreated: string;
    productName: string;
    thumbnail: string;
    goodsId: string;
    skuId: string;
    sku: string;
    currentPrice: number;
    referencePrice: number;
    daysLeft: number;
    status: 'action_required' | 'accepted' | 'rejected' | 'in_process';
    acceptedDate?: string;
    issue?: string;
}

const PricingHealthView: React.FC<PricingHealthViewProps> = ({ sellerId }) => {
    const [activeMainTab, setActiveMainTab] = useState<'incomplete' | 'opportunities' | 'modification'>('opportunities');
    const [activeSubTab, setActiveSubTab] = useState<'all' | 'action_required' | 'in_process' | 'accepted' | 'rejected'>('action_required');
    const [searchQuery, setSearchQuery] = useState('');
    const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (sellerId) {
                const data = await fetchPricingSuggestions(sellerId);

                // Map DB data to UI model
                const mappedItems: PricingItem[] = data.map((item: any) => ({
                    id: item.id,
                    pricingId: item.id.substring(0, 8).toUpperCase(), // Mock ID format for display
                    dateCreated: new Date(item.created_at).toLocaleDateString(),
                    productName: item.products?.title || 'Unknown Product',
                    thumbnail: item.products?.featured_image_url || '',
                    goodsId: item.product_id?.substring(0, 10) || '-',
                    skuId: item.variant_id?.substring(0, 10) || '-',
                    sku: '-', // Variant SKU if available
                    currentPrice: item.current_price,
                    referencePrice: item.suggested_price,
                    daysLeft: 7, // Mock or calculate based on created_at
                    status: item.status === 'pending' ? 'action_required' : item.status,
                    acceptedDate: item.status === 'accepted' ? new Date(item.updated_at).toLocaleDateString() : undefined,
                    issue: item.reason
                }));

                setPricingItems(mappedItems);
            }
            setIsLoading(false);
        };
        loadData();
    }, [sellerId]);

    const filteredItems = pricingItems.filter(item => {
        if (activeSubTab === 'all') return true;
        return item.status === activeSubTab;
    });

    const actionRequiredCount = pricingItems.filter(i => i.status === 'action_required').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Pricing health</h1>

                {/* Main Tabs */}
                <div className="flex items-center gap-8 border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveMainTab('incomplete')}
                        className={`pb-3 font-medium text-sm transition-colors relative ${activeMainTab === 'incomplete' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Incomplete offers <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">0</span>
                        {activeMainTab === 'incomplete' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                    <button
                        onClick={() => setActiveMainTab('opportunities')}
                        className={`pb-3 font-medium text-sm transition-colors relative ${activeMainTab === 'opportunities' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Pricing opportunities <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{actionRequiredCount}</span>
                        {activeMainTab === 'opportunities' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                    <button
                        onClick={() => setActiveMainTab('modification')}
                        className={`pb-3 font-medium text-sm transition-colors relative ${activeMainTab === 'modification' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Pricing modification
                        {activeMainTab === 'modification' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                </div>

                {/* Info Banner */}
                <div className="border border-gray-200 rounded-lg p-3 flex items-start gap-3 bg-white">
                    <span className="material-icons text-gray-400 text-lg mt-0.5">info</span>
                    <p className="text-sm text-gray-600">
                        JuaExpress uses a variety of factors to suggest optimal pricing strategies for your listings. To enhance your sales potential, please consider the reference base price when updating your offer. Here is the list of products with prices pending updates.
                    </p>
                </div>
            </div>

            {/* Sub Tabs & Summary */}
            <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-gray-900">
                    {filteredItems.length} pricing with reference base price
                </div>
                {activeSubTab === 'action_required' && (
                    <button className="bg-orange-500 text-white px-6 py-2 rounded font-medium text-sm hover:bg-orange-600 transition-colors">
                        Accept all
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-6 text-sm">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'action_required', label: 'Action required' },
                        { id: 'in_process', label: 'In Process' },
                        { id: 'accepted', label: 'Accepted' },
                        { id: 'rejected', label: 'Rejected' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id as any)}
                            className={`font-medium transition-colors ${activeSubTab === tab.id ? 'text-gray-900 border-b-2 border-gray-900 pb-0.5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Select creation date"
                            className="pl-4 pr-10 py-2 border border-gray-300 rounded text-sm w-64 focus:outline-none focus:border-orange-500"
                        />
                        <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">calendar_today</span>
                    </div>
                </div>
            </div>

            {/* Pricing Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-gray-500">Loading suggestions...</div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="w-8 px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pricing ID<div className="font-normal text-gray-500 mt-0.5">Date created</div></th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Product name<div className="font-normal text-gray-500 mt-0.5">Image, Variation, Goods ID, SKU ID, SKU</div></th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status<div className="font-normal text-gray-500 mt-0.5">Issue</div></th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Base Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                                        Reference base price <span className="material-icons text-[14px] align-text-bottom text-gray-400">help_outline</span>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 align-top"><input type="checkbox" className="rounded border-gray-300" /></td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="text-sm font-medium text-gray-900">{item.pricingId}</div>
                                            <div className="text-xs text-gray-500 mt-1">{item.dateCreated}</div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex gap-3">
                                                <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                                    {item.thumbnail ? (
                                                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                                            <span className="material-icons text-sm">image</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm text-gray-900 line-clamp-2">{item.productName}</p>
                                                    <div className="text-xs text-gray-400">
                                                        <div>Goods ID: {item.goodsId}</div>
                                                        <div>SKU ID: {item.skuId}</div>
                                                        <div>SKU: {item.sku}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            {item.status === 'action_required' ? (
                                                <div className="space-y-2">
                                                    <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-medium rounded">Action required</span>
                                                    <div className="text-xs text-gray-500">Take action within: {item.daysLeft} days</div>
                                                    <div className="text-xs text-gray-500 leading-tight">
                                                        {item.issue || "Price too high compared to market."} <span className="text-orange-500 cursor-pointer">See more ∨</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-600 text-xs font-medium rounded">Accepted</span>
                                                    {item.acceptedDate && <div className="text-xs text-gray-500">Accepted at {item.acceptedDate}</div>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex items-center text-sm font-medium text-gray-900">
                                                £{item.currentPrice}
                                                {item.status === 'action_required' && <span className="material-icons text-orange-400 text-sm ml-1 cursor-pointer">edit</span>}
                                                {item.status === 'accepted' && <span className="material-icons text-green-500 text-sm ml-1">check_circle</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="text-sm font-bold text-gray-900">£{item.referencePrice}</div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            {item.status === 'action_required' ? (
                                                <div className="flex relative group">
                                                    <button className="bg-orange-500 text-white px-3 py-1.5 rounded-l text-xs font-medium hover:bg-orange-600">
                                                        Accept reference price
                                                    </button>
                                                    <button className="bg-orange-500 text-white px-1 py-1.5 rounded-r text-xs border-l border-orange-400 hover:bg-orange-600">
                                                        <span className="material-icons text-sm">expand_more</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <button className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-50">
                                                    Previous records
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredItems.length === 0 && (
                            <div className="p-12 text-center text-gray-500 text-sm">
                                No pricing opportunities found.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PricingHealthView;
