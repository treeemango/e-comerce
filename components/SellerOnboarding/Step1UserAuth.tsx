import React, { useEffect, useState } from 'react';
import { OnboardingState } from '@/types';
import { supabase } from '../../lib/supabase';

interface Step1Props {
    data: OnboardingState;
    updateData: (updates: Partial<OnboardingState>) => void;
    onNext: () => void;
}

const Step1UserAuth: React.FC<Step1Props> = ({ data, updateData, onNext }) => {
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        supabase.auth.getSession().then(({ data: sessionData }) => {
            if (!mounted) return;
            setSignedInEmail(sessionData.session?.user?.email ?? null);
        });
        return () => {
            mounted = false;
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        updateData({ [name]: value });

        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!data.businessLocation) newErrors.businessLocation = 'Location is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onNext();
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Set Up Your Seller Profile</h2>
                <p className="text-gray-600">You’ll use your existing buyer account to sell.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-blue-900">Signed-in account</p>
                        <p className="text-sm text-blue-800">{signedInEmail || 'Signed in'}</p>
                        <p className="text-xs text-blue-700 mt-1">No password is needed to register as a seller.</p>
                    </div>

                    {/* Business Location */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Business Location <span className="text-red-500">*</span></label>
                        {/** Unified country list from currency mapping */}
                        {(() => {
                            const countryCurrencyMap: Record<string, string> = {
                                'Kenya': 'KES',
                                'Uganda': 'UGX',
                                'Tanzania': 'TZS',
                                'South Africa': 'ZAR',
                                'Nigeria': 'NGN',
                                'Ghana': 'GHS',
                                'Rwanda': 'RWF',
                                'Ethiopia': 'ETB',
                                'Egypt': 'EGP',
                                'Morocco': 'MAD',
                                'United States': 'USD',
                                'United Kingdom': 'GBP',
                                'Eurozone': 'EUR',
                                'Algeria': 'DZD',
                                'Libya': 'LYD',
                                'Sudan': 'SDG',
                                'South Sudan': 'SSP',
                                'Tunisia': 'TND',
                                'Mauritania': 'MRU',
                                'Senegal': 'XOF',
                                'Gambia': 'GMD',
                                'Guinea': 'GNF',
                                'Liberia': 'LRD',
                                'Sierra Leone': 'SLL',
                                'Cape Verde': 'CVE',
                                'Cameroon': 'XAF',
                                'Sao Tome and Principe': 'STN',
                                'Burundi': 'BIF',
                                'Congo (DRC)': 'CDF',
                                'Djibouti': 'DJF',
                                'Eritrea': 'ERN',
                                'Comoros': 'KMF',
                                'Madagascar': 'MGA',
                                'Mauritius': 'MUR',
                                'Seychelles': 'SCR',
                                'Somalia': 'SOS',
                                'Malawi': 'MWK',
                                'Zambia': 'ZMW',
                                'Zimbabwe': 'ZWL',
                                'Angola': 'AOA',
                                'Botswana': 'BWP',
                                'Lesotho': 'LSL',
                                'Mozambique': 'MZN',
                                'Namibia': 'NAD',
                                'Eswatini': 'SZL',
                            };
                            const countryList = Object.keys(countryCurrencyMap);
                            return (
                                <select
                                    name="businessLocation"
                                    value={data.businessLocation}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-lg border transition-colors appearance-none bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.businessLocation ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                >
                                    <option value="">Select a location</option>
                                    {countryList.map((country) => (
                                        <option key={country} value={country}>
                                            {country}
                                        </option>
                                    ))}
                                </select>
                            );
                        })()}
                        {errors.businessLocation && <p className="text-red-500 text-xs mt-1">{errors.businessLocation}</p>}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl mt-6"
                    >
                        Continue
                    </button>
                </form>

                {/* Right: Benefits */}
                <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-xl">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Why sell with us?</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</span>
                                <div>
                                    <p className="font-semibold text-gray-900">Easy Setup</p>
                                    <p className="text-sm text-gray-600">Get started in minutes</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</span>
                                <div>
                                    <p className="font-semibold text-gray-900">Millions of Buyers</p>
                                    <p className="text-sm text-gray-600">Access millions of customers</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</span>
                                <div>
                                    <p className="font-semibold text-gray-900">Secure & Reliable</p>
                                    <p className="text-sm text-gray-600">Your data is protected</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</span>
                                <div>
                                    <p className="font-semibold text-gray-900">Dedicated Support</p>
                                    <p className="text-sm text-gray-600">24/7 seller support team</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 pt-4 border-t border-orange-200">
                        By creating an account, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Step1UserAuth;
