import React, { useState } from 'react';
import { OnboardingState } from '@/types';
import { checkShopNameAvailability } from '../../lib/api';

interface Step2Props {
    data: OnboardingState;
    updateData: (updates: Partial<OnboardingState>) => void;
    onNext: () => void;
    onBack: () => void;
}

const Step2BusinessInfo: React.FC<Step2Props> = ({ data, updateData, onNext, onBack }) => {
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isCheckingName, setIsCheckingName] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        updateData({ [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validateAndNext = async () => {
        const newErrors: { [key: string]: string } = {};
        if (!data.shopName) newErrors.shopName = 'Shop name is required';
        if (!data.description) newErrors.description = 'Business description is required';
        if (!data.categoryId) newErrors.categoryId = 'Primary category is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Check availability
        setIsCheckingName(true);
        const isAvailable = await checkShopNameAvailability(data.shopName);
        setIsCheckingName(false);

        if (!isAvailable) {
            setErrors({ shopName: 'This shop name is already taken. Please choose another.' });
            return;
        }

        onNext();
    };

    return (
        <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Business Profile</h2>
            <p className="text-gray-600 mb-6">Tell us about your business.</p>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                    <input
                        type="text"
                        name="shopName"
                        value={data.shopName}
                        onChange={handleChange}
                        className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.shopName ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="My Awesome Store"
                    />
                    <p className="text-xs text-gray-500 mt-1">This is how customers will know you.</p>
                    {errors.shopName && <p className="text-red-500 text-xs mt-1">{errors.shopName}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Category</label>
                    <div className="relative">
                        <select
                            name="categoryId"
                            value={data.categoryId}
                            onChange={handleChange}
                            className={`w-full border rounded px-3 py-2 text-sm appearance-none bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.categoryId ? 'border-red-500' : 'border-gray-300'}`}
                        >
                            <option value="">Select a category</option>
                            <option value="electronics">Electronics</option>
                            <option value="fashion">Fashion</option>
                            <option value="home_garden">Home & Garden</option>
                            <option value="beauty">Beauty & Health</option>
                            <option value="toys">Toys & Hobbies</option>
                            <option value="sports">Sports & Outdoors</option>
                            <option value="automotive">Automotive</option>
                        </select>
                        <span className="material-icons absolute right-2 top-2 text-gray-400 text-sm pointer-events-none">expand_more</span>
                    </div>
                    {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        name="description"
                        value={data.description}
                        onChange={handleChange}
                        rows={4}
                        className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Describe your shop and what you sell..."
                    />
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>

                <div className="flex gap-4 pt-6">
                    <button
                        onClick={onBack}
                        className="flex-1 py-3 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={validateAndNext}
                        disabled={isCheckingName}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {isCheckingName ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Checking...
                            </>
                        ) : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Step2BusinessInfo;
