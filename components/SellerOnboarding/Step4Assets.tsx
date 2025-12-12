import React, { useState } from 'react';
import { OnboardingState } from '@/types';

interface Step4Props {
    data: OnboardingState;
    updateData: (updates: Partial<OnboardingState>) => void;
    onSubmit: () => void;
    onBack: () => void;
}

const Step4Assets: React.FC<Step4Props> = ({ data, updateData, onSubmit, onBack }) => {
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logoFile' | 'bannerFile') => {
        if (e.target.files && e.target.files[0]) {
            updateData({ [fieldName]: e.target.files[0] });
            if (errors[fieldName]) {
                const newErrors = { ...errors };
                delete newErrors[fieldName];
                setErrors(newErrors);
            }
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        updateData({ [name]: value });
        if (errors[name]) {
            const newErrors = { ...errors };
            delete newErrors[name];
            setErrors(newErrors);
        }
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!data.returnPolicy) newErrors.returnPolicy = 'Return policy is required';
        if (!data.shippingPolicy) newErrors.shippingPolicy = 'Shipping policy is required';
        if (!data.logoFile) newErrors.logoFile = 'Shop logo is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onSubmit();
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Shop Assets & Policies</h2>
            <p className="text-gray-600 mb-6">Final touches to make your shop stand out.</p>

            <div className="space-y-6">
                {/* Logo Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shop Logo</label>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border border-gray-300 overflow-hidden">
                            {data.logoFile ? (
                                <img src={URL.createObjectURL(data.logoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-icons text-gray-400 text-3xl">store</span>
                            )}
                        </div>
                        <div>
                            <input
                                type="file"
                                id="logo-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileChange(e, 'logoFile')}
                            />
                            <label
                                htmlFor="logo-upload"
                                className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded text-sm transition-colors inline-block"
                            >
                                Upload Logo
                            </label>
                            <p className="text-xs text-gray-500 mt-1">Recommended 500x500px</p>
                            {errors.logoFile && <p className="text-red-500 text-xs mt-1">{errors.logoFile}</p>}
                        </div>
                    </div>
                </div>

                {/* Banner Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shop Banner <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <div className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group">
                        {data.bannerFile ? (
                            <>
                                <img src={URL.createObjectURL(data.bannerFile)} alt="Banner Preview" className="w-full h-full object-cover absolute inset-0" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-sm font-bold">Click to change</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-4">
                                <span className="material-icons text-gray-400 text-3xl mb-1">add_photo_alternate</span>
                                <p className="text-xs text-gray-500">Click to upload banner image</p>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleFileChange(e, 'bannerFile')}
                        />
                    </div>
                </div>

                {/* Policies */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Policy</label>
                    <textarea
                        name="returnPolicy"
                        value={data.returnPolicy}
                        onChange={handleTextChange}
                        rows={4}
                        className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.returnPolicy ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="e.g. Returns accepted within 30 days..."
                    />
                    {errors.returnPolicy && <p className="text-red-500 text-xs mt-1">{errors.returnPolicy}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Policy</label>
                    <textarea
                        name="shippingPolicy"
                        value={data.shippingPolicy}
                        onChange={handleTextChange}
                        rows={4}
                        className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.shippingPolicy ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="e.g. Orders ship within 1-2 business days..."
                    />
                    {errors.shippingPolicy && <p className="text-red-500 text-xs mt-1">{errors.shippingPolicy}</p>}
                </div>

                <div className="flex gap-4 pt-6">
                    <button
                        onClick={onBack}
                        className="flex-1 py-3 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition-colors shadow-lg shadow-green-600/20"
                    >
                        Complete Sign Up
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Step4Assets;
