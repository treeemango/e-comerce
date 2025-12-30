// Currency conversion service with caching
// Uses ExchangeRate-API with database caching to minimize API calls

import { supabase } from './supabase';

const EXCHANGE_RATE_API_KEY = 'e1a1b0a52fc28db8e20f6b21';
const CACHE_HOURS = 2; // Cache rates for 2 hours

const EXCHANGE_RATE_MEMORY_TTL_MS = CACHE_HOURS * 60 * 60 * 1000;
const EXCHANGE_RATE_LOCALSTORAGE_PREFIX = 'exchange_rate_cache:';
const EXCHANGE_RATE_REQUEST_TIMEOUT_MS = 10_000;
const EXCHANGE_RATE_RATE_LIMIT_DEFAULT_COOLDOWN_MS = 10 * 60 * 1000;

type CachedRateEntry = {
    rate: number;
    expiresAt: number;
};

const memoryRateCache = new Map<string, CachedRateEntry>();
const inFlightRateRequests = new Map<string, Promise<number | null>>();
const rateLimitCooldownUntil = new Map<string, number>();
const lastLogAt = new Map<string, number>();

function getNowMs(): number {
    return Date.now();
}

function makePairKey(from: string, to: string): string {
    return `${from}->${to}`;
}

function isDevEnv(): boolean {
    try {
        // Vite exposes import.meta.env; guard for non-Vite contexts.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Boolean((import.meta as any)?.env?.DEV);
    } catch {
        return false;
    }
}

function debugLog(...args: unknown[]) {
    if (!isDevEnv()) return;
    console.log(...args);
}

function debugWarnOnce(key: string, ...args: unknown[]) {
    if (!isDevEnv()) return;
    const now = getNowMs();
    const last = lastLogAt.get(key) ?? 0;
    // Prevent log spam for the same key
    if (now - last < 60_000) return;
    lastLogAt.set(key, now);
    console.warn(...args);
}

function getMemoryCachedRate(key: string): number | null {
    const entry = memoryRateCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= getNowMs()) {
        memoryRateCache.delete(key);
        return null;
    }
    return entry.rate;
}

function setMemoryCachedRate(key: string, rate: number, ttlMs: number = EXCHANGE_RATE_MEMORY_TTL_MS) {
    memoryRateCache.set(key, {
        rate,
        expiresAt: getNowMs() + ttlMs
    });
}

function getLocalStorageCachedRate(key: string): number | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(`${EXCHANGE_RATE_LOCALSTORAGE_PREFIX}${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedRateEntry;
        if (!parsed || typeof parsed.rate !== 'number' || typeof parsed.expiresAt !== 'number') return null;
        if (parsed.expiresAt <= getNowMs()) {
            window.localStorage.removeItem(`${EXCHANGE_RATE_LOCALSTORAGE_PREFIX}${key}`);
            return null;
        }
        return parsed.rate;
    } catch {
        return null;
    }
}

function setLocalStorageCachedRate(key: string, rate: number, ttlMs: number = EXCHANGE_RATE_MEMORY_TTL_MS) {
    if (typeof window === 'undefined') return;
    try {
        const payload: CachedRateEntry = {
            rate,
            expiresAt: getNowMs() + ttlMs
        };
        window.localStorage.setItem(`${EXCHANGE_RATE_LOCALSTORAGE_PREFIX}${key}`, JSON.stringify(payload));
    } catch {
        // Ignore storage failures (e.g., quota, privacy mode)
    }
}

function getCooldownUntil(key: string): number {
    return rateLimitCooldownUntil.get(key) ?? 0;
}

function setCooldownUntil(key: string, untilMs: number) {
    rateLimitCooldownUntil.set(key, untilMs);
}

export interface CurrencyConversion {
    from: string;
    to: string;
    rate: number;
    amount: number;
    convertedAmount: number;
    lastUpdated: Date;
}

export interface ExchangeRates {
    [key: string]: number; // currency -> rate relative to base
}

/**
 * Normalizes common currency symbols/codes to standard ISO 4217 codes
 */
export function normalizeCurrencyCode(code: string): string {
    const normalized = code.toUpperCase().trim();
    const map: Record<string, string> = {
        'KSH': 'KES',
        'TSH': 'TZS',
        'USH': 'UGX',
        'FRW': 'RWF',
        'LD': 'LYD',
        'CFA': 'XOF', // Or XAF depending on context, XOF is more common for West Africa
        'FCFA': 'XAF',
        'Z$': 'ZWL',
        'L$': 'LRD',
        'E£': 'EGP',
        'DH': 'MAD',
        'DA': 'DZD',
        'DT': 'TND',
        'UM': 'MRU',
        'MK': 'MWK',
        'ZK': 'ZMW',
        'Kz': 'AOA',
        'MT': 'MZN',
        'DB': 'STN',
        'FBU': 'BIF',
        'FC': 'CDF',
        'FDJ': 'DJF',
        'NFK': 'ERN',
        'CF': 'KMF',
        'AR': 'MGA',
        'RS': 'MUR',
        'SRE': 'SCR',
        'SH.SO.': 'SOS',
    };
    return map[normalized] || normalized;
}

/**
 * Get exchange rate from database cache or API
 */
export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    const from = normalizeCurrencyCode(fromCurrency);
    const to = normalizeCurrencyCode(toCurrency);

    if (from === to) return 1;

    const key = makePairKey(from, to);

    // Fast-path: memory cache
    const memoryCached = getMemoryCachedRate(key);
    if (memoryCached !== null) return memoryCached;

    // Fast-path: localStorage cache (browser only)
    const localCached = getLocalStorageCachedRate(key);
    if (localCached !== null) {
        setMemoryCachedRate(key, localCached);
        return localCached;
    }

    // If we got rate-limited recently, avoid hammering the API.
    const cooldownUntil = getCooldownUntil(key);
    if (cooldownUntil > getNowMs()) {
        debugWarnOnce(`rate-limit:${key}`, `[currency] Rate limit cooldown active for ${key}. Using cached fallback if available.`);
        return null;
    }

    // De-dupe concurrent requests for the same pair.
    const existing = inFlightRateRequests.get(key);
    if (existing) return existing;

    const requestPromise = (async (): Promise<number | null> => {
        // Check DB cache first
        try {
            const { data: cachedRate, error } = await supabase
                .rpc('get_cached_exchange_rate', {
                    p_from_currency: from,
                    p_to_currency: to
                });

            if (!error && cachedRate !== null && cachedRate !== undefined) {
                const rateNum = Number(cachedRate);
                if (!Number.isNaN(rateNum) && Number.isFinite(rateNum)) {
                    setMemoryCachedRate(key, rateNum);
                    setLocalStorageCachedRate(key, rateNum);
                    debugLog(`[currency] Using DB cached rate: ${key} = ${rateNum}`);
                    return rateNum;
                }
            }
        } catch {
            // Ignore DB cache failures; we'll try API below.
        }

        // Fetch from API
        const rate = await fetchExchangeRate(from, to);

        if (rate) {
            setMemoryCachedRate(key, rate);
            setLocalStorageCachedRate(key, rate);

            // Cache the rate in DB (best-effort)
            try {
                await supabase.rpc('update_cached_exchange_rate', {
                    p_from_currency: from,
                    p_to_currency: to,
                    p_rate: rate,
                    p_cache_hours: CACHE_HOURS
                });
            } catch {
                // Ignore DB update errors
            }

            debugLog(`[currency] Cached new rate: ${key} = ${rate}`);
        }

        return rate;
    })();

    inFlightRateRequests.set(key, requestPromise);
    try {
        return await requestPromise;
    } finally {
        inFlightRateRequests.delete(key);
    }
}

/**
 * Fetch exchange rate from ExchangeRate-API
 */
async function fetchExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    try {
        const from = normalizeCurrencyCode(fromCurrency);
        const to = normalizeCurrencyCode(toCurrency);
        const key = makePairKey(from, to);
        const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EXCHANGE_RATE_REQUEST_TIMEOUT_MS);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            if (response.status === 429) {
                const retryAfterHeader = response.headers.get('retry-after');
                const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
                const cooldownMs = Number.isFinite(retryAfterSeconds)
                    ? Math.max(5_000, retryAfterSeconds * 1000)
                    : EXCHANGE_RATE_RATE_LIMIT_DEFAULT_COOLDOWN_MS;

                setCooldownUntil(key, getNowMs() + cooldownMs);
                debugWarnOnce(`429:${key}`, `[currency] ExchangeRate-API 429 for ${key}. Cooling down for ${Math.round(cooldownMs / 1000)}s.`);
                return null;
            }

            debugWarnOnce(`api-error:${key}:${response.status}`, '[currency] ExchangeRate-API error:', response.status, response.statusText);
            return null;
        }

        const data = await response.json();

        if (data.result === 'success') {
            return data.conversion_rate;
        } else {
            debugWarnOnce(`api-result:${from}->${to}`, '[currency] ExchangeRate-API returned error:', data);
            return null;
        }
    } catch (error) {
        debugWarnOnce(`api-exception:${fromCurrency}->${toCurrency}`, '[currency] Error fetching exchange rate:', error);
        return null;
    }
}

/**
 * Convert amount between currencies
 */
export async function convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
): Promise<CurrencyConversion | null> {
    const from = normalizeCurrencyCode(fromCurrency);
    const to = normalizeCurrencyCode(toCurrency);

    if (from === to) {
        return {
            from,
            to,
            rate: 1,
            amount,
            convertedAmount: amount,
            lastUpdated: new Date()
        };
    }

    const rate = await getExchangeRate(from, to);
    if (!rate) return null;

    return {
        from,
        to,
        rate,
        amount,
        convertedAmount: amount * rate,
        lastUpdated: new Date()
    };
}

/**
 * Get all exchange rates for a base currency (useful for bulk operations)
 */
export async function getExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates | null> {
    try {
        const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${baseCurrency}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EXCHANGE_RATE_REQUEST_TIMEOUT_MS);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            debugWarnOnce(`latest:${baseCurrency}:${response.status}`, '[currency] ExchangeRate-API error:', response.status, response.statusText);
            return null;
        }

        const data = await response.json();

        if (data.result === 'success') {
            // Cache individual rates
            const rates = data.conversion_rates;
            const cachePromises = Object.entries(rates).map(([currency, rate]) =>
                supabase.rpc('update_cached_exchange_rate', {
                    p_from_currency: baseCurrency,
                    p_to_currency: currency,
                    p_rate: rate,
                    p_cache_hours: CACHE_HOURS
                })
            );

            await Promise.all(cachePromises);
            debugLog(`[currency] Cached ${Object.keys(rates).length} rates from ${baseCurrency}`);

            return rates;
        } else {
            debugWarnOnce(`latest-result:${baseCurrency}`, '[currency] ExchangeRate-API returned error:', data);
            return null;
        }
    } catch (error) {
        debugWarnOnce(`latest-exception:${baseCurrency}`, '[currency] Error fetching exchange rates:', error);
        return null;
    }
}

/**
 * Detect user's currency based on device type and available methods
 */
export async function detectUserCurrency(): Promise<string> {
    // Try to get from localStorage first (user preference)
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('preferred_currency');
        if (saved) {
            debugLog(`[currency] Using saved currency preference: ${saved}`);
            return saved;
        }
    }

    const isMobile = isMobileDevice();
    debugLog(`[currency] Detecting currency for ${isMobile ? 'mobile' : 'desktop'} device`);

    // For mobile devices, try GPS first (more accurate for location-based apps)
    if (isMobile) {
        try {
            debugLog('[currency] Trying GPS detection for mobile device...');
            const gpsCurrency = await detectCurrencyByGPS();
            if (gpsCurrency) return gpsCurrency;
        } catch (error) {
            debugLog('[currency] GPS detection failed or denied, trying IP...');
        }
    }

    // Try IP-based geolocation (works better on desktop/fixed connections)
    try {
        const ipCurrency = await detectCurrencyByIP();
        if (ipCurrency) return ipCurrency;
    } catch (error) {
        debugLog('[currency] IP geolocation failed, falling back to locale');
    }

    // Fallback to browser locale
    if (typeof navigator !== 'undefined') {
        const locale = navigator.language || 'en-US';
        const currency = localeToCurrency(locale);
        debugLog(`[currency] Using browser locale currency: ${currency} from ${locale}`);
        return currency;
    }

    // Default to USD
    debugLog('[currency] All detection methods failed, defaulting to USD');
    return 'USD';
}

/**
 * Legacy synchronous version for backward compatibility
 */
export function detectUserCurrencySync(): string {
    // Try to get from localStorage first
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('preferred_currency');
        if (saved) return saved;
    }

    // Fallback to browser locale
    if (typeof navigator !== 'undefined') {
        const locale = navigator.language || 'en-US';
        const currency = localeToCurrency(locale);
        return currency;
    }

    // Default to USD
    return 'USD';
}

/**
 * Detect currency by IP geolocation (with multiple API fallbacks)
 */
async function detectCurrencyByIP(): Promise<string | null> {
    // Try multiple IP geolocation services for better reliability
    const GEOLOCATION_APIS = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://api.ipify.org?format=json', // For basic IP detection
    ];

    for (const apiUrl of GEOLOCATION_APIS) {
        try {
            debugLog(`[currency] Trying IP geolocation API: ${apiUrl}`);
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) continue;

            const data = await response.json();
            let countryCode = null;

            // Handle different API response formats
            if (data.country_code) {
                countryCode = data.country_code; // ipapi.co format
            } else if (data.countryCode) {
                countryCode = data.countryCode; // ip-api.com format
            }

            if (countryCode) {
                const currency = countryCodeToCurrency(countryCode);
                debugLog(`[currency] ✅ Detected currency ${currency} from ${apiUrl}: ${countryCode}`);
                return currency;
            }
        } catch (error) {
            debugWarnOnce(`ip-geo:${apiUrl}`, `[currency] ❌ IP geolocation API ${apiUrl} failed:`, error);
            continue;
        }
    }

    debugLog('[currency] ❌ All IP geolocation APIs failed');
    return null;
}

/**
 * Detect currency by GPS coordinates (mobile-friendly)
 */
async function detectCurrencyByGPS(): Promise<string | null> {
    if (!navigator.geolocation) {
        debugLog('[currency] GPS not available');
        return null;
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    debugLog(`[currency] GPS coordinates: ${latitude}, ${longitude}`);

                    // Use reverse geocoding to get country
                    const countryCode = await getCountryFromCoordinates(latitude, longitude);
                    if (countryCode) {
                        const currency = countryCodeToCurrency(countryCode);
                        debugLog(`[currency] ✅ Detected currency ${currency} from GPS: ${countryCode}`);
                        return resolve(currency);
                    }
                } catch (error) {
                    debugWarnOnce('gps-geocoding', '[currency] GPS geocoding error:', error);
                }
                resolve(null);
            },
            (error) => {
                debugLog(`[currency] GPS access denied or error: ${error.message}`);
                resolve(null);
            },
            {
                timeout: 10000,
                enableHighAccuracy: false,
                maximumAge: 300000 // Accept cached position up to 5 minutes old
            }
        );
    });
}

/**
 * Get country code from GPS coordinates using reverse geocoding
 */
async function getCountryFromCoordinates(lat: number, lon: number): Promise<string | null> {
    try {
        // Use a free geocoding service
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );

        if (!response.ok) return null;

        const data = await response.json();
        return data.countryCode || null;
    } catch (error) {
        debugWarnOnce('reverse-geocode', '[currency] Reverse geocoding error:', error);
        return null;
    }
}

/**
 * Check if device is likely mobile
 */
function isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
}

/**
 * Convert country code to currency code
 */
function countryCodeToCurrency(countryCode: string): string {
    const countryToCurrency: { [key: string]: string } = {
        'US': 'USD',
        'GB': 'GBP',
        'EU': 'EUR',
        'CA': 'CAD',
        'AU': 'AUD',
        'NZ': 'NZD',
        'ZA': 'ZAR',
        'KE': 'KES',
        'NG': 'NGN',
        'GH': 'GHS',
        'TZ': 'TZS',
        'UG': 'UGX',
        'RW': 'RWF',
        'BW': 'BWP',
        'ZW': 'ZWL',
        'MW': 'MWK',
        'ZM': 'ZMW',
        'AO': 'AOA',
        'LS': 'LSL',
        'MZ': 'MZN',
        'NA': 'NAD',
        'SZ': 'SZL',
        'BJ': 'XOF',
        'BF': 'XOF',
        'CI': 'XOF',
        'GW': 'XOF',
        'ML': 'XOF',
        'NE': 'XOF',
        'SN': 'XOF',
        'TG': 'XOF',
        'CM': 'XAF',
        'CF': 'XAF',
        'CG': 'XAF',
        'CD': 'CDF',
        'GA': 'XAF',
        'GQ': 'XAF',
        'TD': 'XAF',
        'BI': 'BIF',
        'DJ': 'DJF',
        'ER': 'ERN',
        'ET': 'ETB',
        'KM': 'KMF',
        'MG': 'MGA',
        'MU': 'MUR',
        'SC': 'SCR',
        'SO': 'SOS',
        'CV': 'CVE',
        'GM': 'GMD',
        'GN': 'GNF',
        'LR': 'LRD',
        'SL': 'SLL',
        'ST': 'STN',
        'TN': 'TND',
        'DZ': 'DZD',
        'EG': 'EGP',
        'LY': 'LYD',
        'MA': 'MAD',
        'SD': 'SDG',
        'SS': 'SSP',
        'EH': 'MAD',
        'MR': 'MRU',
        'CN': 'CNY',
        'TW': 'TWD',
        'HK': 'HKD',
        'JP': 'JPY',
        'KR': 'KRW',
        'TH': 'THB',
        'VN': 'VND',
        'ID': 'IDR',
        'MY': 'MYR',
        'PH': 'PHP',
        'IN': 'INR',
        'BD': 'BDT',
        'PK': 'PKR',
        'LK': 'LKR',
        'IL': 'ILS',
        'JO': 'JOD',
        'LB': 'LBP',
        'PS': 'ILS',
        'SY': 'SYP',
        'TR': 'TRY',
        'SA': 'SAR',
        'AE': 'AED',
        'BH': 'BHD',
        'KW': 'KWD',
        'OM': 'OMR',
        'QA': 'QAR',
        'YE': 'YER',
        'IR': 'IRR',
        'IQ': 'IQD',
        'AF': 'AFN',
        'TJ': 'TJS',
        'TM': 'TMT',
        'UZ': 'UZS',
        'KZ': 'KZT',
        'KG': 'KGS',
        'AZ': 'AZN',
        'GE': 'GEL',
        'AM': 'AMD',
        'BY': 'BYN',
        'UA': 'UAH',
        'MD': 'MDL',
        'RO': 'RON',
        'BG': 'BGN',
        'AL': 'ALL',
        'MK': 'MKD',
        'ME': 'EUR',
        'RS': 'RSD',
        'BA': 'BAM',
        'HR': 'EUR',
        'SI': 'EUR',
        'SK': 'EUR',
        'CZ': 'CZK',
        'PL': 'PLN',
        'HU': 'HUF',
        'AT': 'EUR',
        'CH': 'CHF',
        'LI': 'CHF',
        'DE': 'EUR',
        'DK': 'DKK',
        'SE': 'SEK',
        'NO': 'NOK',
        'FI': 'EUR',
        'EE': 'EUR',
        'LV': 'EUR',
        'LT': 'EUR',
        'MT': 'EUR',
        'CY': 'EUR',
        'GR': 'EUR',
        'PT': 'EUR',
        'ES': 'EUR',
        'IT': 'EUR',
        'SM': 'EUR',
        'VA': 'EUR',
        'AD': 'EUR',
        'GI': 'GBP',
        'GG': 'GBP',
        'IM': 'GBP',
        'JE': 'GBP',
        'IE': 'EUR',
        'IS': 'ISK',
        'FO': 'DKK',
        'GL': 'DKK',
        'NL': 'EUR',
        'BE': 'EUR',
        'LU': 'EUR',
        'FR': 'EUR',
        'MC': 'EUR',
        'BR': 'BRL',
        'AR': 'ARS',
        'CL': 'CLP',
        'CO': 'COP',
        'MX': 'MXN',
        'PE': 'PEN',
        'UY': 'UYU',
        'PY': 'PYG',
        'BO': 'BOB',
        'EC': 'USD',
        'VE': 'VES',
        'GY': 'GYD',
        'SR': 'SRD',
        'GF': 'EUR',
        'MQ': 'EUR',
        'GP': 'EUR',
        'BL': 'EUR',
        'MF': 'EUR',
        'PM': 'EUR',
        'HT': 'HTG',
        'DO': 'DOP',
        'PR': 'USD',
        'VI': 'USD',
        'JM': 'JMD',
        'TT': 'TTD',
        'BB': 'BBD',
        'LC': 'XCD',
        'VC': 'XCD',
        'GD': 'XCD',
        'AG': 'XCD',
        'DM': 'XCD',
        'KN': 'XCD',
        'BS': 'BSD',
        'BZ': 'BZD',
        'GT': 'GTQ',
        'SV': 'USD',
        'HN': 'HNL',
        'NI': 'NIO',
        'CR': 'CRC',
        'PA': 'PAB',
        'CU': 'CUP',
        'KY': 'KYD',
        'TC': 'USD',
        'AW': 'AWG',
        'BQ': 'USD',
        'CW': 'ANG',
        'SX': 'ANG',
        'FK': 'FKP',
        'GS': 'GBP',
        'SH': 'SHP',
        'IO': 'USD',
        'CC': 'AUD',
        'CX': 'AUD',
        'HM': 'AUD',
        'NF': 'AUD',
        'NU': 'NZD',
        'PN': 'NZD',
        'CK': 'NZD',
        'FJ': 'FJD',
        'VU': 'VUV',
        'SB': 'SBD',
        'TV': 'AUD',
        'NR': 'AUD',
        'KI': 'AUD',
        'MH': 'USD',
        'FM': 'USD',
        'PW': 'USD',
        'MP': 'USD',
        'GU': 'USD',
        'AS': 'USD',
        'WS': 'WST',
        'TO': 'TOP',
        'PF': 'XPF',
        'NC': 'XPF',
        'WF': 'XPF',
        'TK': 'NZD'
    };

    return countryToCurrency[countryCode.toUpperCase()] || 'USD';
}

/**
 * Convert locale to currency code
 */
function localeToCurrency(locale: string): string {
    const currencyMap: { [key: string]: string } = {
        'en-US': 'USD',
        'en-GB': 'GBP',
        'en-IE': 'EUR',
        'en-CA': 'CAD',
        'en-AU': 'AUD',
        'en-NZ': 'NZD',
        'en-ZA': 'ZAR',
        'en-KE': 'KES',
        'en-NG': 'NGN',
        'en-GH': 'GHS',
        'en-TZ': 'TZS',
        'en-UG': 'UGX',
        'en-RW': 'RWF',
        'en-BW': 'BWP',
        'en-ZW': 'ZWL',
        'en-MW': 'MWK',
        'en-ZM': 'ZMW',
        'fr-FR': 'EUR',
        'de-DE': 'EUR',
        'es-ES': 'EUR',
        'it-IT': 'EUR',
        'pt-PT': 'EUR',
        'nl-NL': 'EUR',
        'sv-SE': 'SEK',
        'no-NO': 'NOK',
        'da-DK': 'DKK',
        'fi-FI': 'EUR',
        'pl-PL': 'PLN',
        'cs-CZ': 'CZK',
        'hu-HU': 'HUF',
        'sk-SK': 'EUR',
        'sl-SI': 'EUR',
        'hr-HR': 'EUR',
        'bg-BG': 'BGN',
        'ro-RO': 'RON',
        'tr-TR': 'TRY',
        'ar-SA': 'SAR',
        'ar-AE': 'AED',
        'ar-EG': 'EGP',
        'ar-MA': 'MAD',
        'ar-TN': 'TND',
        'ar-DZ': 'DZD',
        'ar-LY': 'LYD',
        'zh-CN': 'CNY',
        'zh-TW': 'TWD',
        'zh-HK': 'HKD',
        'ja-JP': 'JPY',
        'ko-KR': 'KRW',
        'th-TH': 'THB',
        'vi-VN': 'VND',
        'id-ID': 'IDR',
        'ms-MY': 'MYR',
        'fil-PH': 'PHP',
        'hi-IN': 'INR',
        'bn-BD': 'BDT',
        'ur-PK': 'PKR',
        'ta-LK': 'LKR',
        'te-IN': 'INR',
        'ml-IN': 'INR',
        'kn-IN': 'INR',
        'gu-IN': 'INR',
        'pa-IN': 'INR',
        'or-IN': 'INR',
        'as-IN': 'INR'
    };

    return currencyMap[locale] || 'USD';
}

/**
 * Set user's preferred currency
 */
export function setPreferredCurrency(currency: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('preferred_currency', currency.toUpperCase());
    }
}

/**
 * Get user's preferred currency (synchronous)
 */
export function getPreferredCurrency(): string {
    return detectUserCurrencySync();
}

/**
 * Format currency with proper symbol and locale
 */
export function formatCurrency(amount: number, currency: string, locale: string = 'en-US'): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(amount);
    } catch (error) {
        // Fallback formatting
        const symbol = getCurrencySymbol(currency);
        return `${symbol}${amount.toFixed(2)}`;
    }
}

/**
 * Get currency symbol
 */
function getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
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
        'SZL': 'E'
    };

    return symbols[currency.toUpperCase()] || currency.toUpperCase();
}
