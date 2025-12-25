import React, { useState, useEffect } from 'react';
import { fetchReturnRequests, authorizeReturnRequest, processRefund } from '../../../lib/api';

interface ManageReturnsViewProps {
    sellerId: string;
}

interface ReturnRequest {
    id: string;
    returnId: string;
    orderId: string;
    date: string;
    buyerName: string;
    amount: number;
    productName: string;
    thumbnail: string;
    reason: string;
    quantity: number;
    comment: string;
    status: 'pending' | 'authorized' | 'completed' | 'cancelled';
    autoAuthorized: boolean;
    daysLeft: number;
}

const ManageReturnsView: React.FC<ManageReturnsViewProps> = ({ sellerId }) => {
    const [activeTab, setActiveTab] = useState<'view_all' | 'pending' | 'completed'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (sellerId) {
                const data = await fetchReturnRequests(sellerId);

                const mappedReturns: ReturnRequest[] = data.map((item: any) => ({
                    id: item.id,
                    returnId: item.id.substring(0, 8).toUpperCase(),
                    orderId: item.orders?.id.substring(0, 8).toUpperCase() || 'UNKNOWN',
                    date: new Date(item.created_at).toLocaleDateString(),
                    buyerName: 'Buyer', // This would need user_id join or order buyer info
                    amount: item.refund_amount || item.orders?.total_amount || 0,
                    productName: item.products?.title || 'Product Name',
                    thumbnail: item.products?.featured_image_url || '',
                    reason: item.reason,
                    quantity: item.quantity || 1,
                    comment: item.comment || 'No comments',
                    status: item.status,
                    autoAuthorized: false,
                    daysLeft: 2 // Mock or calculate
                }));

                setReturns(mappedReturns);
            }
            setIsLoading(false);
        };
        loadData();
    }, [sellerId]);

    const filteredReturns = returns.filter(item => {
        if (activeTab === 'view_all') return true;
        if (activeTab === 'pending') return item.status === 'pending' || item.status === 'authorized';
        if (activeTab === 'completed') return item.status === 'completed' || item.status === 'cancelled';
        return true;
    });

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Returns</h1>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('view_all')}
                    className={`pb-4 font-medium text-sm transition-colors relative ${activeTab === 'view_all' ? 'text-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    View all
                    {activeTab === 'view_all' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500"></span>}
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-4 font-medium text-sm transition-colors relative ${activeTab === 'pending' ? 'text-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Pending actions <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs ml-2">{returns.filter(r => r.status === 'pending').length}</span>
                    {activeTab === 'pending' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500"></span>}
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`pb-4 font-medium text-sm transition-colors relative ${activeTab === 'completed' ? 'text-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Completed
                    {activeTab === 'completed' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500"></span>}
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Search by Order ID or RMA"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-white flex items-center gap-2">
                        <span className="material-icons text-lg">filter_list</span> Filter
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center p-8 text-gray-500">Loading returns...</div>
                ) : filteredReturns.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">No return requests found.</div>
                ) : (
                    filteredReturns.map((item) => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            {/* Header */}
                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                <div className="flex gap-6 text-sm text-gray-600">
                                    <div><span className="font-medium text-gray-900">Return ID:</span> {item.returnId}</div>
                                    <div><span className="font-medium text-gray-900">Order ID:</span> {item.orderId}</div>
                                    <div><span className="font-medium text-gray-900">Date:</span> {item.date}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        item.status === 'authorized' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {item.status}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 flex gap-6">
                                <div className="w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                                    {item.thumbnail ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200" />}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="font-medium text-gray-900">{item.productName}</h3>
                                    <div className="text-sm text-gray-500">
                                        <p>Refund Amount: <span className="font-bold text-gray-900">£{item.amount}</span></p>
                                        <p>Quantity: {item.quantity}</p>
                                        <p>Reason: {item.reason}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 mt-2">
                                        <span className="font-medium">Customer Comment:</span> "{item.comment}"
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 justify-center w-48">
                                    {(item.status === 'pending' || item.status === 'authorized') && (
                                        <>
                                            {item.status === 'pending' && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Authorize this return request?')) {
                                                            const success = await authorizeReturnRequest(item.id);
                                                            if (success) {
                                                                alert('Return authorized successfully');
                                                                window.location.reload();
                                                            } else {
                                                                alert('Failed to authorize return');
                                                            }
                                                        }
                                                    }}
                                                    className="w-full py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600 text-sm"
                                                >
                                                    Authorize Return
                                                </button>
                                            )}
                                            <button
                                                onClick={async () => {
                                                    const amount = prompt('Enter refund amount:', item.amount.toString());
                                                    if (amount && !isNaN(parseFloat(amount))) {
                                                        const success = await processRefund(item.id, parseFloat(amount));
                                                        if (success) {
                                                            alert('Refund processed successfully');
                                                            window.location.reload();
                                                        } else {
                                                            alert('Failed to process refund');
                                                        }
                                                    }
                                                }}
                                                className="w-full py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 text-sm"
                                            >
                                                Issue Refund
                                            </button>
                                        </>
                                    )}
                                    <button className="text-orange-600 text-sm font-medium hover:underline flex items-center justify-center gap-1">
                                        View Details <span className="material-icons text-sm">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ManageReturnsView;
