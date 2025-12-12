import React, { useState } from 'react';
import { Product } from '../types';
import { checkout } from '../lib/api';
import { getCurrencySymbol } from '@/lib/currency';

interface CheckoutViewProps {
    cartItems: Product[];
    totalAmount: number;
    onCheckoutComplete: () => void;
    userId?: string | number;
}

const CheckoutView: React.FC<CheckoutViewProps> = ({ cartItems, totalAmount, onCheckoutComplete, userId }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        postcode: '',
        addressLine1: '',
        townCity: '',
        county: '',
        country: 'United Kingdom',
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currencySymbol = getCurrencySymbol(cartItems[0]?.currency || 'USD');
    const deliveryFee = 0;
    const finalTotal = totalAmount + deliveryFee;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setError(null);

        if (!userId) {
            setError('Please sign in before placing your order.');
            setIsProcessing(false);
            return;
        }

        try {
            const shippingAddress = `${formData.addressLine1}, ${formData.townCity}, ${formData.county}, ${formData.postcode}, ${formData.country}`;
            const orderId = await checkout(userId, 'Card', shippingAddress);

            if (orderId) {
                onCheckoutComplete();
            } else {
                setError('Failed to process order. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Shipping Address */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Shipping Address</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country / Region</label>
                                <select
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                >
                                    <option value="United Kingdom">United Kingdom</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        required
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        required
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone number <span className="text-red-500">*</span></label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    required
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                />
                                <p className="text-xs text-orange-500 mt-1">The phone number should have 10 digits and not contain other characters.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postcode <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="postcode"
                                    required
                                    value={formData.postcode}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flat, house number, building, street, etc. <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="addressLine1"
                                    required
                                    value={formData.addressLine1}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Town / City <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="townCity"
                                    required
                                    value={formData.townCity}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">County <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="county"
                                    required
                                    value={formData.county}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white py-2 px-3"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-full shadow-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? 'Processing...' : 'Place Order'}
                                </button>
                            </div>

                            {error && (
                                <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                                    {error}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Payment methods</h2>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 border border-primary bg-orange-50 dark:bg-gray-700 dark:border-primary rounded-md cursor-pointer">
                                <input type="radio" name="payment" defaultChecked className="text-primary focus:ring-primary" />
                                <span className="material-icons text-gray-600 dark:text-gray-300">credit_card</span>
                                <span className="font-medium text-gray-900 dark:text-white">Card</span>
                                <div className="flex gap-1 ml-auto">
                                    <span className="text-xs bg-gray-200 px-1 rounded">VISA</span>
                                    <span className="text-xs bg-gray-200 px-1 rounded">MC</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                <input type="radio" name="payment" className="text-primary focus:ring-primary" />
                                <span className="material-icons text-blue-600">account_balance</span>
                                <span className="font-medium text-gray-900 dark:text-white">PayPal</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                <input type="radio" name="payment" className="text-primary focus:ring-primary" />
                                <span className="material-icons text-black dark:text-white">apple</span>
                                <span className="font-medium text-gray-900 dark:text-white">Apple Pay</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                <input type="radio" name="payment" className="text-primary focus:ring-primary" />
                                <span className="material-icons text-blue-500">google</span>
                                <span className="font-medium text-gray-900 dark:text-white">Google Pay</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sticky top-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Order Summary</h2>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Item(s) total</span>
                                <span>{currencySymbol}{totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Item(s) discount</span>
                                <span className="text-green-600">-£0.00</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Subtotal</span>
                                <span>{currencySymbol}{totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Shipping</span>
                                <span className="text-green-600">FREE</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-lg text-gray-900 dark:text-white">Order Total</span>
                                <span className="font-bold text-xl text-orange-600">{currencySymbol}{finalTotal.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-right">VAT included</p>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isProcessing}
                            className="w-full bg-black text-white py-3 rounded-full font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-md"
                        >
                            Proceed to checkout
                            <span className="material-icons text-sm">arrow_forward</span>
                        </button>

                        <div className="mt-6 space-y-3">
                            <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="material-icons text-green-500 text-sm">security</span>
                                <p>JuaExpress protects your card information</p>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="material-icons text-green-500 text-sm">check_circle</span>
                                <p>JuaExpress follows the Payment Card Industry Data Security Standard (PCI DSS)</p>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="material-icons text-green-500 text-sm">check_circle</span>
                                <p>All data is safeguarded</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CheckoutView;
