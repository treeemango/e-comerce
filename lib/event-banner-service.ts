// Event Banner Service
// Fetches dynamic AI-generated hero banners based on user's country and current events

import { supabase } from './supabase';

export interface EventBannerData {
    headline: string;
    subheadline: string;
    cta: string;
    backgroundColor: string;
    accentColor: string;
    vibe: 'romantic' | 'festive' | 'patriotic' | 'premium' | 'fun' | 'spiritual';
    eventName: string;
    countryCode: string;
    fromCache?: boolean;
    urgencyText?: string;
    hasCountdown?: boolean;
    iconKey?: string | null;
    // AI-generated section titles
    lightningDealsTitle?: string | null;
    lightningDealsHeadline?: string | null;
    lightningDealsSubtitle?: string | null;
    trendingTitle?: string | null;
    trendingSubtitle?: string | null;
    searchQuery?: string | null;
}

// Trust badges for hero section
export const TRUST_BADGES = [
    { icon: 'star', text: '4.9 Rating', color: '#fbbf24' },
    { icon: 'local_shipping', text: 'Free Delivery Over KSh 5K', color: '#22c55e' },
    { icon: 'lock', text: 'Secure Checkout', color: '#3b82f6' }
];

// Dynamic section titles based on event/vibe
export const SECTION_TITLES = {
    lightningDeals: {
        default: {
            title: '⚡ Flash Drops',
            headline: 'Gone in a Flash — Act Now',
            subtitle: "Prices this low won't last. Blink and you'll miss it."
        },
        festive: {
            title: '🎁 Festive Flash',
            headline: 'Holiday Deals Disappearing Fast',
            subtitle: 'Grab these seasonal steals before midnight!'
        },
        romantic: {
            title: '💝 Love Deals',
            headline: 'Gifts That Say "I Love You"',
            subtitle: 'Perfect presents at perfect prices. Limited time!'
        },
        patriotic: {
            title: '🎉 National Deals',
            headline: 'Celebrate with Massive Savings',
            subtitle: 'Proud prices for a proud nation!'
        },
        spiritual: {
            title: '🌙 Blessed Deals',
            headline: 'Sacred Savings Await',
            subtitle: 'Share the blessings with deals that give back.'
        },
        fun: {
            title: '🔥 Hot Drops',
            headline: 'Fresh Finds, Fresher Prices',
            subtitle: 'New season, new deals. Get them while hot!'
        },
        premium: {
            title: '✨ Elite Deals',
            headline: 'Premium Quality, Unreal Prices',
            subtitle: 'Luxury for less. Today only.'
        }
    },
    trendingDeals: {
        default: {
            title: '🔥 HOT RIGHT NOW',
            subtitle: "WHAT EVERYONE'S BUYING"
        },
        festive: {
            title: '🎄 FESTIVE FAVORITES',
            subtitle: 'TOP PICKS THIS SEASON'
        },
        romantic: {
            title: '❤️ LOVE IS IN THE AIR',
            subtitle: 'MOST WANTED GIFTS'
        },
        patriotic: {
            title: '🇰🇪 LOCAL PRIDE',
            subtitle: 'MADE FOR YOU'
        },
        spiritual: {
            title: '🌙 BLESSED PICKS',
            subtitle: 'MOST POPULAR THIS SEASON'
        },
        fun: {
            title: '🚀 TRENDING NOW',
            subtitle: 'WHAT THE WORLD WANTS'
        },
        premium: {
            title: '💎 CURATED FOR YOU',
            subtitle: 'HANDPICKED EXCELLENCE'
        }
    }
};

// Helper to get section titles based on event banner
export function getSectionTitles(eventBanner: EventBannerData | null) {
    const vibe = eventBanner?.vibe || 'default';
    const vibeDefaults = {
        lightningDeals: SECTION_TITLES.lightningDeals[vibe] || SECTION_TITLES.lightningDeals.default,
        trendingDeals: SECTION_TITLES.trendingDeals[vibe] || SECTION_TITLES.trendingDeals.default
    };

    // Prioritize AI-generated titles if available
    return {
        lightningDeals: {
            title: eventBanner?.lightningDealsTitle || vibeDefaults.lightningDeals.title,
            headline: eventBanner?.lightningDealsHeadline || vibeDefaults.lightningDeals.headline,
            subtitle: eventBanner?.lightningDealsSubtitle || vibeDefaults.lightningDeals.subtitle
        },
        trendingDeals: {
            title: eventBanner?.trendingTitle || vibeDefaults.trendingDeals.title,
            subtitle: eventBanner?.trendingSubtitle || vibeDefaults.trendingDeals.subtitle
        }
    };
}

const BANNER_CACHE_KEY = 'event_banner_cache_v3';
const BANNER_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours client-side

interface CachedBanner {
    data: EventBannerData;
    expiresAt: number;
    countryCode: string;
}

// ============================================================
// COUNTRY DETECTION (reusing currency-service logic)
// ============================================================
export async function detectUserCountry(): Promise<string> {
    // Check localStorage for cached country
    if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('detected_country');
        if (cached) return cached;
    }

    // Try IP-based detection
    try {
        const geoApis = [
            'https://ipapi.co/json/',
            'https://ip-api.com/json/',
        ];

        for (const apiUrl of geoApis) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                });

                if (!response.ok) continue;

                const data = await response.json();
                const countryCode = data.country_code || data.countryCode;

                if (countryCode) {
                    // Cache for future use
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('detected_country', countryCode);
                    }
                    console.log('[EventBanner] Detected country:', countryCode);
                    return countryCode;
                }
            } catch {
                continue;
            }
        }
    } catch (error) {
        console.warn('[EventBanner] Country detection failed:', error);
    }

    return 'GLOBAL';
}

// ============================================================
// BANNER FETCHING
// ============================================================
export async function fetchEventBanner(countryCode?: string): Promise<EventBannerData | null> {
    try {
        // Use provided country or detect
        const country = countryCode || await detectUserCountry();

        // Check client-side cache first
        const cached = getLocalCachedBanner(country);
        if (cached) {
            console.log('[EventBanner] Using client-cached banner');
            return cached;
        }

        // Call edge function
        const { data, error } = await supabase.functions.invoke('generate-hero-banner', {
            body: { country_code: country }
        });

        if (error) {
            console.error('[EventBanner] Edge function error:', error);
            return getDefaultBanner();
        }

        const banner: EventBannerData = {
            headline: data.headline,
            subheadline: data.subheadline,
            cta: data.cta,
            backgroundColor: data.backgroundColor,
            accentColor: data.accentColor,
            vibe: data.vibe,
            eventName: data.eventName,
            countryCode: data.countryCode,
            fromCache: data.fromCache,
            urgencyText: data.urgencyText,
            hasCountdown: data.hasCountdown,
            iconKey: data.iconKey,
            lightningDealsTitle: data.lightningDealsTitle,
            lightningDealsHeadline: data.lightningDealsHeadline,
            lightningDealsSubtitle: data.lightningDealsSubtitle,
            trendingTitle: data.trendingTitle,
            trendingSubtitle: data.trendingSubtitle,
            searchQuery: data.searchQuery
        };

        // Cache locally
        setLocalCachedBanner(country, banner);

        console.log('[EventBanner] Fetched banner:', banner.eventName, 'for', country);
        return banner;

    } catch (error) {
        console.error('[EventBanner] Error fetching banner:', error);
        return getDefaultBanner();
    }
}

// ============================================================
// LOCAL CACHING
// ============================================================
function getLocalCachedBanner(countryCode: string): EventBannerData | null {
    if (typeof window === 'undefined') return null;

    try {
        const raw = localStorage.getItem(BANNER_CACHE_KEY);
        if (!raw) return null;

        const cached: CachedBanner = JSON.parse(raw);

        // Check if expired or different country
        if (cached.expiresAt <= Date.now() || cached.countryCode !== countryCode) {
            localStorage.removeItem(BANNER_CACHE_KEY);
            return null;
        }

        return cached.data;
    } catch {
        return null;
    }
}

function setLocalCachedBanner(countryCode: string, data: EventBannerData): void {
    if (typeof window === 'undefined') return;

    try {
        const cached: CachedBanner = {
            data,
            expiresAt: Date.now() + BANNER_CACHE_TTL_MS,
            countryCode
        };
        localStorage.setItem(BANNER_CACHE_KEY, JSON.stringify(cached));
    } catch {
        // Ignore storage errors
    }
}

// ============================================================
// DEFAULT BANNER
// ============================================================
function getDefaultBanner(): EventBannerData {
    return {
        headline: "Discover Premium Deals ✨",
        subheadline: "Best prices on quality products from around the world",
        cta: "Shop Now",
        backgroundColor: "#1a1a2e",
        accentColor: "#f59e0b",
        vibe: "premium",
        eventName: "default",
        countryCode: "GLOBAL",
        iconKey: 'diamond'
    };
}

// ============================================================
// UTILITY: Generate gradient from banner colors
// ============================================================
export function getBannerGradient(banner: EventBannerData): string {
    const { backgroundColor, accentColor } = banner;

    // Create a subtle gradient using the background color
    // Darken the background for one end, use accent as highlight
    return `linear-gradient(135deg, ${backgroundColor} 0%, ${adjustColor(backgroundColor, -20)} 50%, ${backgroundColor} 100%)`;
}

function adjustColor(hex: string, percent: number): string {
    // Simple color adjustment
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;

    return '#' + (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}

// ============================================================
// HOOKS (if using React)
// ============================================================
export function useEventBanner() {
    // This can be imported and used with React hooks
    // Example usage in component:
    // const [banner, setBanner] = useState<EventBannerData | null>(null);
    // useEffect(() => { fetchEventBanner().then(setBanner); }, []);
    return { fetchEventBanner, detectUserCountry };
}
