import React, { useState } from 'react';
import { registerDriver, createDriverProfile, createDriverVehicle } from '../../lib/api';

interface DriverOnboardingViewProps {
    onComplete: () => void;
    onCancel: () => void;
}

const DriverOnboardingView: React.FC<DriverOnboardingViewProps> = ({ onComplete, onCancel }) => {
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

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

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

            // 2. Profile Creation (Delivery Partner)
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

            alert('Professional Driver Profile Created! Your application is now in the verification queue.');
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
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500 mb-6"></div>
                <p className="text-slate-900 font-black text-xl tracking-tight">Synchronizing Fleet Data...</p>
                <p className="text-slate-400 font-medium tracking-tight">Deploying your logistics portfolio.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-display">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 py-6 px-6 lg:px-12 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                        <span className="material-icons">local_shipping</span>
                    </div>
                    <div>
                        <p className="font-black text-slate-900 leading-none">Logistics Onboarding</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Step {step} of 4</p>
                    </div>
                </div>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-colors">
                    Cancel Application
                </button>
            </header>

            <main className="flex-1 flex items-center justify-center py-12 px-6">
                <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10 lg:p-12">

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                            <span className="material-icons">error_outline</span>
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Partner Identity</h2>
                                <p className="text-slate-500 font-medium">Create your credentials and company profile.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        placeholder="driver@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Login Password</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Company/Brand Name</label>
                                    <input
                                        type="text"
                                        value={formData.companyName}
                                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        placeholder="FastTrack Logistics"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.contactPhone}
                                        onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        placeholder="+254..."
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Driver/Operation License Number</label>
                                    <input
                                        type="text"
                                        value={formData.licenseNumber}
                                        onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        placeholder="DL-XXXXXXXX"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={!formData.email || !formData.password || !formData.companyName || !formData.licenseNumber}
                                className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Continue to Vehicle Portfolio
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Vehicle Specifications</h2>
                                <p className="text-slate-500 font-medium">Tell us about the primary vehicle in your fleet.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vehicle Type</label>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        {[
                                            { id: 'bicycle', icon: 'directions_bike' },
                                            { id: 'motorcycle', icon: 'electric_moped' },
                                            { id: 'car', icon: 'directions_car' },
                                            { id: 'van', icon: 'local_shipping' },
                                            { id: 'truck', icon: 'fire_truck' }
                                        ].map(v => (
                                            <button
                                                key={v.id}
                                                onClick={() => setFormData({ ...formData, vehicleType: v.id })}
                                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${formData.vehicleType === v.id ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                                            >
                                                <span className="material-icons text-xl mb-1">{v.icon}</span>
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{v.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">License Plate</label>
                                        <input
                                            type="text"
                                            value={formData.plateNumber}
                                            onChange={e => setFormData({ ...formData, plateNumber: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                            placeholder="KAA 123X"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Year</label>
                                        <input
                                            type="number"
                                            value={formData.year}
                                            onChange={e => setFormData({ ...formData, year: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                            placeholder="2024"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Make / Brand</label>
                                        <input
                                            type="text"
                                            value={formData.make}
                                            onChange={e => setFormData({ ...formData, make: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                            placeholder="Toyota / Honda"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Model</label>
                                        <input
                                            type="text"
                                            value={formData.model}
                                            onChange={e => setFormData({ ...formData, model: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                            placeholder="Vitz / Supra"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Capacity (KG)</label>
                                        <input
                                            type="number"
                                            value={formData.capacityKg}
                                            onChange={e => setFormData({ ...formData, capacityKg: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                            placeholder="500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Max Package</label>
                                        <select
                                            value={formData.maxPackageSize}
                                            onChange={e => setFormData({ ...formData, maxPackageSize: e.target.value as any })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="small">Small (Shoes)</option>
                                            <option value="medium">Medium (Boxes)</option>
                                            <option value="large">Large (Furniture)</option>
                                            <option value="extra_large">XL (Bulk)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-900 font-black py-5 rounded-2xl transition-all active:scale-95"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!formData.plateNumber}
                                    className="flex-[2] bg-slate-900 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                >
                                    Logistics & Docs
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Operational Logistics</h2>
                                <p className="text-slate-500 font-medium">Define your service areas and financial requirements.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">License Expiry</label>
                                        <input
                                            type="date"
                                            value={formData.licenseExpiry}
                                            onChange={e => setFormData({ ...formData, licenseExpiry: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Insurance Expiry</label>
                                        <input
                                            type="date"
                                            value={formData.insuranceExpiry}
                                            onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Service Areas (City, District... separated by comma)</label>
                                    <input
                                        type="text"
                                        value={formData.serviceAreas}
                                        onChange={e => setFormData({ ...formData, serviceAreas: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Nairobi, Westlands, Kilimani"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Radius (KM)</label>
                                        <input
                                            type="number"
                                            value={formData.deliveryRadius}
                                            onChange={e => setFormData({ ...formData, deliveryRadius: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Base Fee</label>
                                        <input
                                            type="number"
                                            value={formData.baseFee}
                                            onChange={e => setFormData({ ...formData, baseFee: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Per KM</label>
                                        <input
                                            type="number"
                                            value={formData.perKmFee}
                                            onChange={e => setFormData({ ...formData, perKmFee: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-900 font-black py-5 rounded-2xl transition-all active:scale-95"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="flex-[2] bg-slate-900 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95"
                                >
                                    Final Review
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Consent & Submit</h2>
                                <p className="text-slate-500 font-medium">Please review your logistics portfolio before activation.</p>
                            </div>

                            <div className="bg-slate-50 rounded-[2rem] p-8 space-y-6">
                                <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-200">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logistics Partner</p>
                                        <p className="text-lg font-black text-slate-900">{formData.companyName}</p>
                                        <p className="text-sm font-bold text-slate-500">{formData.contactPhone}</p>
                                    </div>
                                    <div className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">Awaiting Verification</div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vehicle Specification</p>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-slate-900 uppercase">{formData.vehicleType} • {formData.plateNumber}</p>
                                            <p className="text-xs font-bold text-slate-500">{formData.make} {formData.model} ({formData.year})</p>
                                            <p className="text-xs font-bold text-slate-500">Max Load: {formData.capacityKg}kg</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Operational Scope</p>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-slate-900">{formData.deliveryRadius}KM Radius</p>
                                            <p className="text-xs font-bold text-slate-500 leading-tight">Areas: {formData.serviceAreas || 'Global'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 text-[11px] text-slate-400 font-bold leading-relaxed bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                <p>By tapping "Submit Final Portfolio", I certify that all vehicle and license data provided is accurate. I understand that falsification of records will lead to immediate account termination.</p>
                                <p>I agree to the <span className="text-emerald-500">Logistics Partner Agreement</span> and have valid insurance for professional delivery operations.</p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-900 font-black py-5 rounded-2xl transition-all active:scale-95"
                                >
                                    Review Docs
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                                >
                                    Submit Final Portfolio
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DriverOnboardingView;
