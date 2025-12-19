// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface Product {
    id: string;
    title: string;
    price: string;
    imageUrl: string;
    description?: string;
    brand?: string;
    stock?: string;
    reason?: string;
    isConfidenceBoost?: boolean;
    tags?: {
        useCases: string[];
        occasions: string[];
    };
    features?: string[];
    specs?: Record<string, any>;
    comparisonScore?: number;
    category?: string;
}

interface ChatMessage {
    role: string;
    content: string;
}

interface ShoppingAction {
    type: string;
    label: string;
    action: string;
    payload?: any;
}

interface RequestAnalysis {
    // Universal Intents
    isComparison: boolean;
    comparisonProducts?: string[];
    isAskingWhy: boolean;
    isAskingForBest: boolean;
    isAskingFeatures: boolean;

    // Product Categories (auto-detected)
    detectedCategory?: string;
    detectedProductType?: string;

    // Context
    budget?: number;
    urgency: 'urgent' | 'normal';
    occasion?: string;

    // Special Cases
    isCelebrityLook: boolean;
    isHomeDecor: boolean;
    isElectronics: boolean;
    isFashion: boolean;
}

// Constants
const GROK_API_KEY = Deno.env.get("GROK_API_KEY")!;
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_SEARCH_RESULTS = 20;
const FALLBACK_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// UNIVERSAL PRODUCT CATEGORY DETECTION
function detectProductCategory(userQuery: string): { category?: string; productType?: string } {
    const query = userQuery.toLowerCase();

    // Electronics & Tech
    if (query.match(/(phone|smartphone|iphone|samsung|tecno|infinix)/i)) {
        return { category: 'electronics', productType: 'phone' };
    }
    if (query.match(/(laptop|macbook|computer|notebook|dell|hp)/i)) {
        return { category: 'electronics', productType: 'laptop' };
    }
    if (query.match(/(tv|television|smart tv|led|oled)/i)) {
        return { category: 'electronics', productType: 'tv' };
    }
    if (query.match(/(speaker|sound|audio|bluetooth|wireless|headphone|earphone)/i)) {
        return { category: 'electronics', productType: 'audio' };
    }

    // Fashion & Clothing
    if (query.match(/(dress|gown|outfit|clothing|fashion|wear|shirt|jeans|shoes)/i)) {
        return { category: 'fashion', productType: 'clothing' };
    }
    if (query.match(/(shoe|sneaker|boot|heels|footwear)/i)) {
        return { category: 'fashion', productType: 'shoes' };
    }
    if (query.match(/(bag|purse|handbag|backpack)/i)) {
        return { category: 'fashion', productType: 'bag' };
    }

    // Home & Furniture
    if (query.match(/(sofa|couch|chair|table|furniture|bed|mattress)/i)) {
        return { category: 'home', productType: 'furniture' };
    }
    if (query.match(/(decor|decoration|home|house|room|lighting|lamp|curtain)/i)) {
        return { category: 'home', productType: 'decor' };
    }
    if (query.match(/(kitchen|appliance|cooker|fridge|microwave|oven)/i)) {
        return { category: 'home', productType: 'appliance' };
    }

    // Beauty & Personal Care
    if (query.match(/(perfume|fragrance|makeup|cosmetic|skincare|cream|lipstick)/i)) {
        return { category: 'beauty', productType: 'beauty' };
    }

    // Sports & Outdoors
    if (query.match(/(sport|fitness|gym|running|exercise|bicycle|bike)/i)) {
        return { category: 'sports', productType: 'fitness' };
    }

    // Automotive
    if (query.match(/(car|vehicle|auto|motors|toyota|mercedes|bmw)/i)) {
        return { category: 'automotive', productType: 'car' };
    }

    return { category: 'general', productType: 'product' };
}

// UNIVERSAL INTENT ANALYSIS
function analyzeUniversalRequest(userQuery: string): RequestAnalysis {
    const query = userQuery.toLowerCase();
    const categoryInfo = detectProductCategory(userQuery);

    // Universal Intent Detection
    const comparisonMatch = query.match(/(compare|comparison|difference between|which is better|vs\.?|versus|contrast)/i);
    const productListMatch = query.match(/(\b\w+\b)(?:\s+and\s+|\s*,\s*|\s+vs\s+)(\b\w+\b)/i);

    const whyMatch = query.match(/(why|how come|reason|explain)/i);
    const bestMatch = query.match(/(best|top|recommend|suggest|good|great|quality)/i);
    const featuresMatch = query.match(/(feature|spec|specification|what can it do)/i);

    // Special Context Detection
    const celebrityMatch = query.match(/(rihanna|beyonce|burna boy|celebrity|famous|star)/i);
    const homeMatch = query.match(/(home|house|room|apartment|decor|furnish)/i);
    const electronicsMatch = query.match(/(electronic|tech|gadget|device|digital)/i);
    const fashionMatch = query.match(/(fashion|style|outfit|wear|clothing|dress)/i);

    // Occasion Detection
    const valentineMatch = query.match(/(valentine|14 feb|date night|romantic)/i);
    const anniversaryMatch = query.match(/(anniversary|versary)/i);
    const interviewMatch = query.match(/(interview|job|office|professional)/i);

    // Budget Detection
    const budget = extractBudget(userQuery);

    return {
        // Universal Intents
        isComparison: !!comparisonMatch || !!productListMatch,
        comparisonProducts: productListMatch ? [productListMatch[1], productListMatch[2]] : undefined,
        isAskingWhy: !!whyMatch,
        isAskingForBest: !!bestMatch,
        isAskingFeatures: !!featuresMatch,

        // Auto-detected Categories
        detectedCategory: categoryInfo.category,
        detectedProductType: categoryInfo.productType,

        // Context
        budget: budget,
        urgency: query.includes('soon') || query.includes('quick') || query.includes('urgent') ? 'urgent' : 'normal',
        occasion: valentineMatch ? 'valentine' : anniversaryMatch ? 'anniversary' : interviewMatch ? 'interview' : undefined,

        // Special Cases
        isCelebrityLook: !!celebrityMatch,
        isHomeDecor: !!homeMatch,
        isElectronics: !!electronicsMatch || categoryInfo.category === 'electronics',
        isFashion: !!fashionMatch || categoryInfo.category === 'fashion'
    };
}

// UNIVERSAL SEARCH QUERY BUILDER
function buildUniversalSearchQuery(userQuery: string, analysis: RequestAnalysis) {
    const baseQuery = {
        search_query: userQuery,
        limit_count: MAX_SEARCH_RESULTS,
    };

    // COMPARISON REQUESTS - GET MORE PRODUCTS
    if (analysis.isComparison) {
        return {
            ...baseQuery,
            search_query: analysis.comparisonProducts ? analysis.comparisonProducts.join(' ') : userQuery,
            limit_count: 15,
        };
    }

    // "BEST" REQUESTS - PRIORITIZE QUALITY
    if (analysis.isAskingForBest) {
        return {
            ...baseQuery,
            use_case_tags: ['premium', 'high_quality', 'confidence_boost'],
            limit_count: 12,
        };
    }

    // "WHY" AND FEATURE REQUESTS
    if (analysis.isAskingWhy || analysis.isAskingFeatures) {
        return {
            ...baseQuery,
            limit_count: 8, // Fewer products for detailed explanations
        };
    }

    // CATEGORY-SPECIFIC OPTIMIZATIONS
    if (analysis.detectedCategory === 'electronics') {
        return {
            ...baseQuery,
            use_case_tags: analysis.isAskingForBest ? ['premium', 'high_quality'] : undefined,
        };
    }

    if (analysis.detectedCategory === 'fashion') {
        return {
            ...baseQuery,
            occasion: analysis.occasion,
            use_case_tags: analysis.isCelebrityLook ? ['celebrity_inspired', 'confidence_boost'] : undefined,
        };
    }

    if (analysis.detectedCategory === 'home') {
        return {
            ...baseQuery,
            use_case_tags: analysis.isHomeDecor ? ['home_decor', 'premium'] : undefined,
        };
    }

    return baseQuery;
}

// UNIVERSAL REPLY GENERATOR
function generateUniversalReply(analysis: RequestAnalysis, products: any[], userQuery: string) {
    const productCount = products.length;
    const category = analysis.detectedCategory;
    const productType = analysis.detectedProductType;

    // COMPARISON REPLIES
    if (analysis.isComparison) {
        if (productCount <= 2) {
            return `🔍 **Comparing ${productType || 'products'}**\n\nI found ${productCount} items to compare. Here are the key differences between them:`;
        }
        return `🔍 **Comparison: ${productType || 'Products'}**\n\nFound ${productCount} options. Here's how they compare on features, price, and quality:`;
    }

    // "BEST" REQUESTS
    if (analysis.isAskingForBest) {
        if (category && productType) {
            return `🏆 **Best ${productType}s**\n\nAfter reviewing ${productCount} options, these stand out for quality, features, and value. Perfect ${category === 'fashion' ? 'for your style' : 'for your needs'}!`;
        }
        return `🏆 **Top Recommendations**\n\nBased on ${productCount} products, these are my top picks for quality and value:`;
    }

    // "WHY" QUESTIONS
    if (analysis.isAskingWhy) {
        return `🎯 **Why These Are Great Choices**\n\nI've selected these based on quality, features, and customer satisfaction. Each has unique strengths worth considering:`;
    }

    // FEATURE QUESTIONS
    if (analysis.isAskingFeatures) {
        return `⚡ **Key Features**\n\nHere are the standout features and specifications of these ${productCount} ${productType || 'products'}:`;
    }

    // CATEGORY-SPECIFIC GREETINGS
    if (category === 'electronics') {
        return `🔌 **Great ${productType || 'Electronics'} Options**\n\nFound ${productCount} quality ${productType || 'tech'} products with the latest features and competitive prices:`;
    }

    if (category === 'fashion') {
        const occasionNote = analysis.occasion ? ` for ${analysis.occasion}` : '';
        return `👗 **Fashion Finds${occasionNote}**\n\nDiscovered ${productCount} stylish ${productType || 'clothing'} options that balance style, quality, and price:`;
    }

    if (category === 'home') {
        return `🏠 **Home ${productType ? productType.charAt(0).toUpperCase() + productType.slice(1) : 'Products'}**\n\nFound ${productCount} ${productType || 'home'} items to enhance your space with quality and style:`;
    }

    if (category === 'beauty') {
        return `💄 **Beauty Picks**\n\nDiscovered ${productCount} quality ${productType || 'beauty'} products that deliver great results:`;
    }

    // UNIVERSAL DEFAULT
    return `✨ **Found ${productCount} Quality Options**\n\nHere are the best matches for your search, carefully selected for quality and value:`;
}

// UNIVERSAL PRODUCT SCORING
function calculateUniversalScore(product: any, analysis: RequestAnalysis): number {
    let score = 0;

    // Base score from search ranking
    score += product.combined_score || 0;

    // Confidence boost bonus
    if (product.confidence_boost) score += 2;

    // Price scoring
    const price = product.product_price || product.price || 0;
    if (analysis.budget) {
        if (price <= analysis.budget * 0.3) score += 1; // Great value
        if (price <= analysis.budget * 0.7) score += 0.5; // Good value
    }

    // Category-specific bonuses
    if (analysis.detectedCategory === 'electronics') {
        if (product.use_case_tags?.includes('premium')) score += 1.5;
        if (product.use_case_tags?.includes('latest')) score += 1;
    }

    if (analysis.detectedCategory === 'fashion') {
        if (product.use_case_tags?.includes('confidence_boost')) score += 2;
        if (product.occasion_tags?.includes(analysis.occasion || '')) score += 1.5;
    }

    if (analysis.detectedCategory === 'home') {
        if (product.use_case_tags?.includes('premium')) score += 1;
        if (product.use_case_tags?.includes('space_saving')) score += 1;
    }

    return score;
}

// UNIVERSAL PRODUCT ENRICHMENT
function enhanceProductForDisplay(product: any, analysis: RequestAnalysis): Product {
    const baseProduct = {
        id: product.product_id || product.id,
        title: product.product_title || product.title,
        price: `KES ${(product.product_price || product.price || 0).toLocaleString()}`,
        imageUrl: product.primary_image_url || product.featured_image_url || FALLBACK_PRODUCT_IMAGE,
        reason: getUniversalProductReason(product, analysis),
        isConfidenceBoost: product.confidence_boost,
        tags: {
            useCases: product.use_case_tags || [],
            occasions: product.occasion_tags || [],
        },
        comparisonScore: calculateUniversalScore(product, analysis),
        category: analysis.detectedCategory,
    };

    // GENERATE UNIVERSAL FEATURES
    const features = [];
    const specs: Record<string, any> = {
        brand: product.brand_name || product.brand || 'Unknown',
        price: product.product_price || product.price,
    };

    // Electronics features
    if (analysis.isElectronics) {
        if (product.use_case_tags?.includes('wireless')) features.push('Wireless');
        if (product.use_case_tags?.includes('premium')) features.push('Premium Quality');
        if (product.use_case_tags?.includes('latest')) features.push('Latest Model');
    }

    // Fashion features
    if (analysis.isFashion) {
        if (product.use_case_tags?.includes('confidence_boost')) features.push('Style Booster');
        if (product.occasion_tags?.length > 0) features.push(`Perfect for ${product.occasion_tags[0]}`);
        if (product.use_case_tags?.includes('premium')) features.push('Premium Fabric');
    }

    // Home features
    if (analysis.isHomeDecor) {
        if (product.use_case_tags?.includes('space_saving')) features.push('Space Saving');
        if (product.use_case_tags?.includes('premium')) features.push('Premium Design');
        if (product.use_case_tags?.includes('easy_clean')) features.push('Easy to Clean');
    }

    // Budget features
    const price = product.product_price || product.price || 0;
    if (analysis.budget && price <= analysis.budget * 0.3) {
        features.push('Great Value');
    }

    return {
        ...baseProduct,
        features: features.length > 0 ? features : ['Quality Build', 'Good Performance'],
        specs: specs
    };
}

// UNIVERSAL PRODUCT REASONING
function getUniversalProductReason(product: any, analysis: RequestAnalysis): string {
    const reasons = [];

    // Comparison context
    if (analysis.isComparison && product.comparisonScore && product.comparisonScore > 3) {
        reasons.push("Top rated in comparison");
    }

    // "Best" context
    if (analysis.isAskingForBest) {
        if (product.use_case_tags?.includes('premium')) {
            reasons.push("Premium choice");
        }
        if (product.confidence_boost) {
            reasons.push("Highly recommended");
        }
    }

    // Category-specific reasons
    if (analysis.isElectronics) {
        if (product.use_case_tags?.includes('latest')) {
            reasons.push("Latest features");
        }
        if (product.use_case_tags?.includes('high_quality')) {
            reasons.push("Great performance");
        }
    }

    if (analysis.isFashion) {
        if (product.confidence_boost) {
            reasons.push("Style booster");
        }
        if (product.occasion_tags?.includes(analysis.occasion || '')) {
            reasons.push(`Perfect for ${analysis.occasion}`);
        }
    }

    if (analysis.isHomeDecor) {
        if (product.use_case_tags?.includes('space_saving')) {
            reasons.push("Space efficient");
        }
        if (product.use_case_tags?.includes('premium')) {
            reasons.push("Premium design");
        }
    }

    // Budget reasons
    if (analysis.budget) {
        const price = product.product_price || product.price || 0;
        if (price <= analysis.budget * 0.3) {
            reasons.push("Great value");
        }
    }

    return reasons.length > 0 ? reasons.join(" • ") : "Quality choice";
}

// UNIVERSAL PRODUCT BUNDLING
function bundleUniversalProducts(products: any[], analysis: RequestAnalysis, maxBudget?: number) {
    let sorted = [...products];

    // SMART SORTING
    if (analysis.isComparison || analysis.isAskingForBest) {
        sorted.sort((a, b) => {
            const aScore = calculateUniversalScore(a, analysis);
            const bScore = calculateUniversalScore(b, analysis);
            return bScore - aScore; // Best first
        });
    } else if (analysis.budget || maxBudget) {
        const budget = maxBudget || analysis.budget;
        sorted.sort((a, b) => {
            const aPrice = a.product_price || a.price || 0;
            const bPrice = b.product_price || b.price || 0;
            const aScore = (a.confidence_boost ? 2 : 0) + (budget && aPrice <= budget * 0.3 ? 1 : 0);
            const bScore = (b.confidence_boost ? 2 : 0) + (budget && bPrice <= budget * 0.3 ? 1 : 0);
            return bScore - aScore || aPrice - bPrice;
        });

        if (budget) {
            sorted = sorted.filter(product => {
                const price = product.product_price || product.price || 0;
                return price <= budget;
            });
        }
    }

    // DETERMINE PRODUCT COUNT
    let productLimit = 6; // Default

    if (analysis.isComparison) productLimit = 8;
    if (analysis.isAskingForBest) productLimit = 6;
    if (analysis.isAskingWhy || analysis.isAskingFeatures) productLimit = 4;

    return {
        products: sorted.slice(0, productLimit),
        totalFound: sorted.length
    };
}

// UNIVERSAL ACTIONS GENERATOR
function generateUniversalActions(analysis: RequestAnalysis, productCount: number): ShoppingAction[] {
    const actions: ShoppingAction[] = [];

    // COMPARISON ACTIONS
    if (analysis.isComparison && productCount > 1) {
        actions.push(
            { type: "button", label: "📊 Compare Features", action: "show_comparison" },
            { type: "button", label: "💰 Price Comparison", action: "compare_prices" }
        );
    }

    // CATEGORY-SPECIFIC ACTIONS
    if (analysis.isElectronics) {
        actions.push(
            { type: "button", label: "🔧 Tech Specs", action: "show_specs" },
            { type: "button", label: "⭐ Top Rated", action: "sort_rating" }
        );
    } else if (analysis.isFashion) {
        actions.push(
            { type: "button", label: "👗 Style Guide", action: "show_styling" },
            { type: "button", label: "🎯 Occasion", action: "filter_occasion" }
        );
    } else if (analysis.isHomeDecor) {
        actions.push(
            { type: "button", label: "🏠 Home Style", action: "show_styling" },
            { type: "button", label: "📏 Dimensions", action: "show_specs" }
        );
    }

    // UNIVERSAL ACTIONS
    if (analysis.budget) {
        actions.push({ type: "button", label: "💸 Budget Picks", action: "sort_cheap" });
    } else {
        actions.push({ type: "button", label: "💰 Sort by Price", action: "sort_price" });
    }

    actions.push(
        { type: "button", label: "⭐ Premium", action: "sort_premium" },
        { type: "button", label: "🔥 Trending", action: "show_trending" }
    );

    return actions.slice(0, 4);
}

// MAIN SERVE FUNCTION
serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { messages, imageUrl, imageId, userId, sessionId } = await req.json();
        const userQuery = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1]?.content ?? '' : '';
        const effectiveSessionId = sessionId || crypto.randomUUID();

        console.log('[UNIVERSAL-CHAT] Request:', { query: userQuery });

        // UNIVERSAL ANALYSIS
        const analysis = analyzeUniversalRequest(userQuery);
        console.log('[UNIVERSAL-CHAT] Analysis:', analysis);

        // BUILD SEARCH QUERY
        const searchQuery = buildUniversalSearchQuery(userQuery, analysis);

        // PERFORM SEARCH
        const searchParams: any = {
            search_query: searchQuery.search_query,
            visual_search_image_id: imageId || null,
            occasion: searchQuery.occasion,
            limit_count: searchQuery.limit_count,
        };

        if (analysis.budget) searchParams.price_max = analysis.budget;
        if (searchQuery.use_case_tags) searchParams.use_case_tags = searchQuery.use_case_tags;

        const { data: products, error } = await supabase.rpc("unified_product_search", searchParams);

        if (error) {
            console.error('[UNIVERSAL-CHAT] RPC error:', error);
            return handleUniversalEmptyResponse(userQuery, analysis);
        }

        // PROCESS PRODUCTS
        const bundle = bundleUniversalProducts(products || [], analysis, analysis.budget);
        const enhancedCatalog = bundle.products.map((product: any) =>
            enhanceProductForDisplay(product, analysis)
        );

        // GENERATE REPLY
        const reply = generateUniversalReply(analysis, enhancedCatalog, userQuery);

        // BUILD RESPONSE
        const response = {
            reply: reply,
            products: enhancedCatalog,
            actions: generateUniversalActions(analysis, enhancedCatalog.length),
            metadata: {
                analysis: analysis,
                productCount: enhancedCatalog.length,
                totalFound: bundle.totalFound,
                category: analysis.detectedCategory,
                productType: analysis.detectedProductType
            }
        };

        console.log('[UNIVERSAL-CHAT] Response:', {
            products: enhancedCatalog.length,
            category: analysis.detectedCategory
        });

        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error("Universal chat error:", err);
        return new Response(JSON.stringify({
            reply: "I'm having trouble accessing our catalog right now. Please try again in a moment!",
            products: [],
            actions: [
                { type: 'button', label: 'Try again', action: 'retry' },
                { type: 'button', label: 'Browse all', action: 'browse_all' },
            ]
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
});

// HELPER FUNCTIONS
function extractBudget(userQuery: string): number | null {
    const query = userQuery.toLowerCase();
    const underMatch = query.match(/(under|below|less than)\s*(\d+)\s*(k|ksh|kes|thousand)?/i);
    if (underMatch) {
        const amount = parseInt(underMatch[2]);
        return underMatch[3] ? amount * 1000 : amount;
    }
    const directMatch = query.match(/(\d+)\s*(k|ksh|kes|bob|thousand)/i);
    if (directMatch) {
        const amount = parseInt(directMatch[1]);
        return directMatch[2] ? amount * 1000 : amount;
    }
    return null;
}

function handleUniversalEmptyResponse(userQuery: string, analysis: RequestAnalysis) {
    const category = analysis.detectedCategory;
    const productType = analysis.detectedProductType;

    let reply = "I couldn't find any matching products. Try different search terms?";

    if (category && productType) {
        reply = `I couldn't find ${productType}s matching your criteria. Try searching for different ${category} products?`;
    } else if (category) {
        reply = `I couldn't find ${category} products matching your search. Try different terms?`;
    }

    return new Response(JSON.stringify({
        reply: reply,
        products: [],
        actions: [
            { type: 'button', label: 'Browse categories', action: 'browse_categories' },
            { type: 'button', label: 'New search', action: 'new_search' },
        ]
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

export { analyzeUniversalRequest };