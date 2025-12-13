import React from 'react';

interface SellerLoginViewProps {
   onSignUpClick?: () => void;
   onSignInClick?: () => void;
}

const SellerLoginView: React.FC<SellerLoginViewProps> = ({ onSignUpClick, onSignInClick }) => {
   return (
      <div className="font-display bg-white min-h-screen flex flex-col">
         {/* Seller Header */}
         <header className="bg-black text-white py-3 px-6 flex justify-between items-center">
            <div className="flex items-center gap-2">
               <div className="bg-orange-500 rounded p-1">
                  <span className="material-icons text-white">storefront</span>
               </div>
               <span className="text-xl font-bold tracking-tight">JuaExpress Seller Center</span>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium">
               <div className="flex items-center gap-1 cursor-pointer hover:text-gray-300">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Flag_of_the_United_Arab_Emirates.svg/255px-Flag_of_the_United_Arab_Emirates.svg.png" alt="UAE" className="w-5 h-3 object-cover" />
                  <span>United Arab Emirates</span>
               </div>
               <span className="cursor-pointer hover:text-gray-300">EN</span>
               <button type="button" onClick={onSignInClick} className="hover:text-gray-300">Sign in</button>
               <button onClick={onSignUpClick} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full transition-colors">Sign up</button>
            </div>
         </header>

         {/* Hero Section */}
         <div className="relative bg-gray-900 h-[500px] overflow-hidden">
            <img
               src="https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
               alt="Seller Background"
               className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>

            <div className="max-w-screen-2xl mx-auto px-6 h-full flex items-center relative z-10">
               <div className="w-full lg:w-1/2 text-white">
                  <h1 className="text-5xl font-bold mb-6 leading-tight">
                     Start Selling to<br />Millions of Buyers on<br />JuaExpress
                  </h1>
                  <ul className="space-y-3 mb-12">
                     {[
                        'Trending Platform',
                        'Fast First Sale',
                        'Cost-efficient from the Start',
                        'Personalized Seller Support'
                     ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-lg">
                           <span className="material-icons text-orange-500">check_circle</span>
                           {item}
                        </li>
                     ))}
                  </ul>

                  <div className="flex gap-8 text-sm">
                     <div className="border-l-4 border-orange-500 pl-4">
                        <span className="text-3xl font-bold block">1 <span className="text-sm font-normal">Minute</span></span>
                        <span className="text-gray-400">Create your account</span>
                     </div>
                     <div className="border-l-4 border-white pl-4">
                        <span className="text-3xl font-bold block">10 <span className="text-sm font-normal">Minutes</span></span>
                        <span className="text-gray-400">Complete your application</span>
                     </div>
                     <div className="border-l-4 border-white pl-4">
                        <span className="text-3xl font-bold block">1 <span className="text-sm font-normal">Day</span></span>
                        <span className="text-gray-400">Receive application results*</span>
                     </div>
                  </div>
               </div>

               {/* Sign Up Form Card */}
               <div className="hidden lg:block w-[400px] bg-white rounded-lg shadow-2xl p-6 ml-auto mr-12">
                  <h2 className="text-center font-bold text-xl mb-1">Sign up</h2>
                  <div className="flex justify-center mb-6">
                     <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded">0% Commission Fees</span>
                  </div>

                  <div className="bg-orange-500 text-white text-center py-2 text-sm font-bold mb-6 rounded-sm">
                     Invited sellers only now
                  </div>

                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Business location</label>
                        <div className="relative">
                           <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm appearance-none bg-white">
                              <option>United Arab Emirates</option>
                           </select>
                           <span className="material-icons absolute right-2 top-2 text-gray-400 text-sm pointer-events-none">expand_more</span>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Email or phone number</label>
                        <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                        <input type="password" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Confirm password</label>
                        <input type="password" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" />
                     </div>

                     <button
                        onClick={onSignUpClick}
                        type="button"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded transition-colors mt-2"
                     >
                        Continue
                     </button>

                     <p className="text-[10px] text-gray-500 text-center leading-tight mt-2">
                        By continuing, you acknowledge that you have read our <a href="#" className="text-blue-600">Seller Privacy Policy</a>
                     </p>
                     <p className="text-xs text-center mt-4">
                        Already have a JuaExpress seller account?{' '}
                        <a
                           href="#"
                           className="text-orange-500 font-bold"
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

         {/* Features Section */}
         <div className="bg-[#FFFBF5] py-16 px-6">
            <div className="max-w-screen-xl mx-auto">
               <h2 className="text-2xl font-bold text-center mb-12 text-slate-900">Why Sell on JuaExpress?</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                     { title: 'Trending Platform', desc: "Thanks to JuaExpress's global popularity and influence, you'll be able to easily promote your products to more potential customers.", icon: 'trending_up' },
                     { title: 'Fast First Sale', desc: "With JuaExpress's high traffic, 40% of new sellers make their first sale within 30 days.", icon: 'bolt' },
                     { title: 'Cost-efficient from the Start', desc: "Benefit from cost efficiency in store setup, selling, operations and marketing.", icon: 'savings' },
                     { title: 'Personalized Seller Support', desc: "Our dedicated team of specialists is here to support your success. From onboarding to boosting product competitiveness, our experienced team provides the guidance you need every step of the way.", icon: 'support_agent' }
                  ].map((feature, i) => (
                     <div key={i} className="bg-white p-6 rounded-lg border border-orange-100 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-orange-500 rounded flex items-center justify-center flex-shrink-0 text-white shadow-lg shadow-orange-500/30">
                           <span className="material-icons">{feature.icon}</span>
                        </div>
                        <div>
                           <h3 className="font-bold text-lg mb-2 text-slate-900">
                              <span className="text-orange-500">{feature.title.split(' ')[0]}</span> {feature.title.split(' ').slice(1).join(' ')}
                           </h3>
                           <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* FAQ Section */}
         <div className="py-16 px-6 bg-gray-50">
            <div className="max-w-screen-md mx-auto">
               <h2 className="text-2xl font-bold text-center mb-12 text-slate-900">FAQ</h2>
               <div className="space-y-4">
                  {[
                     'How do I become a JuaExpress seller?',
                     'What documentation is required to become a JuaExpress seller?',
                     'Are there any fees to register as a local seller on JuaExpress?',
                     'What types of proof of address are accepted?'
                  ].map((q, i) => (
                     <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center cursor-pointer hover:border-gray-300">
                        <span className="font-bold text-sm text-slate-800">{i + 1}. {q}</span>
                        <span className="material-icons text-gray-400">expand_more</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Bottom CTA */}
         <div className="bg-gray-900 text-white py-20 text-center">
            <h2 className="text-3xl font-bold mb-2">Ready to start selling?</h2>
            <p className="text-gray-400 mb-8">Start your JuaExpress selling journey <span className="text-orange-500 font-bold">now</span>.</p>
            <button onClick={onSignUpClick} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-12 rounded transition-colors shadow-lg shadow-orange-500/20">
               Sign up
            </button>
         </div>

      </div>
   );
};

export default SellerLoginView;