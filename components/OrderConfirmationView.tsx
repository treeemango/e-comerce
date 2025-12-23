import React from 'react';

interface OrderConfirmationViewProps {
    onContinueShopping: () => void;
    orderNumber?: string;
    customerEmail?: string;
}

const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
    onContinueShopping,
    orderNumber = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    customerEmail = 'your email'
}) => {
    return (
        <div className="max-w-3xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 relative">
                    <span className="material-icons text-5xl text-green-600 scale-125">check_circle</span>
                    <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-25" />
                </div>
                <h1 className="text-4xl font-black text-black mb-4 tracking-tight">Order Confirmed!</h1>
                <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
                    Thank you for your purchase. We've sent a confirmation email to <span className="font-bold text-black">{customerEmail}</span>.
                </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 overflow-hidden mb-8">
                <div className="p-8 md:p-12">
                    <div className="grid md:grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Order Details</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center group">
                                    <span className="text-sm text-gray-500 font-medium">Order Number</span>
                                    <span className="text-sm font-black text-black bg-gray-50 px-3 py-1 rounded-full group-hover:bg-primary/10 transition-colors uppercase">{orderNumber}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500 font-medium">Estimated Delivery</span>
                                    <span className="text-sm font-bold text-black">3-5 Business Days</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500 font-medium">Shipping Method</span>
                                    <span className="text-sm font-bold text-black">Standard Shipping</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Next Steps</h3>
                            <ul className="space-y-6">
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                                        <span className="material-icons text-sm">inventory_2</span>
                                    </div>
                                    <div className="text-sm">
                                        <p className="font-bold text-black">Order Processing</p>
                                        <p className="text-gray-500 leading-relaxed">We're getting your items ready for shipment.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4 opacity-50">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
                                        <span className="material-icons text-sm">local_shipping</span>
                                    </div>
                                    <div className="text-sm">
                                        <p className="font-bold text-black">Shipped</p>
                                        <p className="text-gray-500">You'll receive a tracking number via email.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50/50 border-t border-gray-100 p-8 text-center">
                    <p className="text-sm text-gray-500 mb-6">Need help with your order? Visit our <a href="#" className="text-primary font-bold hover:underline">Help Center</a> or contact support.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={onContinueShopping}
                            className="bg-black text-white px-8 py-4 rounded-full font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Continue Shopping
                        </button>
                        <button className="bg-white text-black border-2 border-gray-200 px-8 py-4 rounded-full font-black text-sm hover:border-black transition-all">
                            Track Order
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 text-center group cursor-pointer hover:bg-orange-100 transition-colors">
                    <span className="material-icons text-orange-500 text-3xl mb-3 group-hover:scale-110 transition-transform">star</span>
                    <p className="text-xs font-black text-orange-900 uppercase tracking-widest mb-1">Loyalty Points</p>
                    <p className="text-sm text-orange-700">+150 points earned</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center group cursor-pointer hover:bg-blue-100 transition-colors">
                    <span className="material-icons text-blue-500 text-3xl mb-3 group-hover:scale-110 transition-transform">verified_user</span>
                    <p className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">Guaranteed</p>
                    <p className="text-sm text-blue-700">30-day money back</p>
                </div>
                <div className="bg-green-50 p-6 rounded-3xl border border-green-100 text-center group cursor-pointer hover:bg-green-100 transition-colors">
                    <span className="material-icons text-green-500 text-3xl mb-3 group-hover:scale-110 transition-transform">eco</span>
                    <p className="text-xs font-black text-green-900 uppercase tracking-widest mb-1">Climate Conscious</p>
                    <p className="text-sm text-green-700">Carbon neutral delivery</p>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmationView;
