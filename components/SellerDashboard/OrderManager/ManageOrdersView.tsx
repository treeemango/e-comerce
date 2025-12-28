import React, { useState, useEffect, useMemo } from 'react';
import { fetchSellerOrders } from '../../../lib/api';
import { SellerOrder } from '../../../types';
import { useCurrencyConverter, formatPrice } from '../../../lib/currency';
import OrderDetailsModal from './OrderDetailsModal';
import BuyerReceipt from './BuyerReceipt';

// Use SellerOrder interface from types.ts, mapped to view needs if necessary
// But try to use the type directly.



interface ManageOrdersViewProps {
    sellerId?: string;
}

const ManageOrdersView: React.FC<ManageOrdersViewProps> = ({ sellerId }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'unshipped' | 'canceled' | 'shipped' | 'delivered'>('unshipped');
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
    const [printingOrder, setPrintingOrder] = useState<SellerOrder | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (sellerId) {
                setIsLoading(true);
                // Map local tab names to DB status if different
                // DB statuses: pending, paid/unshipped?, shipped, cancelled
                // Let's assume database uses 'pending', 'paid', 'shipped', 'cancelled'
                // For 'unshipped', we probably mean 'paid' status.

                let dbStatus = activeTab;
                if (activeTab === 'unshipped') dbStatus = 'paid';

                // Fetch all or specific? fetchSellerOrders takes generic status.
                // Or we fetch all and filter client side if not too many.
                // Let's try fetching specific status for efficiency.

                const data = await fetchSellerOrders(sellerId); // Implementation fetches all for now, or we can filter client side.
                setOrders(data);
            }
            setIsLoading(false);
        };
        loadData();
    }, [sellerId, activeTab]);
    const filteredOrders = orders.filter(order => {
        // Status mapping
        let orderStatus = order.status;
        if (orderStatus === 'paid') orderStatus = 'unshipped';
        if (orderStatus === 'ready_for_pickup') orderStatus = 'unshipped'; // Group ready items in unshipped for now

        return orderStatus === activeTab;
    });

    // Currency conversion for order item prices
    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];

        filteredOrders.forEach((order, orderIdx) => {
            order.items?.forEach((item, itemIdx) => {
                vals.push({
                    id: `order-${orderIdx}-item-${itemIdx}`,
                    amount: item.price || 0,
                    currency: item.currency || 'USD'
                });
            });
        });

        return vals;
    }, [filteredOrders]);

    const { convertedValues } = useCurrencyConverter(priceValues);

    const getConvertedPrice = (orderId: string, itemIdx: number, fallback: number, currency: string) => {
        const orderIdx = filteredOrders.findIndex(o => o.id === orderId);
        const id = `order-${orderIdx}-item-${itemIdx}`;
        return convertedValues[id]?.converted ?? formatPrice(fallback, currency);
    };


    if (!sellerId) return <div className="p-8 text-center">Please log in to view orders.</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Manage orders</h1>
                    <div className="flex items-center gap-2">
                        <select className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-orange-500">
                            <option>Order ID</option>
                            <option>Buyer Name</option>
                        </select>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search"
                                className="pl-4 pr-10 py-2 border border-gray-300 rounded text-sm w-64 focus:outline-none focus:border-orange-500"
                            />
                            <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'pending' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Pending <span className="text-gray-400 font-normal ml-1"></span>
                        {activeTab === 'pending' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('unshipped')}
                        className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'unshipped' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Unshipped <span className="text-gray-900 font-bold ml-1"></span>
                        {activeTab === 'unshipped' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('canceled')}
                        className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'canceled' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Canceled
                        {activeTab === 'canceled' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('shipped')}
                        className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'shipped' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Shipped
                        {activeTab === 'shipped' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('delivered')}
                        className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'delivered' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Delivered
                        {activeTab === 'delivered' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-gray-700 text-sm font-medium hover:text-orange-500">
                        <span className="material-icons text-lg">filter_list</span>
                        Show filters
                    </button>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <span className="text-sm font-bold text-gray-900">{filteredOrders.length} orders</span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-1.5 border border-gray-300 rounded hover:bg-gray-50">
                        <span className="material-icons text-gray-500 text-lg">refresh</span>
                    </button>
                </div>
            </div>

            {/* Orders List */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-gray-500">Loading orders...</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="w-8 px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order date</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order details</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[30%]">Product Info</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Unit price</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer option</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Order status</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50 group">
                                    <td className="px-4 py-6 align-top"><input type="checkbox" className="rounded border-gray-300" /></td>
                                    <td className="px-4 py-6 align-top">
                                        <div className="text-sm font-bold text-gray-900 mb-1">
                                            {/* Calculate time ago roughly */}
                                            {Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 3600 * 24))} days ago
                                        </div>
                                        <div className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-4 py-6 align-top">
                                        <div className="text-xs font-medium text-orange-500 hover:text-orange-600 cursor-pointer mb-1">
                                            {order.id.substring(0, 8).toUpperCase()}
                                        </div>
                                        <div className="text-xs text-gray-500">Buyer: <span className="text-orange-500">{order.customer_name || 'Guest'}</span></div>
                                    </td>
                                    <td className="px-4 py-6 align-top" colSpan={3}>
                                        <div className="space-y-6">
                                            {order.items && order.items.map((item, idx) => (
                                                <div key={idx} className="flex gap-4">
                                                    {/* Product Info Column Part */}
                                                    <div className="flex gap-3 flex-1">
                                                        <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 overflow-hidden flex-shrink-0">
                                                            {item.image_url ? (
                                                                <img src={item.image_url} alt={item.product_title} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                                                    <span className="material-icons text-sm">image</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-sm text-gray-900 font-medium line-clamp-1">{item.product_title}</p>
                                                            <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                                                        </div>
                                                    </div>

                                                    {/* Unit Price Column Part */}
                                                    <div className="w-24 text-right">
                                                        <div className="text-xs text-gray-500">Price: <span className="text-gray-900 font-medium">{getConvertedPrice(order.id, idx, item.price || 0, item.currency || 'USD')}</span></div>
                                                    </div>

                                                    {/* Customer Option Column Part */}
                                                    <div className="w-32 text-xs text-gray-900">
                                                        <div className="font-medium mb-1">Standard</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 align-top text-center hidden"></td>
                                    <td className="px-4 py-6 align-top text-center hidden"></td>
                                    <td className="px-4 py-6 align-top text-center">
                                        <span className="inline-block px-2 py-0.5 text-xs font-bold border rounded bg-gray-50 border-gray-200 text-gray-500">
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-6 align-top">
                                        <div className="flex flex-col gap-2 items-center">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="bg-orange-500 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm w-full"
                                            >
                                                View Details
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setPrintingOrder(order);
                                                    setTimeout(() => {
                                                        window.print();
                                                        setTimeout(() => setPrintingOrder(null), 100);
                                                    }, 100);
                                                }}
                                                className="bg-white text-gray-700 border border-gray-300 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-50 transition-colors w-full flex items-center justify-center gap-1"
                                            >
                                                <span className="material-icons text-sm">print</span>
                                                Print
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!isLoading && filteredOrders.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No orders found in {activeTab} status
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onOrderUpdated={async () => {
                        setSelectedOrder(null);
                        const data = await fetchSellerOrders(sellerId!);
                        setOrders(data);
                    }}
                />
            )}

            {/* Print-only Receipt Component */}
            {printingOrder && <BuyerReceipt order={printingOrder} />}
        </div>
    );
};

export default ManageOrdersView;
