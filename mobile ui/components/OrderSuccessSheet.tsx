import React from 'react';

interface OrderSuccessSheetProps {
    onClose: () => void;
    orderNumber?: string;
    email?: string;
}

export const OrderSuccessSheet: React.FC<OrderSuccessSheetProps> = ({
    onClose,
    orderNumber = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    email = 'your email'
}) => {
    return (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-surface-dark flex flex-col animate-in slide-in-from-bottom duration-500">
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-8 relative">
                    <span className="material-icons text-5xl text-green-500 scale-125">check_circle</span>
                    <div className="absolute inset-0 rounded-full border-4 border-green-200 dark:border-green-800 animate-ping opacity-25" />
                </div>

                <h1 className="text-3xl font-black text-black dark:text-white mb-4">You're all set!</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
                    Order <span className="font-bold text-black dark:text-white">#{orderNumber}</span> has been placed successfully. A confirmation email has been sent to {email}.
                </p>

                <div className="w-full bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-6 mb-8 text-left space-y-4 border border-gray-100 dark:border-gray-800">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Next Steps</h3>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
                            <span className="material-icons text-blue-500 text-lg">inventory_2</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-black dark:text-white">Preparing Order</p>
                            <p className="text-[10px] text-gray-500 mt-1">Sellers are packing your items</p>
                        </div>
                    </div>
                    <div className="flex gap-4 opacity-50">
                        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
                            <span className="material-icons text-gray-300 text-lg">local_shipping</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-black dark:text-white">Out for Delivery</p>
                            <p className="text-[10px] text-gray-500 mt-1">Expected: {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-800/50 text-center">
                        <span className="material-icons text-orange-500 text-xl mb-1">star</span>
                        <p className="text-[10px] font-bold text-orange-900 dark:text-orange-200">+120 Points</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 text-center">
                        <span className="material-icons text-blue-500 text-xl mb-1">headset_mic</span>
                        <p className="text-[10px] font-bold text-blue-900 dark:text-blue-200">24/7 Support</p>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-3">
                <button
                    onClick={onClose}
                    className="w-full bg-primary py-5 rounded-full font-black text-white shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                >
                    Track My Order
                </button>
                <button
                    onClick={onClose}
                    className="w-full py-2 text-xs font-bold text-gray-400"
                >
                    Back to Shopping
                </button>
            </div>
        </div>
    );
};

export default OrderSuccessSheet;
