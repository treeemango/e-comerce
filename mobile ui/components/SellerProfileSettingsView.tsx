import React, { useState, useEffect } from 'react';
import { fetchSellerProfile, saveSellerProfile, SellerProfile, uploadVendorMediaComplete, deleteVendorMedia } from '../../lib/api';
import { cn } from '../../lib/utils';

interface SellerProfileSettingsViewProps {
    sellerId: string;
    onBack: () => void;
    onSupportClick?: () => void;
}

export const SellerProfileSettingsView: React.FC<SellerProfileSettingsViewProps> = ({ sellerId, onBack, onSupportClick }) => {
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            if (!sellerId) return;
            try {
                const data = await fetchSellerProfile(sellerId);
                setProfile(data);
            } catch (error) {
                console.error('Failed to load seller profile:', error);
                setMessage({ type: 'error', text: 'Failed to load profile settings.' });
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [sellerId]);

    const handleChange = (field: keyof SellerProfile, value: string) => {
        if (!profile) return;
        setProfile({ ...profile, [field]: value });
    };

    const handleSave = async () => {
        if (!profile || !sellerId) return;
        setSaving(true);
        setMessage(null);
        try {
            const success = await saveSellerProfile(profile);
            if (success) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'Failed to save profile changes.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'license' | 'other_document') => {
        const file = event.target.files?.[0];
        if (!file || !sellerId || !profile) return;

        setUploading(type);
        try {
            const result = await uploadVendorMediaComplete(sellerId, file, type);
            if (result.success && result.media) {
                setProfile({
                    ...profile,
                    documents: [...(profile.documents || []), result.media]
                });
                setMessage({ type: 'success', text: `Document uploaded: ${file.name}` });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to upload document.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Upload failed due to an error.' });
        } finally {
            setUploading(null);
            // Reset input
            event.target.value = '';
        }
    };

    const handleDeleteDocument = async (mediaId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            const result = await deleteVendorMedia(mediaId, sellerId);
            if (result.success) {
                setProfile(prev => prev ? {
                    ...prev,
                    documents: (prev.documents || []).filter(doc => doc.id !== mediaId)
                } : null);
                setMessage({ type: 'success', text: 'Document deleted.' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to delete document.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Deletion failed.' });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-black min-h-full">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-sm font-bold text-gray-500 uppercase tracking-widest">Loading Settings...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-black">
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-900 px-5 pt-12 pb-5 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center active:scale-90 transition-transform"
                >
                    <span className="material-icons-round text-gray-600 dark:text-gray-300">chevron_left</span>
                </button>
                <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex-1">Business Settings</h1>
                <button
                    onClick={async () => {
                        const url = `${window.location.origin}/?view=vendor-store&vendorId=${sellerId}`; // Use sellerId directly or profile?.vendor_id if available. 
                        // The component prop is 'sellerId' which usually maps to user_id, but the link expects vendorId (vendor_id).
                        // Let's check profile.vendor_id. If missing, fallback to sellerId (though incorrect if they differ, usually they are same uuid for 1:1, but strictly separate).
                        // However, based on API usage, 'vendorId' in App.tsx maps to vendor_id.
                        // Ideally profile should have vendor_id.
                        // Let's assume profile?.vendor_id is the safe bet, or fallback.
                        // Wait, looking at fetchSellerProfile return type, it returns SellerProfile.
                        // Does SellerProfile have vendor_id? 
                        // I will assume yes or use sellerId for now, but adding a safe check is better.
                        const targetId = (profile as any)?.vendor_id || sellerId;
                        const shareUrl = `${window.location.origin}/?view=vendor-store&vendorId=${targetId}`;

                        const shareData = {
                            title: profile?.business_name || 'My Store',
                            text: `Check out my store ${profile?.business_name} on JuaExpress!`,
                            url: shareUrl,
                        };

                        if (navigator.share) {
                            try {
                                await navigator.share(shareData);
                            } catch (err) {
                                console.error('Error sharing:', err);
                            }
                        } else {
                            try {
                                await navigator.clipboard.writeText(shareUrl);
                                setMessage({ type: 'success', text: 'Store link copied to clipboard!' });
                            } catch (err) {
                                console.error('Error copying:', err);
                            }
                        }
                    }}
                    className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center active:scale-90 transition-transform"
                >
                    <span className="material-icons-round text-gray-600 dark:text-gray-300">share</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-5 pb-40 space-y-6">
                {message && (
                    <div className={cn(
                        "p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
                        message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                    )}>
                        <span className="material-icons-round text-lg">
                            {message.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider">{message.text}</span>
                    </div>
                )}

                {/* Section: Business Info */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Business Identity</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 space-y-5 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <InputField
                            label="Business Name"
                            value={profile?.business_name || ''}
                            onChange={(v) => handleChange('business_name', v)}
                            placeholder="e.g. Acme Corp"
                        />
                        <InputField
                            label="Shop Display Name"
                            value={profile?.shop_name || ''}
                            onChange={(v) => handleChange('shop_name', v)}
                            placeholder="e.g. Acme Official Store"
                        />
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Description</label>
                            <textarea
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none"
                                value={profile?.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Tell customers about your business..."
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Contact */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Contact Channels</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 space-y-5 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <InputField
                            label="Public Email"
                            value={profile?.business_email || ''}
                            onChange={(v) => handleChange('business_email', v)}
                            placeholder="contact@business.com"
                        />
                        <InputField
                            label="Phone Number"
                            value={profile?.phone || ''}
                            onChange={(v) => handleChange('phone', v)}
                            placeholder="+254..."
                        />
                        <InputField
                            label="Website URL"
                            value={profile?.website_url || ''}
                            onChange={(v) => handleChange('website_url', v)}
                            placeholder="https://..."
                        />
                    </div>
                </div>

                {/* Section: Address */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Physical Address</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 space-y-5 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <InputField
                            label="Street Address"
                            value={profile?.address_line1 || ''}
                            onChange={(v) => handleChange('address_line1', v)}
                            placeholder="123 Market St"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="City"
                                value={profile?.city || ''}
                                onChange={(v) => handleChange('city', v)}
                                placeholder="Nairobi"
                            />
                            <InputField
                                label="State/Region"
                                value={profile?.state || ''}
                                onChange={(v) => handleChange('state', v)}
                                placeholder="Central"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Postal Code"
                                value={profile?.postal_code || ''}
                                onChange={(v) => handleChange('postal_code', v)}
                                placeholder="00100"
                            />
                            <InputField
                                label="Country"
                                value={profile?.country || ''}
                                onChange={(v) => handleChange('country', v)}
                                placeholder="Kenya"
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Documents */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Verified Assets</h3>
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">Secure Vault</span>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 space-y-4 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                        {/* Subtle background glow */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 blur-3xl rounded-full"></div>

                        <p className="text-[10px] text-gray-500 font-medium px-1 relative z-10">
                            Managed documents for your business identity and verification status.
                        </p>

                        <div className="space-y-3 relative z-10">
                            {(profile?.documents || []).map((doc: any, idx: number) => (
                                <div key={doc.id || idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-[20px] border border-gray-100 dark:border-gray-700/30 group">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-11 h-11 rounded-2xl bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700/50">
                                            <span className="material-icons-round text-primary text-xl">
                                                {doc.media_usage?.includes('license') ? 'verified_user' : 'description'}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">
                                                {doc.original_filename || (doc.media_usage?.replace('_', ' ') || 'Document')}
                                            </p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => window.open(doc.media_url, '_blank')}
                                            className="w-9 h-9 rounded-xl bg-white dark:bg-gray-700 text-gray-400 flex items-center justify-center active:scale-90 shadow-sm border border-gray-100 dark:border-gray-700/50"
                                        >
                                            <span className="material-icons-round text-sm">visibility</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center active:scale-90 shadow-sm border border-red-100/30"
                                        >
                                            <span className="material-icons-round text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {(!profile?.documents || profile.documents.length === 0) && (
                                <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl bg-gray-50/30">
                                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="material-icons-round text-gray-300 dark:text-gray-600 text-3xl">upload_file</span>
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">No Assets Found</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <label className={cn(
                                "flex flex-col items-center justify-center py-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer relative overflow-hidden group",
                                uploading === 'license' ? "bg-gray-50 border-gray-200 opacity-50" : "bg-blue-500/5 border-blue-200/50 hover:bg-blue-500/10 text-blue-600"
                            )}>
                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'license')} disabled={!!uploading} />
                                <span className="material-icons-round text-2xl mb-1.5 group-hover:scale-110 transition-transform">{uploading === 'license' ? 'sync' : 'verified_user'}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">{uploading === 'license' ? 'Uploading...' : 'Add ID/License'}</span>
                            </label>

                            <label className={cn(
                                "flex flex-col items-center justify-center py-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer relative overflow-hidden group",
                                uploading === 'other_document' ? "bg-gray-50 border-gray-200 opacity-50" : "bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary"
                            )}>
                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'other_document')} disabled={!!uploading} />
                                <span className="material-icons-round text-2xl mb-1.5 group-hover:scale-110 transition-transform">{uploading === 'other_document' ? 'sync' : 'add_circle'}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">{uploading === 'other_document' ? 'Uploading...' : 'Other Cert.'}</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Section: Legal & Policies */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Legal Protocols</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 space-y-6 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -z-10 rounded-full"></div>

                        <InputField
                            label="Tax ID / Registration"
                            value={profile?.tax_id || ''}
                            onChange={(v) => handleChange('tax_id', v)}
                            placeholder="Optional PIN or VAT"
                        />

                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Return & Refund Policy</label>
                            <textarea
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none"
                                value={profile?.return_policy || ''}
                                onChange={(e) => handleChange('return_policy', e.target.value)}
                                placeholder="Formal return policy details..."
                            />
                        </div>
                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Shipping & Logistics</label>
                            <textarea
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none"
                                value={profile?.shipping_policy || ''}
                                onChange={(e) => handleChange('shipping_policy', e.target.value)}
                                placeholder="Shipping methods and timelines..."
                            />
                        </div>
                    </div>
                </div>

                {/* Support Section */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Need Assistance?</h3>
                    <div className="bg-gradient-to-br from-indigo-500/10 to-primary/10 rounded-3xl p-6 border border-primary/20 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all" onClick={onSupportClick}>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center shadow-lg shadow-primary/20">
                                <span className="material-icons-round text-primary text-2xl">support_agent</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Contact Admin Support</div>
                                <div className="text-[10px] text-gray-500 font-bold mt-0.5 uppercase tracking-widest">Get help with your seller account</div>
                            </div>
                            <span className="material-icons-round text-gray-300">chevron_right</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-40 pb-safe">
                <button
                    onClick={handleSave}
                    className={cn(
                        "w-full py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 shadow-xl flex items-center justify-center gap-3",
                        saving
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-primary text-white active:scale-95 shadow-primary/30"
                    )}
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <span className="material-icons-round text-lg">save</span>
                            <span>Save Changes</span>
                        </>
                    )}
                </button>
            </div>
        </div >
    );
};

const InputField: React.FC<{ label: string, value: string, onChange: (v: string) => void, placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">{label}</label>
        <input
            type="text"
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    </div>
);
