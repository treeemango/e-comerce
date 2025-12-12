import React, { useState, useEffect } from 'react';
import { fetchSellerProfile, saveSellerProfile } from '../../../lib/api';
import { SellerProfileExtended } from '../../../types';

interface SellerProfileViewProps {
    sellerId: string;
}

const SellerProfileView: React.FC<SellerProfileViewProps> = ({ sellerId }) => {
    const [profile, setProfile] = useState<Partial<SellerProfileExtended>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (sellerId) {
                const data = await fetchSellerProfile(sellerId);
                if (data) setProfile(data);
                // If data is null, we can initialize with some defaults if needed
                // or just keep empty fields for user to fill
            }
            setIsLoading(false);
        };
        load();
    }, [sellerId]);

    const handleChange = (field: keyof SellerProfileExtended, value: any) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!sellerId) return;
        setIsSaving(true);
        const success = await saveSellerProfile({ ...profile, seller_id: sellerId });
        if (success) {
            alert('Profile saved successfully!');
        } else {
            alert('Failed to save profile.');
        }
        setIsSaving(false);
    };

    if (isLoading) return <div className="p-12 text-center text-gray-500">Loading profile...</div>;

    return (
        <div className="space-y-6 max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900">Seller Profile</h1>

            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Business Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Business Name</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                value={profile.legal_business_name || ''}
                                onChange={(e) => handleChange('legal_business_name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID / VAT Number</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                                value={profile.tax_id || ''}
                                onChange={(e) => handleChange('tax_id', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Business Address</h2>
                    <p className="text-sm text-gray-500 mb-4">This address will be displayed on your profile and invoices.</p>
                    {/* Simplified address block for now, using a JSONB field structure but flattening for UI */}
                    <div className="grid grid-cols-1 gap-4">
                        <textarea
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                            rows={3}
                            placeholder="Street Address, City, State, Zip, Country"
                            value={JSON.stringify(profile.business_address || '', null, 2)}
                            // Rudimentary handling for the JSON object for now
                            // In a real app, we would parse this into individual fields
                            onChange={(e) => {
                                try {
                                    // Only update if valid json or string
                                    handleChange('business_address', e.target.value);
                                } catch { }
                            }}
                        />
                        <p className="text-xs text-gray-400">Enter as text for now, typically structured.</p>
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
