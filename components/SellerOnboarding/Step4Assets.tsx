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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logoFile' | 'bannerFile') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, [fieldName]: 'File size must be less than 5MB' }));
                return;
            }
            updateData({ [fieldName]: file });
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
            setIsSubmitting(true);
            onSubmit();
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Shop Assets & Policies</h2>
                <p className="text-gray-600">Final touches to make your shop stand out</p>
            </div>

            <div className="space-y-6">
                {/* Section: Branding */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-orange-500">🎨</span> Shop Branding
                    </h3>

                    {/* Logo Upload */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Shop Logo <span className="text-red-500">*</span></label>
                        <div className="flex items-start gap-6">
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden flex-shrink-0">
                                {data.logoFile ? (
                                    <img src={URL.createObjectURL(data.logoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center">
                                        <span className="text-2xl">🏪</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <input
                                    type="file"
                                    id="logo-upload"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'logoFile')}
                                />
                                <label
                                    htmlFor="logo-upload"
                                    className="cursor-pointer inline-block bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
                                >
                                    Choose Logo
                                </label>
                                <p className="text-xs text-gray-500 mt-2">
                                    PNG, JPG or GIF • Max 5MB • Recommended 500x500px square
                                </p>
                                {errors.logoFile && <p className="text-red-500 text-xs mt-2">{errors.logoFile}</p>}
                                {data.logoFile && (
                                    <p className="text-xs text-green-600 mt-2">
                                        ✓ {data.logoFile.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Banner Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Shop Banner <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all hover:border-orange-400 hover:bg-orange-50">
                            {data.bannerFile ? (
                                <>
                                    <img src={URL.createObjectURL(data.bannerFile)} alt="Banner Preview" className="w-full h-full object-cover absolute inset-0" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white text-sm font-bold bg-black/50 px-4 py-2 rounded">Change banner</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <div className="text-4xl mb-2">🖼️</div>
                                    <p className="text-sm font-medium text-gray-700">Add a banner image</p>
                                    <p className="text-xs text-gray-500 mt-1">Recommended 1200x400px</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleFileChange(e, 'bannerFile')}
                            />
                        </div>
                        {data.bannerFile && (
                            <p className="text-xs text-green-600 mt-2">
                                ✓ {data.bannerFile.name}
                            </p>
                        )}
                    </div>

                    {/* Business License Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Business License <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-400 transition-colors">
                            <input
                                type="file"
                                id="license-upload"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        if (file.size > 10 * 1024 * 1024) {
                                            setErrors(prev => ({ ...prev, businessLicenseFile: 'File size must be less than 10MB' }));
                                            return;
                                        }
                                        updateData({ businessLicenseFile: file });
                                        if (errors.businessLicenseFile) {
                                            const newErrors = { ...errors };
                                            delete newErrors.businessLicenseFile;
                                            setErrors(newErrors);
                                        }
                                    }
                                }}
                            />
                            <label
                                htmlFor="license-upload"
                                className="cursor-pointer flex flex-col items-center justify-center"
                            >
                                <div className="text-3xl mb-2">📄</div>
                                <p className="text-sm font-medium text-gray-700">Upload Business License</p>
                                <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG • Max 10MB</p>
                            </label>
                        </div>
                        {data.businessLicenseFile && (
                            <p className="text-xs text-green-600 mt-2">
                                ✓ {data.businessLicenseFile.name}
                            </p>
                        )}
                        {errors.businessLicenseFile && <p className="text-red-500 text-xs mt-2">{errors.businessLicenseFile}</p>}
                    </div>

                    {/* Other Documents Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Supporting Documents <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-400 transition-colors">
                            <input
                                type="file"
                                id="docs-upload"
                                accept="image/*,.pdf"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        const files = Array.from(e.target.files) as File[];
                                        const validFiles = files.filter((f: File) => f.size <= 10 * 1024 * 1024);
                                        if (validFiles.length !== files.length) {
                                            setErrors(prev => ({ ...prev, otherDocumentsFiles: 'Some files exceed 10MB and were not added' }));
                                        }
                                        const currentDocs = data.otherDocumentsFiles || [];
                                        updateData({ otherDocumentsFiles: [...currentDocs, ...validFiles] });
                                    }
                                }}
                            />
                            <label
                                htmlFor="docs-upload"
                                className="cursor-pointer flex flex-col items-center justify-center"
                            >
                                <div className="text-3xl mb-2">📎</div>
                                <p className="text-sm font-medium text-gray-700">Upload Additional Documents</p>
                                <p className="text-xs text-gray-500 mt-1">Tax certificates, permits, etc. • Multiple files allowed</p>
                            </label>
                        </div>
                        {data.otherDocumentsFiles && data.otherDocumentsFiles.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {data.otherDocumentsFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs bg-green-50 px-2 py-1 rounded">
                                        <span className="text-green-700">✓ {file.name}</span>
                                        <button
                                            onClick={() => {
                                                const newFiles = data.otherDocumentsFiles?.filter((_, i) => i !== idx);
                                                updateData({ otherDocumentsFiles: newFiles });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {errors.otherDocumentsFiles && <p className="text-red-500 text-xs mt-2">{errors.otherDocumentsFiles}</p>}
                    </div>
                </div>

                {/* Section: Policies */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-orange-500">📋</span> Shop Policies
                    </h3>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Return Policy <span className="text-red-500">*</span></label>
                            <textarea
                                name="returnPolicy"
                                value={data.returnPolicy}
                                onChange={handleTextChange}
                                rows={4}
                                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none ${errors.returnPolicy ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="e.g. Returns accepted within 30 days of purchase if items are in original condition..."
                            />
                            <p className="text-xs text-gray-500 mt-1">{data.returnPolicy.length}/1000 characters</p>
                            {errors.returnPolicy && <p className="text-red-500 text-xs mt-1">{errors.returnPolicy}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Shipping Policy <span className="text-red-500">*</span></label>
                            <textarea
                                name="shippingPolicy"
                                value={data.shippingPolicy}
                                onChange={handleTextChange}
                                rows={4}
                                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none ${errors.shippingPolicy ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="e.g. Orders ship within 1-2 business days using DHL/FedEx. Delivery typically takes 3-5 days..."
                            />
                            <p className="text-xs text-gray-500 mt-1">{data.shippingPolicy.length}/1000 characters</p>
                            {errors.shippingPolicy && <p className="text-red-500 text-xs mt-1">{errors.shippingPolicy}</p>}
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-800 mt-6">
                        <span className="text-lg">ℹ️</span>
                        <p>Clear and transparent policies build customer trust and reduce disputes. Update them anytime from your dashboard.</p>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="text-green-600">✅</span> You're Almost Done!
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                            <span className={data.logoFile ? '✓' : '•'}>•</span>
                            Shop logo uploaded
                        </li>
                        <li className="flex items-center gap-2">
                            <span>•</span>
                            Return policy defined
                        </li>
                        <li className="flex items-center gap-2">
                            <span>•</span>
                            Shipping policy defined
                        </li>
                    </ul>
                    <p className="text-xs text-gray-600 mt-4">Click "Complete Sign Up" to finalize your account and start selling!</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-6">
                    <button
                        onClick={onBack}
                        disabled={isSubmitting}
                        className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                Completing...
                            </>
                        ) : (
                            <>
                                <span>✓ Complete Sign Up</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Step4Assets;
