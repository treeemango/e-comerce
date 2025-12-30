import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AdminPermissions } from '@/types';
import { clearAIFeatureFlagsCache, fetchAIFeatureFlags, type AIFeatureFlags, type AIFeatureKey } from '@/lib/ai-feature-flags';

interface AdminAIControlsViewProps {
    permissions: AdminPermissions;
}

type FeatureRow = {
    key: AIFeatureKey;
    title: string;
    description: string;
};

const AdminAIControlsView: React.FC<AdminAIControlsViewProps> = ({ permissions }) => {
    const [flags, setFlags] = useState<AIFeatureFlags | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<AIFeatureKey | null>(null);
    const [error, setError] = useState<string | null>(null);

    const features: FeatureRow[] = useMemo(
        () => [
            {
                key: 'listing_assistant',
                title: 'Product Listing AI',
                description: 'Title improvement, description generation, SEO metadata, and tag suggestions for sellers.'
            },
            {
                key: 'product_questions',
                title: 'Ask Question (Product Q&A)',
                description: 'Buyer-facing Q&A that answers questions using the product details.'
            },
            {
                key: 'image_matching',
                title: 'Image Matching (Visual Search)',
                description: 'Analyze an uploaded/captured image to generate keywords and find similar products.'
            },
            {
                key: 'seller_chat_reply',
                title: 'Seller Smart Reply',
                description: 'Suggests a reply to the last buyer message in seller chat.'
            },
            {
                key: 'product_explain',
                title: 'Product Explain',
                description: 'Explains a product in plain language (used where enabled in the UI).'
            }
        ],
        []
    );

    const canEdit = permissions?.permission_level === 'super_admin';

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const latest = await fetchAIFeatureFlags({ force: true });
            setFlags(latest);
        } catch (e: any) {
            console.error('Failed to load AI feature flags', e);
            setError('Failed to load AI settings.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateFlag = async (key: AIFeatureKey, enabled: boolean) => {
        if (!canEdit) return;

        setSavingKey(key);
        setError(null);
        const previous = flags;

        setFlags(prev => (prev ? { ...prev, [key]: enabled } : prev));

        try {
            const { error } = await supabase
                .from('ai_feature_flags')
                .upsert(
                    {
                        key,
                        enabled,
                        updated_at: new Date().toISOString()
                    },
                    { onConflict: 'key' }
                );

            if (error) throw error;

            clearAIFeatureFlagsCache();
        } catch (e: any) {
            console.error('Failed to update AI feature flag', e);
            setFlags(previous);
            setError(e?.message || 'Failed to save AI setting.');
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <div className="max-w-5xl">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">AI Controls</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Turn Grok-powered features on/off across the platform.
                        </p>
                        {!canEdit && (
                            <p className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 inline-flex rounded-xl px-3 py-2">
                                Read-only: only Super Admin can change AI settings.
                            </p>
                        )}
                    </div>

                    <button
                        onClick={load}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-sm shadow-lg shadow-blue-600/20"
                    >
                        <span className="material-icons-round text-sm">refresh</span>
                        <span>Refresh</span>
                    </button>
                </div>

                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-bold">
                        {error}
                    </div>
                )}

                <div className="mt-6">
                    {loading || !flags ? (
                        <div className="text-gray-500">Loading AI settings...</div>
                    ) : (
                        <div className="space-y-3">
                            {features.map((f) => {
                                const isEnabled = !!flags[f.key];
                                const isSaving = savingKey === f.key;

                                return (
                                    <div
                                        key={f.key}
                                        className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start justify-between gap-6"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-sm font-black text-gray-900 truncate">{f.title}</h3>
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                        isEnabled
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {isEnabled ? 'ON' : 'OFF'}
                                                </span>
                                                {isSaving && (
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        Saving…
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                                                {f.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                disabled={!canEdit || isSaving}
                                                onClick={() => updateFlag(f.key, true)}
                                                className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                                                    isEnabled
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                } ${!canEdit || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                Enable
                                            </button>
                                            <button
                                                disabled={!canEdit || isSaving}
                                                onClick={() => updateFlag(f.key, false)}
                                                className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                                                    !isEnabled
                                                        ? 'bg-gray-800 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                } ${!canEdit || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                Disable
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs text-slate-600 font-bold">
                        Notes: Changes apply immediately to Grok calls. Some UI elements may require a refresh to fully hide/show.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminAIControlsView;
