import React, { useState } from 'react';
import {
    registerSeller,
    createBusinessProfile,
    addVendorBankAccount,
    uploadVendorMediaToStorage,
    createVendorMediaRecord,
} from '@/lib/api';
import { cn } from '@/lib/utils';

interface SellerOnboardingViewProps {
    userId?: string;
    onComplete: () => void;
    onCancel: () => void;
}

export const SellerOnboardingView: React.FC<SellerOnboardingViewProps> = ({ userId, onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        // Step 1: Account (if userId not provided)
        email: '',
        password: '',
        shopName: '',
        // Step 2: Business Info
        businessName: '',
        businessType: 'Individual',
        businessEmail: '',
        businessPhone: '',
        description: '',
        categoryId: '',
        // Step 3: Financials
        taxId: '',
        bankName: '',
        accountHolder: '',
        accountNumber: '',
        routingNumber: '',
        monthlyRevenue: '',
        // Step 4: Address
        addressStreet: '',
        addressCity: '',
        addressState: '',
        addressPostalCode: '',
        // Step 5: Media & Policies
        logoFile: null as File | null,
        bannerFile: null as File | null,
        licenseFile: null as File | null,
        returnPolicy: 'Standard 30-day return policy. Buyer pays return shipping.',
        shippingPolicy: 'Licensed courier. Delivery in 3-5 business days.',
    });

    const updateFormData = (updates: Partial<typeof formData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleNext = () => {
        if (step === 1 && !formData.shopName) {
            setError("Shop name is required");
            return;
        }
        setError(null);
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setError(null);
        setStep(prev => prev - 1);
    };

    const handleFinalSubmit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let currentUserId = userId;

            // 1. Register if no userId
            if (!currentUserId) {
                const { user, error: regError } = await registerSeller(formData.email, formData.password, formData.shopName);
                if (regError) throw new Error(regError.message);
                currentUserId = user.id;
            }

            // 2. Upload Media
            let logoUrl, logoPath, bannerUrl, bannerPath;

            if (formData.logoFile) {
                const res = await uploadVendorMediaToStorage(formData.logoFile, `vendors/${currentUserId}/logo`);
                logoUrl = res.url; logoPath = res.path;
            }
            if (formData.bannerFile) {
                const res = await uploadVendorMediaToStorage(formData.bannerFile, `vendors/${currentUserId}/banner`);
                bannerUrl = res.url; bannerPath = res.path;
            }

            // 3. Create Profile
            const payload = {
                user_id: currentUserId,
                shop_name: formData.shopName,
                business_name: formData.businessName || formData.shopName,
                business_slug: formData.shopName.toLowerCase().replace(/\s+/g, '-'),
                business_description: formData.description,
                business_type: formData.businessType,
                primary_category: formData.categoryId || 'General',
                primary_category_description: formData.description,
                business_email: formData.businessEmail || formData.email,
                business_phone: formData.businessPhone,
                tax_id: formData.taxId,
                address_street: formData.addressStreet,
                address_city: formData.addressCity,
                address_state: formData.addressState,
                address_postal_code: formData.addressPostalCode,
                address_country: 'Kenya',
                monthly_revenue: formData.monthlyRevenue,
                return_policy: formData.returnPolicy,
                shipping_policy: formData.shippingPolicy,
                bank_details: {
                    bank_name: formData.bankName,
                    account_holder: formData.accountHolder,
                    account_number: formData.accountNumber,
                    routing_number: formData.routingNumber
                },
                logo_url: logoUrl || undefined,
                banner_url: bannerUrl || undefined
            };

            const { business, error: bizError } = await createBusinessProfile(payload);
            if (bizError) throw new Error(bizError.message);
            if (!business) throw new Error("Failed to create profile");

            // 4. Create Media Records
            if (logoUrl && logoPath) {
                await createVendorMediaRecord(business.id, logoUrl, logoPath, 'logo', formData.logoFile!.type, formData.logoFile!.size, formData.logoFile!.name, currentUserId);
            }
            if (bannerUrl && bannerPath) {
                await createVendorMediaRecord(business.id, bannerUrl, bannerPath, 'banner', formData.bannerFile!.type, formData.bannerFile!.size, formData.bannerFile!.name, currentUserId);
            }

            // 5. Add Bank Account
            if (currentUserId) {
                const { error: bankError } = await addVendorBankAccount(currentUserId, {
                    bank_name: formData.bankName,
                    account_holder_name: formData.accountHolder,
                    account_number: formData.accountNumber,
                    routing_number: formData.routingNumber
                });
                if (bankError) console.error('Bank account warning:', bankError);
            }

            onComplete();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const STEPS = [
        { title: 'Account', icon: 'person' },
        { title: 'Business', icon: 'business' },
        { title: 'Legal', icon: 'gavel' },
        { title: 'Address', icon: 'location_on' },
        { title: 'Assets', icon: 'image' }
    ];

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl active:scale-90 transition-all">
                        <span className="material-icons text-gray-900">close</span>
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 leading-tight">Seller Setup</h2>
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Step {step} of 5: {STEPS[step - 1].title}</p>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="px-5 py-4 bg-gray-50/50">
                <div className="flex justify-between items-center relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-0" />
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-orange-500 transition-all duration-500 -z-0"
                        style={{ width: `${((step - 1) / 4) * 100}%` }}
                    />
                    {STEPS.map((s, idx) => {
                        const active = step >= idx + 1;
                        return (
                            <div key={idx} className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-500",
                                active ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-300"
                            )}>
                                <span className="material-icons text-sm">{active && step > idx + 1 ? 'check' : s.icon}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start animate-shake">
                        <span className="material-icons text-red-500 text-xl">error_outline</span>
                        <p className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                            <h3 className="font-black text-orange-900 text-sm mb-1">Welcome to JuaExpress</h3>
                            <p className="text-xs font-medium text-orange-700/80 leading-relaxed">Let's start with your store identity. This is how customers will see you.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Store Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Premium Tech Hub"
                                    value={formData.shopName}
                                    onChange={e => updateFormData({ shopName: e.target.value })}
                                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all outline-none"
                                />
                                <p className="text-[10px] text-gray-400 mt-2 px-1">This will be your unique identifier on the marketplace.</p>
                            </div>

                            {!userId && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                                        <input
                                            type="email"
                                            placeholder="you@example.com"
                                            value={formData.email}
                                            onChange={e => updateFormData({ email: e.target.value })}
                                            className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={e => updateFormData({ password: e.target.value })}
                                            className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Legal Business Name</label>
                            <input
                                type="text"
                                placeholder="Registration Name"
                                value={formData.businessName}
                                onChange={e => updateFormData({ businessName: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Business Type</label>
                            <select
                                value={formData.businessType}
                                onChange={e => updateFormData({ businessType: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none appearance-none"
                            >
                                <option>Individual</option>
                                <option>Registered Business</option>
                                <option>Corporation</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Primary Category</label>
                            <select
                                value={formData.categoryId}
                                onChange={e => updateFormData({ categoryId: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none appearance-none"
                            >
                                <option value="">Select a category</option>
                                <option value="Electronics">Electronics</option>
                                <option value="Fashion">Fashion</option>
                                <option value="Home & Garden">Home & Garden</option>
                                <option value="Beauty">Beauty</option>
                                <option value="Automotive">Automotive</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Business Phone</label>
                            <input
                                type="tel"
                                placeholder="+254 ..."
                                value={formData.businessPhone}
                                onChange={e => updateFormData({ businessPhone: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">About the Shop</label>
                            <textarea
                                rows={4}
                                placeholder="What do you sell? (Description)"
                                value={formData.description}
                                onChange={e => updateFormData({ description: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none resize-none"
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tax / PIN Number</label>
                            <input
                                type="text"
                                placeholder="KRA PIN"
                                value={formData.taxId}
                                onChange={e => updateFormData({ taxId: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                            />
                        </div>
                        <div className="mt-6">
                            <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4 ml-1">Settlement Account (KES)</h4>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Bank Name"
                                    value={formData.bankName}
                                    onChange={e => updateFormData({ bankName: e.target.value })}
                                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Account Holder Name"
                                    value={formData.accountHolder}
                                    onChange={e => updateFormData({ accountHolder: e.target.value })}
                                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Account Number"
                                    value={formData.accountNumber}
                                    onChange={e => updateFormData({ accountNumber: e.target.value })}
                                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Street Address</label>
                            <input
                                type="text"
                                placeholder="Building, Street"
                                value={formData.addressStreet}
                                onChange={e => updateFormData({ addressStreet: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">City</label>
                                <input
                                    type="text"
                                    placeholder="Nairobi"
                                    value={formData.addressCity}
                                    onChange={e => updateFormData({ addressCity: e.target.value })}
                                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Postal Code</label>
                                <input
                                    type="text"
                                    placeholder="00100"
                                    value={formData.addressPostalCode}
                                    onChange={e => updateFormData({ addressPostalCode: e.target.value })}
                                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="space-y-6">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <h3 className="font-black text-emerald-900 text-sm mb-1">Final Touches</h3>
                            <p className="text-xs font-medium text-emerald-700/80 leading-relaxed">Upload store branding and set your policies.</p>
                        </div>

                        <div className="space-y-6">
                            {/* Logo Upload */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Store Logo (1:1)</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                        {formData.logoFile ? (
                                            <img src={URL.createObjectURL(formData.logoFile)} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-icons text-gray-300">add_a_photo</span>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        id="logo-upload"
                                        hidden
                                        accept="image/*"
                                        onChange={e => updateFormData({ logoFile: e.target.files?.[0] || null })}
                                    />
                                    <label htmlFor="logo-upload" className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-xl text-center text-xs font-black uppercase tracking-widest active:scale-95 transition-all">
                                        Choose Logo
                                    </label>
                                </div>
                            </div>

                            {/* Banner Upload */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Store Banner (16:9)</label>
                                <div className="w-full aspect-video rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden mb-3">
                                    {formData.bannerFile ? (
                                        <img src={URL.createObjectURL(formData.bannerFile)} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <span className="material-icons text-gray-300 text-3xl mb-1">wallpaper</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Click to upload</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        id="banner-upload"
                                        hidden
                                        accept="image/*"
                                        onChange={e => updateFormData({ bannerFile: e.target.files?.[0] || null })}
                                    />
                                    <label htmlFor="banner-upload" className="absolute inset-0 cursor-pointer" />
                                </div>
                            </div>

                            {/* Policies */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Shipping Policy</label>
                                    <textarea
                                        rows={2}
                                        value={formData.shippingPolicy}
                                        onChange={e => updateFormData({ shippingPolicy: e.target.value })}
                                        className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Return Policy</label>
                                    <textarea
                                        rows={2}
                                        value={formData.returnPolicy}
                                        onChange={e => updateFormData({ returnPolicy: e.target.value })}
                                        className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-gray-100 bg-white sticky bottom-0 z-10">
                <div className="flex gap-3">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            disabled={isLoading}
                            className="flex-1 py-4 px-6 rounded-2xl border border-gray-100 text-gray-900 font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={step === 5 ? handleFinalSubmit : handleNext}
                        disabled={isLoading}
                        className={cn(
                            "flex-[2] py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all",
                            step === 5 ? "bg-emerald-600 text-white shadow-emerald-600/20" : "bg-orange-500 text-white shadow-orange-500/20"
                        )}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {step === 5 ? 'Launch Store' : 'Continue'}
                                <span className="material-icons text-sm">{step === 5 ? 'rocket_launch' : 'arrow_forward'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
