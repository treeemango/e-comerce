import React, { useState } from 'react';
import { OnboardingState } from '@/types';

interface Step1Props {
    data: OnboardingState;
    updateData: (updates: Partial<OnboardingState>) => void;
    onNext: () => void;
}

const Step1UserAuth: React.FC<Step1Props> = ({ data, updateData, onNext }) => {
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        updateData({ [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!data.email) newErrors.email = 'Email is required';
        if (!data.password) newErrors.password = 'Password is required';
        if (data.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
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
        <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-2">Create your seller account</h2>
            <p className="text-gray-600 mb-6">Start selling to millions of customers today.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Location</label>
                    <div className="relative">
                        <select
                            name="businessLocation"
                            value={data.businessLocation}
                            onChange={(e) => updateData({ businessLocation: e.target.value })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm appearance-none bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                        >
                            <option value="United Arab Emirates">United Arab Emirates</option>
                            <option value="Saudi Arabia">Saudi Arabia</option>
                            <option value="Kenya">Kenya</option>
                            <option value="South Africa">South Africa</option>
                            <option value="Nigeria">Nigeria</option>
                        </select>
                        <span className="material-icons absolute right-2 top-2 text-gray-400 text-sm pointer-events-none">expand_more</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        value={data.email}
                        onChange={handleChange}
                        className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="name@business.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                        type="password"
                        name="password"
                        value={data.password}
                        onChange={handleChange}
                        className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="••••••••"
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={data.confirmPassword}
                        onChange={handleChange}
                        className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="••••••••"
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded transition-colors"
                    >
                        Continue
                    </button>
                    <p className="text-xs text-center text-gray-500 mt-3">
                        By continuing, you start the process of creating a seller account.
                    </p>
                </div>
            </form>
        </div>
    );
};

export default Step1UserAuth;
