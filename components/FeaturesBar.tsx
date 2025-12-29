import React from 'react';

interface FeaturesBarProps {
  onClick?: () => void;
}

const FeaturesBar: React.FC<FeaturesBarProps> = ({ onClick }) => {
  return (
    <section className="mb-10 group">
      <button
        onClick={onClick}
        className="w-full bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950 rounded-[2.5rem] p-6 lg:p-10 shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-zinc-800 hover:border-primary/30 transition-all duration-500 overflow-hidden relative text-left"
      >
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:bg-primary/10 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -ml-20 -mb-20 group-hover:bg-blue-500/10 transition-all duration-700" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white shadow-lg shadow-primary/20 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              <span className="material-icons text-4xl">verified</span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Elite Trust Quality</h2>
                <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Escrow Verified
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-icons text-lg text-orange-400">star</span>
                  ))}
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800" />
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">4.9/5 Based on 50K+ reviews</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8 md:gap-12 pl-4 md:pl-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                <span className="material-icons">local_shipping</span>
              </div>
              <div>
                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Free Shipping</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pan-African Network</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                <span className="material-icons">shield</span>
              </div>
              <div>
                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Escrow Secure</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Funds Protected</p>
              </div>
            </div>

            <div className="flex items-center gap-4 group/cta">
              <div className="flex -space-x-3">
                {[12, 23, 34, 45].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-white dark:border-zinc-900 bg-gray-200 overflow-hidden shadow-premium transition-transform hover:-translate-y-1">
                    <img src={`https://i.pravatar.cc/100?img=${i}`} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-[0.2em] group-hover/cta:translate-x-1 transition-transform">
                Read Community Voices
                <span className="material-icons">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>
      </button>
    </section>
  );
};

export default FeaturesBar;