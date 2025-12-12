import React, { useState, useEffect } from 'react';
import { fetchOrderReports } from '../../../lib/api';
import { OrderReport } from '../../../types';
import { getCurrentUser } from '../../../lib/auth';

const OrderReportsView: React.FC = () => {
    const [reports, setReports] = useState<OrderReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            if (currentUser?.id) {
                const data = await fetchOrderReports(currentUser.id);
                setReports(data);
            }
            setIsLoading(false);
        };
        load();
    }, []);

    const handleRequestReport = async () => {
        // Logic to trigger a report generation
        // This would ideally involve an implementation in api.ts to insert a new 'Processing' report
        // For now, we'll just alert as it might require backend processing logic
        alert('Report request initiated (backend integration pending)');
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Order reports</h1>

            {/* Warning Banner */}
            <div className="bg-orange-50 border border-orange-200 rounded p-4 flex items-start gap-3">
                <span className="material-icons text-orange-500 text-lg mt-0.5">info</span>
                <p className="text-sm text-gray-700">
                    Customer personal information contained in order reports, including phone number, is provided for shipping labels only. Please do not use it casually.
                </p>
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Unshipped orders</h2>

                {/* Request Report Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-base font-bold text-gray-900 mb-2">Request report</h3>
                    <p className="text-sm text-gray-600 mb-4 max-w-4xl">
                        The unshipped order report identifies unshipped orders that you have as of today. For regulatory compliance, unshipped order report exports are only kept for 15 days before being deleted, and you can only request an unshipped order report once every 5 minutes.
                    </p>
                    <button
                        onClick={handleRequestReport}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    >
                        <span className="material-icons text-lg">summarize</span>
                        Request
                    </button>
                </div>

                {/* Reports Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">Loading reports...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Batch ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date created</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Report status</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-xs font-medium text-gray-900 break-all max-w-[200px]">
                                            {report.batch_id || report.id.substring(0, 8)}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {new Date(report.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {report.report_type}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2 py-1 border text-xs rounded ${report.status === 'Ready' ? 'border-green-200 bg-green-50 text-green-700' :
                                                    report.status === 'Processing' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                                                        'border-red-200 bg-red-50 text-red-700'
                                                }`}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {report.status === 'Ready' && (
                                                <button className="text-gray-900 hover:text-orange-500 font-medium text-xs border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors">
                                                    Download
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {reports.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            No reports found. Request one above.
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

export default OrderReportsView;
