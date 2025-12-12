import React from 'react';

const SellerPerformanceView: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Performance Metrics</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Order Defect Rate</h3>
                        <span className="material-icons text-green-500">check_circle</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">0.0%</div>
                    <p className="text-xs text-gray-500 mt-1">Target: under 1%</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Late Shipment Rate</h3>
                        <span className="material-icons text-green-500">check_circle</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">0.0%</div>
                    <p className="text-xs text-gray-500 mt-1">Target: under 4%</p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Pre-fulfillment Cancel Rate</h3>
                        <span className="material-icons text-green-500">check_circle</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">0.0%</div>
                    <p className="text-xs text-gray-500 mt-1">Target: under 2.5%</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Customer Feedback</h3>
                <div className="text-center py-10 text-gray-500">
                    <span className="material-icons text-4xl mb-2 text-gray-300">star_outline</span>
                    <p>No new feedback received in the last 30 days.</p>
                </div>
            </div>
        </div>
    );
};

export default SellerPerformanceView;
