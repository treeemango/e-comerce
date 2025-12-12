import React, { useState, useEffect } from 'react';
import { fetchSellerProfile, saveSellerProfile, fetchSellerAddresses, SellerProfile } from '../../../lib/api';
import { SellerProfileExtended, SellerAddress } from '../../../types';

interface ReturnSettingsViewProps {
    sellerId: string;
}

const ReturnSettingsView: React.FC<ReturnSettingsViewProps> = ({ sellerId }) => {
    const [settings, setSettings] = useState<any>({
        auto_authorize: false,
        return_window_days: 30,
        return_address_id: ''
    });
    const [addresses, setAddresses] = useState<SellerAddress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (sellerId) {
                const [profile, addrList] = await Promise.all([
                    fetchSellerProfile(sellerId),
                    fetchSellerAddresses(sellerId)
                ]);

                if (profile && profile.return_settings) {
                    setSettings({ ...settings, ...profile.return_settings });
                }
                setAddresses(addrList);
            }
            setIsLoading(false);
        };
        load();
    }, [sellerId]);

    const handleSave = async () => {
        setIsSaving(true);
        // We save this into the seller_profile_extended 'return_settings' JSONB column
        // We first need to fetch existing profile to not overwrite other fields
        const currentProfile = await fetchSellerProfile(sellerId);

        const updatedProfile: Partial<SellerProfileExtended> = {
            seller_id: sellerId,
            ...currentProfile,
            return_settings: settings
        } as unknown as Partial<SellerProfileExtended>;

        const success = await saveSellerProfile(updatedProfile as unknown as SellerProfile);
        if (success) {
            alert('Return settings saved.');
        } else {
            alert('Failed to save settings.');
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900">Return Settings</h1>

            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">General Rules</h2>

                    <div className="flex items-center gap-3 mb-4">
                        <input
                            type="checkbox"
                            id="auto-auth"
                            checked={settings.auto_authorize}
                            onChange={(e) => setSettings({ ...settings, auto_authorize: e.target.checked })}
                            className="h-4 w-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <label htmlFor="auto-auth" className="text-sm text-gray-700">
                            <strong>Auto-authorize returns</strong> that meet standard policy (e.g. within return window)
                        </label>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 w-48">Return window (days):</label>
                        <select
                            value={settings.return_window_days}
                            onChange={(e) => setSettings({ ...settings, return_window_days: parseInt(e.target.value) })}
                            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                        >
                            <option value={15}>15 days</option>
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                            <option value={90}>90 days</option>
                        </select>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Return Address</h2>
                    <p className="text-sm text-gray-500 mb-4">Select the address where returns should be sent.</p>

                    <select
                        value={settings.return_address_id}
                        onChange={(e) => setSettings({ ...settings, return_address_id: e.target.value })}
                        className="w-full max-w-md border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    >
                        <option value="">Select an address</option>
                        {addresses.map(addr => (
                            <option key={addr.id} value={addr.id}>
                                {addr.address_name} - {addr.street_address}, {addr.city}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-2">
                        Manage addresses in <a href="#" className="text-orange-500 underline">Shipping Settings</a>
                    </p>
                </div>

                <div className="border-t border-gray-200 pt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`bg-orange-500 text-white px-6 py-2 rounded font-bold text-sm hover:bg-orange-600 transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReturnSettingsView;
