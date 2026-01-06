/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = (
    (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : undefined) ??
    (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) ??
    ''
).trim();

const supabaseAnonKey = (
    (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined) ??
    (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) ??
    ''
).trim();

if (!rawSupabaseUrl || !supabaseAnonKey) {
    // Only throw if we are in a browser
    if (typeof window !== 'undefined') {
        throw new Error(
            'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env and restart the dev server.'
        );
    }
}

const isBrowser = typeof window !== 'undefined';
const isViteDev = typeof import.meta.env !== 'undefined' ? Boolean(import.meta.env.DEV) : false;

// Determine if we should use the local dev proxy (/supabase)
// We only do this in a browser in local dev mode.
const useDevProxy = isBrowser && isViteDev && rawSupabaseUrl === '/supabase';

const supabaseUrl = (useDevProxy ? `${window.location.origin}/supabase` : rawSupabaseUrl).trim();

if (isBrowser) {
    console.log(`[Supabase] Initializing client with URL: ${supabaseUrl} (Dev mode: ${isViteDev}, Proxy: ${useDevProxy})`);

    // Safety check for production users hitting relative proxies
    if (!isViteDev && supabaseUrl.startsWith('/') && !supabaseUrl.startsWith('//')) {
        console.error('[Supabase] CRITICAL: Relative URL detected in production environment. This will likely fail to reach Supabase. Ensure VITE_SUPABASE_URL is an absolute URL in production.');
    }
}

// Create client only if we have keys, otherwise export a dummy/null client
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');

if (!rawSupabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase client initialized with placeholders. Ensure environment variables are set before use.');
}
