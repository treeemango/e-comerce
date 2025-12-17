import React, { useState } from 'react';
import { OnboardingState } from '@/types';

interface Step3Props {
    data: OnboardingState;
    updateData: (updates: Partial<OnboardingState>) => void;
    onNext: () => void;
    onBack: () => void;
}

const Step3Financials: React.FC<Step3Props> = ({ data, updateData, onNext, onBack }) => {
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
        if (!data.bankName) newErrors.bankName = 'Bank name is required';
        if (!data.accountHolder) newErrors.accountHolder = 'Account holder name is required';
        if (!data.accountNumber) newErrors.accountNumber = 'Account number is required';
        if (!data.monthlyRevenue) newErrors.monthlyRevenue = 'Expected monthly revenue is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            onNext();
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Financial & Business Details</h2>
                <p className="text-gray-600">Tell us about your finances and business credentials</p>
            </div>

            <div className="space-y-6">
                {/* Section: Financial Details */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-orange-500">💰</span> Bank Account Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="bankName"
                                value={data.bankName}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                                    errors.bankName ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g. Equity Bank, Kenya Commercial Bank"
                            />
                            {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Account Holder Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="accountHolder"
                                value={data.accountHolder}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                                    errors.accountHolder ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Must match your ID"
                            />
                            {errors.accountHolder && <p className="text-red-500 text-xs mt-1">{errors.accountHolder}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="accountNumber"
                                value={data.accountNumber}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                                    errors.accountNumber ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="0000000000"
                            />
                            {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Routing / Branch Code <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                name="routingNumber"
                                value={data.routingNumber}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                placeholder="e.g. 001234"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-800 mt-4">
                        <span className="text-lg">🔒</span>
                        <p>Your bank details are encrypted and secured. We only use them for payouts.</p>
                    </div>
                </div>

                {/* Section: Business Revenue */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-orange-500">📊</span> Expected Revenue
                    </h3>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Monthly Revenue <span className="text-red-500">*</span></label>
                        <select
                            name="monthlyRevenue"
                            value={data.monthlyRevenue || ''}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border transition-colors appearance-none bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
                                errors.monthlyRevenue ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                            <option value="">Select revenue range</option>
                            <option value="under_10k">Under 10,000</option>
                            <option value="10k_50k">10,000 - 50,000</option>
                            <option value="50k_100k">50,000 - 100,000</option>
                            <option value="over_100k">Over 100,000</option>
                        </select>
                        {errors.monthlyRevenue && <p className="text-red-500 text-xs mt-1">{errors.monthlyRevenue}</p>}
                    </div>
                </div>

                {/* Section: Business Credentials */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-orange-500">📋</span> Business Credentials
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tax ID / PIN <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                name="taxId"
                                value={data.taxId || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                placeholder="Your tax ID/PIN"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Registration Number <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                name="registrationNumber"
                                value={data.registrationNumber || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                placeholder="Business registration number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Business License Number <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                name="businessLicenseNumber"
                                value={data.businessLicenseNumber || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                placeholder="License number"
                            />
                        </div>
                    </div>

                    <p className="text-xs text-gray-600 mt-4 bg-gray-50 p-3 rounded">
                        ℹ️ These credentials help us verify your business and enable quick approval. Upload documents in the next step.
                    </p>
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

export default Step3Financials;
