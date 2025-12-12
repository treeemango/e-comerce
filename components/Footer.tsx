import React from 'react';

interface FooterProps {
    onAdminClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onAdminClick }) => {
    return (
        <footer className="bg-[#222] text-white pt-12 pb-8 mt-12 font-display">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Top Section: Links & Seller Banner */}
                <div className="flex flex-col lg:flex-row justify-between gap-8 mb-12 border-b border-gray-700 pb-12">
                    {/* Link Columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 flex-1">
                        {/* Company Info */}
                        <div>
                            <h3 className="font-bold mb-4 text-sm text-white">Company info</h3>
                            <ul className="space-y-2 text-xs text-gray-400">
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">About JuaExpress</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Affiliate & Influencer: Join to Earn</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Contact us</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Company Details</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Careers</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Press</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Sustainability at JuaExpress</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Corporate Responsibility</a></li>
                            </ul>
                        </div>

                        {/* Customer Service */}
                        <div>
                            <h3 className="font-bold mb-4 text-sm text-white">Customer service</h3>
                            <ul className="space-y-2 text-xs text-gray-400">
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Return and refund policy</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Intellectual property policy</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Shipping info</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Report suspicious activity</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Minimum Order Value</a></li>
                            </ul>
                        </div>

                        {/* Help */}
                        <div>
                            <h3 className="font-bold mb-4 text-sm text-white">Help</h3>
                            <ul className="space-y-2 text-xs text-gray-400">
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Support center</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Safety centre</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">JuaExpress purchase protection</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Sitemap</a></li>
                                <li><a href="#" className="hover:text-white hover:underline transition-colors">Sell on JuaExpress</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Seller Banner */}
                    <div className="lg:w-80">
                        <div className="bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer border border-gray-600">
                            <img
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYIVDZy9wPxv65uL8Ar5bua0GpPwC5qKIq96E53cK_jWFjoN0j2d25vQrjenWUXSTo-NRVWRIDxVNJFXwVy5SYXcNfotNRuBnORLw1BQFz8Kb1n6gN6MFupVswRDpYJ6iuEy0_daKuhBx6AFS29bB8ighZ4IoaqUOB3WBsxVZXj0QDLBmSGBwaYnVS2MYIxHSapKxohIr1x2E2rTTfpEOwBfoZOtDK-COnBGAtjgX2NGRCBFKa11KmjIQcFdzlvi48i1xiu7T8Fn4"
                                alt="Sell on JuaExpress"
                                className="w-full h-32 object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                            />
                            <div className="absolute inset-0 p-5 flex flex-col justify-center bg-gradient-to-r from-black/80 to-transparent">
                                <h3 className="font-bold text-sm mb-3 leading-tight">Start Selling to Millions of Buyers on JuaExpress</h3>
                                <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 px-4 rounded w-fit transition-colors shadow-lg shadow-orange-500/30">
                                    Start a Selling Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Section: App Download & Social */}
                <div className="flex flex-col lg:flex-row justify-between gap-12 mb-12">
                    {/* Download App */}
                    <div className="flex-1">
                        <h3 className="font-bold mb-4 text-sm text-white">Download the JuaExpress App</h3>
                        <div className="flex flex-col sm:flex-row gap-8 text-xs text-gray-300 mb-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2"><span className="material-icons text-base opacity-70">notifications_none</span> Price-drop alerts</div>
                                <div className="flex items-center gap-2"><span className="material-icons text-base opacity-70">verified_user</span> Faster & more secure checkout</div>
                                <div className="flex items-center gap-2"><span className="material-icons text-base opacity-70">card_giftcard</span> Exclusive offers</div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2"><span className="material-icons text-base opacity-70">local_shipping</span> Track orders any time</div>
                                <div className="flex items-center gap-2"><span className="material-icons text-base opacity-70">inventory_2</span> Low stock items alerts</div>
                                <div className="flex items-center gap-2"><span className="material-icons text-base opacity-70">confirmation_number</span> Coupons & offers alerts</div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {/* App Store Buttons */}
                            <button className="bg-transparent border border-gray-500 rounded-lg px-3 py-1.5 flex items-center gap-2 hover:bg-gray-800 transition-colors">
                                <span className="material-icons text-3xl">apple</span>
                                <div className="text-left">
                                    <div className="text-[10px] leading-none text-gray-400">Download on the</div>
                                    <div className="text-sm font-bold leading-none mt-0.5">App Store</div>
                                </div>
                            </button>
                            <button className="bg-transparent border border-gray-500 rounded-lg px-3 py-1.5 flex items-center gap-2 hover:bg-gray-800 transition-colors">
                                <span className="material-icons text-3xl">android</span>
                                <div className="text-left">
                                    <div className="text-[10px] leading-none text-gray-400">Get it on</div>
                                    <div className="text-sm font-bold leading-none mt-0.5">Google Play</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Connect with JuaExpress */}
                    <div className="lg:min-w-[200px]">
                        <h3 className="font-bold mb-4 text-sm text-white">Connect with JuaExpress</h3>
                        <div className="flex gap-4">
                            <a href="#" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors">
                                <span className="material-icons text-2xl">camera_alt</span> {/* Instagram placeholder */}
                            </a>
                            <a href="#" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors">
                                <span className="font-bold text-xl">f</span> {/* Facebook placeholder */}
                            </a>
                            <a href="#" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors">
                                <span className="font-bold text-xl">X</span> {/* X placeholder */}
                            </a>
                            <a href="#" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors">
                                <span className="material-icons text-2xl">music_note</span> {/* Tiktok placeholder */}
                            </a>
                            <a href="#" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors">
                                <span className="material-icons text-2xl">smart_display</span> {/* Youtube placeholder */}
                            </a>
                            <a href="#" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors">
                                <span className="font-bold text-xl">P</span> {/* Pinterest placeholder */}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Security & Payments */}
                <div className="border-t border-gray-700 pt-8 mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                        {/* Security */}
                        <div>
                            <h3 className="font-bold mb-3 text-sm text-white">Security certification</h3>
                            <div className="flex flex-wrap gap-2">
                                {['PCI DSS', 'Visa Secure', 'ID Check', 'SafeKey', 'ProtectBuy', 'JCB', 'APWG'].map((cert, i) => (
                                    <div key={i} className="bg-white text-[#222] text-[10px] font-bold px-1.5 py-0.5 rounded-sm border-b-2 border-r-2 border-gray-400">
                                        {cert}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Payments */}
                        <div>
                            <h3 className="font-bold mb-3 text-sm text-white">We accept</h3>
                            <div className="flex flex-wrap gap-2">
                                {['PayPal', 'Visa', 'Mastercard', 'Amex', 'Discover', 'Maestro', 'Diners Club', 'JCB', 'Apple Pay', 'ClearPay', 'Klarna', 'Google Pay'].map((pay, i) => (
                                    <div key={i} className="bg-white text-[#222] text-[10px] font-bold px-1.5 py-0.5 rounded-sm border-b-2 border-r-2 border-gray-400">
                                        {pay}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
                    <button
                        onClick={onAdminClick}
                        className="hover:text-white transition-colors focus:outline-none"
                    >
                        © 2022 - 2025 JuaExpress
                    </button>
                    <div className="flex flex-wrap justify-center gap-6 mt-4 md:mt-0">
                        <a href="#" className="hover:text-white hover:underline transition-colors">Terms of use</a>
                        <a href="#" className="hover:text-white hover:underline transition-colors">Privacy policy</a>
                        <a href="#" className="hover:text-white hover:underline transition-colors flex items-center gap-1">
                            Your privacy choices <span className="bg-blue-500 text-white rounded-full px-1 text-[8px] font-bold">✓</span>
                        </a>
                        <a href="#" className="hover:text-white hover:underline transition-colors">Ad Choices</a>
                    </div>
                </div >

            </div >
        </footer >
    );
};

export default Footer;