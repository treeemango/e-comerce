import React, { useState, useEffect } from 'react';
import { fetchOrderFileUploads } from '../../../lib/api';
import { OrderFileUpload } from '../../../types';
import { getCurrentUser } from '../../../lib/auth';

const UploadOrderFilesView: React.FC = () => {
    const [uploads, setUploads] = useState<OrderFileUpload[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const currentUser = await getCurrentUser();
            if (currentUser?.id) {
                const data = await fetchOrderFileUploads(currentUser.id);
                setUploads(data);
            }
            setIsLoading(false);
        };
        load();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload order related files</h1>

            <div className="border-b border-gray-200">
                <button className="pb-3 border-b-2 border-gray-900 font-bold text-sm text-gray-900">
                    Shipping confirmation
                </button>
            </div>

            <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">Shipping confirmation</h2>
                <p className="text-sm text-gray-500">
                    This file contains shipping details such as the item(s), quantity, shipping date, courier, and tracking number. The information you submit allows customers to see the status of their orders.
                </p>
            </div>

            {/* Step 1 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-2">1. Prepare Your Shipping Confirmation File</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Prepare your Shipping Confirmation File using our template. Remember to save a copy in case you need to make any changes later.
                </p>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700">
                    <span className="material-icons text-lg">download</span>
                    Download template
                </button>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-2">2. Upload Your Shipping Confirmation File</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Upload the tab-delimited Shipping Confirmation File you created from your Shipping Confirmation File Template.
                </p>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700">
                    <span className="material-icons text-lg">upload_file</span>
                    Upload a file
                </button>
            </div>

            {/* History Section */}
            <div className="pt-6">
                <h3 className="font-bold text-gray-900 mb-4">Review File Status and History</h3>
                <p className="text-xs text-gray-500 mb-4">
                    View the status of your last 10 uploads. If the processing report indicates any errors, modify your Shipping Confirmation File and return to step 2 above.
                </p>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden min-h-[200px] flex flex-col">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">File Name</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status/Results</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-12 text-center text-gray-500">Loading history...</td></tr>
                            ) : uploads.length > 0 ? (
                                uploads.map(upload => (
                                    <tr key={upload.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-xs text-gray-900">{new Date(upload.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-xs text-gray-500">{upload.file_name}</td>
                                        <td className="px-6 py-4 text-xs">
                                            <span className={`inline-block px-2 py-0.5 rounded text-white ${upload.status === 'Success' ? 'bg-green-500' :
                                                    upload.status === 'Failed' ? 'bg-red-500' :
                                                        'bg-blue-500'
                                                }`}>{upload.status}</span>
                                            {upload.records_processed > 0 && <span className="ml-2 text-gray-500">({upload.records_processed} records)</span>}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {upload.error_log && <button className="text-red-500 hover:underline">View Errors</button>}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                                        You have not uploaded any files
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UploadOrderFilesView;
