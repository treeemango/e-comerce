import React, { useState, useEffect } from 'react';
import { fetchPromotionalCampaigns } from '../../../lib/api';
import { PromotionalCampaign } from '../../../types';

interface PromotionalCampaignsViewProps {
    sellerId: string;
}

const PromotionalCampaignsView: React.FC<PromotionalCampaignsViewProps> = ({ sellerId }) => {
    const [campaigns, setCampaigns] = useState<PromotionalCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (sellerId) {
                const data = await fetchPromotionalCampaigns(sellerId);
                setCampaigns(data);
            }
            setIsLoading(false);
        };
        loadData();
    }, [sellerId]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Promotional Campaigns</h1>
            <p className="text-sm text-gray-600">
                Manage your campaigns to boost visibility and sales during key shopping events.
            </p>

            <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors">
                <span className="material-icons">add</span>
                Create new campaign
            </button>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-gray-500">Loading campaigns...</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Campaign Name</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Duration</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {campaigns.map(campaign => (
                                <tr key={campaign.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{campaign.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{campaign.type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block px-2 py-0.5 text-xs font-bold border rounded ${campaign.status === 'Active' ? 'text-green-600 border-green-200 bg-green-50' :
                                                campaign.status === 'Ended' ? 'text-gray-500 border-gray-200 bg-gray-50' :
                                                    'text-blue-600 border-blue-200 bg-blue-50'
                                            }`}>
                                            {campaign.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(campaign.start_time).toLocaleDateString()} - {new Date(campaign.end_time).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <button className="text-orange-500 hover:underline">Edit</button>
                                    </td>
                                </tr>
                            ))}
                            {campaigns.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        No campaigns found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PromotionalCampaignsView;
