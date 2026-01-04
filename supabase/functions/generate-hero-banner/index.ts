// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface HeroBannerData {
    headline: string;
    subheadline: string;
    cta: string;
    backgroundColor: string;
    accentColor: string;
    vibe: 'romantic' | 'festive' | 'patriotic' | 'premium' | 'fun' | 'spiritual';
    urgencyText?: string;    // "Ends Midnight!" or "Last Day!"
    hasCountdown?: boolean;  // Show countdown timer
    iconKey?: string;        // one of approved local icon keys
    iconKeys?: string[];     // Array of icons for multi-layout
    layout?: 'left' | 'center' | 'spaced';
    // AI-generated section titles
    lightningDealsTitle?: string;     // e.g. "🎒 School Season Steals"
    lightningDealsHeadline?: string;  // e.g. "Gear Up for Less!"
    lightningDealsSubtitle?: string;  // e.g. "Fresh finds for the new term"
    trendingTitle?: string;           // e.g. "📚 BACK TO SCHOOL PICKS"
    trendingSubtitle?: string;        // e.g. "WHAT STUDENTS LOVE"
    searchQuery?: string;             // AI-generated search term for "Shop Now"
}

const APPROVED_ICON_KEYS = [
    'bolt',
    'backpack',
    'gift',
    'heart',
    'moon',
    'flag',
    'diamond',
    'fireworks',
    'shopping_bag',
    'truck',
    'star',
    'crown',
    'rocket',
    'savings',
    'flash',
    'calendar',
    'card',
    'package',
    'balloons',
    'confetti',
    'flag_ke',
    'flag_ng',
    'flag_za',
    'flag_tz',
    'flag_ug',
    'flag_gh'
] as const;

function pickFallbackIconKey(eventName: string, vibe: string): string {
    const name = (eventName || '').toLowerCase();
    if (name.includes('school')) return 'backpack';

    switch ((vibe || '').toLowerCase()) {
        case 'romantic':
            return 'heart';
        case 'festive':
            return 'gift';
        case 'patriotic':
            return 'flag';
        case 'spiritual':
            return 'moon';
        case 'fun':
            return 'fireworks';
        case 'premium':
            return 'diamond';
        default:
            return 'bolt';
    }
}

function normalizeIconKey(value: unknown, eventName: string, vibe: string): string {
    if (typeof value === 'string' && APPROVED_ICON_KEYS.includes(value as any)) return value;
    return pickFallbackIconKey(eventName, vibe);
}

interface EventInfo {
    name: string;
    start: string;  // "MM-DD"
    end: string;    // "MM-DD"
    priority: number;
    countries: string[];  // ISO country codes, empty = global
    vibe: string;
}

// Constants
const GROK_API_KEY = Deno.env.get("GROK_API_KEY")!;
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ============================================================
// GLOBAL EVENT DATABASE (50+ countries)
// ============================================================
const EVENTS: EventInfo[] = [
    // ===== GLOBAL EVENTS =====
    { name: "New Year", start: "12-27", end: "01-05", priority: 9, countries: [], vibe: "festive" },
    { name: "Valentine's Day", start: "02-01", end: "02-18", priority: 10, countries: [], vibe: "romantic" },
    { name: "Easter", start: "03-20", end: "04-20", priority: 8, countries: [], vibe: "spiritual" },
    { name: "Black Friday", start: "11-20", end: "11-30", priority: 10, countries: [], vibe: "premium" },
    { name: "Cyber Monday", start: "12-01", end: "12-03", priority: 9, countries: [], vibe: "premium" },
    { name: "Christmas", start: "12-01", end: "12-26", priority: 10, countries: [], vibe: "festive" },

    // ===== AFRICA =====
    // Kenya
    { name: "Jamhuri Day", start: "12-12", end: "12-12", priority: 9, countries: ["KE"], vibe: "patriotic" },
    { name: "Mashujaa Day", start: "10-20", end: "10-20", priority: 8, countries: ["KE"], vibe: "patriotic" },
    { name: "Madaraka Day", start: "06-01", end: "06-01", priority: 8, countries: ["KE"], vibe: "patriotic" },
    { name: "Back to School KE", start: "01-01", end: "01-31", priority: 7, countries: ["KE"], vibe: "fun" },

    // Nigeria
    { name: "Nigeria Independence Day", start: "10-01", end: "10-01", priority: 9, countries: ["NG"], vibe: "patriotic" },
    { name: "Democracy Day", start: "06-12", end: "06-12", priority: 8, countries: ["NG"], vibe: "patriotic" },

    // South Africa
    { name: "Freedom Day", start: "04-27", end: "04-27", priority: 9, countries: ["ZA"], vibe: "patriotic" },
    { name: "Heritage Day", start: "09-24", end: "09-24", priority: 8, countries: ["ZA"], vibe: "patriotic" },
    { name: "Youth Day", start: "06-16", end: "06-16", priority: 8, countries: ["ZA"], vibe: "patriotic" },

    // Tanzania
    { name: "Tanzania Independence Day", start: "12-09", end: "12-09", priority: 9, countries: ["TZ"], vibe: "patriotic" },
    { name: "Union Day", start: "04-26", end: "04-26", priority: 8, countries: ["TZ"], vibe: "patriotic" },

    // Uganda
    { name: "Uganda Independence Day", start: "10-09", end: "10-09", priority: 9, countries: ["UG"], vibe: "patriotic" },

    // Ghana
    { name: "Ghana Independence Day", start: "03-06", end: "03-06", priority: 9, countries: ["GH"], vibe: "patriotic" },

    // Rwanda
    { name: "Rwanda Liberation Day", start: "07-04", end: "07-04", priority: 9, countries: ["RW"], vibe: "patriotic" },

    // Egypt
    { name: "Egypt Revolution Day", start: "07-23", end: "07-23", priority: 9, countries: ["EG"], vibe: "patriotic" },

    // ===== AMERICAS =====
    // USA
    { name: "Independence Day USA", start: "07-04", end: "07-04", priority: 10, countries: ["US"], vibe: "patriotic" },
    { name: "Thanksgiving", start: "11-23", end: "11-28", priority: 9, countries: ["US"], vibe: "festive" },
    { name: "Memorial Day", start: "05-25", end: "05-31", priority: 8, countries: ["US"], vibe: "patriotic" },
    { name: "Labor Day USA", start: "09-01", end: "09-07", priority: 7, countries: ["US"], vibe: "fun" },
    { name: "Back to School USA", start: "08-01", end: "08-31", priority: 7, countries: ["US"], vibe: "fun" },

    // Canada
    { name: "Canada Day", start: "07-01", end: "07-01", priority: 9, countries: ["CA"], vibe: "patriotic" },
    { name: "Thanksgiving Canada", start: "10-08", end: "10-14", priority: 8, countries: ["CA"], vibe: "festive" },

    // Mexico
    { name: "Mexico Independence Day", start: "09-16", end: "09-16", priority: 9, countries: ["MX"], vibe: "patriotic" },
    { name: "Día de los Muertos", start: "11-01", end: "11-02", priority: 9, countries: ["MX"], vibe: "spiritual" },
    { name: "Cinco de Mayo", start: "05-05", end: "05-05", priority: 8, countries: ["MX"], vibe: "festive" },

    // Brazil
    { name: "Brazil Independence Day", start: "09-07", end: "09-07", priority: 9, countries: ["BR"], vibe: "patriotic" },
    { name: "Carnaval", start: "02-20", end: "02-25", priority: 10, countries: ["BR"], vibe: "fun" },

    // Argentina
    { name: "Argentina Independence Day", start: "07-09", end: "07-09", priority: 9, countries: ["AR"], vibe: "patriotic" },

    // ===== EUROPE =====
    // UK
    { name: "Boxing Day", start: "12-26", end: "12-26", priority: 9, countries: ["GB"], vibe: "premium" },
    { name: "Bank Holiday August", start: "08-26", end: "08-31", priority: 7, countries: ["GB"], vibe: "fun" },

    // Germany
    { name: "German Unity Day", start: "10-03", end: "10-03", priority: 8, countries: ["DE"], vibe: "patriotic" },
    { name: "Oktoberfest", start: "09-16", end: "10-03", priority: 8, countries: ["DE"], vibe: "festive" },

    // France
    { name: "Bastille Day", start: "07-14", end: "07-14", priority: 9, countries: ["FR"], vibe: "patriotic" },

    // Spain
    { name: "Spain National Day", start: "10-12", end: "10-12", priority: 8, countries: ["ES"], vibe: "patriotic" },

    // Italy
    { name: "Italy Republic Day", start: "06-02", end: "06-02", priority: 8, countries: ["IT"], vibe: "patriotic" },

    // Ireland
    { name: "St. Patrick's Day", start: "03-17", end: "03-17", priority: 9, countries: ["IE"], vibe: "festive" },

    // ===== ASIA & MIDDLE EAST =====
    // UAE, Saudi Arabia, etc. (Islamic events - dates are approximate, update yearly)
    { name: "Eid al-Fitr", start: "03-30", end: "04-05", priority: 10, countries: ["AE", "SA", "EG", "ID", "MY", "PK", "BD", "KE", "NG", "TZ"], vibe: "spiritual" },
    { name: "Eid al-Adha", start: "06-06", end: "06-12", priority: 10, countries: ["AE", "SA", "EG", "ID", "MY", "PK", "BD", "KE", "NG", "TZ"], vibe: "spiritual" },
    { name: "Ramadan", start: "03-01", end: "03-29", priority: 9, countries: ["AE", "SA", "EG", "ID", "MY", "PK", "BD"], vibe: "spiritual" },

    // India
    { name: "Diwali", start: "10-20", end: "11-05", priority: 10, countries: ["IN"], vibe: "festive" },
    { name: "Holi", start: "03-10", end: "03-15", priority: 9, countries: ["IN"], vibe: "fun" },
    { name: "India Independence Day", start: "08-15", end: "08-15", priority: 9, countries: ["IN"], vibe: "patriotic" },
    { name: "Republic Day India", start: "01-26", end: "01-26", priority: 9, countries: ["IN"], vibe: "patriotic" },

    // China, Singapore, etc.
    { name: "Chinese New Year", start: "01-20", end: "02-10", priority: 10, countries: ["CN", "SG", "MY", "TW", "HK"], vibe: "festive" },
    { name: "Singles Day", start: "11-11", end: "11-11", priority: 10, countries: ["CN", "SG", "MY"], vibe: "premium" },

    // Japan
    { name: "Golden Week", start: "04-29", end: "05-05", priority: 8, countries: ["JP"], vibe: "festive" },

    // South Korea
    { name: "Chuseok", start: "09-10", end: "09-18", priority: 9, countries: ["KR"], vibe: "festive" },

    // ===== OCEANIA =====
    // Australia
    { name: "Australia Day", start: "01-26", end: "01-26", priority: 9, countries: ["AU"], vibe: "patriotic" },
    { name: "ANZAC Day", start: "04-25", end: "04-25", priority: 8, countries: ["AU", "NZ"], vibe: "patriotic" },

    // New Zealand
    { name: "Waitangi Day", start: "02-06", end: "02-06", priority: 9, countries: ["NZ"], vibe: "patriotic" },

    // ===== MOTHER'S/FATHER'S DAY (varies by country) =====
    { name: "Mother's Day", start: "05-01", end: "05-14", priority: 8, countries: ["US", "CA", "AU", "NZ", "IN", "SG", "ZA"], vibe: "romantic" },
    { name: "Mother's Day UK", start: "03-10", end: "03-20", priority: 8, countries: ["GB", "IE"], vibe: "romantic" },
    { name: "Father's Day", start: "06-10", end: "06-21", priority: 7, countries: ["US", "CA", "GB", "AU", "NZ", "IN", "SG", "ZA", "KE"], vibe: "fun" },
];

// ============================================================
// EVENT DETECTION
// ============================================================
function getCurrentEvents(countryCode: string): EventInfo[] {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const currentDate = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const countryUpper = countryCode.toUpperCase();
    const matchingEvents: EventInfo[] = [];

    for (const event of EVENTS) {
        const isGlobal = event.countries.length === 0;
        const isCountryMatch = event.countries.includes(countryUpper);

        if (!isGlobal && !isCountryMatch) continue;

        if (isDateInRange(currentDate, event.start, event.end)) {
            matchingEvents.push({
                ...event,
                priority: isCountryMatch ? event.priority + 5 : event.priority
            });
        }
    }

    return matchingEvents.sort((a, b) => b.priority - a.priority);
}

function isDateInRange(current: string, start: string, end: string): boolean {
    // Handle year wrap-around (e.g., Dec 27 - Jan 5)
    const [currentMonth, currentDay] = current.split('-').map(Number);
    const [startMonth, startDay] = start.split('-').map(Number);
    const [endMonth, endDay] = end.split('-').map(Number);

    const currentNum = currentMonth * 100 + currentDay;
    const startNum = startMonth * 100 + startDay;
    const endNum = endMonth * 100 + endDay;

    if (endNum >= startNum) {
        // Normal range (e.g., Feb 1 - Feb 18)
        return currentNum >= startNum && currentNum <= endNum;
    } else {
        // Year wrap-around (e.g., Dec 27 - Jan 5)
        return currentNum >= startNum || currentNum <= endNum;
    }
}

// ============================================================
// COUNTRY NAME MAPPING
// ============================================================
const COUNTRY_NAMES: Record<string, string> = {
    'KE': 'Kenya', 'NG': 'Nigeria', 'ZA': 'South Africa', 'TZ': 'Tanzania',
    'UG': 'Uganda', 'GH': 'Ghana', 'RW': 'Rwanda', 'EG': 'Egypt',
    'US': 'USA', 'CA': 'Canada', 'MX': 'Mexico', 'BR': 'Brazil', 'AR': 'Argentina',
    'GB': 'UK', 'DE': 'Germany', 'FR': 'France', 'ES': 'Spain', 'IT': 'Italy', 'IE': 'Ireland',
    'AE': 'UAE', 'SA': 'Saudi Arabia', 'IN': 'India', 'ID': 'Indonesia', 'MY': 'Malaysia',
    'PK': 'Pakistan', 'BD': 'Bangladesh', 'CN': 'China', 'JP': 'Japan', 'KR': 'South Korea',
    'SG': 'Singapore', 'TW': 'Taiwan', 'HK': 'Hong Kong',
    'AU': 'Australia', 'NZ': 'New Zealand',
};

// ============================================================
// GROK BANNER GENERATION
// ============================================================
async function generateBannerWithGrok(events: EventInfo[], countryCode: string): Promise<HeroBannerData> {
    const countryName = COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
    const primaryEvent = events[0];
    const eventNames = events.length > 0 ? events.map(e => e.name).join(", ") : 'normal shopping day';
    const vibe = primaryEvent?.vibe || 'premium';

    const prompt = `You are a dynamic e-commerce copywriter for JuaExpress.
Create a high-converting hero banner for ${countryName}.
Events happening now: ${eventNames}.
Your goal:
1. Create a combined theme if multiple events overlap.
2. If you know any other local events for ${countryName} on ${new Date().toISOString().split('T')[0]}, include them.
3. Be vibrant and local.

Return JSON ONLY:
{
  "headline": string,
  "subheadline": string,
  "cta": string,
  "backgroundColor": string (dark hex),
  "accentColor": string (contrasting hex),
  "vibe": string,
  "urgencyText": string or null,
  "hasCountdown": boolean,
  "iconKey": string (one from approved list),
  "iconKeys": string[] (up to 3 matching icons),
  "layout": "left" | "center",
  "lightningDealsTitle": string,
  "lightningDealsHeadline": string,
  "lightningDealsSubtitle": string,
  "trendingTitle": string,
  "trendingSubtitle": string,
  "searchQuery": string
}`;

    try {
        console.log('[HERO-BANNER] Calling Grok for:', eventNames);
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROK_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "grok-4-1-fast-non-reasoning",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
            }),
        });

        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Robust JSON extraction
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");

        const banner = JSON.parse(jsonMatch[0]);

        return {
            headline: banner.headline || "Discover Premium Deals ✨",
            subheadline: banner.subheadline || "Best prices on quality products",
            cta: banner.cta || "Shop Now",
            backgroundColor: banner.backgroundColor || "#1a1a2e",
            accentColor: banner.accentColor || "#f59e0b",
            vibe: banner.vibe || vibe,
            urgencyText: banner.urgencyText || null,
            hasCountdown: banner.hasCountdown || false,
            iconKey: normalizeIconKey(banner.iconKey, eventNames, banner.vibe || vibe),
            iconKeys: Array.isArray(banner.iconKeys)
                ? banner.iconKeys.map(k => normalizeIconKey(k, eventNames, vibe)).slice(0, 3)
                : [normalizeIconKey(banner.iconKey, eventNames, vibe)],
            layout: banner.layout || 'left',
            lightningDealsTitle: banner.lightningDealsTitle || null,
            lightningDealsHeadline: banner.lightningDealsHeadline || null,
            lightningDealsSubtitle: banner.lightningDealsSubtitle || null,
            trendingTitle: banner.trendingTitle || null,
            trendingSubtitle: banner.trendingSubtitle || null,
            searchQuery: banner.searchQuery || null
        };
    } catch (error) {
        console.error('[HERO-BANNER] Generation Error:', error);
        return getDefaultBanner(vibe, eventNames);
    }
}

function getDefaultBanner(vibe: string, eventName: string = 'default'): HeroBannerData {
    const icon = pickFallbackIconKey(eventName, vibe);
    const defaults: Record<string, HeroBannerData> = {
        romantic: {
            headline: "Love on Sale ❤️",
            subheadline: "Find the perfect gift at the perfect price",
            cta: "Shop Gifts",
            backgroundColor: "#4a1942",
            accentColor: "#ff6b9d",
            vibe: "romantic",
            iconKey: icon,
            iconKeys: [icon],
            layout: 'left',
            lightningDealsTitle: "💝 Love Deals",
            lightningDealsHeadline: "Gifts That Say I Love You",
            lightningDealsSubtitle: "Perfect presents at perfect prices. Limited time!",
            trendingTitle: "❤️ LOVE IS IN THE AIR",
            trendingSubtitle: "MOST WANTED GIFTS",
            searchQuery: "Romantic gifts for her"
        },
        festive: {
            headline: "Celebrate with Savings 🎉",
            subheadline: "Up to 70% off on festive favorites",
            cta: "Explore Deals",
            backgroundColor: "#1a472a",
            accentColor: "#ffd700",
            vibe: "festive",
            iconKey: icon,
            iconKeys: [icon],
            layout: 'left',
            lightningDealsTitle: "🎁 Festive Flash",
            lightningDealsHeadline: "Holiday Deals Disappearing Fast",
            lightningDealsSubtitle: "Grab these seasonal steals before midnight!",
            trendingTitle: "🎄 FESTIVE FAVORITES",
            trendingSubtitle: "TOP PICKS THIS SEASON",
            searchQuery: "Festive decorations"
        },
        patriotic: {
            headline: "Pride & Great Prices 🎯",
            subheadline: "Celebrate with unbeatable local deals",
            cta: "Shop Local",
            backgroundColor: "#1a1a2e",
            accentColor: "#22c55e",
            vibe: "patriotic",
            iconKey: icon,
            iconKeys: [icon],
            layout: 'left',
            lightningDealsTitle: "🎉 National Deals",
            lightningDealsHeadline: "Celebrate with Massive Savings",
            lightningDealsSubtitle: "Proud prices for a proud nation!",
            trendingTitle: "🇰🇪 LOCAL PRIDE",
            trendingSubtitle: "MADE FOR YOU",
            searchQuery: "Made in Kenya"
        },
        spiritual: {
            headline: "Blessings & Bargains 🌙",
            subheadline: "Sacred savings for you and your family",
            cta: "Discover More",
            backgroundColor: "#0f3460",
            accentColor: "#e2c044",
            vibe: "spiritual",
            iconKey: icon,
            iconKeys: [icon],
            layout: 'left',
            lightningDealsTitle: "🌙 Blessed Deals",
            lightningDealsHeadline: "Sacred Savings Await",
            lightningDealsSubtitle: "Share the blessings with deals that give back.",
            trendingTitle: "🌙 BLESSED PICKS",
            trendingSubtitle: "MOST POPULAR THIS SEASON",
            searchQuery: "Spiritual gifts"
        },
        fun: {
            headline: "Time to Save Big! 🚀",
            subheadline: "Grab the best deals before they're gone",
            cta: "Start Shopping",
            backgroundColor: "#16213e",
            accentColor: "#00d4ff",
            vibe: "fun",
            iconKey: icon,
            iconKeys: [icon],
            layout: 'left',
            lightningDealsTitle: "🔥 Hot Drops",
            lightningDealsHeadline: "Fresh Finds, Fresher Prices",
            lightningDealsSubtitle: "New season, new deals. Get them while hot!",
            trendingTitle: "🚀 TRENDING NOW",
            trendingSubtitle: "WHAT THE WORLD WANTS",
            searchQuery: "Trending electronics"
        },
        premium: {
            headline: "Premium Quality, Best Prices ✨",
            subheadline: "Discover exclusive deals on top brands",
            cta: "Shop Now",
            backgroundColor: "#1a1a2e",
            accentColor: "#f59e0b",
            vibe: "premium",
            iconKey: icon,
            iconKeys: [icon],
            layout: 'left',
            lightningDealsTitle: "✨ Elite Deals",
            lightningDealsHeadline: "Premium Quality, Unreal Prices",
            lightningDealsSubtitle: "Luxury for less. Today only.",
            trendingTitle: "💎 CURATED FOR YOU",
            trendingSubtitle: "HANDPICKED EXCELLENCE",
            searchQuery: "Luxury accessories"
        }
    };

    return defaults[vibe] || defaults.premium;
}

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        let countryCode = "GLOBAL";

        // Get country from request body or header
        if (req.method === "POST") {
            const body = await req.json().catch(() => ({}));
            countryCode = body.country_code || "GLOBAL";
        } else {
            // GET request - check headers
            countryCode = req.headers.get("x-country-code") || "GLOBAL";
        }

        countryCode = countryCode.toUpperCase();
        console.log('[HERO-BANNER] Request for country:', countryCode);

        // Detect current events
        const events = getCurrentEvents(countryCode);
        const compositeKey = events.length > 0 ? events.map(e => e.name).join("|") : "default";
        console.log('[HERO-BANNER] Composite Key:', compositeKey);

        // Check cache
        const { data: cached, error: cacheError } = await supabase.rpc('get_cached_hero_banner', {
            p_country_code: countryCode,
            p_event_name: compositeKey
        });

        if (!cacheError && cached?.[0]?.cache_status !== 'miss') {
            console.log('[HERO-BANNER] Cache hit');
            return new Response(JSON.stringify({
                ...cached[0].banner_data,
                eventName: compositeKey,
                countryCode: countryCode,
                fromCache: true
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Generate
        console.log('[HERO-BANNER] Cache miss, generating...');
        const banner = await generateBannerWithGrok(events, countryCode);

        // Cache expiration
        const now = new Date();
        const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

        // Save cache
        await supabase.rpc('upsert_hero_banner_cache', {
            p_country_code: countryCode,
            p_event_name: compositeKey,
            p_banner_data: banner,
            p_expires_at: endOfDay.toISOString()
        });

        return new Response(JSON.stringify({
            ...banner,
            eventName: compositeKey,
            countryCode: countryCode,
            fromCache: false
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error("[HERO-BANNER] Error:", err);

        // Return a safe default
        return new Response(JSON.stringify({
            headline: "Discover Premium Deals ✨",
            subheadline: "Best prices on quality products from around the world",
            cta: "Shop Now",
            backgroundColor: "#1a1a2e",
            accentColor: "#f59e0b",
            vibe: "premium",
            eventName: "default",
            countryCode: "GLOBAL",
            fromCache: false,
            error: true
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
});
