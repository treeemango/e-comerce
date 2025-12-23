// Currency formatting utilities

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
    'USD': '$',
    'KES': 'KSh',
    'NGN': '₦',
    'GHS': '₵',
    'ZAR': 'R',
    'TZS': 'TSh',
    'UGX': 'USh',
    'RWF': 'FRw',
    'ETB': 'Br',
    'EGP': 'E£',
    'MAD': 'DH',
    'GBP': '£',
    'EUR': '€',
    // African currencies
    'DZD': 'DA',
    'LYD': 'LD',
    'SDG': 'SDG',
    'SSP': 'SSP',
    'TND': 'DT',
    'MRU': 'UM',
    'XOF': 'CFA',
    'GMD': 'D',
    'GNF': 'FG',
    'LRD': 'L$',
    'SLL': 'Le',
    'CVE': 'Esc',
    'XAF': 'FCFA',
    'STN': 'Db',
    'BIF': 'FBu',
    'CDF': 'FC',
    'DJF': 'Fdj',
    'ERN': 'Nfk',
    'KMF': 'CF',
    'MGA': 'Ar',
    'MUR': '₨',
    'SCR': 'SRe',
    'SOS': 'Sh.So.',
    'MWK': 'MK',
    'ZMW': 'ZK',
    'ZWL': 'Z$',
    'AOA': 'Kz',
    'BWP': 'P',
    'LSL': 'L',
    'MZN': 'MT',
    'NAD': 'N$',
    'SZL': 'E',
};

export const SUPPORTED_CURRENCIES = [
    { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
    { code: 'DZD', flag: '🇩🇿', name: 'Algerian Dinar' },
    { code: 'EGP', flag: '🇪🇬', name: 'Egyptian Pound' },
    { code: 'LYD', flag: '🇱🇾', name: 'Libyan Dinar' },
    { code: 'MAD', flag: '🇲🇦', name: 'Moroccan Dirham' },
    { code: 'SDG', flag: '🇸🇩', name: 'Sudanese Pound' },
    { code: 'SSP', flag: '🇸🇸', name: 'South Sudanese Pound' },
    { code: 'TND', flag: '🇹🇳', name: 'Tunisian Dinar' },
    { code: 'MRU', flag: '🇲🇷', name: 'Mauritanian Ouguiya' },
    { code: 'XOF', flag: '🌍', name: 'West African CFA Franc' },
    { code: 'GMD', flag: '🇬🇲', name: 'Gambian Dalasi' },
    { code: 'GHS', flag: '🇬🇭', name: 'Ghanaian Cedi' },
    { code: 'GNF', flag: '🇬🇳', name: 'Guinean Franc' },
    { code: 'LRD', flag: '🇱🇷', name: 'Liberian Dollar' },
    { code: 'NGN', flag: '🇳🇬', name: 'Nigerian Naira' },
    { code: 'SLL', flag: '🇸🇱', name: 'Sierra Leonean Leone' },
    { code: 'CVE', flag: '🇨🇻', name: 'Cape Verdean Escudo' },
    { code: 'XAF', flag: '🌍', name: 'Central African CFA Franc' },
    { code: 'STN', flag: '🇸🇹', name: 'São Tomé and Príncipe Dobra' },
    { code: 'BIF', flag: '🇧🇮', name: 'Burundian Franc' },
    { code: 'CDF', flag: '🇨🇩', name: 'Congolese Franc' },
    { code: 'RWF', flag: '🇷🇼', name: 'Rwandan Franc' },
    { code: 'DJF', flag: '🇩🇯', name: 'Djiboutian Franc' },
    { code: 'ERN', flag: '🇪🇷', name: 'Eritrean Nakfa' },
    { code: 'ETB', flag: '🇪🇹', name: 'Ethiopian Birr' },
    { code: 'KES', flag: '🇰🇪', name: 'Kenyan Shilling' },
    { code: 'KMF', flag: '🇰🇲', name: 'Comorian Franc' },
    { code: 'MGA', flag: '🇲🇬', name: 'Malagasy Ariary' },
    { code: 'MUR', flag: '🇲🇺', name: 'Mauritian Rupee' },
    { code: 'SCR', flag: '🇸🇨', name: 'Seychellois Rupee' },
    { code: 'SOS', flag: '🇸🇴', name: 'Somali Shilling' },
    { code: 'TZS', flag: '🇹🇿', name: 'Tanzanian Shilling' },
    { code: 'UGX', flag: '🇺🇬', name: 'Ugandan Shilling' },
    { code: 'MWK', flag: '🇲🇼', name: 'Malawian Kwacha' },
    { code: 'ZMW', flag: '🇿🇲', name: 'Zambian Kwacha' },
    { code: 'ZWL', flag: '🇿🇼', name: 'Zimbabwean Dollar' },
    { code: 'AOA', flag: '🇦🇴', name: 'Angolan Kwanza' },
    { code: 'BWP', flag: '🇧🇼', name: 'Botswana Pula' },
    { code: 'LSL', flag: '🇱🇸', name: 'Lesotho Loti' },
    { code: 'MZN', flag: '🇲🇿', name: 'Mozambican Metical' },
    { code: 'NAD', flag: '🇳🇦', name: 'Namibian Dollar' },
    { code: 'ZAR', flag: '🇿🇦', name: 'South African Rand' },
    { code: 'SZL', flag: '🇸🇿', name: 'Swazi Lilangeni' },
    { code: 'ZWD', flag: '🇿🇼', name: 'Zimbabwean Dollar (Old)' },
    { code: 'MRO', flag: '🇲🇷', name: 'Mauritanian Ouguiya (Old)' }
];

/**
 * Get the currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string = 'USD'): string {
    return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Format a price with the appropriate currency symbol
 */
export function formatPrice(amount: number, currencyCode: string = 'USD'): string {
    const symbol = getCurrencySymbol(currencyCode);
    const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `${symbol}${validAmount.toFixed(2)}`;
}

/**
 * Format a price with split integer and decimal parts (for styling)
 */
export function formatPriceParts(amount: number, currencyCode: string = 'USD'): {
    symbol: string;
    integer: string;
    decimal: string;
} {
    const symbol = getCurrencySymbol(currencyCode);
    const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    const [integer, decimal] = validAmount.toFixed(2).split('.');
    return { symbol, integer, decimal };
}
