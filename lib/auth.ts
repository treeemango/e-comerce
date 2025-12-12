import { supabase } from './supabase';
import type { User, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';

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
}

// Sign in with email and password
export const signInWithEmail = async (
    email: string,
    password: string
): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Sign in error:', error);
        return { user: null, session: null, error };
    }

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
        .select('id, email, name, avatar_url, role')
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
