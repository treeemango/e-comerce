import React, { useState } from 'react';
import { saveShippingTemplate } from '@/lib/api';
import { ShippingTemplate } from '@/types';

interface ShippingTemplateProps {
    onBack?: () => void;
    onSave?: () => void;
    sellerId?: string;
}

const EditShippingTemplateView: React.FC<ShippingTemplateProps> = ({ onBack, onSave, sellerId }) => {
    const [templateName, setTemplateName] = useState('New Template');
    const [isFreeShipping, setIsFreeShipping] = useState(false);
    const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(30);
    const [isSaving, setIsSaving] = useState(false);

    // Simplified regions state for now
    const [standardRegions, setStandardRegions] = useState([
        {
            region_names: ['All states (Continental US)'],
            transit_time_min: 2,
            transit_time_max: 5,
            shipping_fee: 0, // Using standard rate
            address_types: { street: true, po_box: false }
        }
    ]);

    const handleSave = async () => {
        if (!sellerId) return;
        setIsSaving(true);

        const template: Partial<ShippingTemplate> = {
            seller_id: sellerId,
            name: templateName,
            is_free_shipping_enabled: isFreeShipping,
            free_shipping_threshold: isFreeShipping ? freeShippingThreshold : undefined,
            regions: standardRegions.map(r => ({
                id: '', // New
                template_id: '',
                region_names: r.region_names,
                address_types: r.address_types,
                transit_time_min: r.transit_time_min,
                transit_time_max: r.transit_time_max,
                shipping_fee: r.shipping_fee
            }))
        };

        const result = await saveShippingTemplate(template);
        setIsSaving(false);

        if (result) {
            // Success notification could go here
            if (onSave) onSave();
        } else {
            alert('Failed to save template');
        }
    };

    return (
        <div className="space-y-6 pb-20"> {/* pb-20 for bottom sticky bar space */}
            {/* Header */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span className="material-icons text-sm cursor-pointer hover:text-gray-900" onClick={onBack}>arrow_back</span>
                <span className="cursor-pointer hover:text-gray-900" onClick={onBack}>Shipping settings</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Edit shipping template</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit shipping template</h1>

            {/* Template Name */}
            <div className="space-y-2 max-w-lg">
                <label className="text-sm font-bold text-gray-900">Template name</label>
                <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
            </div>

            {/* Free Shipping Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-black pl-2">
                    <h3 className="text-sm font-bold text-gray-900">Free shipping</h3>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input type="checkbox" checked={isFreeShipping} onChange={() => setIsFreeShipping(!isFreeShipping)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                </div>

                <div className="bg-white border border-gray-300 rounded p-3 flex items-start gap-2 text-sm text-gray-600">
                    <span className="material-icons text-gray-400 text-lg">info</span>
                    You will cover all shipping costs if the order meets the free shipping condition.
                </div>

                {isFreeShipping && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden p-4">
                        <label className="text-xs font-bold text-gray-900 block mb-2">Free shipping condition</label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">Orders over</span>
                            <div className="relative w-24">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    value={freeShippingThreshold}
                                    onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                                    className="w-full border border-gray-300 rounded pl-5 pr-2 py-1 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Standard Shipping Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-black pl-2">
                    <h3 className="text-sm font-bold text-gray-900">Standard shipping</h3>
                </div>

                <div className="bg-white border border-gray-300 rounded p-3 flex items-start gap-2 text-sm text-gray-600">
                    <span className="material-icons text-gray-400 text-lg">info</span>
                    Please add the required regions for Standard Shipping. Delivery to all regions in United States is required for this ship option.
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 w-[40%]">Regions</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 w-[15%]">Address type</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 w-[20%]">Transit time</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 w-[15%]">Shipping fee</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {standardRegions.map((region, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 align-top">
                                        <div className="text-xs text-gray-900 leading-relaxed">
                                            {region.region_names.join(', ')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-xs text-gray-900">
                                                <input type="checkbox" checked={region.address_types.street} readOnly className="rounded text-orange-500" />
                                                Street
                                            </label>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <select
                                            value={`${region.transit_time_min}-${region.transit_time_max}`}
                                            onChange={(e) => {
                                                const [min, max] = e.target.value.split('-').map(Number);
                                                const newRegions = [...standardRegions];
                                                newRegions[idx] = { ...newRegions[idx], transit_time_min: min, transit_time_max: max };
                                                setStandardRegions(newRegions);
                                            }}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                                        >
                                            <option value="2-5">2-5 work days</option>
                                            <option value="3-7">3-7 work days</option>
                                            <option value="5-10">5-10 work days</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-gray-500">$</span>
                                            <input
                                                type="number"
                                                value={region.shipping_fee}
                                                onChange={(e) => {
                                                    const newRegions = [...standardRegions];
                                                    newRegions[idx] = { ...newRegions[idx], shipping_fee: Number(e.target.value) };
                                                    setStandardRegions(newRegions);
                                                }}
                                                className="w-20 border border-gray-300 rounded px-2 py-1 text-xs"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-4 flex justify-center gap-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <button
                    onClick={onBack}
                    className="px-8 py-2 border border-gray-300 rounded text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-bold transition-colors disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
};

export default EditShippingTemplateView;
