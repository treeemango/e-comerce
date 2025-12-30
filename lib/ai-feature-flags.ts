import { supabase } from './supabase';

export type AIFeatureKey =
    | 'listing_assistant'
    | 'product_questions'
    | 'image_matching'
    | 'seller_chat_reply'
    | 'product_explain';

export type AIFeatureFlags = Record<AIFeatureKey, boolean>;

const DEFAULT_FLAGS: AIFeatureFlags = {
    listing_assistant: true,
    product_questions: true,
    image_matching: true,
    seller_chat_reply: true,
    product_explain: true
};

const STORAGE_KEY = 'ai_feature_flags_cache_v1';
const CACHE_TTL_MS = 30_000;

let inMemoryCache: { flags: AIFeatureFlags; fetchedAt: number } | null = null;
let inFlight: Promise<AIFeatureFlags> | null = null;

function mergeWithDefaults(partial: Partial<Record<string, boolean>>): AIFeatureFlags {
    return {
        ...DEFAULT_FLAGS,
        listing_assistant: partial.listing_assistant ?? DEFAULT_FLAGS.listing_assistant,
        product_questions: partial.product_questions ?? DEFAULT_FLAGS.product_questions,
        image_matching: partial.image_matching ?? DEFAULT_FLAGS.image_matching,
        seller_chat_reply: partial.seller_chat_reply ?? DEFAULT_FLAGS.seller_chat_reply,
        product_explain: partial.product_explain ?? DEFAULT_FLAGS.product_explain
    };
}

function readLocalCache(): { flags: AIFeatureFlags; fetchedAt: number } | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.flags || typeof parsed.fetchedAt !== 'number') return null;
        return { flags: mergeWithDefaults(parsed.flags), fetchedAt: parsed.fetchedAt };
    } catch {
        return null;
    }
}

function writeLocalCache(flags: AIFeatureFlags) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ flags, fetchedAt: Date.now() })
        );
    } catch {
        // ignore
    }
}

export async function fetchAIFeatureFlags(options?: { force?: boolean }): Promise<AIFeatureFlags> {
    const force = options?.force === true;
    const now = Date.now();

    if (!force && inMemoryCache && now - inMemoryCache.fetchedAt < CACHE_TTL_MS) {
        return inMemoryCache.flags;
    }

    const local = !force ? readLocalCache() : null;
    if (!force && local && now - local.fetchedAt < CACHE_TTL_MS) {
        inMemoryCache = local;
        return local.flags;
    }

    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            const { data, error } = await supabase
                .from('ai_feature_flags')
                .select('key, enabled');

            if (error) {
                // If the table doesn't exist or RLS blocks it, fall back to defaults.
                const flags = mergeWithDefaults({});
                inMemoryCache = { flags, fetchedAt: now };
                writeLocalCache(flags);
                return flags;
            }

            const partial: Partial<Record<string, boolean>> = {};
            for (const row of data ?? []) {
                if (!row?.key) continue;
                partial[row.key] = !!row.enabled;
            }

            const flags = mergeWithDefaults(partial);
            inMemoryCache = { flags, fetchedAt: now };
            writeLocalCache(flags);
            return flags;
        } catch {
            const flags = mergeWithDefaults({});
            inMemoryCache = { flags, fetchedAt: now };
            writeLocalCache(flags);
            return flags;
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
}

export async function isAIFeatureEnabled(feature: AIFeatureKey): Promise<boolean> {
    const flags = await fetchAIFeatureFlags();
    return !!flags[feature];
}

export async function assertAIFeatureEnabled(feature: AIFeatureKey, message?: string) {
    const enabled = await isAIFeatureEnabled(feature);
    if (!enabled) {
        throw new Error(message ?? 'This AI feature is currently turned off by the platform admin.');
    }
}

export function clearAIFeatureFlagsCache() {
    inMemoryCache = null;
    inFlight = null;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}
