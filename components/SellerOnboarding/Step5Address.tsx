import React, { useState } from 'react';
import { OnboardingState } from '@/types';

interface Step5Props {
    data: OnboardingState;
    updateData: (updates: Partial<OnboardingState>) => void;
    onNext: () => void;
    onBack: () => void;
}

const Step5Address: React.FC<Step5Props> = ({ data, updateData, onNext, onBack }) => {
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        updateData({ [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!data.addressStreet) newErrors.addressStreet = 'Street address is required';
        if (!data.addressCity) newErrors.addressCity = 'City is required';
        if (!data.addressCountry) newErrors.addressCountry = 'Country is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            onNext();
        }
    };

    // Dynamically generate country list from currency mapping with flags
    const countryCurrencyMap: Record<string, { currency: string, flag: string }> = {
        'Kenya': { currency: 'KES', flag: '🇰🇪' },
        'Uganda': { currency: 'UGX', flag: '🇺🇬' },
        'Tanzania': { currency: 'TZS', flag: '🇹🇿' },
        'South Africa': { currency: 'ZAR', flag: '🇿🇦' },
        'Nigeria': { currency: 'NGN', flag: '🇳🇬' },
        'Ghana': { currency: 'GHS', flag: '🇬🇭' },
        'Rwanda': { currency: 'RWF', flag: '🇷🇼' },
        'Ethiopia': { currency: 'ETB', flag: '🇪🇹' },
        'Egypt': { currency: 'EGP', flag: '🇪🇬' },
        'Morocco': { currency: 'MAD', flag: '🇲🇦' },
        'United States': { currency: 'USD', flag: '🇺🇸' },
        'United Kingdom': { currency: 'GBP', flag: '🇬🇧' },
        'Eurozone': { currency: 'EUR', flag: '🇪🇺' },
        'Algeria': { currency: 'DZD', flag: '🇩🇿' },
        'Libya': { currency: 'LYD', flag: '🇱🇾' },
        'Sudan': { currency: 'SDG', flag: '🇸🇩' },
        'South Sudan': { currency: 'SSP', flag: '🇸🇸' },
        'Tunisia': { currency: 'TND', flag: '🇹🇳' },
        'Mauritania': { currency: 'MRU', flag: '🇲🇷' },
        'Senegal': { currency: 'XOF', flag: '🇸🇳' },
        'Gambia': { currency: 'GMD', flag: '🇬🇲' },
        'Guinea': { currency: 'GNF', flag: '🇬🇳' },
        'Liberia': { currency: 'LRD', flag: '🇱🇷' },
        'Sierra Leone': { currency: 'SLL', flag: '🇸🇱' },
        'Cape Verde': { currency: 'CVE', flag: '🇨🇻' },
        'Cameroon': { currency: 'XAF', flag: '🇨🇲' },
        'Sao Tome and Principe': { currency: 'STN', flag: '🇸🇹' },
        'Burundi': { currency: 'BIF', flag: '🇧🇮' },
        'Congo (DRC)': { currency: 'CDF', flag: '🇨🇩' },
        'Djibouti': { currency: 'DJF', flag: '🇩🇯' },
        'Eritrea': { currency: 'ERN', flag: '🇪🇷' },
        'Comoros': { currency: 'KMF', flag: '🇰🇲' },
        'Madagascar': { currency: 'MGA', flag: '🇲🇬' },
        'Mauritius': { currency: 'MUR', flag: '🇲🇺' },
        'Seychelles': { currency: 'SCR', flag: '🇸🇨' },
        'Somalia': { currency: 'SOS', flag: '🇸🇴' },
        'Malawi': { currency: 'MWK', flag: '🇲🇼' },
        'Zambia': { currency: 'ZMW', flag: '🇿🇲' },
        'Zimbabwe': { currency: 'ZWL', flag: '🇿🇼' },
        'Angola': { currency: 'AOA', flag: '🇦🇴' },
        'Botswana': { currency: 'BWP', flag: '🇧🇼' },
        'Lesotho': { currency: 'LSL', flag: '🇱🇸' },
        'Mozambique': { currency: 'MZN', flag: '🇲🇿' },
        'Namibia': { currency: 'NAD', flag: '🇳🇦' },
        'Eswatini': { currency: 'SZL', flag: '🇸🇿' },
    };
    const countryList = Object.keys(countryCurrencyMap);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Business Address</h2>
                <p className="text-gray-600">Where is your business located?</p>
            </div>

            <div className="space-y-6">
                {/* Section: Address Details */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-orange-500">📍</span> Business Location
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Country */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Country <span className="text-red-500">*</span></label>
                            <select
                                name="addressCountry"
                                value={data.addressCountry || data.businessLocation || ''}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-lg border transition-colors appearance-none bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.addressCountry ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            >
                                <option value="">Select your country</option>
                                {countryList.map((country) => (
                                    <option key={country} value={country}>
                                        {country}
                                    </option>
                                ))}
                            </select>
                            {errors.addressCountry && <p className="text-red-500 text-xs mt-1">{errors.addressCountry}</p>}
                        </div>

                        {/* Street Address */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="addressStreet"
                                value={data.addressStreet || ''}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.addressStreet ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="Street address, building number, etc."
                            />
                            {errors.addressStreet && <p className="text-red-500 text-xs mt-1">{errors.addressStreet}</p>}
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">City / Town <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="addressCity"
                                value={data.addressCity || ''}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.addressCity ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="e.g. Nairobi, Lagos, Kampala"
                            />
                            {errors.addressCity && <p className="text-red-500 text-xs mt-1">{errors.addressCity}</p>}
                        </div>

                        {/* State/Region */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">State / Region <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                name="addressState"
                                value={data.addressState || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                placeholder="e.g. Nairobi, Lagos State"
                            />
                        </div>

                        {/* Postal Code */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Postal Code / ZIP <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                name="addressPostalCode"
                                value={data.addressPostalCode || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                placeholder="e.g. 00100"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-800 mt-6">
                        <span className="text-lg">ℹ️</span>
                        <p>We use this address for verification purposes and to connect you with local market opportunities.</p>
                    </div>
                </div>

                {/* Section: Address Summary */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Summary</h3>
                    <div className="space-y-2 text-sm">
                        <p><span className="font-semibold text-gray-700">Street:</span> <span className="text-gray-600">{data.addressStreet || '—'}</span></p>
                        <p><span className="font-semibold text-gray-700">City:</span> <span className="text-gray-600">{data.addressCity || '—'}</span></p>
                        {data.addressState && <p><span className="font-semibold text-gray-700">State:</span> <span className="text-gray-600">{data.addressState}</span></p>}
                        <p><span className="font-semibold text-gray-700">Country:</span> <span className="text-gray-600">{data.addressCountry || data.businessLocation || '—'}</span></p>
                        {data.addressPostalCode && <p><span className="font-semibold text-gray-700">Postal Code:</span> <span className="text-gray-600">{data.addressPostalCode}</span></p>}
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-6">
                    <button
                        onClick={onBack}
                        className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleNext}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 rounded-lg transition-all duration-200"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Step5Address;
