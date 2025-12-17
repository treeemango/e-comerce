import React, { useState } from 'react';
import { OnboardingState } from '@/types';

interface Step1Props {
    data: OnboardingState;
    updateData: (updates: Partial<OnboardingState>) => void;
    onNext: () => void;
}

const Step1UserAuth: React.FC<Step1Props> = ({ data, updateData, onNext }) => {
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [passwordStrength, setPasswordStrength] = useState(0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        updateData({ [name]: value });

        // Check password strength
        if (name === 'password') {
            let strength = 0;
            if (value.length >= 8) strength++;
            if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength++;
            if (/\d/.test(value)) strength++;
            if (/[^a-zA-Z0-9]/.test(value)) strength++;
            setPasswordStrength(strength);
        }

        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const getPasswordStrengthColor = () => {
        if (passwordStrength === 0) return 'bg-gray-300';
        if (passwordStrength === 1) return 'bg-red-500';
        if (passwordStrength === 2) return 'bg-yellow-500';
        if (passwordStrength === 3) return 'bg-blue-500';
        return 'bg-green-500';
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!data.businessLocation) newErrors.businessLocation = 'Location is required';
        if (!data.email) newErrors.email = 'Email is required';
        if (!data.email.includes('@')) newErrors.email = 'Please enter a valid email';
        if (!data.password) newErrors.password = 'Password is required';
        if (data.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (data.password !== data.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

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
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Your Seller Account</h2>
                <p className="text-gray-600">Join thousands of successful sellers and start earning today</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
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

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Business Email <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            name="email"
                            value={data.email}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.email ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="your.business@email.com"
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password <span className="text-red-500">*</span></label>
                        <input
                            type="password"
                            name="password"
                            value={data.password}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.password ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="Create a strong password"
                        />
                        {data.password && (
                            <div className="mt-2">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`} style={{ width: `${(passwordStrength / 4) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    Strength: {passwordStrength === 0 && 'Very Weak'} {passwordStrength === 1 && 'Weak'} {passwordStrength === 2 && 'Fair'} {passwordStrength === 3 && 'Good'} {passwordStrength === 4 && 'Strong'}
                                </p>
                            </div>
                        )}
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password <span className="text-red-500">*</span></label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={data.confirmPassword}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="Re-enter your password"
                        />
                        {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
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
