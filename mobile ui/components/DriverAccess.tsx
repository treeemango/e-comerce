import React from 'react';

interface DriverAccessProps {
    onLogin: () => void;
    onSignup: () => void;
    onBackToShop: () => void;
}

export const DriverAccess: React.FC<DriverAccessProps> = ({ onLogin, onSignup, onBackToShop }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex flex-col items-center justify-center p-6 text-white">
            {/* Header with Back Button */}
            <button
                onClick={onBackToShop}
                className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition"
            >
                <span className="material-icons text-white">arrow_back</span>
            </button>

            {/* Logo/Icon */}
            <div className="w-24 h-24 rounded-3xl bg-orange-500 flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/20">
                <span className="material-icons text-5xl text-white">local_shipping</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-black mb-3 text-center tracking-tight">Driver Portal</h1>
            <p className="text-slate-300 text-center mb-12 max-w-sm">
                Manage your deliveries, track earnings, and stay connected with your assigned orders.
            </p>

            {/* Features */}
            <div className="w-full max-w-md space-y-4 mb-12">
                {[
                    { icon: 'assignment', title: 'Active Jobs', desc: 'View and manage delivery assignments' },
                    { icon: 'payments', title: 'Instant Payouts', desc: 'Track your daily earnings' },
                    { icon: 'map', title: 'Delivery Zones', desc: 'Navigate your operating areas' }
                ].map(item => (
                    <div key={item.title} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="material-icons text-orange-400">{item.icon}</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-1">{item.title}</h3>
                            <p className="text-sm text-slate-400">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* CTA Buttons */}
            <div className="w-full max-w-md space-y-3">
                <button
                    onClick={onLogin}
                    className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition"
                >
                    Sign In as Driver
                </button>
                <button
                    onClick={onSignup}
                    className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition"
                >
                    Join the Fleet (Sign Up)
                </button>
                <button
                    onClick={onBackToShop}
                    className="w-full py-4 bg-white/10 backdrop-blur-md text-white font-bold rounded-2xl border border-white/20 active:scale-95 transition"
                >
                    Back to Shop
                </button>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-slate-500 mt-8 max-w-sm text-center">
                Driver accounts require verification. Contact support if you need access.
            </p>
        </div>
    );
};
