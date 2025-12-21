import React, { useState } from 'react';
import { OnboardingState } from '@/types';
import Step1UserAuth from './Step1UserAuth';
import Step2BusinessInfo from './Step2BusinessInfo';
import Step3Financials from './Step3Financials';
import Step5Address from './Step5Address';
import Step4Assets from './Step4Assets';
import {
    registerSeller,
    createBusinessProfile,
    addVendorBankAccount,
    uploadVendorMediaToStorage,
    createVendorMediaRecord,
    updateBusinessMedia,
    createBusinessPolicies
} from '../../lib/api';

interface SellerOnboardingViewProps {
    onComplete: () => void;
    onCancel: () => void;
}

const SellerOnboardingView: React.FC<SellerOnboardingViewProps> = ({ onComplete, onCancel }) => {
    const [state, setState] = useState<OnboardingState>({
        step: 1,
        // Step 1: Authentication
        email: '',
        password: '',
        confirmPassword: '',
        // Step 2: Basic Business Info
        shopName: '',
        businessName: '',
        businessLocation: 'Kenya',
        businessType: '',
        businessEmail: '',
        businessPhone: '',
        website: '',
        description: '',
        categoryId: '',
        categoryDescription: '',
        yearsInBusiness: '',
        // Step 3: Legal & Compliance
        taxId: '',
        registrationNumber: '',
        businessLicenseNumber: '',
        monthlyRevenue: '',
        bankName: '',
        accountHolder: '',
        accountNumber: '',
        routingNumber: '',
        // Step 5: Address
        addressStreet: '',
        addressCity: '',
        addressState: '',
        addressCountry: 'Kenya',
        addressPostalCode: '',
        // Step 4: Assets & Policies
        logoFile: null,
        bannerFile: null,
        businessLicenseFile: null,
        otherDocumentsFiles: [],
        returnPolicy: 'Standard 30-day return policy. Buyer pays return shipping.',
        shippingPolicy: 'Licensed courier. Delivery in 3-5 business days.',
        // Status
        isLoading: false,
        error: null
    });

    const updateData = (updates: Partial<OnboardingState>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    const nextStep = () => updateData({ step: state.step + 1 });
    const prevStep = () => updateData({ step: state.step - 1 });

    const handleFinalSubmit = async () => {
        updateData({ isLoading: true, error: null });
        try {
            // 1. Register User
            const { user, error: authError } = await registerSeller(state.email, state.password, state.shopName);
            if (authError) throw new Error('Registration failed: ' + authError.message);
            if (!user) throw new Error('Registration failed: No user returned');
            const userId = user.id;

            // 2. Upload files to storage (without DB records yet)
            let logoUrl = null, logoPath = null;
            let bannerUrl = null, bannerPath = null;
            let licenseUrl = null, licensePath = null;
            const otherDocsData: { url: string, path: string, file: File }[] = [];

            if (state.logoFile) {
                const { url, path, error: logoError } = await uploadVendorMediaToStorage(state.logoFile, `business/logo/${userId}`);
                if (logoError) console.error('Logo upload warning:', logoError);
                else { logoUrl = url; logoPath = path; }
            }
            if (state.bannerFile) {
                const { url, path, error: bannerError } = await uploadVendorMediaToStorage(state.bannerFile, `business/banner/${userId}`);
                if (bannerError) console.error('Banner upload warning:', bannerError);
                else { bannerUrl = url; bannerPath = path; }
            }
            if (state.businessLicenseFile) {
                const { url, path, error: licenseError } = await uploadVendorMediaToStorage(state.businessLicenseFile, `business/license/${userId}`);
                if (licenseError) console.error('License upload warning:', licenseError);
                else { licenseUrl = url; licensePath = path; }
            }
            if (Array.isArray(state.otherDocumentsFiles)) {
                for (const file of state.otherDocumentsFiles) {
                    const { url, path, error: docError } = await uploadVendorMediaToStorage(file, `business/docs/${userId}`);
                    if (docError) console.error('Other doc upload warning:', docError);
                    else if (url && path) otherDocsData.push({ url, path, file });
                }
            }

            // 3. Create Business Profile
            const payload = {
                user_id: userId,
                shop_name: state.shopName,
                business_name: state.businessName || state.shopName,
                business_slug: state.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                business_description: state.description,
                primary_category: state.categoryId,
                primary_category_description: state.categoryDescription,
                business_type: state.businessType,
                business_email: state.businessEmail,
                business_phone: state.businessPhone,
                website_url: state.website,
                years_in_business: state.yearsInBusiness ? Number(state.yearsInBusiness) : null,
                tax_id: state.taxId,
                registration_number: state.registrationNumber,
                business_license_number: state.businessLicenseNumber,
                address_street: state.addressStreet,
                address_city: state.addressCity,
                address_state: state.addressState,
                address_country: state.addressCountry,
                address_postal_code: state.addressPostalCode,
                follower_count: 0,
                return_policy: state.returnPolicy,
                shipping_policy: state.shippingPolicy,
                monthly_revenue: state.monthlyRevenue,
                bank_details: {
                    bank_name: state.bankName,
                    account_holder: state.accountHolder,
                    account_number: state.accountNumber,
                    routing_number: state.routingNumber
                },
                logo_url: logoUrl || undefined,
                banner_url: bannerUrl || undefined
            };
            const { business, error: bizError } = await createBusinessProfile(payload);
            if (bizError) {
                // Check for duplicate key error
                if (bizError.code === '23505' && bizError.message?.includes('vendors_user_id_key')) {
                    throw new Error('This account already has a seller profile. Please sign in to your seller dashboard instead.');
                }
                throw new Error('Business creation failed: ' + bizError.message);
            }
            if (!business) throw new Error('Business creation failed');
            const vendorId = business.id;

            // 4. Create vendor_media records
            if (logoUrl && logoPath && state.logoFile) {
                await createVendorMediaRecord(vendorId, logoUrl, logoPath, 'logo',
                    state.logoFile.type, state.logoFile.size, state.logoFile.name, userId);
            }
            if (bannerUrl && bannerPath && state.bannerFile) {
                await createVendorMediaRecord(vendorId, bannerUrl, bannerPath, 'banner',
                    state.bannerFile.type, state.bannerFile.size, state.bannerFile.name, userId);
            }
            if (licenseUrl && licensePath && state.businessLicenseFile) {
                await createVendorMediaRecord(vendorId, licenseUrl, licensePath, 'license',
                    state.businessLicenseFile.type, state.businessLicenseFile.size, state.businessLicenseFile.name, userId);
            }
            for (const docData of otherDocsData) {
                await createVendorMediaRecord(vendorId, docData.url, docData.path, 'other_document',
                    docData.file.type, docData.file.size, docData.file.name, userId);
            }

            // 5. Add Bank Account
            const { error: bankError } = await addVendorBankAccount(userId, {
                bank_name: state.bankName,
                account_holder_name: state.accountHolder,
                account_number: state.accountNumber,
                routing_number: state.routingNumber
            });
            if (bankError) console.error('Bank account warning:', bankError);

            // Success!
            alert('Seller account created successfully! Redirecting to dashboard...');
            onComplete();
        } catch (err: any) {
            console.error('Onboarding error:', err);
            updateData({ error: err.message || 'An unexpected error occurred.' });
        } finally {
            updateData({ isLoading: false });
        }
    };

    if (state.isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-4"></div>
                <h2 className="text-xl font-bold text-gray-800">Setting up your shop...</h2>
                <p className="text-gray-500">Please wait while we process your information.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 py-4 px-6 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
                        J
                    </div>
                    <div>
                        <p className="font-bold text-lg text-gray-900">JuaExpress</p>
                        <p className="text-xs text-gray-500">Seller Setup</p>
                    </div>
                </div>
                <button onClick={onCancel} className="text-gray-600 hover:text-gray-900 font-medium text-sm px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                    Cancel
                </button>
            </header>

            {/* Progress Bar */}
            <div className="bg-white border-b border-gray-200 py-6 px-6 mb-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center relative">
                        {/* Line */}
                        <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                        <div className="absolute left-0 top-1/2 h-1 bg-gradient-to-r from-orange-500 to-orange-400 -z-10 transition-all duration-500" style={{ width: `calc(${((state.step - 1) / 4) * 100}% + 1rem)` }}></div>

                        {/* Steps */}
                        {[
                            { num: 1, label: 'Account', icon: 'person' },
                            { num: 2, label: 'Business', icon: 'business' },
                            { num: 3, label: 'Financial', icon: 'payment' },
                            { num: 4, label: 'Address', icon: 'location_on' },
                            { num: 5, label: 'Finalize', icon: 'check_circle' }
                        ].map((s) => (
                            <div key={s.num} className="flex flex-col items-center gap-2 bg-white px-3 relative z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${s.num < state.step
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : s.num === state.step
                                        ? 'bg-orange-500 border-orange-500 text-white ring-4 ring-orange-200'
                                        : 'bg-white border-gray-300 text-gray-400'
                                    }`}>
                                    {s.num < state.step ? (
                                        <span className="text-lg">✓</span>
                                    ) : (
                                        s.num
                                    )}
                                </div>
                                <span className={`text-xs font-semibold hidden sm:block text-center ${s.num <= state.step ? 'text-gray-900' : 'text-gray-400'
                                    }`}>
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 px-6 pb-12">
                {state.error && (
                    <div className="max-w-5xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg flex items-start gap-3">
                        <span className="text-lg mt-0.5">⚠️</span>
                        <div>
                            <p className="font-semibold">Error</p>
                            <p className="text-sm">{state.error}</p>
                        </div>
                    </div>
                )}

                {state.step === 1 && (
                    <Step1UserAuth
                        data={state}
                        updateData={updateData}
                        onNext={nextStep}
                    />
                )}
                {state.step === 2 && (
                    <Step2BusinessInfo
                        data={state}
                        updateData={updateData}
                        onNext={nextStep}
                        onBack={prevStep}
                    />
                )}
                {state.step === 3 && (
                    <Step3Financials
                        data={state}
                        updateData={updateData}
                        onNext={nextStep}
                        onBack={prevStep}
                    />
                )}
                {state.step === 4 && (
                    <Step5Address
                        data={state}
                        updateData={updateData}
                        onNext={nextStep}
                        onBack={prevStep}
                    />
                )}
                {state.step === 5 && (
                    <Step4Assets
                        data={state}
                        updateData={updateData}
                        onSubmit={handleFinalSubmit}
                        onBack={prevStep}
                    />
                )}
            </main>
        </div>
    );
};

export default SellerOnboardingView;
