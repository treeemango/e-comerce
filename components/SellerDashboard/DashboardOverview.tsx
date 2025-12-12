
import React, { useEffect, useState } from 'react';
import { fetchSellerInventory, fetchSellerStats, SellerStats } from '../../lib/api';
import { SellerInventoryItem } from '../../types';

interface DashboardOverviewProps {
    sellerId?: string;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ sellerId }) => {
    const [stats, setStats] = useState<SellerStats | null>(null);
    const [recentInventory, setRecentInventory] = useState<SellerInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (sellerId) {
                // Fetch stats and recent inventory in parallel
                const [statsData, inventoryData] = await Promise.all([
                    fetchSellerStats(sellerId),
                    fetchSellerInventory(sellerId) // Assuming this returns a list of items
                ]);

                setStats(statsData);
                setRecentInventory(inventoryData);
            }
            setIsLoading(false);
        };
        loadData();
    }, [sellerId]);

    // Fallbacks if stats are loading or failed
    const totalProducts = stats?.total_products || 0;
    const totalSales = stats?.total_sales || 0;
    // For total stock, we might not have a stat for it in get_seller_stats yet, 
    // but we can calculate from recent inventory or add it to stats later. 
    // For now, let's use the sum from recent inventory as a proxy or 0 if we want to be strict.
    // Better yet, let's just stick to what we have in stats or disable the card if missing.
    // Actually, let's use the inventory data for "Total Stock" if we had full inventory, 
    // but fetchSellerInventory might be limited. 
    // Let's use a placeholder or calculate from the reduced set if that's all we have, 
    // or just assume the simplified mock inventory is small enough for now.
    // NOTE: In a real large app, specific aggregate query for stock is better.
    const totalStock = recentInventory.reduce((acc, item) => acc + item.current_stock, 0);
    const lowStockItems = stats?.low_stock_count || 0;

    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Products', value: totalProducts, icon: 'inventory_2', color: 'bg-blue-500' },
                    { label: 'Total Sales', value: `£${totalSales.toLocaleString()}`, icon: 'shopping_cart', color: 'bg-green-500' },
                    { label: 'Total Stock', value: totalStock, icon: 'bar_chart', color: 'bg-purple-500' },
                    { label: 'Low Stock Alerts', value: lowStockItems, icon: 'warning', color: 'bg-red-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
                        </div>
                        <div className={`${stat.color} p-3 rounded-lg text-white shadow-lg shadow-gray-200`}>
                            <span className="material-icons">{stat.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Inventory Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Inventory Summary</h3>
                    <button className="text-sm text-orange-600 font-medium hover:text-orange-700">View All</button>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading inventory...</div>
                ) : recentInventory.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No products found. Start listing items!</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3">Product Name</th>
                                    <th className="px-6 py-3">SKU</th>
                                    <th className="px-6 py-3">Price</th>
                                    <th className="px-6 py-3">Stock</th>
                                    <th className="px-6 py-3">Sales</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentInventory.slice(0, 10).map((item) => (
                                    <tr key={item.variant_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-900">{item.product_title}</td>
                                        <td className="px-6 py-3 text-gray-500">{item.sku || '-'}</td>
                                        <td className="px-6 py-3">£{item.current_price}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.current_stock < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {item.current_stock}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">{item.total_sales_to_date}</td>
                                        <td className="px-6 py-3 text-gray-500">Active</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardOverview;
