import React from 'react';

interface FooterProps {
    onAdminClick?: () => void;
    onDriverClick?: () => void;
    onSellerClick?: () => void;
    onInfoPageClick?: (slug: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onAdminClick, onDriverClick, onSellerClick, onInfoPageClick }) => {
    return (
        <footer className="bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white pt-16 pb-12 mt-12 font-display relative overflow-hidden">
            {/* Gradient orbs */}
            <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-[120px]"></div>
            <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px]"></div>

            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                {/* Top Section: Links & Seller Banner */}
                <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16 border-b border-gray-800/50 pb-16">
                    {/* Link Columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 flex-1">
                        {/* Company Info */}
                        <div>
                            <h3 className="font-black text-sm text-white uppercase tracking-widest mb-5">Company info</h3>
                            <ul className="space-y-3 text-[13px] text-gray-400">
                                <li><button onClick={() => onInfoPageClick?.('about')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">About JuaExpress</button></li>
                                <li><button onClick={() => onInfoPageClick?.('affiliate')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Affiliate & Influencer: Join to Earn</button></li>
                                <li><button onClick={() => onInfoPageClick?.('contact')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Contact us</button></li>
                                <li><button onClick={() => onInfoPageClick?.('company-details')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Company Details</button></li>
                                <li><button onClick={() => onInfoPageClick?.('careers')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Careers</button></li>
                                <li><button onClick={() => onInfoPageClick?.('press')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Press</button></li>
                                <li><button onClick={() => onInfoPageClick?.('sustainability')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Sustainability at JuaExpress</button></li>
                                <li><button onClick={() => onInfoPageClick?.('corporate-responsibility')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Corporate Responsibility</button></li>
                                <li className="pt-3">
                                    <button
                                        onClick={onDriverClick}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all font-black text-[10px] uppercase tracking-widest border border-emerald-500/30 w-fit shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
                                    >
                                        <span className="material-icons-round text-sm">local_shipping</span>
                                        Become a Driver
                                    </button>
                                </li>
                            </ul>
                        </div>

                        {/* Customer Service */}
                        <div>
                            <h3 className="font-black text-sm text-white uppercase tracking-widest mb-5">Customer service</h3>
                            <ul className="space-y-3 text-[13px] text-gray-400">
                                <li><button onClick={() => onInfoPageClick?.('returns')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Return and refund policy</button></li>
                                <li><button onClick={() => onInfoPageClick?.('intellectual-property')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Intellectual property policy</button></li>
                                <li><button onClick={() => onInfoPageClick?.('shipping')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Shipping info</button></li>
                                <li><button onClick={() => onInfoPageClick?.('report-suspicious')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Report suspicious activity</button></li>
                                <li><button onClick={() => onInfoPageClick?.('minimum-order')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Minimum Order Value</button></li>
                            </ul>
                        </div>

                        {/* Help */}
                        <div>
                            <h3 className="font-black text-sm text-white uppercase tracking-widest mb-5">Help</h3>
                            <ul className="space-y-3 text-[13px] text-gray-400">
                                <li><button onClick={() => onInfoPageClick?.('support-center')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Support center</button></li>
                                <li><button onClick={() => onInfoPageClick?.('safety-centre')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Safety centre</button></li>
                                <li><button onClick={() => onInfoPageClick?.('protection')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">JuaExpress purchase protection</button></li>
                                <li><button onClick={() => onInfoPageClick?.('sitemap')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Sitemap</button></li>
                                <li><button onClick={() => onInfoPageClick?.('sell')} className="hover:text-white transition-colors text-left hover:translate-x-1 transform duration-200">Sell on JuaExpress</button></li>
                            </ul>
                        </div>
                    </div>

                    {/* Seller Banner - Premium Card */}
                    <div className="lg:w-96">
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-3xl overflow-hidden relative group cursor-pointer border border-gray-700/50 hover:border-primary/30 transition-all duration-500 shadow-2xl"
                            onClick={onSellerClick}>
                            <img
                                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80"
                                alt="Team collaboration"
                                className="w-full h-40 object-cover object-center opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                            />
                            <div className="absolute inset-0 p-6 flex flex-col justify-center bg-gradient-to-r from-black/90 via-black/70 to-transparent">
                                <h3 className="font-black text-base mb-4 leading-tight text-white">Start Selling to Millions of Buyers on JuaExpress</h3>
                                <button className="bg-gradient-to-r from-primary to-orange-500 hover:from-orange-500 hover:to-primary text-white text-xs font-black py-3 px-6 rounded-xl w-fit transition-all duration-300 shadow-xl shadow-primary/30 uppercase tracking-wider active:scale-95">
                                    Start a Selling Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Section: App Download & Social */}
                <div className="flex flex-col lg:flex-row justify-between gap-16 mb-16">
                    {/* Download App */}
                    <div className="flex-1">
                        <h3 className="font-black text-sm text-white uppercase tracking-widest mb-6">Download the JuaExpress App</h3>
                        <div className="flex flex-col sm:flex-row gap-8 text-[13px] text-gray-400 mb-8">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3"><span className="material-icons-round text-primary text-lg">notifications</span> Price-drop alerts</div>
                                <div className="flex items-center gap-3"><span className="material-icons-round text-emerald-500 text-lg">verified_user</span> Faster & more secure checkout</div>
                                <div className="flex items-center gap-3"><span className="material-icons-round text-purple-500 text-lg">card_giftcard</span> Exclusive offers</div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3"><span className="material-icons-round text-blue-500 text-lg">local_shipping</span> Track orders any time</div>
                                <div className="flex items-center gap-3"><span className="material-icons-round text-amber-500 text-lg">inventory_2</span> Low stock items alerts</div>
                                <div className="flex items-center gap-3"><span className="material-icons-round text-pink-500 text-lg">confirmation_number</span> Coupons & offers alerts</div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            {/* App Store Buttons - Premium */}
                            <button className="bg-white/5 backdrop-blur-md border border-gray-700/50 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-white/10 hover:border-gray-600 transition-all group">
                                <span className="material-icons text-3xl group-hover:scale-110 transition-transform">apple</span>
                                <div className="text-left">
                                    <div className="text-[10px] leading-none text-gray-500 font-medium">Download on the</div>
                                    <div className="text-sm font-black leading-none mt-1">App Store</div>
                                </div>
                            </button>
                            <button className="bg-white/5 backdrop-blur-md border border-gray-700/50 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-white/10 hover:border-gray-600 transition-all group">
                                <span className="material-icons text-3xl text-emerald-500 group-hover:scale-110 transition-transform">android</span>
                                <div className="text-left">
                                    <div className="text-[10px] leading-none text-gray-500 font-medium">Get it on</div>
                                    <div className="text-sm font-black leading-none mt-1">Google Play</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Connect with JuaExpress - Premium Social Icons */}
                    <div className="lg:min-w-[240px]">
                        <h3 className="font-black text-sm text-white uppercase tracking-widest mb-6">Connect with JuaExpress</h3>
                        <div className="flex gap-3">
                            {[
                                { icon: 'camera_alt', color: 'from-pink-500 to-purple-600', glow: 'shadow-pink-500/30', href: 'https://www.instagram.com/juaexpress_online/' },
                                { icon: 'facebook', color: 'from-blue-600 to-blue-700', glow: 'shadow-blue-500/30', isLetter: true, letter: 'f', href: 'https://www.facebook.com/people/Juaexpress/61585676611998/' },
                                { icon: 'close', color: 'from-gray-700 to-gray-800', glow: 'shadow-gray-500/30', isLetter: true, letter: 'X', href: 'https://x.com/juaexpress1' },
                                { icon: 'music_note', color: 'from-gray-900 to-black', glow: 'shadow-gray-500/20', href: 'https://www.tiktok.com/@juaexpress_online?lang=en' },
                                { icon: 'smart_display', color: 'from-red-600 to-red-700', glow: 'shadow-red-500/30', href: 'https://www.youtube.com/@JuaExpress' },
                                { icon: 'push_pin', color: 'from-red-500 to-red-600', glow: 'shadow-red-500/30', isLetter: true, letter: 'P', href: 'https://www.pinterest.com/juaexpress01/' },
                            ].map((social, i) => (
                                <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" className={`w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br ${social.color} shadow-lg ${social.glow} hover:scale-110 active:scale-95 transition-all duration-300`}>
                                    {social.isLetter ? (
                                        <span className="font-black text-lg text-white">{social.letter}</span>
                                    ) : (
                                        <span className="material-icons-round text-white text-xl">{social.icon}</span>
                                    )}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Security & Payments - Premium Cards */}
                <div className="border-t border-gray-800/50 pt-10 mb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">
                        {/* Security */}
                        <div>
                            <h3 className="font-black text-sm text-white uppercase tracking-widest mb-4">Security certification</h3>
                            <div className="flex flex-wrap gap-2">
                                {['PCI DSS', 'Visa Secure', 'ID Check', 'SafeKey', 'ProtectBuy', 'JCB', 'APWG'].map((cert, i) => (
                                    <div key={i} className="bg-white/10 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/20 transition-colors">
                                        {cert}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Payments */}
                        <div>
                            <h3 className="font-black text-sm text-white uppercase tracking-widest mb-4">We accept</h3>
                            <div className="flex flex-wrap gap-2">
                                {['PayPal', 'Visa', 'Mastercard', 'Amex', 'Discover', 'Maestro', 'Diners', 'JCB', 'Apple Pay', 'Klarna', 'Google Pay'].map((pay, i) => (
                                    <div key={i} className="bg-white text-gray-900 text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm hover:scale-105 transition-transform">
                                        {pay}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800/50 pt-8 flex flex-col md:flex-row justify-between items-center text-[13px] text-gray-500">
                    <button
                        onClick={onAdminClick}
                        className="hover:text-white transition-colors focus:outline-none font-medium"
                    >
                        © 2022 - 2025 JuaExpress
                    </button>
                    <div className="flex flex-wrap justify-center gap-6 mt-4 md:mt-0">
                        <button onClick={() => onInfoPageClick?.('terms')} className="hover:text-white transition-colors">Terms of use</button>
                        <button onClick={() => onInfoPageClick?.('privacy')} className="hover:text-white transition-colors">Privacy policy</button>
                        <a href="#" className="hover:text-white transition-colors flex items-center gap-1.5">
                            Your privacy choices <span className="bg-emerald-500 text-white rounded-full px-1.5 py-0.5 text-[8px] font-black">✓</span>
                        </a>
                        <a href="#" className="hover:text-white transition-colors">Ad Choices</a>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default Footer;