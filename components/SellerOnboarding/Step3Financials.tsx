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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            onNext();
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Financial Details</h2>
            <p className="text-gray-600 mb-6">Where should we send your payouts?</p>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                        type="text"
                        name="bankName"
                        value={data.bankName}
                        onChange={handleChange}
                        className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.bankName ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="e.g. Emirates NBD, Equity Bank"
                    />
                    {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                    <input
                        type="text"
                        name="accountHolder"
                        value={data.accountHolder}
                        onChange={handleChange}
                        className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.accountHolder ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Must match your ID"
                    />
                    {errors.accountHolder && <p className="text-red-500 text-xs mt-1">{errors.accountHolder}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                        <input
                            type="text"
                            name="accountNumber"
                            value={data.accountNumber}
                            onChange={handleChange}
                            className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="0000000000"
                        />
                        {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Routing / Branch Code <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <input
                            type="text"
                            name="routingNumber"
                            value={data.routingNumber}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            placeholder="XYZ123"
                        />
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-800">
                    <span className="material-icons text-blue-600">lock</span>
                    <p>Your bank details are stored securely and encrypted. We only use them for payouts.</p>
                </div>

                <div className="flex gap-4 pt-6">
                    <button
                        onClick={onBack}
                        className="flex-1 py-3 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleNext}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Step3Financials;
