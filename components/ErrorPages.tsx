import React from 'react';

interface ErrorPageProps {
    type: 'offline' | 'not-found' | 'server-error' | 'forbidden' | 'timeout' | 'generic';
    title?: string;
    message?: string;
    onRetry?: () => void;
    onGoHome?: () => void;
    onGoBack?: () => void;
}

const errorConfigs = {
    offline: {
        icon: 'wifi_off',
        gradient: 'from-slate-600 to-slate-800',
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        iconColor: 'text-slate-600 dark:text-slate-400',
        title: 'No Internet Connection',
        message: 'Please check your connection and try again. We\'ll be here when you\'re back online.',
        illustration: '📡'
    },
    'not-found': {
        icon: 'search_off',
        gradient: 'from-purple-600 to-indigo-600',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400',
        title: 'Page Not Found',
        message: 'The page you\'re looking for doesn\'t exist or has been moved.',
        illustration: '🔍'
    },
    'server-error': {
        icon: 'cloud_off',
        gradient: 'from-red-600 to-orange-600',
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-600 dark:text-red-400',
        title: 'Server Error',
        message: 'Something went wrong on our end. Our team has been notified.',
        illustration: '🔧'
    },
    forbidden: {
        icon: 'lock',
        gradient: 'from-amber-600 to-orange-600',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        title: 'Access Denied',
        message: 'You don\'t have permission to access this resource.',
        illustration: '🔒'
    },
    timeout: {
        icon: 'timer_off',
        gradient: 'from-blue-600 to-cyan-600',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: 'Request Timeout',
        message: 'The server took too long to respond. Please try again.',
        illustration: '⏱️'
    },
    generic: {
        icon: 'error_outline',
        gradient: 'from-gray-600 to-slate-600',
        iconBg: 'bg-gray-100 dark:bg-gray-800',
        iconColor: 'text-gray-600 dark:text-gray-400',
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred. Please try again later.',
        illustration: '⚠️'
    }
};

export const ErrorPage: React.FC<ErrorPageProps> = ({
    type,
    title,
    message,
    onRetry,
    onGoHome,
    onGoBack
}) => {
    const config = errorConfigs[type];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-6">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/10 to-orange-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full"></div>
            </div>

            <div className="relative z-10 max-w-md w-full text-center">
                {/* Animated illustration */}
                <div className="mb-8 relative">
                    <div className={`w-32 h-32 mx-auto rounded-full ${config.iconBg} flex items-center justify-center shadow-2xl shadow-slate-200/50 dark:shadow-black/30 animate-bounce-slow`}>
                        <span className="text-6xl">{config.illustration}</span>
                    </div>
                    {/* Decorative rings */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-40 h-40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-full animate-spin-slow"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border border-slate-100 dark:border-slate-800/50 rounded-full"></div>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800">
                    {/* Icon badge */}
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} shadow-lg mb-6 -mt-14`}>
                        <span className="material-icons-round text-white text-2xl">{config.icon}</span>
                    </div>

                    <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                        {title || config.title}
                    </h1>

                    <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                        {message || config.message}
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className={`w-full py-4 px-6 rounded-2xl bg-gradient-to-r ${config.gradient} text-white font-bold text-sm uppercase tracking-widest shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2`}
                            >
                                <span className="material-icons-round text-lg">refresh</span>
                                Try Again
                            </button>
                        )}

                        <div className="flex gap-3">
                            {onGoBack && (
                                <button
                                    onClick={onGoBack}
                                    className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-icons-round text-lg">arrow_back</span>
                                    Go Back
                                </button>
                            )}
                            {onGoHome && (
                                <button
                                    onClick={onGoHome}
                                    className="flex-1 py-3 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-icons-round text-lg">home</span>
                                    Home
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Branding */}
                <div className="mt-8 flex items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                        <span className="material-icons-round text-white text-sm">storefront</span>
                    </div>
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-600">JuaExpress</span>
                </div>
            </div>

            {/* Custom CSS for animations */}
            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                }
                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }
            `}</style>
        </div>
    );
};

// Convenience components for common error types
export const OfflinePage: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
    <ErrorPage
        type="offline"
        onRetry={onRetry || (() => window.location.reload())}
        onGoHome={() => window.location.href = '/'}
    />
);

export const NotFoundPage: React.FC<{ onGoHome?: () => void; onGoBack?: () => void }> = ({ onGoHome, onGoBack }) => (
    <ErrorPage
        type="not-found"
        onGoHome={onGoHome || (() => window.location.href = '/')}
        onGoBack={onGoBack || (() => window.history.back())}
    />
);

export const ServerErrorPage: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
    <ErrorPage
        type="server-error"
        onRetry={onRetry || (() => window.location.reload())}
        onGoHome={() => window.location.href = '/'}
    />
);

export default ErrorPage;
