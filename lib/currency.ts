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
    return `${symbol}${amount.toFixed(2)}`;
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
    const [integer, decimal] = amount.toFixed(2).split('.');
    return { symbol, integer, decimal };
}
