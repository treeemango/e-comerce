import { autoDetectCurrency } from './currency';
import { getCountrySEOConfig, getSupportedCountryCodes } from './country-seo';
import { fetchSellerProfile } from './api';

function isCountryCode(value: string): boolean {
    return /^[A-Za-z]{2}$/.test(value.trim());
}

function normalize(value: string): string {
    return value.trim().toLowerCase();
}

export async function getSellerCurrency(sellerId: string): Promise<string> {
    try {
        const profile = await fetchSellerProfile(sellerId);
        const rawCountry = profile?.country?.trim();

        if (!rawCountry) {
            return await autoDetectCurrency();
        }

        let countryCode: string | null = null;

        if (isCountryCode(rawCountry)) {
            countryCode = rawCountry.toUpperCase();
        } else {
            const target = normalize(rawCountry);
            for (const code of getSupportedCountryCodes()) {
                const cfg = getCountrySEOConfig(code);
                if (cfg && normalize(cfg.name) === target) {
                    countryCode = cfg.countryCode;
                    break;
                }
            }
        }

        if (countryCode) {
            const cfg = getCountrySEOConfig(countryCode);
            if (cfg?.currencyCode) return cfg.currencyCode;
        }

        return await autoDetectCurrency();
    } catch {
        return await autoDetectCurrency();
    }
}

export function getCurrencySymbol(currencyCode: string): string {
    try {
        const parts = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currencyCode,
            currencyDisplay: 'narrowSymbol',
        }).formatToParts(0);

        return parts.find(p => p.type === 'currency')?.value || currencyCode;
    } catch {
        return currencyCode;
    }
}
