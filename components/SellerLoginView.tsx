import React, { useState } from 'react';
import { FlagIcon } from '@/lib/FlagIcon';

interface SellerLoginViewProps {
   onSignUpClick?: () => void;
   onSignInClick?: () => void;
}

const SellerLoginView: React.FC<SellerLoginViewProps> = ({ onSignUpClick, onSignInClick }) => {
   const [activeCountry, setActiveCountry] = useState('UK');

   const countries = [
      { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
      { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
      { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
      { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
      { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
   ];

   return (
      <div className="font-display bg-white min-h-screen flex flex-col">
         {/* Premium Seller Header */}
         <header className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white py-4 px-6 flex justify-between items-center border-b border-gray-800/50">
            <div className="flex items-center gap-3">
               <div className="w-11 h-11 bg-gradient-to-br from-primary to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                  <span className="material-icons-round text-white text-xl">storefront</span>
               </div>
               <div>
                  <span className="text-lg font-black tracking-tight block">JuaExpress</span>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Seller Center</span>
               </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
               <div className="hidden md:flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors">
                  <FlagIcon
                     emoji={countries.find(c => c.code === activeCountry)?.flag}
                     label={countries.find(c => c.code === activeCountry)?.name || 'Country'}
                     fallbackText={countries.find(c => c.code === activeCountry)?.code || '—'}
                     className="w-5 h-5"
                  />
                  <span className="font-medium">{countries.find(c => c.code === activeCountry)?.name}</span>
                  <span className="material-icons-round text-sm">expand_more</span>
               </div>
               <span className="bg-gray-800/50 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors font-medium">EN</span>
               <button type="button" onClick={onSignInClick} className="font-bold hover:text-primary transition-colors">Sign in</button>
               <button onClick={onSignUpClick} className="bg-gradient-to-r from-primary to-orange-500 hover:from-orange-500 hover:to-primary text-white px-5 py-2 rounded-xl font-bold transition-all shadow-lg shadow-primary/30 hover:scale-105 active:scale-95">
                  Start Selling
               </button>
            </div>
         </header>

         {/* Premium Hero Section */}
         <div className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 min-h-[600px] overflow-hidden">
            {/* Animated gradient orbs */}
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] animate-pulse"></div>
            <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-orange-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>

            <div className="max-w-screen-2xl mx-auto px-6 py-16 flex items-center relative z-10">
               <div className="w-full lg:w-1/2 text-white">
                  {/* Multi-country badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                     {countries.map((country) => (
                        <button
                           key={country.code}
                           onClick={() => setActiveCountry(country.code)}
                           className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${activeCountry === country.code
                              ? 'bg-primary text-white shadow-lg shadow-primary/30'
                              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                              }`}
                        >
                           <FlagIcon emoji={country.flag} label={country.name} fallbackText={country.code} className="w-4 h-4" />
                           <span className="hidden sm:inline">{country.code}</span>
                        </button>
                     ))}
                  </div>

                  <h1 className="text-5xl lg:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
                     Start Selling to<br />
                     <span className="bg-gradient-to-r from-primary via-orange-400 to-amber-500 bg-clip-text text-transparent">Millions of Buyers</span><br />
                     Across UK & Africa
                  </h1>

                  <p className="text-lg text-gray-400 mb-8 max-w-xl leading-relaxed">
                     Join the premier marketplace bridging the UK and Africa. Reach customers across borders with zero upfront costs and dedicated support.
                  </p>

                  <ul className="space-y-4 mb-12">
                     {[
                        { icon: 'trending_up', text: 'Trending Platform', sub: 'Join 10,000+ active sellers' },
                        { icon: 'bolt', text: 'Fast First Sale', sub: '40% sell in first 30 days' },
                        { icon: 'savings', text: '0% Commission Start', sub: 'First 3 months free' },
                        { icon: 'support_agent', text: 'Dedicated Support', sub: '24/7 seller assistance' }
                     ].map((item, i) => (
                        <li key={i} className="flex items-center gap-4 group">
                           <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-orange-500/20 rounded-2xl flex items-center justify-center border border-primary/30 group-hover:bg-primary/30 transition-colors">
                              <span className="material-icons-round text-primary text-xl">{item.icon}</span>
                           </div>
                           <div>
                              <span className="text-lg font-black text-white block">{item.text}</span>
                              <span className="text-sm text-gray-500">{item.sub}</span>
                           </div>
                        </li>
                     ))}
                  </ul>

                  {/* Stats row */}
                  <div className="flex gap-8">
                     {[
                        { value: '1', unit: 'Minute', desc: 'Create account' },
                        { value: '10', unit: 'Minutes', desc: 'Complete setup' },
                        { value: '24', unit: 'Hours', desc: 'Go live' }
                     ].map((stat, i) => (
                        <div key={i} className="relative pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-primary before:to-orange-500 before:rounded-full">
                           <span className="text-4xl font-black text-white block">{stat.value}</span>
                           <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.unit}</span>
                           <span className="text-sm text-gray-400 block mt-1">{stat.desc}</span>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Premium Glassmorphism Sign Up Form */}
               <div className="hidden lg:block w-[420px] ml-auto">
                  <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                     <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-white mb-2">Start Selling Today</h2>
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 px-4 py-1.5 rounded-full border border-emerald-500/30">
                           <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                           <span className="text-emerald-400 text-sm font-bold">0% Commission for 3 Months</span>
                        </div>
                     </div>

                     <div className="bg-gradient-to-r from-primary to-orange-500 text-white text-center py-3 text-sm font-black rounded-xl mb-6 shadow-lg shadow-primary/30">
                        🔥 Limited Time Offer - Join Now!
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label className="block text-xs font-black text-white/70 mb-2 uppercase tracking-widest">Business Location</label>
                           <div className="relative">
                              <select className="w-full bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-3 text-white text-sm appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none">
                                 {countries.map(c => (
                                    <option key={c.code} value={c.code} className="bg-gray-900 text-white">{c.name}</option>
                                 ))}
                              </select>
                              <span className="material-icons-round absolute right-3 top-3 text-white/50 text-sm pointer-events-none">expand_more</span>
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-black text-white/70 mb-2 uppercase tracking-widest">Email or Phone</label>
                           <input type="text" placeholder="your@email.com" className="w-full bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                        <div>
                           <label className="block text-xs font-black text-white/70 mb-2 uppercase tracking-widest">Password</label>
                           <input type="password" placeholder="••••••••" className="w-full bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>

                        <button
                           onClick={onSignUpClick}
                           type="button"
                           className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-orange-500 hover:to-primary text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] text-sm uppercase tracking-widest mt-2"
                        >
                           Create Seller Account →
                        </button>

                        <p className="text-[10px] text-white/40 text-center leading-relaxed">
                           By continuing, you agree to our <a href="#" className="text-primary hover:underline">Terms</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                        </p>
                        <p className="text-sm text-center text-white/60">
                           Already a seller?{' '}
                           <a
                              href="#"
                              className="text-primary font-black hover:underline"
                              onClick={(e) => {
                                 e.preventDefault();
                                 if (onSignInClick) onSignInClick();
                              }}
                           >
                              Sign in
                           </a>
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Trusted By Section */}
         <div className="bg-white py-8 border-b border-gray-100">
            <div className="max-w-screen-xl mx-auto px-6">
               <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-[0.3em] mb-6">Trusted by thousands of sellers worldwide</p>
               <div className="flex justify-center items-center gap-12 opacity-40">
                  {['payments', 'verified_user', 'local_shipping', 'support_agent', 'analytics'].map((icon, i) => (
                     <span key={i} className="material-icons-round text-4xl text-gray-400">{icon}</span>
                  ))}
               </div>
            </div>
         </div>

         {/* Premium Features Section */}
         <div className="bg-gradient-to-b from-gray-50 to-white py-24 px-6">
            <div className="max-w-screen-xl mx-auto">
               <div className="text-center mb-16">
                  <span className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4 block">Why Choose Us</span>
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Why Sell on JuaExpress?</h2>
                  <p className="text-gray-500 max-w-2xl mx-auto">Join the premier marketplace bridging the UK and Africa with high-trust logistics and millions of active buyers.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                     { title: 'Trending Platform', desc: "Thanks to JuaExpress's global reach across UK and 9 African countries, promote your products to millions of potential customers.", icon: 'trending_up', gradient: 'from-blue-500 to-indigo-600' },
                     { title: 'Fast First Sale', desc: "With our high traffic and smart algorithms, 40% of new sellers make their first sale within 30 days of joining.", icon: 'bolt', gradient: 'from-amber-500 to-orange-600' },
                     { title: 'Cost-efficient Start', desc: "Zero upfront fees, 0% commission for first 3 months, and affordable selling plans to maximize your profits.", icon: 'savings', gradient: 'from-emerald-500 to-teal-600' },
                     { title: 'Dedicated Support', desc: "Our experienced team provides 24/7 seller support, from onboarding to boosting your product competitiveness.", icon: 'support_agent', gradient: 'from-purple-500 to-pink-600' }
                  ].map((feature, i) => (
                     <div key={i} className="group bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500">
                        <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform`}>
                           <span className="material-icons-round text-2xl">{feature.icon}</span>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-3">
                           <span className="text-primary">{feature.title.split(' ')[0]}</span> {feature.title.split(' ').slice(1).join(' ')}
                        </h3>
                        <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Multi-Country Section */}
         <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 py-20 px-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>
            <div className="max-w-screen-xl mx-auto text-center relative z-10">
               <span className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4 block">Global Reach</span>
               <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Sell Across 9+ Countries</h2>
               <p className="text-gray-400 mb-12 max-w-2xl mx-auto">One platform, unlimited reach. List your products and sell to customers across the UK and African individual markets.</p>

               <div className="flex flex-wrap justify-center gap-4">
                  {[
                     { code: 'UK', emoji: '🇬🇧', name: 'United Kingdom' },
                     { code: 'KE', emoji: '🇰🇪', name: 'Kenya' },
                     { code: 'NG', emoji: '🇳🇬', name: 'Nigeria' },
                     { code: 'ZA', emoji: '🇿🇦', name: 'South Africa' },
                     { code: 'GH', emoji: '🇬🇭', name: 'Ghana' },
                     { code: 'UG', emoji: '🇺🇬', name: 'Uganda' },
                     { code: 'TZ', emoji: '🇹🇿', name: 'Tanzania' },
                     { code: 'RW', emoji: '🇷🇼', name: 'Rwanda' },
                     { code: 'ET', emoji: '🇪🇹', name: 'Ethiopia' },
                  ].map((country, i) => (
                     <div key={i} className="bg-white/10 backdrop-blur px-6 py-4 rounded-2xl border border-white/10 hover:border-primary/50 hover:bg-white/20 transition-all cursor-pointer group">
                        <div className="w-8 h-8 mx-auto mb-2 group-hover:scale-125 transition-transform">
                           <FlagIcon emoji={country.emoji} label={country.name} fallbackText={country.code} className="w-8 h-8" />
                        </div>
                        <span className="text-white font-bold text-sm">{country.name}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* FAQ Section */}
         <div className="py-20 px-6 bg-white">
            <div className="max-w-screen-md mx-auto">
               <div className="text-center mb-12">
                  <span className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4 block">Questions?</span>
                  <h2 className="text-3xl font-black text-gray-900">Frequently Asked Questions</h2>
               </div>
               <div className="space-y-4">
                  {[
                     { q: 'How do I become a JuaExpress seller?', a: 'Sign up with your email, complete your business profile, and start listing products. The process takes about 10 minutes.' },
                     { q: 'What documentation is required?', a: 'Valid ID, proof of address, and business registration (for business accounts). Individual sellers can start with just ID verification.' },
                     { q: 'Are there any fees to register?', a: 'Registration is completely free! We offer 0% commission for your first 3 months, then competitive rates starting at 5%.' },
                     { q: 'Which countries can I sell to?', a: 'You can sell to customers across UK, Kenya, Nigeria, South Africa, Ghana, Uganda, Tanzania, Rwanda, and Ethiopia.' }
                  ].map((faq, i) => (
                     <details key={i} className="group bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                        <summary className="flex justify-between items-center cursor-pointer p-6 font-bold text-gray-900 hover:bg-gray-100 transition-colors">
                           <span>{i + 1}. {faq.q}</span>
                           <span className="material-icons-round text-gray-400 group-open:rotate-180 transition-transform">expand_more</span>
                        </summary>
                        <div className="px-6 pb-6 text-gray-600 leading-relaxed">{faq.a}</div>
                     </details>
                  ))}
               </div>
            </div>
         </div>

         {/* Bottom CTA */}
         <div className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 py-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
               <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Ready to Start Selling?</h2>
               <p className="text-white/80 mb-8 text-lg">Join 10,000+ sellers growing their business on JuaExpress</p>
               <button onClick={onSignUpClick} className="bg-white text-gray-900 font-black py-4 px-12 rounded-2xl transition-all shadow-2xl hover:scale-105 active:scale-95 text-sm uppercase tracking-widest">
                  Create Free Account →
               </button>
            </div>
         </div>
      </div>
   );
};

export default SellerLoginView;