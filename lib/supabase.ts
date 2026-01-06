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
const useDevProxy = isBrowser && isViteDev;

// In dev (browser), route Supabase traffic via Vite proxy (/supabase) to avoid CORS.
// In prod and non-browser environments, use the configured Supabase URL directly.
const supabaseUrl = (useDevProxy ? `${window.location.origin}/supabase` : rawSupabaseUrl).trim();

// Create client only if we have keys, otherwise export a dummy/null client
// Note: This matches the previous behavior but avoids throwing in Node environments during import
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');

if (!rawSupabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase client initialized with placeholders. Ensure environment variables are set before use.');
}
