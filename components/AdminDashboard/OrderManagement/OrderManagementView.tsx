import React, { useEffect, useState } from 'react';
// We'll reuse the seller order fetcher for now, but in reality admin should see ALL orders
// For this MVP we'll treat it as a "super viewer"
import { fetchSellerOrders } from '@/lib/api';
import type { SellerOrder } from '@/types';

const OrderManagementView: React.FC = () => {
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        // TODO: Create a specific fetchAllOrders admin API
        // For now, this is a placeholder structure
        setLoading(false);
    }, [filterStatus]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'processing': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
                <div className="flex gap-3">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="all">All Orders</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-shopping-cart text-blue-500 text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Order Management</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        This module will allow global oversight of all platform orders.
                        Currently under development pending backend "get_all_orders" RPC function.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OrderManagementView;
