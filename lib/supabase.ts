/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (
    (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : undefined) ??
    (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) ??
    ''
).trim();

const supabaseAnonKey = (
    (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined) ??
    (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) ??
    ''
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
    // Only throw if we are in a browser
    if (typeof window !== 'undefined') {
        throw new Error(
            'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env and restart the dev server.'
        );
    }
}

// Create client only if we have keys, otherwise export a dummy/null client
// Note: This matches the previous behavior but avoids throwing in Node environments during import
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase client initialized with placeholders. Ensure environment variables are set before use.');
}
