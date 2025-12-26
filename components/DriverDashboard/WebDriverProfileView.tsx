import React, { useEffect, useState } from 'react';
import { fetchDriverProfile, updateDriverProfile } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface WebDriverProfileViewProps {
    partnerId: string; // This is actually the user_id in the current context of App.tsx
}

interface DriverProfile {
    id: string; // partner_id
    user_id: string;
    company_name: string;
    contact_email: string;
    contact_phone: string;
    license_number: string;
    insurance_policy_number: string;
    delivery_radius_km: number;
    base_delivery_fee: number;
    per_km_fee: number;
    is_active: boolean;
    verification_status: string;
    rating: number;
    total_deliveries: number;
}

export const WebDriverProfileView: React.FC<WebDriverProfileViewProps> = ({ partnerId }) => {
    const [profile, setProfile] = useState<DriverProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Check if partnerId is user_id or partner_id.
    // In App.tsx: <WebDriverDashboard partnerId={user?.id || ''} /> 
    // It passes user.id. fetchDriverProfile expects userId.

    const loadProfile = async () => {
        setLoading(true);
        // partnerId prop is actually user.id
        const data = await fetchDriverProfile(partnerId);
        if (data) {
            setProfile(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadProfile();
    }, [partnerId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setSaving(true);
        try {
            const { error } = await updateDriverProfile(profile.id, {
                company_name: profile.company_name,
                contact_email: profile.contact_email,
                contact_phone: profile.contact_phone,
                delivery_radius_km: profile.delivery_radius_km,
                base_delivery_fee: profile.base_delivery_fee,
                per_km_fee: profile.per_km_fee,
                license_number: profile.license_number,
                insurance_policy_number: profile.insurance_policy_number,
                is_active: profile.is_active
            });

            if (error) throw error;
            alert('Profile updated successfully');
        } catch (error: any) {
            console.error(error);
            alert('Failed to update profile: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center p-12 bg-white rounded-3xl border border-slate-100">
                <p className="text-slate-500 font-bold">Driver profile not found.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Profile Settings</h1>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Manage your account details & preferences</p>
                </div>
                <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-black uppercase tracking-widest">{profile.verification_status}</span>
                </div>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Public Info */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                            <span className="material-icons text-slate-300">person</span>
                            Personal Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name / Company Name</label>
                                <input
                                    type="text"
                                    value={profile.company_name}
                                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                                    className="w-full p-4 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={profile.contact_email}
                                    onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
                                    className="w-full p-4 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={profile.contact_phone}
                                    onChange={(e) => setProfile({ ...profile, contact_phone: e.target.value })}
                                    className="w-full p-4 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                            <span className="material-icons text-slate-300">work</span>
                            Operational Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Base Delivery Fee (KES)</label>
                                <input
                                    type="number"
                                    value={profile.base_delivery_fee}
                                    onChange={(e) => setProfile({ ...profile, base_delivery_fee: Number(e.target.value) })}
                                    className="w-full p-4 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Fee Per KM (KES)</label>
                                <input
                                    type="number"
                                    value={profile.per_km_fee}
                                    onChange={(e) => setProfile({ ...profile, per_km_fee: Number(e.target.value) })}
                                    className="w-full p-4 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Max Radius (km)</label>
                                <input
                                    type="number"
                                    value={profile.delivery_radius_km}
                                    onChange={(e) => setProfile({ ...profile, delivery_radius_km: Number(e.target.value) })}
                                    className="w-full p-4 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mt-6">
                                <div className={`w-12 h-6 flex items-center bg-slate-300 rounded-full p-1 cursor-pointer transition-colors ${profile.is_active ? 'bg-emerald-500' : ''}`} onClick={() => setProfile({ ...profile, is_active: !profile.is_active })}>
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${profile.is_active ? 'translate-x-6' : ''}`}></div>
                                </div>
                                <span className="font-bold text-slate-600 text-sm">Available for Orders</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Private/Admin Info */}
                <div className="space-y-8">
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                            <span className="material-icons text-slate-300">verified_user</span>
                            Verification
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">License Number</label>
                                <input
                                    type="text"
                                    value={profile.license_number}
                                    onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
                                    className="w-full p-3 bg-white rounded-xl font-bold border-transparent focus:border-orange-500 focus:ring-0 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Insurance Policy</label>
                                <input
                                    type="text"
                                    value={profile.insurance_policy_number || ''}
                                    onChange={(e) => setProfile({ ...profile, insurance_policy_number: e.target.value })}
                                    className="w-full p-3 bg-white rounded-xl font-bold border-transparent focus:border-orange-500 focus:ring-0 text-sm"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-200 mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Rating</span>
                                    <span className="font-black text-slate-900">{profile.rating}/5.0</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Total Deliveries</span>
                                    <span className="font-black text-slate-900">{profile.total_deliveries}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};
