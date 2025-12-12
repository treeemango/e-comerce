import React, { useState } from 'react';
import { OnboardingState } from '@/types';
import Step1UserAuth from './Step1UserAuth';
import Step2BusinessInfo from './Step2BusinessInfo';
import Step3Financials from './Step3Financials';
import Step4Assets from './Step4Assets';
import {
    registerSeller,
    createBusinessProfile,
    addVendorBankAccount,
    uploadVendorMedia,
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
        shopName: '',
        businessLocation: 'United Arab Emirates',
        email: '',
        password: '',
        confirmPassword: '',
        description: '',
        categoryId: '',
        bankName: '',
        accountHolder: '',
        accountNumber: '',
        routingNumber: '',
        logoFile: null,
        bannerFile: null,
        returnPolicy: 'Standard 30-day return policy. Buyer pays return shipping.',
        shippingPolicy: 'Licensed courier. Delivery in 3-5 business days.',
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
            const { user, error: authError } = await registerSeller(state.email, state.password, state.shopName); // Using shop name as full name for now, or could ask for explicit name
            if (authError) throw new Error('Registration failed: ' + authError.message);
            if (!user) throw new Error('Registration failed: No user returned');

            const userId = user.id;

            // 2. Create Business
            const { business, error: bizError } = await createBusinessProfile(
                userId,
                state.shopName,
                state.description,
                state.categoryId,
                state.businessLocation
            );
            if (bizError) throw new Error('Business creation failed: ' + bizError.message);
            if (!business) throw new Error('Business creation failed');

            const businessId = business.id;

            // 3. Add Bank Account
            const { error: bankError } = await addVendorBankAccount(businessId, {
                bank_name: state.bankName,
                account_holder_name: state.accountHolder,
                account_number: state.accountNumber,
                routing_number: state.routingNumber,
                currency: 'AED' // Assuming based on location
            });
            if (bankError) console.error('Bank account warning:', bankError); // Non-blocking

            // 4. Upload Assets
            let logoId = null;
            let bannerId = null;

            if (state.logoFile) {
                const { id, error: logoError } = await uploadVendorMedia(state.logoFile, `business/${businessId}/logo`);
                if (logoError) console.error('Logo upload warning:', logoError);
                else logoId = id;
            }

            if (state.bannerFile) {
                const { id, error: bannerError } = await uploadVendorMedia(state.bannerFile, `business/${businessId}/banner`);
                if (bannerError) console.error('Banner upload warning:', bannerError);
                else bannerId = id;
            }

            // Link media to business
            if (logoId || bannerId) {
                await updateBusinessMedia(businessId, logoId || undefined, bannerId || undefined);
            }

            // 5. Create Policies
            await createBusinessPolicies(businessId, {
                returnPolicy: state.returnPolicy,
                shippingPolicy: state.shippingPolicy
            });

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
            <header className="bg-white border-b border-gray-200 py-4 px-6 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <span className="material-icons text-orange-500">storefront</span>
                    <span className="font-bold text-xl tracking-tight">JuaExpress Seller Center</span>
                </div>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-800 font-medium text-sm">
                    Cancel
                </button>
            </header>

            {/* Progress Bar */}
            <div className="bg-white border-b border-gray-200 py-4 px-6 mb-8">
                <div className="max-w-3xl mx-auto">
                    <div className="flex justify-between items-center relative">
                        {/* Line */}
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 -z-10"></div>
                        <div className="absolute left-0 top-1/2 w-[calc((100%/3)*(var(--step)-1))] h-0.5 bg-orange-500 -z-10 transition-all duration-500" style={{ '--step': state.step } as React.CSSProperties}></div>

                        {/* Steps */}
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} className="flex flex-col items-center gap-2 bg-white px-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${s <= state.step
                                    ? 'bg-orange-500 border-orange-500 text-white'
                                    : 'bg-white border-gray-300 text-gray-400'
                                    }`}>
                                    {s < state.step ? <span className="material-icons text-sm">check</span> : s}
                                </div>
                                <span className={`text-xs font-medium hidden sm:block ${s <= state.step ? 'text-orange-500' : 'text-gray-400'}`}>
                                    {s === 1 && 'Account'}
                                    {s === 2 && 'Business'}
                                    {s === 3 && 'Payment'}
                                    {s === 4 && 'Review'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 px-6 pb-12">
                {state.error && (
                    <div className="max-w-xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
                        <span className="material-icons text-lg">error_outline</span>
                        <span className="text-sm font-medium">{state.error}</span>
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
