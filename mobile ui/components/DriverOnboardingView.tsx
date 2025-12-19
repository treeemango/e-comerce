import React, { useState } from 'react';
import { registerDriver, createDriverProfile, createDriverVehicle } from '../../lib/api';

interface DriverOnboardingViewProps {
    onComplete: () => void;
    onCancel: () => void;
}

export const DriverOnboardingView: React.FC<DriverOnboardingViewProps> = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Auth / User
        email: '',
        password: '',
        fullName: '',
        // Company
        companyName: '',
        companyDescription: '',
        contactPhone: '',
        licenseNumber: '',
        licenseExpiry: '',
        // Vehicle
        vehicleType: 'motorcycle',
        plateNumber: '',
        make: '',
        model: '',
        year: '',
        color: '',
        capacityKg: '',
        maxPackageSize: 'medium' as 'small' | 'medium' | 'large' | 'extra_large',
        // Operations
        insurancePolicy: '',
        insuranceExpiry: '',
        serviceAreas: '',
        deliveryRadius: '50',
        baseFee: '0',
        perKmFee: '0',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNext = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setStep(prev => prev + 1);
    };
    const handleBack = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Auth Registration
            const { user, error: authError } = await registerDriver(
                formData.email,
                formData.password,
                formData.fullName,
                formData.contactPhone
            );

            if (authError) throw authError;

            // 2. Profile Creation
            const { data: partner, error: profileError } = await createDriverProfile({
                user_id: user.id,
                company_name: formData.companyName || formData.fullName,
                company_description: formData.companyDescription,
                contact_email: formData.email,
                contact_phone: formData.contactPhone,
                license_number: formData.licenseNumber,
                license_expiry_date: formData.licenseExpiry || undefined,
                insurance_policy_number: formData.insurancePolicy || undefined,
                insurance_expiry_date: formData.insuranceExpiry || undefined,
                delivery_radius_km: parseInt(formData.deliveryRadius) || 50,
                base_delivery_fee: parseFloat(formData.baseFee) || 0,
                per_km_fee: parseFloat(formData.perKmFee) || 0,
                service_areas: formData.serviceAreas.split(',').map(s => s.trim()).filter(s => s)
            });

            if (profileError) throw profileError;

            // 3. Vehicle Creation
            const { error: vehicleError } = await createDriverVehicle({
                partner_id: partner.id,
                vehicle_type: formData.vehicleType,
                license_plate: formData.plateNumber,
                make: formData.make,
                model: formData.model,
                year: parseInt(formData.year) || undefined,
                color: formData.color,
                capacity_kg: parseFloat(formData.capacityKg) || undefined,
                max_package_size: formData.maxPackageSize,
                insurance_number: formData.insurancePolicy,
                registration_expiry: formData.licenseExpiry
            });

            if (vehicleError) throw vehicleError;

            onComplete();
        } catch (err: any) {
            console.error('Driver onboarding error:', err);
            setError(err.message || 'Failed to complete onboarding');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-emerald-500 mb-6"></div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Deploying Fleet Node</h2>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">Connecting your logistics profile to the global fulfillment mesh...</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
            {/* Mobile Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={step === 1 ? onCancel : handleBack} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center active:scale-90 transition">
                        <span className="material-icons text-slate-900">{step === 1 ? 'close' : 'arrow_back'}</span>
                    </button>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Step {step} of 4</p>
                        <p className="font-black text-slate-900 text-sm leading-none">Driver Onboarding</p>
                    </div>
                </div>
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <span className="material-icons text-xl">local_shipping</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 pb-24">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                        <span className="material-icons text-xl">error_outline</span>
                        <p className="text-xs font-bold leading-relaxed">{error}</p>
                    </div>
                )}

                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Identity</h2>
                            <p className="text-sm text-slate-500 font-medium">Create your credentials and company profile.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Legal Full Name</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    placeholder="John Wick"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    placeholder="driver@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Secure Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Company / Brand Name</label>
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    placeholder="My Delivery Express"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.contactPhone}
                                    onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    placeholder="+254..."
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={!formData.email || !formData.password || !formData.companyName}
                            className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50"
                        >
                            Next: Vehicle Details
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Fleet Details</h2>
                            <p className="text-sm text-slate-500 font-medium">Register your primary delivery vehicle.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vehicle Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'motorcycle', icon: 'electric_moped', label: 'Motor' },
                                        { id: 'bicycle', icon: 'directions_bike', label: 'Bike' },
                                        { id: 'van', icon: 'local_shipping', label: 'Van' },
                                        { id: 'car', icon: 'directions_car', label: 'Car' },
                                        { id: 'truck', icon: 'fire_truck', label: 'Truck' }
                                    ].map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => setFormData({ ...formData, vehicleType: v.id })}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${formData.vehicleType === v.id ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-50 bg-slate-50 text-slate-400'}`}
                                        >
                                            <span className="material-icons text-xl mb-1">{v.icon}</span>
                                            <span className="text-[10px] font-black uppercase tracking-tight">{v.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">License Plate</label>
                                <input
                                    type="text"
                                    value={formData.plateNumber}
                                    onChange={e => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    placeholder="KAA 123X"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Make</label>
                                    <input
                                        type="text"
                                        value={formData.make}
                                        onChange={e => setFormData({ ...formData, make: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Toyota"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Model</label>
                                    <input
                                        type="text"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Vitz"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={!formData.plateNumber}
                            className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50"
                        >
                            Next: Operations
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Operations</h2>
                            <p className="text-sm text-slate-500 font-medium">Set your service radius and delivery fees.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Service Areas</label>
                                <input
                                    type="text"
                                    value={formData.serviceAreas}
                                    onChange={e => setFormData({ ...formData, serviceAreas: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    placeholder="Nairobi, Mombasa..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Max Radius (KM)</label>
                                <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4">
                                    <input
                                        type="range"
                                        min="1"
                                        max="200"
                                        value={formData.deliveryRadius}
                                        onChange={e => setFormData({ ...formData, deliveryRadius: e.target.value })}
                                        className="flex-1 accent-emerald-500"
                                    />
                                    <span className="font-black text-slate-900 text-lg min-w-[60px] text-right">{formData.deliveryRadius}KM</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Base Fee</label>
                                    <input
                                        type="number"
                                        value={formData.baseFee}
                                        onChange={e => setFormData({ ...formData, baseFee: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Per KM Fee</label>
                                    <input
                                        type="number"
                                        value={formData.perKmFee}
                                        onChange={e => setFormData({ ...formData, perKmFee: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleNext}
                            className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95"
                        >
                            Final Verification
                        </button>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Review</h2>
                            <p className="text-sm text-slate-500 font-medium">Verify your logistics profile information.</p>
                        </div>

                        <div className="bg-slate-50 rounded-3xl p-6 space-y-6">
                            <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                    <span className="material-icons">person</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Logistics Lead</p>
                                    <p className="text-sm font-black text-slate-900 leading-none">{formData.fullName}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                    <span className="material-icons">{formData.vehicleType === 'motorcycle' ? 'electric_moped' : 'local_shipping'}</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Primary Vehicle</p>
                                    <p className="text-sm font-black text-slate-900 leading-none">{formData.plateNumber} • {formData.make}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                    <span className="material-icons">explore</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Operational Area</p>
                                    <p className="text-sm font-black text-slate-900 leading-none">{formData.deliveryRadius}KM Radius</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-2xl flex items-start gap-3">
                            <span className="material-icons text-emerald-600 text-sm">security</span>
                            <p className="text-[11px] text-emerald-700 font-bold leading-relaxed">
                                By submitting, you agree to our Logistics Standards. Your account will enter the verification queue for approval.
                            </p>
                        </div>

                        <button
                            onClick={handleSubmit}
                            className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                        >
                            Submit Final Portfolio
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
