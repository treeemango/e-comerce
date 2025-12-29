import React, { useState, useEffect, useCallback } from 'react';
import { fetchVendorMedia, uploadVendorMediaComplete, deleteVendorMedia, VendorMediaItem, VendorMediaType, fetchSellerProfile, saveSellerProfile, SellerProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface StoreMediaManagerProps {
    vendorId?: string; // Vendor UUID (vendors.id)
    sellerId?: string; // User ID (auth.users.id / vendors.user_id)
    userId?: string; // For uploaded_by tracking
    onMediaUpdate?: () => void;
}

const MEDIA_TYPE_CONFIG: Record<VendorMediaType, {
    title: string;
    description: string;
    icon: string;
    accept: string;
    maxSize: number; // in MB
    aspectHint?: string;
}> = {
    logo: {
        title: 'Store Logo',
        description: 'Your store logo appears on your profile and product cards',
        icon: 'storefront',
        accept: 'image/jpeg,image/png,image/webp',
        maxSize: 5,
        aspectHint: '1:1 ratio recommended (square)'
    },
    banner: {
        title: 'Store Banner',
        description: 'Banner displayed at the top of your store page',
        icon: 'panorama',
        accept: 'image/jpeg,image/png,image/webp',
        maxSize: 10,
        aspectHint: '16:9 ratio recommended'
    },
    license: {
        title: 'Business License',
        description: 'Upload your business license for verification',
        icon: 'verified_user',
        accept: 'image/jpeg,image/png,image/webp,application/pdf',
        maxSize: 10
    },
    other_document: {
        title: 'Other Documents',
        description: 'Additional certificates or documents',
        icon: 'description',
        accept: 'image/jpeg,image/png,image/webp,application/pdf',
        maxSize: 10
    }
};

const StoreMediaManager: React.FC<StoreMediaManagerProps> = ({
    vendorId: propVendorId,
    sellerId,
    userId,
    onMediaUpdate
}) => {
    const [media, setMedia] = useState<VendorMediaItem[]>([]);
    const [profile, setProfile] = useState<Partial<SellerProfile>>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState<VendorMediaType | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<VendorMediaType | null>(null);
    const [resolvedVendorId, setResolvedVendorId] = useState<string | null>(propVendorId || null);

    // Resolve vendor ID from seller ID if needed
    useEffect(() => {
        const resolveIds = async () => {
            if (propVendorId) {
                setResolvedVendorId(propVendorId);
            }

            const lookupId = sellerId || userId;
            if (!lookupId) return;

            setLoading(true);
            try {
                // 1. Resolve Vendor ID if not provided
                if (!propVendorId) {
                    const { data } = await supabase
                        .from('vendors')
                        .select('id')
                        .eq('user_id', lookupId)
                        .single();

                    if (data?.id) {
                        setResolvedVendorId(data.id);
                    }
                }

                // 2. Load Seller Profile
                const profileData = await fetchSellerProfile(lookupId);
                if (profileData) {
                    setProfile(profileData);
                }
            } catch (e) {
                console.error('Failed to resolve IDs or load profile:', e);
            } finally {
                setLoading(false);
            }
        };

        resolveIds();
    }, [propVendorId, sellerId, userId]);

    const loadMedia = useCallback(async () => {
        if (!resolvedVendorId) return;

        setLoading(true);
        try {
            const data = await fetchVendorMedia(resolvedVendorId);
            setMedia(data);
        } catch (e) {
            console.error('Failed to load vendor media:', e);
        } finally {
            setLoading(false);
        }
    }, [resolvedVendorId]);

    useEffect(() => {
        if (resolvedVendorId) {
            loadMedia();
        }
    }, [loadMedia, resolvedVendorId]);

    const handleProfileChange = (field: keyof SellerProfile, value: any) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveProfile = async () => {
        const lookupId = sellerId || userId;
        if (!lookupId) return;

        setIsSaving(true);
        try {
            const success = await saveSellerProfile({ ...profile as SellerProfile, id: lookupId });
            if (success) {
                alert('Store details saved successfully!');
            } else {
                setError('Failed to save store details.');
            }
        } catch (e) {
            console.error('Failed to save profile:', e);
            setError('An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileSelect = async (file: File, mediaType: VendorMediaType) => {
        const config = MEDIA_TYPE_CONFIG[mediaType];

        // Validate file size
        if (file.size > config.maxSize * 1024 * 1024) {
            setError(`File size must be less than ${config.maxSize}MB`);
            return;
        }

        // Validate file type
        const acceptedTypes = config.accept.split(',');
        if (!acceptedTypes.some(type => file.type.match(type.replace('*', '.*')))) {
            setError(`Invalid file type. Accepted: ${config.accept}`);
            return;
        }

        setError(null);
        setUploading(mediaType);

        try {
            const result = await uploadVendorMediaComplete(resolvedVendorId!, file, mediaType, userId);
            if (result.success) {
                await loadMedia();
                onMediaUpdate?.();
            } else {
                setError(result.error || 'Upload failed');
            }
        } catch (e) {
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(null);
        }
    };

    const handleDelete = async (mediaItem: VendorMediaItem) => {
        if (!confirm('Are you sure you want to delete this media?')) return;

        try {
            const result = await deleteVendorMedia(mediaItem.id, resolvedVendorId!);
            if (result.success) {
                await loadMedia();
                onMediaUpdate?.();
            } else {
                setError(result.error || 'Delete failed');
            }
        } catch (e) {
            setError('Delete failed. Please try again.');
        }
    };

    const handleDrop = (e: React.DragEvent, mediaType: VendorMediaType) => {
        e.preventDefault();
        setDragOver(null);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file, mediaType);
        }
    };

    const getMediaByType = (type: VendorMediaType) => {
        return media.filter(m => m.media_type === type);
    };

    const renderMediaUploader = (mediaType: VendorMediaType) => {
        const config = MEDIA_TYPE_CONFIG[mediaType];
        const existingMedia = getMediaByType(mediaType);
        const isSingle = mediaType === 'logo' || mediaType === 'banner';
        const currentMedia = isSingle ? existingMedia[0] : null;
        const isUploading = uploading === mediaType;
        const isDragOver = dragOver === mediaType;

        return (
            <div key={mediaType} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-5 border-b border-gray-50 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <span className="material-icons text-orange-500">{config.icon}</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">{config.title}</h3>
                            <p className="text-xs text-gray-500">{config.description}</p>
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    {isSingle && currentMedia ? (
                        // Show existing media with replace/delete options
                        <div className="relative group">
                            <img
                                src={currentMedia.image_url}
                                alt={config.title}
                                className={`w-full rounded-xl object-cover ${mediaType === 'logo' ? 'h-32 w-32' : 'h-40'}`}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                                <label className="cursor-pointer px-3 py-2 bg-white rounded-lg text-xs font-bold text-slate-900 hover:bg-gray-100 transition-colors flex items-center gap-1">
                                    <span className="material-icons text-sm">refresh</span>
                                    Replace
                                    <input
                                        type="file"
                                        accept={config.accept}
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileSelect(file, mediaType);
                                        }}
                                    />
                                </label>
                                <button
                                    onClick={() => handleDelete(currentMedia)}
                                    className="px-3 py-2 bg-red-500 rounded-lg text-xs font-bold text-white hover:bg-red-600 transition-colors flex items-center gap-1"
                                >
                                    <span className="material-icons text-sm">delete</span>
                                    Delete
                                </button>
                            </div>
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                                    <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    ) : isSingle ? (
                        // Upload area for logo/banner
                        <label
                            className={`block cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragOver
                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
                                }`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(mediaType); }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={(e) => handleDrop(e, mediaType)}
                        >
                            {isUploading ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-3" />
                                    <span className="text-sm font-medium text-gray-500">Uploading...</span>
                                </div>
                            ) : (
                                <>
                                    <span className="material-icons text-4xl text-gray-300 mb-3">cloud_upload</span>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Drag & drop or click to upload
                                    </p>
                                    {config.aspectHint && (
                                        <p className="text-xs text-gray-400">{config.aspectHint}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2">Max {config.maxSize}MB</p>
                                </>
                            )}
                            <input
                                type="file"
                                accept={config.accept}
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(file, mediaType);
                                }}
                            />
                        </label>
                    ) : (
                        // Documents list with add button
                        <div className="space-y-3">
                            {existingMedia.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-900 group">
                                    <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 overflow-hidden flex-shrink-0">
                                        {item.mime_type?.startsWith('image/') ? (
                                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="material-icons text-gray-400">description</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {item.original_filename || 'Document'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {item.file_size ? `${(item.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <a
                                            href={item.image_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <span className="material-icons text-sm text-gray-600 dark:text-gray-400">visibility</span>
                                        </a>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                        >
                                            <span className="material-icons text-sm text-red-500">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Add new document */}
                            <label
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${isDragOver
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
                                    }`}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(mediaType); }}
                                onDragLeave={() => setDragOver(null)}
                                onDrop={(e) => handleDrop(e, mediaType)}
                            >
                                {isUploading ? (
                                    <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                                ) : (
                                    <span className="material-icons text-2xl text-gray-400">add_circle_outline</span>
                                )}
                                <span className="text-sm font-medium text-gray-500">
                                    {isUploading ? 'Uploading...' : 'Add document'}
                                </span>
                                <input
                                    type="file"
                                    accept={config.accept}
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileSelect(file, mediaType);
                                    }}
                                />
                            </label>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header with Unified Save */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-gray-900/40 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Store Identity</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Manage your brand assets and business credentials in one place</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            if (!resolvedVendorId) return;
                            const shareUrl = `${window.location.origin}/?view=vendor-store&vendorId=${resolvedVendorId}`;

                            const shareData = {
                                title: (profile as SellerProfile)?.business_name || 'My Store',
                                text: `Check out my store ${(profile as SellerProfile)?.business_name} on JuaExpress!`,
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
                                    alert('Store link copied to clipboard!');
                                } catch (err) {
                                    console.error('Error copying:', err);
                                }
                            }
                        }}
                        className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm active:scale-95"
                        title="Share Store Link"
                    >
                        <span className="material-icons text-gray-600 dark:text-gray-400">share</span>
                    </button>

                    <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="material-icons text-sm">save</span>
                        )}
                        {isSaving ? 'Synchronizing...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3 animate-in shake duration-500">
                    <span className="material-icons text-red-500">error</span>
                    <span className="text-sm text-red-700 dark:text-red-300 font-bold">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto w-8 h-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors">
                        <span className="material-icons text-red-500 text-lg">close</span>
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Media Management */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Core Branding Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderMediaUploader('logo')}
                        {renderMediaUploader('banner')}
                    </div>

                    {/* Business Profile Details */}
                    <div className="bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <span className="material-icons-round text-primary">business</span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Business Profile</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary transition-colors text-gray-900 dark:text-white"
                                    value={profile.business_name || ''}
                                    onChange={(e) => handleProfileChange('business_name', e.target.value)}
                                    placeholder="e.g. The Mega Store Corp"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Registration No.</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary transition-colors text-gray-900 dark:text-white"
                                    value={profile.registration_number || ''}
                                    onChange={(e) => handleProfileChange('registration_number', e.target.value)}
                                    placeholder="Tax ID or Business Reg"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Narrative</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary transition-colors text-gray-900 dark:text-white min-h-[120px] resize-none"
                                    value={profile.description || ''}
                                    onChange={(e) => handleProfileChange('description', e.target.value)}
                                    placeholder="Tell your customers about your journey and expertise..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                <span className="material-icons-round text-blue-500">location_on</span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Operating Location</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Street Address</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary transition-colors text-gray-900 dark:text-white"
                                    value={profile.address_line1 || ''}
                                    onChange={(e) => handleProfileChange('address_line1', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary transition-colors text-gray-900 dark:text-white"
                                    value={profile.city || ''}
                                    onChange={(e) => handleProfileChange('city', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">State / Province</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary transition-colors text-gray-900 dark:text-white"
                                    value={profile.state || ''}
                                    onChange={(e) => handleProfileChange('state', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Postal Code</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary transition-colors text-gray-900 dark:text-white"
                                        value={profile.postal_code || ''}
                                        onChange={(e) => handleProfileChange('postal_code', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Country</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary transition-colors text-gray-900 dark:text-white"
                                        value={profile.country || ''}
                                        onChange={(e) => handleProfileChange('country', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Documents and Verification Info */}
                <div className="space-y-8">
                    {/* Documents Section */}
                    <div className="bg-gradient-to-br from-gray-900 to-black rounded-[40px] p-8 shadow-2xl border border-gray-800 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-colors duration-700"></div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <span className="material-icons-round text-emerald-500">description</span>
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight">Verified Vault</h2>
                        </div>

                        <div className="space-y-6">
                            {renderMediaUploader('license')}
                            {renderMediaUploader('other_document')}
                        </div>

                        {/* Verification Info */}
                        <div className="mt-10 pt-8 border-t border-gray-800">
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <span className="material-icons-round text-blue-500 text-lg">info</span>
                                    </div>
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Protocol Intelligence</span>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[11px] text-gray-400 leading-relaxed font-bold uppercase tracking-tight">
                                        Verification Benefits:
                                    </p>
                                    <ul className="space-y-2">
                                        {[
                                            'Verified badge on your store',
                                            'Priority search visibility',
                                            'Enhanced buyer confidence',
                                            'Advanced analytics access'
                                        ].map(benefit => (
                                            <li key={benefit} className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                                                <span className="material-icons text-[12px] text-emerald-500">check_circle</span>
                                                {benefit}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreMediaManager;
