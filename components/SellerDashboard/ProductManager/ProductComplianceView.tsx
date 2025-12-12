
import React, { useState, useEffect } from 'react';
import { fetchProductCompliance, ProductComplianceItem } from '../../../lib/api';

interface ProductComplianceViewProps {
    sellerId?: string;
}

const ProductComplianceView: React.FC<ProductComplianceViewProps> = ({ sellerId }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [complianceItems, setComplianceItems] = useState<ProductComplianceItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (sellerId) {
                const data = await fetchProductCompliance(sellerId);
                setComplianceItems(data);
            }
            setIsLoading(false);
        };
        load();
    }, [sellerId]);

    const filteredItems = complianceItems.filter(item =>
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.goods_id.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Product compliance</h1>

            {/* Info Banner */}
            <div className="border border-gray-200 rounded-lg p-3 flex items-start gap-3 bg-white">
                <span className="material-icons text-gray-400 text-lg mt-0.5">info</span>
                <p className="text-sm text-gray-600">
                    Product compliance is key to ensuring buyers' safety and smooth transactions for sellers. In order to sell products on JuaExpress, you need to submit the corresponding compliance documents.
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-lg">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search product name or ID"
                    className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-orange-500"
                />
                <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            </div>

            {/* Compliance Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Product info</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Actual photos/Compliances</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading compliance info...</td>
                            </tr>
                        ) : filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No products requiring compliance action found.</td>
                            </tr>
                        ) : (
                            filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0 border border-gray-200">
                                                <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-900 font-medium mb-1 line-clamp-2 max-w-md">{item.product_name}</p>
                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                    <span className="material-icons text-[14px]">local_offer</span>
                                                    Product ID: {item.goods_id}
                                                    <span className="material-icons text-[14px] ml-1 cursor-pointer hover:text-gray-600">content_copy</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-sm text-gray-500">
                                        -
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        <span className="inline-block px-3 py-1 border border-gray-300 text-gray-500 text-xs font-medium rounded">
                                            {item.status === 'no_need_upload' ? 'No need upload' : 'Upload required'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-right">
                                        <button className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-50 transition-colors">
                                            View details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductComplianceView;
