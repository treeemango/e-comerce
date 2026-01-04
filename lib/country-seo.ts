import { SUPPORTED_CURRENCIES } from './currency';
import { getPreferredCurrency } from './currency-service';

export interface SiteBrandingConfig {
    name: string;
    url: string;
    logo: string;
    email?: string;
    phone?: string;
    socialMedia?: {
        twitter?: string;
        facebook?: string;
        instagram?: string;
        tiktok?: string;
        pinterest?: string;
        youtube?: string;
    };
}

// Country-specific SEO configuration
export interface CountrySEOConfig {
    countryCode: string; // ISO 3166-1 alpha-2
    currencyCode: string;
    locale: string; // BCP 47 language tag
    name: string;
    capital: string;
    region: 'Africa' | 'Europe' | 'Asia' | 'Americas' | 'Oceania';
    flag: string;

    // SEO-specific config
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    geoRegion: string;
    geoPlacename: string;
    searchTerms: string[];

    // Business info for structured data
    businessName: string;
    businessDescription: string;
    contactInfo: {
        phone: string;
        email: string;
        address: {
            streetAddress?: string;
            addressLocality: string;
            addressRegion?: string;
            addressCountry: string;
            postalCode?: string;
        };
    };

    // Market-specific features
    popularCategories: string[];
    shippingTime: string;
    paymentMethods: string[];
    trustSignals: string[];
}

// Country-specific SEO configurations
export const COUNTRY_SEO_CONFIGS: Record<string, CountrySEOConfig> = {
    // United Kingdom
    'GB': {
        countryCode: 'GB',
        currencyCode: 'GBP',
        locale: 'en-GB',
        name: 'United Kingdom',
        capital: 'London',
        region: 'Europe',
        flag: '🇬🇧',

        metaTitle: 'JuaExpress UK - Shop Electronics, Fashion & More Online',
        metaDescription: 'Discover premium electronics, fashion, and home goods on JuaExpress UK. Fast delivery across England, Scotland, Wales & Northern Ireland with secure payments.',
        keywords: ['online shopping UK', 'electronics UK', 'fashion UK', 'home delivery UK', 'secure payments', 'fast delivery'],
        geoRegion: 'GB',
        geoPlacename: 'London, United Kingdom',
        searchTerms: ['shop online UK', 'buy electronics UK', 'fashion shopping UK', 'UK marketplace', 'British online store'],

        businessName: 'JuaExpress UK',
        businessDescription: 'Leading UK e-commerce platform offering electronics, fashion, and lifestyle products with fast delivery across the United Kingdom.',
        contactInfo: {
            phone: '',
            email: '',
            address: {
                addressLocality: '',
                addressRegion: '',
                addressCountry: 'GB',
            }
        },

        popularCategories: ['electronics', 'fashion', 'home-garden', 'sports-outdoors'],
        shippingTime: '1-3 business days',
        paymentMethods: ['Visa', 'Mastercard', 'PayPal', 'Apple Pay', 'Google Pay'],
        trustSignals: ['UK Consumer Rights', 'Secure SSL', 'Verified Reviews', 'Fast Delivery Guarantee']
    },

    // Kenya
    'KE': {
        countryCode: 'KE',
        currencyCode: 'KES',
        locale: 'en-KE',
        name: 'Kenya',
        capital: 'Nairobi',
        region: 'Africa',
        flag: '🇰🇪',

        metaTitle: 'JuaExpress Kenya - Shop Electronics, Fashion & More Online',
        metaDescription: 'Your trusted Kenyan online marketplace. Shop electronics, fashion, home goods with fast delivery across Nairobi, Mombasa, Kisumu & major towns. Secure payments in KES.',
        keywords: ['online shopping Kenya', 'electronics Kenya', 'fashion Kenya', 'Nairobi shopping', 'Mombasa online store', 'secure payments Kenya', 'fast delivery Kenya'],
        geoRegion: 'KE',
        geoPlacename: 'Nairobi, Kenya',
        searchTerms: ['shop online Kenya', 'buy electronics Kenya', 'fashion shopping Kenya', 'Nairobi marketplace', 'Kenyan online store'],

        businessName: 'JuaExpress Kenya',
        businessDescription: 'Kenya\'s leading e-commerce platform connecting buyers with quality products. Fast delivery across all major cities with local customer support.',
        contactInfo: {
            phone: '',
            email: '',
            address: {
                addressLocality: 'Nairobi',
                addressRegion: 'Nairobi County',
                addressCountry: 'KE',
            }
        },

        popularCategories: ['electronics', 'fashion', 'home-garden', 'books-stationery'],
        shippingTime: '1-5 business days',
        paymentMethods: ['M-Pesa', 'Card', 'Bank Transfer', 'Cash on Delivery'],
        trustSignals: ['Kenya Consumer Protection', 'Secure Payments', 'Local Support', 'Verified Sellers']
    },

    // Nigeria
    'NG': {
        countryCode: 'NG',
        currencyCode: 'NGN',
        locale: 'en-NG',
        name: 'Nigeria',
        capital: 'Abuja',
        region: 'Africa',
        flag: '🇳🇬',

        metaTitle: 'JuaExpress Nigeria - Shop Electronics, Fashion & More Online',
        metaDescription: 'Nigeria\'s premier online marketplace. Shop electronics, fashion, home goods with fast delivery across Lagos, Abuja, Port Harcourt & all states. Pay with card or bank transfer.',
        keywords: ['online shopping Nigeria', 'electronics Nigeria', 'fashion Nigeria', 'Lagos shopping', 'Abuja online store', 'secure payments Nigeria', 'fast delivery Nigeria'],
        geoRegion: 'NG',
        geoPlacename: 'Lagos, Nigeria',
        searchTerms: ['shop online Nigeria', 'buy electronics Nigeria', 'fashion shopping Nigeria', 'Lagos marketplace', 'Nigerian online store'],

        businessName: 'JuaExpress Nigeria',
        businessDescription: 'Nigeria\'s trusted e-commerce platform offering quality products with nationwide delivery. Connect with verified sellers across all 36 states.',
        contactInfo: {
            phone: '',
            email: '',
            address: {
                addressLocality: '',
                addressRegion: '',
                addressCountry: 'NG',
            }
        },

        popularCategories: ['electronics', 'fashion', 'phones-tablets', 'home-garden'],
        shippingTime: '2-7 business days',
        paymentMethods: ['Card', 'Bank Transfer', 'Paystack', 'Flutterwave', 'Cash on Delivery'],
        trustSignals: ['Nigeria Consumer Protection', 'Secure Payments', 'Nationwide Delivery', 'Verified Sellers']
    },

    // South Africa
    'ZA': {
        countryCode: 'ZA',
        currencyCode: 'ZAR',
        locale: 'en-ZA',
        name: 'South Africa',
        capital: 'Cape Town',
        region: 'Africa',
        flag: '🇿🇦',

        metaTitle: 'JuaExpress South Africa - Shop Electronics, Fashion & More Online',
        metaDescription: 'South Africa\'s modern online marketplace. Shop electronics, fashion, home goods with fast delivery across Johannesburg, Cape Town, Durban & major cities.',
        keywords: ['online shopping South Africa', 'electronics South Africa', 'fashion South Africa', 'Johannesburg shopping', 'Cape Town online store', 'secure payments South Africa'],
        geoRegion: 'ZA',
        geoPlacename: 'Johannesburg, South Africa',
        searchTerms: ['shop online South Africa', 'buy electronics South Africa', 'fashion shopping South Africa', 'Johannesburg marketplace', 'South African online store'],

        businessName: 'JuaExpress South Africa',
        businessDescription: 'South Africa\'s leading e-commerce platform offering international and local products with reliable delivery across all provinces.',
        contactInfo: {
            phone: '',
            email: '',
            address: {
                addressLocality: '',
                addressRegion: '',
                addressCountry: 'ZA',
            }
        },

        popularCategories: ['electronics', 'fashion', 'home-garden', 'sports-outdoors'],
        shippingTime: '2-5 business days',
        paymentMethods: ['Visa', 'Mastercard', 'EFT', 'Ozow', 'Cash on Delivery'],
        trustSignals: ['South African Consumer Protection', 'Secure SSL', 'Fast Delivery', 'Quality Guarantee']
    },

    // Ghana
    'GH': {
        countryCode: 'GH',
        currencyCode: 'GHS',
        locale: 'en-GH',
        name: 'Ghana',
        capital: 'Accra',
        region: 'Africa',
        flag: '🇬🇭',

        metaTitle: 'JuaExpress Ghana - Shop Electronics, Fashion & More Online',
        metaDescription: 'Ghana\'s trusted online marketplace. Shop electronics, fashion, home goods with fast delivery across Accra, Tema, Kumasi & all regions. Secure mobile money payments.',
        keywords: ['online shopping Ghana', 'electronics Ghana', 'fashion Ghana', 'Accra shopping', 'Tema online store', 'secure payments Ghana', 'mobile money Ghana'],
        geoRegion: 'GH',
        geoPlacename: 'Accra, Ghana',
        searchTerms: ['shop online Ghana', 'buy electronics Ghana', 'fashion shopping Ghana', 'Accra marketplace', 'Ghanaian online store'],

        businessName: 'JuaExpress Ghana',
        businessDescription: 'Ghana\'s premier e-commerce platform connecting buyers with quality products. Fast delivery nationwide with mobile money and card payments.',
        contactInfo: {
            phone: '',
            email: '',
            address: {
                addressLocality: '',
                addressRegion: '',
                addressCountry: 'GH',
            }
        },

        popularCategories: ['electronics', 'fashion', 'phones-tablets', 'home-garden'],
        shippingTime: '1-4 business days',
        paymentMethods: ['Mobile Money', 'Card', 'Bank Transfer', 'Cash on Delivery'],
        trustSignals: ['Ghana Consumer Protection', 'Mobile Money Secure', 'Fast Delivery', 'Local Support']
    },

    // Uganda
    'UG': {
        countryCode: 'UG',
        currencyCode: 'UGX',
        locale: 'en-UG',
        name: 'Uganda',
        capital: 'Kampala',
        region: 'Africa',
        flag: '🇺🇬',

        metaTitle: 'JuaExpress Uganda - Shop Electronics, Fashion & More Online',
        metaDescription: 'Uganda\'s leading online marketplace. Shop electronics, fashion, home goods with fast delivery across Kampala, Entebbe, Jinja & major towns. Mobile money payments.',
        keywords: ['online shopping Uganda', 'electronics Uganda', 'fashion Uganda', 'Kampala shopping', 'Entebbe online store', 'secure payments Uganda', 'mobile money Uganda'],
        geoRegion: 'UG',
        geoPlacename: 'Kampala, Uganda',
        searchTerms: ['shop online Uganda', 'buy electronics Uganda', 'fashion shopping Uganda', 'Kampala marketplace', 'Ugandan online store'],

        businessName: 'JuaExpress Uganda',
        businessDescription: 'Uganda\'s trusted e-commerce platform offering quality products with nationwide delivery. Connect with verified sellers across all regions.',
        contactInfo: {
            phone: '',
            email: '',
            address: {
                addressLocality: '',
                addressRegion: '',
                addressCountry: 'UG',
            }
        },

        popularCategories: ['electronics', 'fashion', 'phones-tablets', 'home-garden'],
        shippingTime: '1-4 business days',
        paymentMethods: ['Mobile Money', 'Card', 'Bank Transfer', 'Cash on Delivery'],
        trustSignals: ['Uganda Consumer Protection', 'Mobile Money Secure', 'Fast Delivery', 'Local Support']
    },

    // Tanzania
    'TZ': {
        countryCode: 'TZ',
        currencyCode: 'TZS',
        locale: 'en-TZ',
        name: 'Tanzania',
        capital: 'Dodoma',
        region: 'Africa',
        flag: '🇹🇿',

        metaTitle: 'JuaExpress Tanzania - Shop Electronics, Fashion & More Online',
        metaDescription: 'Tanzania\'s modern online marketplace. Shop electronics, fashion, home goods with fast delivery across Dar es Salaam, Mwanza, Arusha & major cities.',
        keywords: ['online shopping Tanzania', 'electronics Tanzania', 'fashion Tanzania', 'Dar es Salaam shopping', 'Mwanza online store', 'secure payments Tanzania'],
        geoRegion: 'TZ',
        geoPlacename: 'Dar es Salaam, Tanzania',
        searchTerms: ['shop online Tanzania', 'buy electronics Tanzania', 'fashion shopping Tanzania', 'Dar es Salaam marketplace', 'Tanzanian online store'],

        businessName: 'JuaExpress Tanzania',
        businessDescription: 'Tanzania\'s leading e-commerce platform connecting buyers with quality products. Reliable delivery across mainland and Zanzibar.',
        contactInfo: {
            phone: '',
            email: '',
            address: {
                addressLocality: '',
                addressRegion: '',
                addressCountry: 'TZ',
            }
        },

        popularCategories: ['electronics', 'fashion', 'home-garden', 'books-stationery'],
        shippingTime: '2-5 business days',
        paymentMethods: ['Card', 'Mobile Money', 'Bank Transfer', 'Cash on Delivery'],
        trustSignals: ['Tanzania Consumer Protection', 'Secure Payments', 'Nationwide Delivery', 'Quality Products']
    }
};

/**
 * Get country SEO config by country code
 */
export function getCountrySEOConfig(countryCode: string): CountrySEOConfig | null {
    return COUNTRY_SEO_CONFIGS[countryCode.toUpperCase()] || null;
}

/**
 * Get all supported country codes
 */
export function getSupportedCountryCodes(): string[] {
    return Object.keys(COUNTRY_SEO_CONFIGS);
}

/**
 * Get country config by currency code
 */
export function getCountryConfigByCurrency(currencyCode: string): CountrySEOConfig | null {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode.toUpperCase());
    if (!currency) return null;

    // Map currency to primary country (simplified mapping)
    const currencyToCountry: Record<string, string> = {
        'GBP': 'GB',
        'KES': 'KE',
        'NGN': 'NG',
        'ZAR': 'ZA',
        'GHS': 'GH',
        'UGX': 'UG',
        'TZS': 'TZ',
        // Add more mappings as needed
    };

    const countryCode = currencyToCountry[currencyCode.toUpperCase()];
    return countryCode ? getCountrySEOConfig(countryCode) : null;
}

/**
 * Detect user's country SEO config based on various methods
 */
export async function detectUserCountrySEO(): Promise<CountrySEOConfig> {
    // Try to get from localStorage first
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('preferred_country');
        if (saved) {
            const config = getCountrySEOConfig(saved);
            if (config) return config;
        }
    }

    // Try currency-based detection
    const currency = getPreferredCurrency();
    const countryConfig = getCountryConfigByCurrency(currency);
    if (countryConfig) return countryConfig;

    // Default to Kenya
    return COUNTRY_SEO_CONFIGS['KE'];
}

/**
 * Set user's preferred country
 */
export function setPreferredCountry(countryCode: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('preferred_country', countryCode.toUpperCase());
    }
}

/**
 * Generate country-specific meta tags
 */
export function generateCountryMetaTags(
    countryConfig: CountrySEOConfig,
    site: Pick<SiteBrandingConfig, 'name'>,
    pageType: 'home' | 'category' | 'product' = 'home'
) {
    const baseTitle = countryConfig.metaTitle;
    const baseDescription = countryConfig.metaDescription;

    let title = baseTitle;
    let description = baseDescription;

    // Customize based on page type
    switch (pageType) {
        case 'category':
            title = `Shop ${countryConfig.name} - ${site.name}`;
            description = `Discover quality products in ${countryConfig.name}. Fast delivery, secure payments, and trusted sellers on ${site.name}.`;
            break;
        case 'product':
            title = `${site.name} ${countryConfig.name} - Quality Products Online`;
            description = `Shop with confidence in ${countryConfig.name}. Fast delivery, secure payments, and excellent customer service on ${site.name}.`;
            break;
    }

    return {
        title: title.includes(site.name) ? title : `${title} | ${site.name}`,
        description,
        keywords: countryConfig.keywords.join(', '),
        geoRegion: countryConfig.geoRegion,
        geoPlacename: countryConfig.geoPlacename,
        locale: countryConfig.locale,
    };
}

/**
 * Generate country-specific business schema
 */
export function generateCountryBusinessSchema(countryConfig: CountrySEOConfig, site: SiteBrandingConfig) {
    const address: any = {
        '@type': 'PostalAddress',
        addressCountry: countryConfig.countryCode,
        ...(countryConfig.contactInfo.address.addressLocality && countryConfig.contactInfo.address.addressLocality.trim()
            ? { addressLocality: countryConfig.contactInfo.address.addressLocality }
            : {}),
        ...(countryConfig.contactInfo.address.addressRegion && countryConfig.contactInfo.address.addressRegion.trim()
            ? { addressRegion: countryConfig.contactInfo.address.addressRegion }
            : {}),
    };

    const contactPoint: any = {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        areaServed: countryConfig.countryCode,
        availableLanguage: 'English',
        ...((countryConfig.contactInfo.email && countryConfig.contactInfo.email.trim())
            ? { email: countryConfig.contactInfo.email }
            : (site.email && site.email.trim() ? { email: site.email } : {})),
        ...((countryConfig.contactInfo.phone && countryConfig.contactInfo.phone.trim())
            ? { telephone: countryConfig.contactInfo.phone }
            : (site.phone && site.phone.trim() ? { telephone: site.phone } : {})),
    };

    const sameAs: string[] = [];
    if (site.socialMedia?.facebook) sameAs.push(site.socialMedia.facebook);
    if (site.socialMedia?.twitter) {
        sameAs.push(site.socialMedia.twitter.startsWith('http')
            ? site.socialMedia.twitter
            : `https://twitter.com/${site.socialMedia.twitter.replace('@', '')}`);
    }
    if (site.socialMedia?.instagram) {
        sameAs.push(site.socialMedia.instagram.startsWith('http')
            ? site.socialMedia.instagram
            : `https://instagram.com/${site.socialMedia.instagram.replace('@', '')}`);
    }
    if (site.socialMedia?.tiktok) {
        sameAs.push(site.socialMedia.tiktok.startsWith('http')
            ? site.socialMedia.tiktok
            : `https://tiktok.com/${site.socialMedia.tiktok.replace('@', '')}`);
    }
    if (site.socialMedia?.pinterest) sameAs.push(site.socialMedia.pinterest);
    if (site.socialMedia?.youtube) sameAs.push(site.socialMedia.youtube);

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: countryConfig.businessName,
        alternateName: site.name,
        url: `${site.url}?country=${countryConfig.countryCode.toLowerCase()}`,
        logo: `${site.url}${site.logo}`,
        description: countryConfig.businessDescription,
        address,
        contactPoint,
        ...(sameAs.length ? { sameAs } : {}),
        areaServed: {
            '@type': 'Country',
            name: countryConfig.name,
        },
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Product Catalog',
            itemListElement: countryConfig.popularCategories.map(category => ({
                '@type': 'Offer',
                itemOffered: {
                    '@type': 'Product',
                    category: category,
                },
            })),
        },
    };
}
