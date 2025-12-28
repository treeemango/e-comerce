import React, { useState, useEffect } from 'react';
import { SUPPORTED_CURRENCIES, setUserCurrency } from '@/lib/currency';

interface CountrySelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onCurrencyChange: (currency: string) => void;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ isOpen, onClose, onCurrencyChange }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCurrencies = SUPPORTED_CURRENCIES.filter(currency =>
        currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        currency.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCurrencySelect = (currencyCode: string) => {
        setUserCurrency(currencyCode);
        onCurrencyChange(currencyCode);
        onClose();
        // Refresh page to update all prices
        window.location.reload();
    };

    const popularCurrencies = ['USD', 'EUR', 'GBP', 'KES', 'NGN', 'GHS', 'ZAR', 'TZS'];

    const popularFiltered = filteredCurrencies.filter(c => popularCurrencies.includes(c.code));
    const otherFiltered = filteredCurrencies.filter(c => !popularCurrencies.includes(c.code));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Select Your Currency
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <span className="material-icons">close</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search currencies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <span className="material-icons absolute left-3 top-2.5 text-gray-400 text-sm">
                            search
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-96">
                    {/* Popular Currencies */}
                    {popularFiltered.length > 0 && (
                        <div className="p-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                Popular Currencies
                            </h3>
                            <div className="space-y-2">
                                {popularFiltered.map((currency) => (
                                    <button
                                        key={currency.code}
                                        onClick={() => handleCurrencySelect(currency.code)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <span className="text-2xl">{currency.flag}</span>
                                        <div className="flex-1 text-left">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {currency.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {currency.code}
                                            </div>
                                        </div>
                                        <span className="text-gray-400">
                                            <span className="material-icons text-sm">chevron_right</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Other Currencies */}
                    {otherFiltered.length > 0 && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                All Currencies
                            </h3>
                            <div className="space-y-1">
                                {otherFiltered.map((currency) => (
                                    <button
                                        key={currency.code}
                                        onClick={() => handleCurrencySelect(currency.code)}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <span className="text-lg">{currency.flag}</span>
                                        <div className="flex-1 text-left">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {currency.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {currency.code}
                                            </div>
                                        </div>
                                        <span className="text-gray-400">
                                            <span className="material-icons text-sm">chevron_right</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {filteredCurrencies.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <span className="material-icons text-4xl mb-2">search_off</span>
                            <p>No currencies found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Prices will update automatically after selection
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CountrySelector;
