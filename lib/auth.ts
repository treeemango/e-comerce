import { supabase } from './supabase';
import type { User, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';

// ============================================================================
// RATE LIMITING - Brute Force Protection
// ============================================================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_KEY = 'login_rate_limit';

interface RateLimitData {
    attempts: number;
    lastAttempt: number;
    lockedUntil: number | null;
}

const getRateLimitData = (): RateLimitData => {
    if (typeof window === 'undefined') {
        return { attempts: 0, lastAttempt: 0, lockedUntil: null };
    }
    try {
        const data = localStorage.getItem(RATE_LIMIT_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        // Ignore parse errors
    }
    return { attempts: 0, lastAttempt: 0, lockedUntil: null };
};

const setRateLimitData = (data: RateLimitData): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
};

const clearRateLimitData = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(RATE_LIMIT_KEY);
};

export const checkLoginRateLimit = (): { allowed: boolean; remainingAttempts: number; lockoutEndTime: number | null } => {
    const data = getRateLimitData();
    const now = Date.now();

    // Check if currently locked out
    if (data.lockedUntil && now < data.lockedUntil) {
        return {
            allowed: false,
            remainingAttempts: 0,
            lockoutEndTime: data.lockedUntil
        };
    }

    // Reset if lockout has expired
    if (data.lockedUntil && now >= data.lockedUntil) {
        clearRateLimitData();
        return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS, lockoutEndTime: null };
    }

    // Reset attempts if last attempt was more than lockout duration ago
    if (now - data.lastAttempt > LOCKOUT_DURATION_MS) {
        clearRateLimitData();
        return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS, lockoutEndTime: null };
    }

    return {
        allowed: data.attempts < MAX_LOGIN_ATTEMPTS,
        remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - data.attempts),
        lockoutEndTime: null
    };
};

export const recordFailedLoginAttempt = (): { locked: boolean; lockoutEndTime: number | null; remainingAttempts: number } => {
    const data = getRateLimitData();
    const now = Date.now();

    data.attempts += 1;
    data.lastAttempt = now;

    if (data.attempts >= MAX_LOGIN_ATTEMPTS) {
        data.lockedUntil = now + LOCKOUT_DURATION_MS;
        setRateLimitData(data);
        return { locked: true, lockoutEndTime: data.lockedUntil, remainingAttempts: 0 };
    }

    setRateLimitData(data);
    return { locked: false, lockoutEndTime: null, remainingAttempts: MAX_LOGIN_ATTEMPTS - data.attempts };
};

export const recordSuccessfulLogin = (): void => {
    clearRateLimitData();
};

export const formatLockoutTime = (lockoutEndTime: number): string => {
    const remainingMs = lockoutEndTime - Date.now();
    if (remainingMs <= 0) return '0 seconds';
    const minutes = Math.ceil(remainingMs / 60000);
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
};

// ============================================================================

export interface AuthResponse {
    user: User | null;
    session: Session | null;
    error: SupabaseAuthError | null;
}

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    role?: string;
    account_status?: string;
    banned_until?: string;
}

export const isAccountBanned = (profile: { account_status?: string; banned_until?: string } | null): boolean => {
    if (!profile) return false;
    if (profile.account_status === 'banned') return true;
    if (!profile.banned_until) return false;

    const bannedUntilMs = Date.parse(profile.banned_until);
    return Number.isFinite(bannedUntilMs) && bannedUntilMs > Date.now();
};

// --- Google One Tap helpers ---
let googleScriptPromise: Promise<void> | null = null;

const loadGoogleScript = () => {
    if (googleScriptPromise) return googleScriptPromise;
    googleScriptPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('Window not available'));
            return;
        }
        const existing = document.querySelector('script[data-google-one-tap]');
        if (existing) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleOneTap = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google One Tap script'));
        document.head.appendChild(script);
    });
    return googleScriptPromise;
};

export const initGoogleOneTap = async (
    clientId: string,
    options?: {
        context?: { view: string };
        onSuccess?: (user: User | null) => void;
        onError?: (err: Error) => void;
    }
) => {
    if (!clientId || typeof window === 'undefined') return () => { };

    try {
        await loadGoogleScript();
        // Persist auth intent if provided
        if (options?.context) {
            sessionStorage.setItem('auth_context', JSON.stringify(options.context));
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const googleObj = (window as any).google;
        if (!googleObj?.accounts?.id) throw new Error('Google One Tap not available');

        googleObj.accounts.id.initialize({
            client_id: clientId,
            callback: async (credentialResponse: { credential?: string }) => {
                if (!credentialResponse?.credential) return;
                try {
                    const { data, error } = await supabase.auth.signInWithIdToken({
                        provider: 'google',
                        token: credentialResponse.credential,
                    });
                    if (error) throw error;
                    options?.onSuccess?.(data.user);
                } catch (err: any) {
                    console.error('One Tap sign-in failed', err);
                    options?.onError?.(err instanceof Error ? err : new Error('One Tap sign-in failed'));
                }
            },
            cancel_on_tap_outside: true,
            context: 'signin',
        });

        googleObj.accounts.id.prompt();

        return () => {
            try {
                googleObj.accounts.id.cancel();
            } catch (e) {
                // ignore
            }
        };
    } catch (err: any) {
        console.error('Failed to init One Tap', err);
        options?.onError?.(err instanceof Error ? err : new Error('Failed to init One Tap'));
        return () => { };
    }
};

// Sign in with email and password (with rate limiting)
export const signInWithEmail = async (
    email: string,
    password: string
): Promise<AuthResponse> => {
    // Check rate limit before attempting login
    const rateLimit = checkLoginRateLimit();
    if (!rateLimit.allowed) {
        const waitTime = formatLockoutTime(rateLimit.lockoutEndTime!);
        return {
            user: null,
            session: null,
            error: {
                message: `Too many failed login attempts. Please try again in ${waitTime}.`,
                status: 429,
                name: 'RateLimitError'
            } as SupabaseAuthError
        };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        // Record failed attempt
        const result = recordFailedLoginAttempt();
        let errorMessage = error.message;

        if (result.locked) {
            errorMessage = `Account temporarily locked due to too many failed attempts. Try again in ${formatLockoutTime(result.lockoutEndTime!)}`;
        } else if (result.remainingAttempts <= 2) {
            errorMessage = `${error.message} (${result.remainingAttempts} attempts remaining)`;
        }

        console.error('Sign in error:', error);
        return {
            user: null,
            session: null,
            error: { ...error, message: errorMessage } as SupabaseAuthError
        };
    }

    // Clear rate limit on successful login
    recordSuccessfulLogin();

    return { user: data.user, session: data.session, error: null };
};

// Sign up with email and password
export const signUpWithEmail = async (
    email: string,
    password: string,
    name?: string
): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: name || email.split('@')[0],
                role: 'buyer', // Default role for new signups
            },
        },
    });

    if (error) {
        console.error('Sign up error:', error);
        return { user: null, session: null, error };
    }

    // The trigger function in your SQL will automatically create the user profile
    // withbuyer role in public.users table

    return { user: data.user, session: data.session, error: null };
};

// Sign in with Google
export const signInWithGoogle = async (context?: { view: string }): Promise<{ error: SupabaseAuthError | null }> => {
    // Save context before redirecting to OAuth
    if (context) {
        console.log('🔵 Saving auth context before OAuth:', context);
        sessionStorage.setItem('auth_context', JSON.stringify(context));
        console.log('🔵 Saved to sessionStorage:', sessionStorage.getItem('auth_context'));
    }

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });

    if (error) {
        console.error('Google sign in error:', error);
    }

    return { error };
};

// Sign out
export const signOut = async (): Promise<{ error: SupabaseAuthError | null }> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Sign out error:', error);
    }

    return { error };
};

// Reset password
export const resetPassword = async (email: string): Promise<{ error: SupabaseAuthError | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
        console.error('Password reset error:', error);
    }

    return { error };
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

// Get current session
export const getCurrentSession = async (): Promise<Session | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

// Subscribe to auth state changes
export const onAuthStateChange = (
    callback: (event: string, session: Session | null) => void
) => {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
};

// Get user profile from public.users table
export const getUserProfile = async (userId: string): Promise<AuthUser | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, name, avatar_url, role, account_status, banned_until')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return data as AuthUser;
};

// Update user profile
export const updateUserProfile = async (
    userId: string,
    updates: Partial<{ name: string; avatar_url: string }>
): Promise<{ error: any }> => {
    const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

    if (error) {
        console.error('Error updating user profile:', error);
    }

    return { error };
};
