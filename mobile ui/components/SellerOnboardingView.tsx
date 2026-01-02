import React, { useState } from 'react';
import {
    checkShopNameAvailability,
    createBusinessProfile,
    addVendorBankAccount,
    uploadVendorMediaToStorage,
    createVendorMediaRecord,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { processImageForUpload, validateImageFile } from '@/lib/image-utils';
import { supabase } from '@/lib/supabase';

interface SellerOnboardingViewProps {
    userId?: string;
    onComplete: () => void;
    onCancel: () => void;
}

interface CompressionStats {
    originalSize: number;
    compressedSize: number;
    ratio: number;
}

export const SellerOnboardingView: React.FC<SellerOnboardingViewProps> = ({ userId, onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [compressing, setCompressing] = useState<string | null>(null);
    const [compressionStats, setCompressionStats] = useState<{ [key: string]: CompressionStats }>({});
    const [isCompleting, setIsCompleting] = useState(false);

    const PRIMARY_CATEGORIES = [
        'Animals & Pet Supplies',
        'Apparel & Accessories',
        'Arts & Entertainment',
        'Baby & Toddler',
        'Bundles',
        'Business & Industrial',
        'Cameras & Optics',
        'Electronics',
        'Food, Beverages & Tobacco',
        'Furniture',
        'Gift Cards',
        'Hardware',
        'Health & Beauty',
        'Home & Garden',
        'Luggage & Bags',
        'Mature',
        'Media',
        'Office Supplies',
        'Product Add-Ons',
        'Religious & Ceremonial',
        'Services',
        'Software',
        'Sporting Goods',
        'Toys & Games',
        'Uncategorized',
        'Vehicles & Parts',
    ] as const;

    const makeBusinessSlug = (shopName: string) =>
        shopName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

    // Form State
    const [formData, setFormData] = useState({
        // Step 1: Store identity
        shopName: '',
        // Step 2: Business Info
        businessName: '',
        businessType: '',
        businessEmail: '',
        businessPhone: '',
        website: '',
        description: '',
        categoryId: '',
        categoryDescription: '',
        yearsInBusiness: '',
        // Step 3: Financials & Credentials
        taxId: '',
        registrationNumber: '',
        businessLicenseNumber: '',
        monthlyRevenue: '',
        bankName: '',
        accountHolder: '',
        accountNumber: '',
        routingNumber: '',
        // Step 4: Address
        addressStreet: '',
        addressCity: '',
        addressState: '',
        addressPostalCode: '',
        addressCountry: 'Kenya',
        // Step 5: Assets & Policies
        logoFile: null as File | null,
        bannerFile: null as File | null,
        businessLicenseFile: null as File | null,
        otherDocumentsFiles: [] as File[],
        returnPolicy: 'Standard 30-day return policy. Buyer pays return shipping.',
        shippingPolicy: 'Licensed courier. Delivery in 3-5 business days.',
    });

    const updateFormData = (updates: Partial<typeof formData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    // Compress images before storing
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logoFile' | 'bannerFile') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error || 'Invalid image file');
            return;
        }

        setCompressing(fieldName);
        setError(null);

        try {
            // Compress the image
            const variant = fieldName === 'logoFile' ? 'grid' : 'detail';
            const compressed = await processImageForUpload(file, variant);

            // Create a new File from the compressed blob
            const compressedFile = new File(
                [compressed.blob],
                file.name.replace(/\.[^.]+$/, `.${compressed.format}`),
                { type: `image/${compressed.format}` }
            );

            // Store compression stats
            setCompressionStats(prev => ({
                ...prev,
                [fieldName]: {
                    originalSize: file.size,
                    compressedSize: compressed.size,
                    ratio: compressed.compressionRatio
                }
            }));

            updateFormData({ [fieldName]: compressedFile });
        } catch (err: any) {
            setError(err.message || 'Failed to process image');
        } finally {
            setCompressing(null);
        }
    };

    const handleNext = async () => {
        if (isLoading) return;

        if (step === 1) {
            if (!formData.shopName.trim()) {
                setError('Shop name is required');
                return;
            }
        }

        if (step === 2) {
            if (!formData.businessName.trim()) {
                setError('Business name is required');
                return;
            }
            if (!formData.businessEmail.trim()) {
                setError('Business email is required');
                return;
            }
            if (!formData.description.trim()) {
                setError('Business description is required');
                return;
            }
            if (!formData.categoryId.trim()) {
                setError('Primary category is required');
                return;
            }
            if (!formData.businessType.trim()) {
                setError('Business type is required');
                return;
            }

            try {
                const available = await checkShopNameAvailability(formData.shopName.trim());
                if (!available) {
                    setError('This shop name is already taken. Please choose another.');
                    return;
                }
            } catch {
                // If the availability check fails (network, etc.), don't hard-block onboarding.
            }
        }

        if (step === 3) {
            if (!formData.bankName.trim()) {
                setError('Bank name is required');
                return;
            }
            if (!formData.accountHolder.trim()) {
                setError('Account holder name is required');
                return;
            }
            if (!formData.accountNumber.trim()) {
                setError('Account number is required');
                return;
            }
            if (!formData.monthlyRevenue.trim()) {
                setError('Expected monthly revenue is required');
                return;
            }
        }

        if (step === 4) {
            if (!formData.addressStreet.trim()) {
                setError('Street address is required');
                return;
            }
            if (!formData.addressCity.trim()) {
                setError('City is required');
                return;
            }
        }

        if (step === 5) {
            if (!formData.logoFile) {
                setError('Store logo is required');
                return;
            }
            if (!formData.shippingPolicy.trim()) {
                setError('Shipping policy is required');
                return;
            }
            if (!formData.returnPolicy.trim()) {
                setError('Return policy is required');
                return;
            }
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
            const currentUserId = userId;
            if (!currentUserId) {
                throw new Error('Please sign in as a buyer first, then continue to register as a seller.');
            }

            // 2. Upload Media
            let logoUrl: string | null = null;
            let logoPath: string | null = null;
            let bannerUrl: string | null = null;
            let bannerPath: string | null = null;
            let licenseUrl: string | null = null;
            let licensePath: string | null = null;
            const otherDocsData: { url: string, path: string, file: File }[] = [];

            if (formData.logoFile) {
                const res = await uploadVendorMediaToStorage(formData.logoFile, `business/logo/${currentUserId}`);
                logoUrl = res.url || null;
                logoPath = res.path || null;
            }
            if (formData.bannerFile) {
                const res = await uploadVendorMediaToStorage(formData.bannerFile, `business/banner/${currentUserId}`);
                bannerUrl = res.url || null;
                bannerPath = res.path || null;
            }
            if (formData.businessLicenseFile) {
                const res = await uploadVendorMediaToStorage(formData.businessLicenseFile, `business/license/${currentUserId}`);
                licenseUrl = res.url || null;
                licensePath = res.path || null;
            }
            if (Array.isArray(formData.otherDocumentsFiles) && formData.otherDocumentsFiles.length > 0) {
                for (const file of formData.otherDocumentsFiles) {
                    const res = await uploadVendorMediaToStorage(file, `business/docs/${currentUserId}`);
                    if (res.url && res.path) {
                        otherDocsData.push({ url: res.url, path: res.path, file });
                    }
                }
            }

            // 3. Create Profile
            const payload = {
                user_id: currentUserId,
                shop_name: formData.shopName,
                business_name: formData.businessName || formData.shopName,
                business_slug: makeBusinessSlug(formData.shopName),
                business_description: formData.description,
                business_type: formData.businessType,
                primary_category: formData.categoryId,
                primary_category_description: formData.categoryDescription || undefined,
                business_email: formData.businessEmail || undefined,
                business_phone: formData.businessPhone,
                website_url: formData.website || undefined,
                years_in_business: formData.yearsInBusiness ? Number(formData.yearsInBusiness) : null,
                tax_id: formData.taxId || undefined,
                registration_number: formData.registrationNumber || undefined,
                business_license_number: formData.businessLicenseNumber || undefined,
                address_street: formData.addressStreet,
                address_city: formData.addressCity,
                address_state: formData.addressState,
                address_postal_code: formData.addressPostalCode,
                address_country: formData.addressCountry || 'Kenya',
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
            if (bizError) {
                console.error('Business profile creation error:', bizError);
                if (bizError.status === 401 || bizError.status === 403) {
                    throw new Error('Profile creation failed: Unauthorized. This usually means you need to confirm your email before you can set up a shop. Please check your inbox.');
                }
                throw new Error(bizError.message);
            }
            if (!business) throw new Error("Failed to create profile");

            // 4. Create Media Records
            if (logoUrl && logoPath && formData.logoFile) {
                await createVendorMediaRecord(business.id, logoUrl, logoPath, 'logo', formData.logoFile.type, formData.logoFile.size, formData.logoFile.name, currentUserId);
            }
            if (bannerUrl && bannerPath && formData.bannerFile) {
                await createVendorMediaRecord(business.id, bannerUrl, bannerPath, 'banner', formData.bannerFile.type, formData.bannerFile.size, formData.bannerFile.name, currentUserId);
            }
            if (licenseUrl && licensePath && formData.businessLicenseFile) {
                await createVendorMediaRecord(business.id, licenseUrl, licensePath, 'license', formData.businessLicenseFile.type, formData.businessLicenseFile.size, formData.businessLicenseFile.name, currentUserId);
            }
            for (const docData of otherDocsData) {
                await createVendorMediaRecord(business.id, docData.url, docData.path, 'other_document', docData.file.type, docData.file.size, docData.file.name, currentUserId);
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

            // 6. Mark the account as seller (mobile uses public.users.role)
            try {
                await supabase
                    .from('users')
                    .update({ is_seller: true, role: 'seller' })
                    .eq('id', currentUserId);
            } catch (e) {
                console.warn('Non-blocking: failed to update public.users role', e);
            }
            try {
                await supabase.auth.updateUser({ data: { role: 'seller', is_seller: true } });
            } catch (e) {
                console.warn('Non-blocking: failed to update auth metadata', e);
            }

            // Show success state briefly, then auto-redirect to Seller Dashboard.
            setIsCompleting(true);
            setStep(6);
            window.setTimeout(() => onComplete(), 1400);
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
        { title: 'Financial', icon: 'payment' },
        { title: 'Address', icon: 'location_on' },
        { title: 'Finalize', icon: 'check_circle' }
    ];

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        disabled={step === 6}
                        className={cn(
                            "w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl active:scale-90 transition-all",
                            step === 6 && "opacity-50 active:scale-100"
                        )}
                    >
                        <span className="material-icons text-gray-900">close</span>
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 leading-tight">Seller Setup</h2>
                        {step <= 5 ? (
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Step {step} of 5: {STEPS[step - 1].title}</p>
                        ) : (
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Completed</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            {step <= 5 && (
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
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start animate-shake">
                        <span className="material-icons text-red-500 text-xl">error_outline</span>
                        <p className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
                    </div>
                )}

                {step === 6 && (
                    <div className="h-full flex flex-col items-center justify-center text-center py-10">
                        <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6">
                            <span className="material-icons text-emerald-600 text-4xl">check_circle</span>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">Congratulations!</h3>
                        <p className="text-sm font-bold text-gray-600 leading-relaxed max-w-xs">
                            Your seller profile is submitted. You’ll be logged in and taken to your Seller Dashboard now.
                        </p>
                        <div className="mt-5 p-4 bg-orange-50 border border-orange-100 rounded-2xl max-w-sm">
                            <p className="text-xs font-bold text-orange-900 leading-relaxed">
                                While admin reviews your profile, you can still add products. New listings may show as pending until approved.
                            </p>
                        </div>
                        <div className="mt-8 flex items-center gap-3 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                            <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                            Redirecting…
                        </div>
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
                            <input
                                type="text"
                                placeholder="e.g. Retailer, Wholesaler, Manufacturer"
                                value={formData.businessType}
                                onChange={e => updateFormData({ businessType: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Business Email</label>
                            <input
                                type="email"
                                placeholder="business@example.com"
                                value={formData.businessEmail}
                                onChange={e => updateFormData({ businessEmail: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Primary Category</label>
                            <select
                                value={formData.categoryId}
                                onChange={e => updateFormData({ categoryId: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none appearance-none"
                            >
                                <option value="">Select a category</option>
                                {PRIMARY_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Category Description</label>
                            <textarea
                                rows={3}
                                placeholder="What will you sell in this category?"
                                value={formData.categoryDescription}
                                onChange={e => updateFormData({ categoryDescription: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none resize-none"
                            />
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
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Website (Optional)</label>
                            <input
                                type="url"
                                placeholder="https://www.example.com"
                                value={formData.website}
                                onChange={e => updateFormData({ website: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Years in Business (Optional)</label>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                placeholder="e.g. 5"
                                value={formData.yearsInBusiness}
                                onChange={e => updateFormData({ yearsInBusiness: e.target.value })}
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

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Registration Number (Optional)</label>
                            <input
                                type="text"
                                placeholder="Business registration number"
                                value={formData.registrationNumber}
                                onChange={e => updateFormData({ registrationNumber: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Business License Number (Optional)</label>
                            <input
                                type="text"
                                placeholder="License number"
                                value={formData.businessLicenseNumber}
                                onChange={e => updateFormData({ businessLicenseNumber: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Expected Monthly Revenue</label>
                            <select
                                value={formData.monthlyRevenue}
                                onChange={e => updateFormData({ monthlyRevenue: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none appearance-none"
                            >
                                <option value="">Select revenue range</option>
                                <option value="under_10k">Under 10,000</option>
                                <option value="10k_50k">10,000 - 50,000</option>
                                <option value="50k_100k">50,000 - 100,000</option>
                                <option value="over_100k">Over 100,000</option>
                            </select>
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
                                <input
                                    type="text"
                                    placeholder="Routing / Branch Code (Optional)"
                                    value={formData.routingNumber}
                                    onChange={e => updateFormData({ routingNumber: e.target.value })}
                                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Country</label>
                            <input
                                type="text"
                                value={formData.addressCountry}
                                readOnly
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-500 outline-none"
                            />
                        </div>
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
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">State / Region (Optional)</label>
                            <input
                                type="text"
                                placeholder="Region"
                                value={formData.addressState}
                                onChange={e => updateFormData({ addressState: e.target.value })}
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                            />
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
                                        onChange={e => handleImageChange(e, 'logoFile')}
                                    />
                                    <div className="flex-1">
                                        {compressing === 'logoFile' ? (
                                            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-orange-100 text-orange-600 rounded-xl text-xs font-black uppercase">
                                                <span className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></span>
                                                Compressing...
                                            </div>
                                        ) : (
                                            <label htmlFor="logo-upload" className="block py-3 px-4 bg-gray-900 text-white rounded-xl text-center text-xs font-black uppercase tracking-widest active:scale-95 transition-all">
                                                Choose Logo
                                            </label>
                                        )}
                                        {compressionStats.logoFile && (
                                            <p className="text-[10px] text-gray-500 mt-2 text-center">
                                                {(compressionStats.logoFile.originalSize / 1024).toFixed(0)}KB → {(compressionStats.logoFile.compressedSize / 1024).toFixed(0)}KB
                                                <span className="text-green-500 ml-1">(-{compressionStats.logoFile.ratio}%)</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Banner Upload */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Store Banner (16:9)</label>
                                <div className="w-full aspect-video rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden mb-3 relative">
                                    {compressing === 'bannerFile' ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></span>
                                            <span className="text-[10px] font-black text-orange-600 uppercase">Compressing...</span>
                                        </div>
                                    ) : formData.bannerFile ? (
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
                                        onChange={e => handleImageChange(e, 'bannerFile')}
                                    />
                                    <label htmlFor="banner-upload" className="absolute inset-0 cursor-pointer" />
                                </div>
                                {compressionStats.bannerFile && (
                                    <p className="text-[10px] text-gray-500 text-center">
                                        {(compressionStats.bannerFile.originalSize / 1024).toFixed(0)}KB → {(compressionStats.bannerFile.compressedSize / 1024).toFixed(0)}KB
                                        <span className="text-green-500 ml-1">(-{compressionStats.bannerFile.ratio}%)</span>
                                    </p>
                                )}
                            </div>

                            {/* Business License Upload */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Business License (Optional)</label>
                                <input
                                    type="file"
                                    id="license-upload"
                                    hidden
                                    accept="image/*,.pdf"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        if (file.size > 10 * 1024 * 1024) {
                                            setError('Business license must be less than 10MB');
                                            return;
                                        }
                                        updateFormData({ businessLicenseFile: file });
                                    }}
                                />
                                <label htmlFor="license-upload" className="block py-3 px-4 bg-gray-50 border border-gray-100 rounded-2xl text-center text-xs font-black uppercase tracking-widest active:scale-95 transition-all">
                                    {formData.businessLicenseFile ? 'Change License File' : 'Upload License File'}
                                </label>
                                {formData.businessLicenseFile && (
                                    <div className="mt-2 flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                                        <p className="text-[10px] font-black text-emerald-700 truncate">✓ {formData.businessLicenseFile.name}</p>
                                        <button
                                            type="button"
                                            onClick={() => updateFormData({ businessLicenseFile: null })}
                                            className="text-[10px] font-black text-red-500 uppercase"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Supporting Documents Upload */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Supporting Documents (Optional)</label>
                                <input
                                    type="file"
                                    id="docs-upload"
                                    hidden
                                    accept="image/*,.pdf"
                                    multiple
                                    onChange={(e) => {
                                        const files = e.target.files ? Array.from(e.target.files) as File[] : [];
                                        if (files.length === 0) return;

                                        const validFiles = files.filter((f) => f.size <= 10 * 1024 * 1024);
                                        if (validFiles.length !== files.length) {
                                            setError('Some files exceed 10MB and were not added');
                                        }
                                        updateFormData({ otherDocumentsFiles: [...formData.otherDocumentsFiles, ...validFiles] });
                                    }}
                                />
                                <label htmlFor="docs-upload" className="block py-3 px-4 bg-gray-50 border border-gray-100 rounded-2xl text-center text-xs font-black uppercase tracking-widest active:scale-95 transition-all">
                                    Upload Documents
                                </label>

                                {formData.otherDocumentsFiles.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {formData.otherDocumentsFiles.map((file, idx) => (
                                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                                                <p className="text-[10px] font-black text-gray-700 truncate">✓ {file.name}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => updateFormData({ otherDocumentsFiles: formData.otherDocumentsFiles.filter((_, i) => i !== idx) })}
                                                    className="text-[10px] font-black text-red-500 uppercase"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
            <div className={cn("p-5 border-t border-gray-100 bg-white sticky bottom-0 z-10", step === 6 && "hidden")}>
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
                        disabled={isLoading || isCompleting}
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
