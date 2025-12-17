import React from 'react';

interface SellerAccessProps {
  onLogin: () => void;
  onSignup: () => void;
  onBackToShop?: () => void;
}

export const SellerAccess: React.FC<SellerAccessProps> = ({ onLogin, onSignup, onBackToShop }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white pb-24">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.6),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.5),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(94,234,212,0.35),transparent_40%)]" />
        <div className="relative px-5 pt-14 pb-10 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide w-fit border border-white/15">
            <span className="material-icons-outlined text-sm">storefront</span>
            Seller hub
          </div>
          <h1 className="text-3xl font-black leading-tight">Run your shop from your phone.</h1>
          <p className="text-sm text-white/80 max-w-[320px]">
            Log in to the same dashboard you use on web, manage orders, payouts, and product launches without leaving mobile.
          </p>
          <div className="flex gap-2 text-xs text-white/70">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/10">
              <span className="material-icons-outlined text-sm">bolt</span>
              Real-time alerts
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/10">
              <span className="material-icons-outlined text-sm">payments</span>
              Payout tracking
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={onLogin} className="w-full px-4 py-3 rounded-xl bg-white text-black font-bold shadow-[0_15px_40px_rgba(255,255,255,0.18)] hover:translate-y-[-1px] transition-transform">
              Log in
            </button>
            <button onClick={onSignup} className="w-full px-4 py-3 rounded-xl border border-white/30 text-white font-bold bg-white/5 hover:bg-white/10 transition-colors">
              Become a seller
            </button>
          </div>
          <button onClick={onBackToShop} className="self-start inline-flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors">
            <span className="material-icons-outlined text-sm">arrow_back_ios_new</span>
            Continue shopping
          </button>
        </div>
      </div>

      <div className="px-5 space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Payouts</p>
              <p className="text-2xl font-black">$18,420</p>
            </div>
            <span className="material-icons-outlined text-3xl text-emerald-300">insights</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/75">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide">This week</p>
              <p className="text-lg font-bold">$4,210</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide">Next payout</p>
              <p className="text-lg font-bold">Thu, 4 PM</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[{ icon: 'inventory_2', label: 'Add products' }, { icon: 'auto_graph', label: 'View analytics' }, { icon: 'support_agent', label: 'Talk to support' }, { icon: 'payments', label: 'Set payouts' }].map((item) => (
            <div key={item.icon} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-start gap-2 text-white/80">
              <span className="material-icons-outlined text-lg text-white">{item.icon}</span>
              <div className="text-xs font-semibold leading-tight">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
