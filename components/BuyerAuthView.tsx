import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } from '../lib/auth';

interface BuyerAuthViewProps {
    onAuthSuccess?: () => void;
    onClose?: () => void;
    authContext?: { view: string };
}

const BuyerAuthView: React.FC<BuyerAuthViewProps> = ({ onAuthSuccess, onClose, authContext }) => {
    const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Save auth context before attempting sign-in (for email auth)
        if (authContext) {
            console.log('🔵 Saving auth context before email sign-in:', authContext);
            sessionStorage.setItem('auth_context', JSON.stringify(authContext));
        }

        try {
            const { user, error: authError } = await signInWithEmail(email, password);

            if (authError) {
                setError(authError.message);
            } else if (user) {
                setSuccess('Successfully signed in!');
                // Only call onAuthSuccess for regular buyer auth, not seller auth
                // Seller redirects are handled by auth state listener
                if (!authContext) {
                    setTimeout(() => {
                        onAuthSuccess?.();
                    }, 500);
                }
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const { user, error: authError } = await signUpWithEmail(email, password, name);

            if (authError) {
                setError(authError.message);
            } else if (user) {
                setSuccess('Account created successfully!');
                setTimeout(() => {
                    onAuthSuccess?.();
                }, 500);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        // Pass authContext (e.g. { view: 'seller-onboarding' }) to save it context before redirect
        const { error } = await signInWithGoogle(authContext);
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: authError } = await resetPassword(email);

            if (authError) {
                setError(authError.message);
            } else {
                setSuccess('Password reset email sent! Check your inbox.');
                setTimeout(() => {
                    setMode('signin');
                    setSuccess('');
                }, 3000);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
            {/* Close button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="fixed top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-50"
                    aria-label="Close"
                >
                    <span className="material-icons text-gray-600">close</span>
                </button>
            )}

            <div className="w-full max-w-md">
                {/* Logo and Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-3">
                            <span className="material-icons text-white text-3xl">shopping_bag</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {mode === 'signup'
                            ? 'Join millions of shoppers'
                            : mode === 'forgot'
                                ? 'Enter your email to reset password'
                                : 'Sign in to your account'}
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                            <span className="material-icons text-red-500 text-sm">error</span>
                            <span className="text-red-700 text-sm">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                            <span className="material-icons text-green-500 text-sm">check_circle</span>
                            <span className="text-green-700 text-sm">{success}</span>
                        </div>
                    )}

                    {/* Google Sign In (Only for signin/signup) */}
                    {mode !== 'forgot' && (
                        <>
                            <button
                                onClick={handleGoogleSignIn}
                                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-lg py-3 px-4 transition-all hover:shadow-md mb-4"
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19.9895 10.1871C19.9895 9.36767 19.9214 8.76973 19.7742 8.14966H10.1992V11.848H15.8195C15.7062 12.7671 15.0943 14.1512 13.7346 15.0813L13.7155 15.2051L16.7429 17.4969L16.9527 17.5174C18.879 15.7789 19.9895 13.221 19.9895 10.1871Z" fill="#4285F4" />
                                    <path d="M10.1993 19.9313C12.9527 19.9313 15.2643 19.0454 16.9527 17.5174L13.7346 15.0813C12.8734 15.6682 11.7176 16.0779 10.1993 16.0779C7.50243 16.0779 5.21352 14.3395 4.39759 11.9366L4.27799 11.9465L1.13003 14.3273L1.08887 14.4391C2.76588 17.6945 6.21061 19.9313 10.1993 19.9313Z" fill="#34A853" />
                                    <path d="M4.39748 11.9366C4.18219 11.3166 4.05759 10.6521 4.05759 9.96565C4.05759 9.27909 4.18219 8.61473 4.38615 7.99466L4.38045 7.8626L1.19304 5.44366L1.08875 5.49214C0.397576 6.84305 0 8.36008 0 9.96565C0 11.5712 0.397576 13.0882 1.08875 14.4391L4.39748 11.9366Z" fill="#FBBC05" />
                                    <path d="M10.1993 3.85336C12.1142 3.85336 13.406 4.66168 14.1425 5.33717L17.0207 2.59107C15.253 0.985496 12.9527 0 10.1993 0C6.2106 0 2.76588 2.23672 1.08887 5.49214L4.38626 7.99466C5.21352 5.59183 7.50242 3.85336 10.1993 3.85336Z" fill="#EB4335" />
                                </svg>
                                <span className="font-semibold text-gray-700">Continue with Google</span>
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-500">or</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Sign In Form */}
                    {mode === 'signin' && (
                        <form onSubmit={handleEmailSignIn} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setMode('forgot')}
                                className="text-sm text-orange-600 hover:text-orange-700 font-semibold"
                            >
                                Forgot password?
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {/* Sign Up Form */}
                    {mode === 'signup' && (
                        <form onSubmit={handleEmailSignUp} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Your name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>
                    )}

                    {/* Forgot Password Form */}
                    {mode === 'forgot' && (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('signin')}
                                className="w-full text-sm text-gray-600 hover:text-gray-800 font-semibold"
                            >
                                Back to Sign In
                            </button>
                        </form>
                    )}

                    {/* Toggle between Sign In and Sign Up */}
                    {mode !== 'forgot' && (
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                                <button
                                    onClick={() => {
                                        setMode(mode === 'signin' ? 'signup' : 'signin');
                                        setError('');
                                        setSuccess('');
                                    }}
                                    className="text-orange-600 hover:text-orange-700 font-bold"
                                >
                                    {mode === 'signin' ? 'Create Account' : 'Sign In'}
                                </button>
                            </p>
                        </div>
                    )}
                </div>

                {/* Terms and Privacy */}
                <p className="text-xs text-gray-500 text-center mt-6">
                    By continuing, you agree to our{' '}
                    <a href="#" className="text-orange-600 hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-orange-600 hover:underline">Privacy Policy</a>
                </p>
            </div>
        </div>
    );
};

export default BuyerAuthView;
