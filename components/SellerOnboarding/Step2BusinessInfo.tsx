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
        if (!data.businessName) newErrors.businessName = 'Business name is required';
        if (!data.businessEmail) newErrors.businessEmail = 'Business email is required';
        if (!data.description) newErrors.description = 'Business description is required';
        if (!data.categoryId) newErrors.categoryId = 'Primary category is required';
        if (!data.businessType) newErrors.businessType = 'Business type is required';

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
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Business Information</h2>
                <p className="text-gray-600">Tell us more about your business</p>
            </div>

            <div className="space-y-6">
                {/* Shop Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Shop Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="shopName"
                            value={data.shopName}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.shopName ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="My Awesome Store"
                        />
                        <p className="text-xs text-gray-500 mt-1">How customers will know you</p>
                        {errors.shopName && <p className="text-red-500 text-xs mt-1">{errors.shopName}</p>}
                    </div>

                    {/* Business Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Official Business Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="businessName"
                            value={data.businessName || ''}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.businessName ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="Legal business name"
                        />
                        <p className="text-xs text-gray-500 mt-1">Your registered business name</p>
                        {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
                    </div>
                </div>

                {/* Business Email & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Business Email <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            name="businessEmail"
                            value={data.businessEmail || ''}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.businessEmail ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="business@email.com"
                        />
                        {errors.businessEmail && <p className="text-red-500 text-xs mt-1">{errors.businessEmail}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Business Phone <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <input
                            type="tel"
                            name="businessPhone"
                            value={data.businessPhone || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            placeholder="+254 712 345 678"
                        />
                    </div>
                </div>

                {/* Business Type & Website */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Business Type <span className="text-red-500">*</span></label>
                        <select
                            name="businessType"
                            value={data.businessType || ''}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors appearance-none bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.businessType ? 'border-red-500' : 'border-gray-300'
                                }`}
                        >
                            <option value="">Select business type</option>
                            <option value="sole_proprietor">Sole Proprietor</option>
                            <option value="partnership">Partnership</option>
                            <option value="limited_company">Limited Company</option>
                            <option value="cooperative">Cooperative</option>
                            <option value="ngo">NGO</option>
                            <option value="other">Other</option>
                        </select>
                        {errors.businessType && <p className="text-red-500 text-xs mt-1">{errors.businessType}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Website <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <input
                            type="url"
                            name="website"
                            value={data.website || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            placeholder="https://www.example.com"
                        />
                    </div>
                </div>

                {/* Primary Category & Years in Business */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Category <span className="text-red-500">*</span></label>
                        <select
                            name="categoryId"
                            value={data.categoryId}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors appearance-none bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.categoryId ? 'border-red-500' : 'border-gray-300'
                                }`}
                        >
                            <option value="">Select a category</option>
                            <option value="Animals & Pet Supplies">Animals & Pet Supplies</option>
                            <option value="Apparel & Accessories">Apparel & Accessories</option>
                            <option value="Arts & Entertainment">Arts & Entertainment</option>
                            <option value="Baby & Toddler">Baby & Toddler</option>
                            <option value="Bundles">Bundles</option>
                            <option value="Business & Industrial">Business & Industrial</option>
                            <option value="Cameras & Optics">Cameras & Optics</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Food, Beverages & Tobacco">Food, Beverages & Tobacco</option>
                            <option value="Furniture">Furniture</option>
                            <option value="Gift Cards">Gift Cards</option>
                            <option value="Hardware">Hardware</option>
                            <option value="Health & Beauty">Health & Beauty</option>
                            <option value="Home & Garden">Home & Garden</option>
                            <option value="Luggage & Bags">Luggage & Bags</option>
                            <option value="Mature">Mature</option>
                            <option value="Media">Media</option>
                            <option value="Office Supplies">Office Supplies</option>
                            <option value="Product Add-Ons">Product Add-Ons</option>
                            <option value="Religious & Ceremonial">Religious & Ceremonial</option>
                            <option value="Services">Services</option>
                            <option value="Software">Software</option>
                            <option value="Sporting Goods">Sporting Goods</option>
                            <option value="Toys & Games">Toys & Games</option>
                            <option value="Uncategorized">Uncategorized</option>
                            <option value="Vehicles & Parts">Vehicles & Parts</option>
                        </select>
                        {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Years in Business <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <input
                            type="number"
                            name="yearsInBusiness"
                            value={data.yearsInBusiness || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            placeholder="e.g., 5"
                            min="0"
                            max="99"
                        />
                    </div>
                </div>

                {/* Category Description */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Anything else about this category? <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <textarea
                        name="categoryDescription"
                        value={data.categoryDescription || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        placeholder="Any additional comments or specific details about your chosen category..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Let us know if you have specific needs or a unique niche.</p>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Description <span className="text-red-500">*</span></label>
                    <textarea
                        name="description"
                        value={data.description}
                        onChange={handleChange}
                        rows={5}
                        className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.description ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="Describe your business, what you sell, your mission, and what makes you unique..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{data.description.length}/500 characters</p>
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-6 border-t border-gray-200">
                    <button
                        onClick={onBack}
                        className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={validateAndNext}
                        disabled={isCheckingName}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {isCheckingName ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Checking...
                            </>
                        ) : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Step2BusinessInfo;
