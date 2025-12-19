import React from 'react';

interface DriverLoginViewProps {
    onSignUpClick?: () => void;
    onSignInClick?: () => void;
}

const DriverLoginView: React.FC<DriverLoginViewProps> = ({ onSignUpClick, onSignInClick }) => {
    return (
        <div className="font-display bg-white min-h-screen flex flex-col">
            {/* Driver Center Header */}
            <header className="bg-slate-900 text-white py-4 px-6 lg:px-12 flex justify-between items-center sticky top-0 z-50 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 rounded-xl p-2 shadow-lg shadow-emerald-500/20">
                        <span className="material-icons text-white text-2xl">local_shipping</span>
                    </div>
                    <div>
                        <span className="text-xl font-black tracking-tight block leading-none">JuaExpress Logistics</span>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Delivery Partner Portal</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 lg:gap-8">
                    <button
                        type="button"
                        onClick={onSignInClick}
                        className="text-sm font-black hover:text-emerald-400 transition-colors hidden sm:block"
                    >
                        Log in
                    </button>
                    <button
                        onClick={onSignUpClick}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        Sign up to drive
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <div className="relative bg-slate-900 h-[600px] lg:h-[700px] overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1580674285054-bed31e145f59?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                    alt="Driver Background"
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent"></div>

                <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 h-full flex items-center relative z-10">
                    <div className="w-full lg:w-3/5 text-white">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full mb-8">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Accepting New Partners in Nairobi</span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black mb-8 leading-[1.1] tracking-tight">
                            Drive your own <br />success with <br />
                            <span className="text-emerald-500">Logistics Hub</span>
                        </h1>
                        <p className="text-xl text-slate-400 mb-12 max-w-xl font-medium leading-relaxed">
                            Turn your vehicle into a revenue machine. Earn competitive rates, choose your own hours, and power the commerce of tomorrow.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-12 pb-12">
                            <div className="space-y-2">
                                <span className="text-4xl font-black block text-white tracking-tighter">1 Min</span>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Quick Register</span>
                            </div>
                            <div className="space-y-2 border-l border-slate-800 pl-8">
                                <span className="text-4xl font-black block text-white tracking-tighter">24 Hrs</span>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Fast Approval</span>
                            </div>
                            <div className="space-y-2 border-l border-slate-800 pl-8">
                                <span className="text-4xl font-black block text-white tracking-tighter">Daily</span>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Direct Payouts</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <button onClick={onSignUpClick} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-10 py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/30 text-lg active:scale-95">
                                Start Onboarding
                            </button>
                            <button className="bg-slate-800/80 backdrop-blur-md hover:bg-slate-700 text-white font-black px-10 py-5 rounded-2xl transition-all text-lg active:scale-95 border border-slate-700">
                                How it works
                            </button>
                        </div>
                    </div>

                    {/* Desktop Floating Card */}
                    <div className="hidden lg:block w-[450px] bg-white rounded-[2.5rem] shadow-2xl p-10 ml-auto border border-slate-100 relative group transition-transform hover:-translate-y-2 duration-500">
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/40 rotate-12 transition-transform group-hover:rotate-6">
                            <span className="material-icons text-white text-4xl">payments</span>
                        </div>

                        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Become a Partner</h2>
                        <p className="text-slate-500 font-bold text-sm mb-8 uppercase tracking-widest">Earn up to £1,200 / Week</p>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Your Vehicle Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-600 font-black text-xs transition-all">
                                        <span className="material-icons text-sm">directions_bike</span> Bicycle
                                    </button>
                                    <button className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-400 font-black text-xs hover:bg-white hover:border-slate-200 transition-all">
                                        <span className="material-icons text-sm">electric_moped</span> Motorcycle
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email or Phone</label>
                                <input type="text" placeholder="driver@juaexpress.com" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all" />
                            </div>

                            <button
                                onClick={onSignUpClick}
                                className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-slate-200 text-lg mt-4 active:scale-95"
                            >
                                Continue Application
                            </button>

                            <div className="flex items-center justify-center gap-2 pt-2">
                                <span className="text-[11px] text-slate-400 font-bold">Already a partner?</span>
                                <button onClick={onSignInClick} className="text-[11px] text-emerald-600 font-black uppercase tracking-widest hover:underline decoration-2 underline-offset-4">Log In</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Why Drive Section */}
            <div className="bg-slate-50 py-24 lg:py-32 px-6">
                <div className="max-w-screen-xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4 leading-tight">Why Partner with logistics?</h2>
                        <div className="w-24 h-2 bg-emerald-500 mx-auto rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[
                            { title: 'Total Flexibility', desc: "Decide when and how often you want to deliver. We follow your schedule, not the other way around.", icon: 'event_available', color: 'bg-emerald-100 text-emerald-600' },
                            { title: 'Reliable Payouts', desc: "Get paid daily or weekly directly into your wallet. Clear, transparent earnings for every single trip.", icon: 'account_balance', color: 'bg-blue-100 text-blue-600' },
                            { title: 'Safety Premium', desc: "Every partner is covered by our insurance protocols. We prioritize your safety on the road above all else.", icon: 'verified_user', color: 'bg-orange-100 text-orange-600' }
                        ].map((feature, i) => (
                            <div key={i} className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white hover:border-slate-200 transition-all group">
                                <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110 duration-300`}>
                                    <span className="material-icons text-3xl">{feature.icon}</span>
                                </div>
                                <h3 className="text-2xl font-black mb-4 text-slate-900 tracking-tight">{feature.title}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Steps Section */}
            <div className="py-24 lg:py-32 px-6 bg-white overflow-hidden relative">
                <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-32">
                    <div className="lg:w-1/2">
                        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-12">Three steps to <span className="text-emerald-500">start earning</span></h2>
                        <div className="space-y-12">
                            {[
                                { step: '01', title: 'Register Online', desc: 'Securely upload your ID and vehicle documents in under 1 minute.' },
                                { step: '02', title: 'Get Verified', desc: 'Our team reviews your profile within 24 hours to ensure quality.' },
                                { step: '03', title: 'Hit the Road', desc: 'Download the app, accept your first delivery, and earn immediately.' }
                            ].map((s, i) => (
                                <div key={i} className="flex gap-8 group">
                                    <div className="text-4xl font-black text-emerald-100 group-hover:text-emerald-500 transition-colors leading-none">{s.step}</div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-black text-slate-900 tracking-tight">{s.title}</h4>
                                        <p className="text-slate-500 font-medium">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="lg:w-1/2 relative">
                        <div className="absolute -inset-10 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
                        <img
                            src="https://images.unsplash.com/photo-1594835697621-3e0e7135017e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                            alt="Driver App"
                            className="relative rounded-[3rem] shadow-2xl skew-x-1 hover:skew-x-0 transition-transform duration-700"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="bg-slate-900 py-32 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500"></div>
                <div className="max-w-screen-md mx-auto px-6 relative z-10">
                    <h2 className="text-4xl lg:text-6xl font-black text-white mb-6 tracking-tight">Ready to join the fleet?</h2>
                    <p className="text-slate-400 text-xl mb-12 font-medium">Be part of the specialized force delivering thousands of orders every day.</p>
                    <button
                        onClick={onSignUpClick}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 px-16 rounded-3xl transition-all shadow-2xl shadow-emerald-500/40 text-xl active:scale-95"
                    >
                        Apply to Drive
                    </button>
                    <p className="text-slate-500 font-bold text-xs mt-10 uppercase tracking-widest">Available now in Nairobi, Mombasa, and Kisumu</p>
                </div>
            </div>
        </div>
    );
};

export default DriverLoginView;
