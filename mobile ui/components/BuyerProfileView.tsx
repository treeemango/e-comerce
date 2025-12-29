import React, { useState, useEffect } from 'react';
import { AccountSection } from './AccountSection';
import { AuthUser, updateUserProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface BuyerProfileViewProps {
    user: AuthUser;
    onBack: () => void;
    onUpdate: () => void;
}

export const BuyerProfileView: React.FC<BuyerProfileViewProps> = ({ user, onBack, onUpdate }) => {
    const [name, setName] = useState(user.name || '');
    const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = async () => {
        if (!name.trim()) {
            setMessage({ type: 'error', text: 'Name cannot be empty' });
            return;
        }

        setIsUpdating(true);
        setMessage(null);

        try {
            const { error } = await updateUserProfile(user.id, {
                name: name.trim(),
                avatar_url: avatarUrl
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            onUpdate();
        } catch (err: any) {
            console.error('Update profile error:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simple validation
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }

        setIsUploading(true);
        setMessage(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `docs/avatars/${user.id}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('seller-documents')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('seller-documents')
                .getPublicUrl(fileName);

            setAvatarUrl(publicUrl);
            setMessage({ type: 'success', text: 'Avatar uploaded! Save profile to apply.' });
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to upload avatar' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <AccountSection
            title="Profile Settings"
            description="Update your personal information"
            onBack={onBack}
            accent="bg-orange-50 text-primary"
        >
            <div className="flex flex-col gap-6 p-1">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-[2rem] bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-surface-dark shadow-xl overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-400">
                                    {(name || user.email).slice(0, 1).toUpperCase()}
                                </div>
                            )}
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-transform">
                            <span className="material-icons-round text-xl">camera_alt</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                        </label>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tap camera to change avatar</span>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">Full Name</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-gray-400">person</span>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-surface-dark border-none rounded-2xl text-sm font-bold text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-primary transition-all"
                                placeholder="Your full name"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">Email Address</label>
                        <div className="relative opacity-60">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-gray-400">email</span>
                            <input
                                type="email"
                                value={user.email}
                                disabled
                                className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-black/20 border-none rounded-2xl text-sm font-bold text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-[9px] text-gray-400 ml-1">Email cannot be changed directly</p>
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                        <span className="material-icons-round text-sm">
                            {message.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        {message.text}
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={isUpdating || isUploading}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none mt-4"
                >
                    {isUpdating ? 'Saving Changes...' : 'Save Profile'}
                </button>
            </div>
        </AccountSection>
    );
};
