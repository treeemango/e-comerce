import React, { useEffect, useState } from 'react';
import { fetchSellerAddresses, fetchShippingTemplates } from '@/lib/api';
import { SellerAddress, ShippingTemplate } from '@/types';

interface ShippingSettingsViewProps {
    onNavigate?: (tab: string) => void;
    sellerId?: string;
}

const ShippingSettingsView: React.FC<ShippingSettingsViewProps> = ({ onNavigate, sellerId }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'templates'>('general');
    const [addresses, setAddresses] = useState<SellerAddress[]>([]);
    const [templates, setTemplates] = useState<ShippingTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (sellerId) {
                setIsLoading(true);
                const [addressData, templateData] = await Promise.all([
                    fetchSellerAddresses(sellerId),
                    fetchShippingTemplates(sellerId)
                ]);
                setAddresses(addressData);
                setTemplates(templateData);
                setIsLoading(false);
            }
        };
        loadData();
    }, [sellerId]);

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Shipping settings</h1>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`pb-3 font-bold text-sm ${activeTab === 'general' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    General shipping settings
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`pb-3 font-bold text-sm ${activeTab === 'templates' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Shipping templates
                </button>
            </div>

            {activeTab === 'general' ? (
                <>
                    {/* Shipping Address */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900">Shipping address</h2>
                            <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors">
                                <span className="material-icons text-sm">add</span>
                                Add a new address
                            </button>
                        </div>

                        <div className="bg-white rounded-lg overflow-hidden border border-gray-100">
                            <table className="w-full">
                                <thead className="bg-white border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400">Address name</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 w-[35%]">Address</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400">Contact person</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400">Phone number</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                                        </tr>
                                    ) : addresses.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No addresses found.</td>
                                        </tr>
                                    ) : (
                                        addresses.map(addr => (
                                            <tr key={addr.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-xs text-gray-900 font-medium">
                                                    {addr.address_name}
                                                    {addr.is_default && <span className="ml-2 bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-bold">Default</span>}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-900">
                                                    {addr.street_address}, {addr.city}, {addr.state}, {addr.zip_code}, {addr.country}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-900">{addr.contact_person}</td>
                                                <td className="px-6 py-4 text-xs text-gray-900">{addr.phone_number}</td>
                                                <td className="px-6 py-4 text-xs">
                                                    {!addr.is_default && <button className="text-gray-400 hover:text-orange-500 mr-3">Set as default</button>}
                                                    <button className="text-orange-500 hover:text-orange-600 mr-3">Edit</button>
                                                    <button className="text-gray-400 hover:text-red-500">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Order Fulfillment Settings - Keeping Static for now as schema support is minimal/defaults */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900">Order fulfillment settings</h2>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="font-bold text-sm text-gray-700">Pickup & delivery availability</span>
                            <span className="material-icons text-gray-400 text-sm">help_outline</span>
                        </div>
                        {/* Static content preserved for UI completeness */}
                        <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-sm text-gray-900">General settings</span>
                                    <span className="text-orange-500 text-xs cursor-pointer hover:underline">Edit</span>
                                </div>
                                <div className="text-xs text-gray-400 mb-1">Operating days</div>
                                <div className="text-sm text-gray-900">Monday, Tuesday, Wednesday, Thursday, Friday</div>
                            </div>
                            {/* ... other static sections ... */}
                        </div>
                    </div>
                </>
            ) : (
                /* Shipping Templates List */
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">Your Shipping Templates</h2>
                        <button
                            onClick={() => onNavigate && onNavigate('account-shipping-template')}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <span className="material-icons text-sm">add</span>
                            Create new template
                        </button>
                    </div>

                    <div className="bg-white rounded-lg overflow-hidden border border-gray-100">
                        <table className="w-full">
                            <thead className="bg-white border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400">Template Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400">Free Shipping</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400">Created At</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
                                ) : templates.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No templates found.</td></tr>
                                ) : (
                                    templates.map(tmpl => (
                                        <tr key={tmpl.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-xs text-gray-900 font-medium">{tmpl.name}</td>
                                            <td className="px-6 py-4 text-xs text-gray-900">
                                                {tmpl.is_free_shipping_enabled ? (
                                                    <span className="text-green-600">Enabled {tmpl.free_shipping_threshold ? `(> $${tmpl.free_shipping_threshold})` : ''}</span>
                                                ) : <span className="text-gray-400">Disabled</span>}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-900">{new Date(tmpl.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-xs">
                                                <button className="text-orange-500 hover:text-orange-600 mr-3">Edit</button>
                                                <button className="text-gray-400 hover:text-red-500">Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShippingSettingsView;
