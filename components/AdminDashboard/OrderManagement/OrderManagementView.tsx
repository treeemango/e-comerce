import React, { useEffect, useState } from 'react';
import { fetchAllOrders } from '@/lib/api';
import type { SellerOrder } from '@/types';

const OrderManagementView: React.FC = () => {
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const loadOrders = async () => {
            setLoading(true);
            const data = await fetchAllOrders();
            setOrders(data);
            setLoading(false);
        };
        loadOrders();
    }, []);

    const filteredOrders = orders.filter(order =>
        filterStatus === 'all' || order.status === filterStatus
    );

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'delivered': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'shipped': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'pending': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'refunded': return 'bg-red-50 text-red-600 border-red-100';
            case 'cancelled': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order Management</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Platform-wide order oversight</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-slate-100 border-none rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="refunded">Refunded</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border-2 border-slate-50 shadow-xl overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent shadow-xl"></div>
                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Scanning platform orders...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="p-20 text-center">
                        <span className="material-icons text-6xl text-slate-100 mb-4">shopping_bag</span>
                        <h3 className="text-lg font-black text-slate-400 tracking-tight">No matching orders found</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Order #</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-6 border-none">
                                            <span className="font-black text-indigo-600 tracking-tighter">#{order.order_number}</span>
                                        </td>
                                        <td className="px-6 py-6 border-none">
                                            <div className="font-bold text-slate-900">{order.customer_name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{order.customer_email}</div>
                                        </td>
                                        <td className="px-6 py-6 border-none">
                                            <span className="font-black text-slate-900 tracking-tight">£{order.total_amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-6 border-none">
                                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 border-none text-slate-500 font-bold text-xs uppercase tracking-tighter">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-6 border-none text-right">
                                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 ml-auto group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                {order.items.length}
                                            </span>
                                        </td>
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

export default OrderManagementView;
