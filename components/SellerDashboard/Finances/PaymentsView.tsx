
import React, { useState, useEffect } from 'react';
import { fetchSellerTransactions } from '../../../lib/api';

interface PaymentsViewProps {
    sellerId: string;
}

interface Transaction {
    date: string;
    type: string;
    orderId: string;
    batchId: string;
    productCharges: number;
    others: number;
    total: number;
}

const PaymentsView: React.FC<PaymentsViewProps> = ({ sellerId }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (sellerId) {
                const data = await fetchSellerTransactions(sellerId);

                const mappedTransactions: Transaction[] = data.map((item: any) => ({
                    date: new Date(item.created_at).toLocaleDateString(),
                    type: item.type === 'payout' ? 'Payout' : item.type === 'refund' ? 'Refund' : 'Order Payment',
                    orderId: item.order_id ? item.order_id.substring(0, 15).toUpperCase() : '-',
                    batchId: item.payout_id || '-',
                    productCharges: item.amount > 0 ? item.amount : 0, // Simplified for now
                    others: 0,
                    total: item.amount
                }));
                setTransactions(mappedTransactions);
            }
            setIsLoading(false);
        };
        loadData();
    }, [sellerId]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Payments</h1>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-gray-200">
                <button className="pb-3 font-medium text-sm text-gray-500 hover:text-gray-700">Overview</button>
                <button className="pb-3 font-medium text-sm text-gray-500 hover:text-gray-700">Disbursements</button>
                <button className="pb-3 font-medium text-sm text-gray-900 border-b-2 border-gray-900">Statements</button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {/* Sub Tabs */}
                <div className="flex gap-4 mb-4">
                    <button className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1.5 rounded">View by orders</button>
                    <button className="text-sm text-gray-500 px-3 py-1.5 hover:bg-gray-50 rounded">View by statements</button>
                </div>

                {/* Filters */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                        <div className="relative">
                            <input type="text" placeholder="Order ID" className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm w-40" />
                            <span className="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                        </div>
                        <div className="relative">
                            <input type="text" placeholder="Batch ID" className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm w-40" />
                            <span className="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                        </div>
                        <select className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:border-orange-500 min-w-[150px]">
                            <option>Transaction type</option>
                        </select>
                        <div className="relative">
                            <input type="text" placeholder="08/13/2024 - 08/24/2024" className="pl-3 pr-8 py-1.5 border border-gray-300 rounded text-sm w-56 text-gray-600" />
                            <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">calendar_today</span>
                        </div>
                    </div>
                    <button className="text-gray-700 hover:text-orange-500 font-medium text-xs border border-gray-300 rounded px-4 py-1.5 hover:bg-gray-50 transition-colors">
                        Download
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500">Loading transactions...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-white border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Transaction type</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-[25%]">Order ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-[25%]">Batch ID</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total product charges</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Others</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total amount</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {transactions.map((tx, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-6 text-xs text-gray-500">{tx.date}</td>
                                        <td className="px-6 py-6 text-xs text-gray-900">{tx.type}</td>
                                        <td className="px-6 py-6 text-xs text-gray-500 font-mono">{tx.orderId}</td>
                                        <td className="px-6 py-6 text-xs text-gray-500">{tx.batchId}</td>
                                        <td className={`px-6 py-6 text-right text-xs font-bold ${tx.productCharges < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                            ${tx.productCharges.toFixed(2)}
                                        </td>
                                        <td className={`px-6 py-6 text-right text-xs font-bold ${tx.others < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                            ${tx.others.toFixed(2)}
                                        </td>
                                        <td className={`px-6 py-6 text-right text-xs font-bold ${tx.total < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                            ${tx.total.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <button className="text-orange-500 text-xs hover:underline">View detail</button>
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500 text-sm">
                                            No recent transactions.
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

export default PaymentsView;
