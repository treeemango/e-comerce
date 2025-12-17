import React, { useState, useEffect } from 'react';
import { fetchSellerProfile, saveSellerProfile, SellerProfile } from '../../../lib/api';

interface SellerProfileViewProps {
    sellerId: string;
}

const SellerProfileView: React.FC<SellerProfileViewProps> = ({ sellerId }) => {
    const [profile, setProfile] = useState<Partial<SellerProfile>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (sellerId) {
                const data = await fetchSellerProfile(sellerId);
                if (data) setProfile(data);
            }
            setIsLoading(false);
        };
        load();
    }, [sellerId]);

    const handleChange = (field: keyof SellerProfile, value: any) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!sellerId) return;
        setIsSaving(true);
        const success = await saveSellerProfile({ ...profile as SellerProfile, id: sellerId });
        if (success) {
            alert('Profile saved successfully!');
        } else {
            alert('Failed to save profile.');
        }
        setIsSaving(false);
    };

    if (isLoading) return <div className="p-12 text-center text-gray-500">Loading profile...</div>;

    const isPending = profile.verification_status !== 'approved';

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Seller Profile</h1>
                {isPending && (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-md flex items-center gap-2">
                        <span className="material-icons text-yellow-600">pending</span>
                        <span className="font-medium">Verification Pending</span>
                    </div>
                )}
                {!isPending && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-md flex items-center gap-2">
                        <span className="material-icons text-green-600">verified</span>
                        <span className="font-medium">Verified Seller</span>
                    </div>
                )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Business Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                value={profile.business_name || ''}
                                onChange={(e) => handleChange('business_name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                value={profile.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Business Address</h2>
                    <p className="text-sm text-gray-500 mb-4">This address will be displayed on your profile and invoices.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Street Address</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                value={profile.address_line1 || ''}
                                onChange={(e) => handleChange('address_line1', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">City</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                value={profile.city || ''}
                                onChange={(e) => handleChange('city', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">State</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                value={profile.state || ''}
                                onChange={(e) => handleChange('state', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Postal Code</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                value={profile.postal_code || ''}
                                onChange={(e) => handleChange('postal_code', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Country</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                value={profile.country || ''}
                                onChange={(e) => handleChange('country', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`bg-orange-500 text-white px-6 py-2 rounded font-bold text-sm hover:bg-orange-600 transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SellerProfileView;
