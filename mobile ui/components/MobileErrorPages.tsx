import React from 'react';

interface MobileErrorPageProps {
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
        title: 'No Internet',
        message: 'Check your connection and try again.',
        emoji: '📡'
    },
    'not-found': {
        icon: 'search_off',
        gradient: 'from-purple-600 to-indigo-600',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        title: 'Page Not Found',
        message: 'This page doesn\'t exist.',
        emoji: '🔍'
    },
    'server-error': {
        icon: 'cloud_off',
        gradient: 'from-red-600 to-orange-600',
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        title: 'Server Error',
        message: 'Something went wrong on our end.',
        emoji: '🔧'
    },
    forbidden: {
        icon: 'lock',
        gradient: 'from-amber-600 to-orange-600',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        title: 'Access Denied',
        message: 'You don\'t have permission.',
        emoji: '🔒'
    },
    timeout: {
        icon: 'timer_off',
        gradient: 'from-blue-600 to-cyan-600',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        title: 'Request Timeout',
        message: 'Server took too long to respond.',
        emoji: '⏱️'
    },
    generic: {
        icon: 'error_outline',
        gradient: 'from-gray-600 to-slate-600',
        iconBg: 'bg-gray-100 dark:bg-gray-800',
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred.',
        emoji: '⚠️'
    }
};

export const MobileErrorPage: React.FC<MobileErrorPageProps> = ({
    type,
    title,
    message,
    onRetry,
    onGoHome,
    onGoBack
}) => {
    const config = errorConfigs[type];

    return (
        <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex flex-col">
            {/* Header */}
            <div className="safe-top bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center">
                {onGoBack && (
                    <button
                        onClick={onGoBack}
                        className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-3 active:scale-95 transition-transform"
                    >
                        <span className="material-icons-round text-gray-600 dark:text-gray-400">arrow_back</span>
                    </button>
                )}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                        <span className="material-icons-round text-white text-sm">storefront</span>
                    </div>
                    <span className="font-black text-gray-900 dark:text-white tracking-tight">JuaExpress</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                {/* Animated Illustration */}
                <div className="relative mb-10">
                    {/* Decorative circles */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-40 h-40 border border-gray-100 dark:border-gray-800 rounded-full animate-ping-slow opacity-20"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border border-dashed border-gray-200 dark:border-gray-800 rounded-full animate-spin-slow"></div>
                    </div>

                    {/* Main icon */}
                    <div className={`relative w-28 h-28 rounded-full ${config.iconBg} flex items-center justify-center shadow-2xl`}>
                        <span className="text-5xl animate-bounce-slow">{config.emoji}</span>
                    </div>

                    {/* Status badge */}
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r ${config.gradient} shadow-lg`}>
                        <span className="material-icons-round text-white text-sm">{config.icon}</span>
                    </div>
                </div>

                {/* Text Content */}
                <h1 className="text-xl font-black text-gray-900 dark:text-white text-center mb-2 tracking-tight">
                    {title || config.title}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs leading-relaxed mb-8">
                    {message || config.message}
                </p>

                {/* Action Buttons */}
                <div className="w-full max-w-xs space-y-3">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className={`w-full py-4 rounded-2xl bg-gradient-to-r ${config.gradient} text-white font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2`}
                        >
                            <span className="material-icons-round text-lg">refresh</span>
                            Try Again
                        </button>
                    )}

                    {onGoHome && (
                        <button
                            onClick={onGoHome}
                            className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2"
                        >
                            <span className="material-icons-round text-lg">home</span>
                            Go Home
                        </button>
                    )}
                </div>

                {/* Help text */}
                <div className="mt-8 flex items-center gap-2 text-gray-400">
                    <span className="material-icons-round text-sm">help_outline</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Need help? Contact support</span>
                </div>
            </div>

            {/* Custom animations */}
            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes ping-slow {
                    0% { transform: scale(1); opacity: 0.3; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2.5s ease-in-out infinite;
                }
                .animate-spin-slow {
                    animation: spin-slow 15s linear infinite;
                }
                .animate-ping-slow {
                    animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
            `}</style>
        </div>
    );
};

// Convenience components
export const MobileOfflinePage: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
    <MobileErrorPage
        type="offline"
        onRetry={onRetry || (() => window.location.reload())}
        onGoHome={() => window.location.href = '/'}
    />
);

export const MobileNotFoundPage: React.FC<{ onGoHome?: () => void; onGoBack?: () => void }> = ({ onGoHome, onGoBack }) => (
    <MobileErrorPage
        type="not-found"
        onGoHome={onGoHome || (() => window.location.href = '/')}
        onGoBack={onGoBack || (() => window.history.back())}
    />
);

export const MobileServerErrorPage: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
    <MobileErrorPage
        type="server-error"
        onRetry={onRetry || (() => window.location.reload())}
        onGoHome={() => window.location.href = '/'}
    />
);

export default MobileErrorPage;
