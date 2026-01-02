import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import { isAIFeatureEnabled } from '@/lib/ai-feature-flags';
import { SimpleMarkdown } from '@/components/SimpleMarkdown';

type ProductSpotlights = {
    feature_highlights?: string;
    vendor_highlights?: string;
    // Back-compat (older responses)
    supplier_highlights?: string;
    positive_retail_outlook?: string;
    suggested_questions?: string[];
    knowledge_base?: Record<string, string>;
};

function clampText(value: unknown, maxLen: number) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, Math.max(0, maxLen - 1)).trimEnd() + '…';
}

function normalizeSpotlights(raw: ProductSpotlights | null): ProductSpotlights | null {
    if (!raw) return null;

    const vendorHighlightsRaw = raw.vendor_highlights || raw.supplier_highlights;

    const suggested = Array.isArray(raw.suggested_questions)
        ? raw.suggested_questions
            .map(q => clampText(q, 80))
            .filter(Boolean)
            .slice(0, 6)
        : [];

    const normalized: ProductSpotlights = {
        feature_highlights: clampText(raw.feature_highlights, 240),
        vendor_highlights: clampText(vendorHighlightsRaw, 180),
        positive_retail_outlook: clampText(raw.positive_retail_outlook, 180),
        suggested_questions: suggested.length ? suggested : undefined,
        knowledge_base: typeof raw.knowledge_base === 'object' ? raw.knowledge_base : undefined,
    };

    const hasAny =
        !!normalized.feature_highlights ||
        !!normalized.vendor_highlights ||
        !!normalized.positive_retail_outlook ||
        !!normalized.suggested_questions?.length;

    return hasAny ? normalized : null;
}

function safeParseSpotlights(raw: unknown): ProductSpotlights | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.replace(/```json|```/g, '').trim();
    if (!trimmed) return null;
    try {
        const parsed = JSON.parse(trimmed);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as ProductSpotlights;
    } catch {
        return null;
    }
}

// Smart local answering - answers simple questions without calling AI API
function tryLocalAnswer(
    question: string,
    product: Product,
    vendorContext: any,
    fetchedAttributes?: { name: string; value: string }[],
    knowledgeBase?: Record<string, string>
): string | null {
    const q = question.toLowerCase().trim();
    const attributes = fetchedAttributes && fetchedAttributes.length > 0 ? fetchedAttributes : (product.attributes || []);
    const seller = vendorContext?.business_name || 'the seller';

    // Helper to find attribute value by name keywords with optional exclusions and unit hints
    const findAttribute = (include: string[], exclude: string[] = [], unitHints: string[] = []): string | null => {
        if (unitHints.length > 0) {
            for (const attr of attributes) {
                const name = attr.name?.toLowerCase() || '';
                const value = attr.value?.toLowerCase() || '';
                if (include.some(kw => name.includes(kw)) && !exclude.some(kw => name.includes(kw)) && unitHints.some(uh => value.includes(uh))) return attr.value;
            }
        }
        for (const attr of attributes) {
            const name = attr.name?.toLowerCase() || '';
            if (include.some(kw => name.includes(kw)) && !exclude.some(kw => name.includes(kw))) return attr.value;
        }
        return null;
    };

    // 1. Dynamic Knowledge Base Match (Highest Precision)
    if (knowledgeBase) {
        // Try exact match first
        for (const [pattern, attrName] of Object.entries(knowledgeBase)) {
            if (q.includes(pattern.toLowerCase())) {
                const attr = attributes.find(a => a.name.toLowerCase() === attrName.toLowerCase());
                if (attr) return `Based on our data, the ${attr.name} is ${attr.value}.`;
            }
        }
    }

    // 2. Specialized Universal Intents (High Confidence UX)
    const specIntents = [
        { triggers: ['color', 'colour', 'finish', 'shade'], attrs: ['color', 'colour', 'finish', 'shade'], template: (val: string) => `This product is available in ${val}.`, fallback: `Color options aren't specified. Please check with ${seller}.`, alwaysLocal: true },
        {
            triggers: ['storage', 'capacity', 'memory', 'gb', 'tb'],
            attrs: ['storage', 'memory', 'capacity', 'rom', 'disk', 'ssd'],
            exclude: ['battery', 'ram', 'expandable'],
            units: ['gb', 'tb', 'mb'],
            template: (val: string) => `The storage capacity is ${val}.`,
            alwaysLocal: true
        },
        {
            triggers: ['expandable'],
            attrs: ['expandable storage'],
            template: (val: string) => val.toLowerCase() === 'yes' ? 'Yes, this product supports expandable storage.' : `Expandable storage: ${val}.`,
            alwaysLocal: false
        },
        { triggers: ['battery', 'mah', 'runtime', 'power'], attrs: ['battery', 'power', 'mah', 'capacity', 'runtime'], exclude: ['storage', 'ram'], units: ['mah', 'wh', 'volts'], template: (val: string) => `The battery capacity is ${val}.`, alwaysLocal: true },
        { triggers: ['ram'], attrs: ['ram', 'system memory'], template: (val: string) => `The RAM is ${val}.`, alwaysLocal: true },
        { triggers: ['weight', 'heavy'], attrs: ['weight', 'mass'], units: ['kg', 'g', 'lb'], template: (val: string) => `The weight is ${val}.`, alwaysLocal: true },
        { triggers: ['warranty', 'guarantee'], attrs: ['warranty', 'guarantee'], template: (val: string) => `Warranty: ${val}.`, alwaysLocal: true },
        { triggers: ['charger', 'usb', 'box', 'includes', 'accessory'], attrs: ['charger', 'package', 'box', 'includes', 'contents', 'accessories'], template: (val: string) => `Included items: ${val}.`, fallback: `It is not specified if a charger or specific accessories are included. You can message ${seller} to confirm.`, alwaysLocal: true }
    ];

    for (const intent of specIntents) {
        if (intent.triggers.some(t => q.includes(t))) {
            const val = findAttribute(intent.attrs, intent.exclude || [], intent.units || []);
            if (val) {
                // Handle "Yes/No" values gracefully in the general template if not specifically handled
                if (val.toLowerCase() === 'yes') return `Yes, ${intent.attrs[0]} is supported.`;
                if (val.toLowerCase() === 'no') return `No, it does not have ${intent.attrs[0]}.`;
                return intent.template(val);
            }
            if (intent.alwaysLocal && (q.includes(intent.triggers[0]) || q.includes('how much') || q.includes('what'))) return intent.fallback || `That information isn't specified in the listing. Please check with ${seller}.`;
        }
    }

    // 3. Dynamic Fuzzy Attribute Discovery & Spec Listing
    // If the question is about "specs", "details", or "information" in general, list significant attributes
    const generalSpecTerms = ['spec', 'detail', 'feature', 'information', 'about this', 'list'];
    if (generalSpecTerms.some(t => q.includes(t)) || q === 'what?') {
        const topSpecs = attributes.slice(0, 8).map(a => `${a.name}: ${a.value}`).join(' • ');
        if (topSpecs) return `Here are the key specifications: ${topSpecs}`;
    }

    const questionTokens = q.split(/\s+/).filter(t => t.length > 3);
    for (const attr of attributes) {
        const attrName = attr.name.toLowerCase();
        // If the question contains the attribute name verbatim, answer it
        if (q.includes(attrName) && attrName.length > 3) {
            if (attr.value.toLowerCase() === 'yes') return `Yes, it has ${attr.name}.`;
            return `The ${attr.name} is ${attr.value}.`;
        }
        // If significant tokens overlap, it's likely a match
        const matchesToken = questionTokens.some(t => attrName.includes(t));
        if (matchesToken) {
            if (q.includes('what') || q.includes('how') || q.includes('show') || q.includes('tell')) {
                if (attr.value.toLowerCase() === 'yes') return `Yes, ${attr.name} is available.`;
                return `Specific detail for ${attr.name}: ${attr.value}.`;
            }
        }
    }

    // 4. Variant Awareness (Options, Colors, Sizes, Stock)
    const variants = product.variants || [];
    if (variants.length > 0) {
        // Colors check
        if (q.includes('color') || q.includes('colour') || q.includes('shades')) {
            const availableColors = Array.from(new Set(variants.map(v => v.options?.Color || v.options?.color).filter(Boolean)));
            if (availableColors.length > 1) {
                return `This product is available in ${availableColors.join(', ')}.`;
            }
        }

        // Sizes check
        if (q.includes('size') || q.includes('dimension') || q.includes('fit')) {
            const availableSizes = Array.from(new Set(variants.map(v => v.options?.Size || v.options?.size).filter(Boolean)));
            if (availableSizes.length > 0) {
                return `Available sizes: ${availableSizes.join(', ')}.`;
            }
        }

        // Generic options check
        for (const variant of variants) {
            const optionValues = Object.values(variant.options || {}).map(v => v.toLowerCase());
            if (optionValues.some(val => q.includes(val))) {
                const stockStatus = (variant.stock || 0) > 0 ? 'is in stock' : 'is currently out of stock';
                const optionsStr = Object.entries(variant.options || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
                return `The ${optionsStr} variant ${stockStatus}${variant.price ? ` at ${variant.price}` : ''}.`;
            }
        }
    }

    // 5. Listing Context (Condition, Stock, Delivery)
    if (q.includes('condition') || q.includes('new') || q.includes('used')) return `This product is ${product.condition || 'new'}.`;
    if (q.includes('stock') || q.includes('available')) {
        if (typeof product.stock === 'number') {
            if (product.stock > 0) return `Yes, ${product.stock > 10 ? 'it is in stock' : `limited stock available (${product.stock} left)`}.`;
            return 'This product is currently out of stock.';
        }
    }

    // Delivery & Shipping
    if (q.includes('delivery') || q.includes('shipping') || q.includes('ship')) {
        const deliveryTime = (product as any).deliveryTimeEstimate || (product as any).delivery_time_estimate;
        const freeDelivery = (product as any).freeDelivery || product.free_delivery;
        const deliveryDays = (product as any).deliveryTimeDays || (product as any).delivery_time_days;
        const deliveryCost = (product as any).deliveryCost || product.delivery_cost;
        const isExpress = (product as any).isExpressDelivery || (product as any).is_express_delivery;
        const scope = (product as any).deliveryScope || (product as any).delivery_scope;
        const locations = (product as any).deliveryLocations || (product as any).delivery_locations || [];

        let response = '';
        if (deliveryTime) response += `Estimated delivery: ${deliveryTime}${deliveryDays ? ` (${deliveryDays} days)` : ''}. `;
        if (isExpress) response += 'Express delivery is available. ';

        if (scope) {
            const locStr = Array.isArray(locations) && locations.length > 0 ? ` (${locations.join(', ')})` : '';
            response += `Deployment area: ${scope}${locStr}. `;
        }

        if (freeDelivery) response += 'Free delivery available.';
        else if (deliveryCost) response += `Shipping cost: ${deliveryCost}.`;

        if (response) return response.trim();
    }

    return null;
}

interface ProductQuestionsProps {
    product: Product;
    attributes?: { name: string; value: string }[];
    vendorContext?: {
        vendor_id?: string;
        business_name?: string;
        business_country?: string;
        is_verified?: boolean;
        vendor_rating?: number | null;
        review_count?: number | null;
        completed_orders?: number | null;
        response_time?: string | null;
        seller_since?: string | null;
        follower_count?: number | null;
        delivery_speed?: string | null;
        order_completion_rate?: number | null;
    } | null;
}

const ProductQuestions: React.FC<ProductQuestionsProps> = ({ product, attributes = [], vendorContext = null }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [aiEnabled, setAiEnabled] = useState<boolean>(true);
    const [explainEnabled, setExplainEnabled] = useState<boolean>(true);
    const [spotlightsLoading, setSpotlightsLoading] = useState(false);
    const [spotlights, setSpotlights] = useState<ProductSpotlights | null>(null);

    React.useEffect(() => {
        let mounted = true;
        Promise.allSettled([
            isAIFeatureEnabled('product_questions'),
            isAIFeatureEnabled('product_explain')
        ])
            .then((results) => {
                const q = results[0].status === 'fulfilled' ? results[0].value : true;
                const e = results[1].status === 'fulfilled' ? results[1].value : true;
                if (!mounted) return;
                setAiEnabled(q);
                setExplainEnabled(e);
            })
            .catch(() => {
                if (!mounted) return;
                setAiEnabled(true);
                setExplainEnabled(true);
            });
        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        let mounted = true;
        const run = async () => {
            if (!explainEnabled) return;
            setSpotlightsLoading(true);
            try {
                const { data, error } = await supabase.functions.invoke('ai-assistant', {
                    body: {
                        action: 'explain_product',
                        params: {
                            product_id: product.id,
                            product_title: product.title,
                            description: product.description,
                            attributes: {},
                            vendor_context: vendorContext
                        }
                    }
                });

                if (error) throw error;
                const result = (data as any)?.result;
                const functionError = (data as any)?.error;
                if (functionError) {
                    throw new Error(String(functionError));
                }

                const parsed = safeParseSpotlights(result);
                if (!mounted) return;

                if (parsed) {
                    setSpotlights(normalizeSpotlights(parsed));
                } else {
                    setSpotlights(null);
                }
            } catch (err) {
                console.warn('AI Spotlights Error:', err);
                if (!mounted) return;
                setSpotlights(null);
            } finally {
                if (mounted) setSpotlightsLoading(false);
            }
        };

        run();
        return () => {
            mounted = false;
        };
    }, [explainEnabled, product.title, product.description, vendorContext]);

    const handleAsk = async (questionOverride?: string) => {
        const questionToAsk = String(questionOverride || question || '');

        if (!aiEnabled) {
            setAnswer('AI Q&A is currently disabled by the platform admin.');
            return;
        }
        if (!questionToAsk.trim()) return;

        // Update the displayed question if using override
        if (questionOverride) {
            setQuestion(questionOverride);
        }

        // Check for local answer first
        const localAnswer = tryLocalAnswer(questionToAsk, product, vendorContext, attributes, spotlights?.knowledge_base);
        if (localAnswer) {
            setAnswer(localAnswer);
            return;
        }

        setLoading(true);
        setAnswer(null);

        try {
            const { data, error } = await supabase.functions.invoke('ai-assistant', {
                body: {
                    action: 'answer_product_question',
                    params: {
                        product_id: product.id,
                        product_title: product.title,
                        description: product.description,
                        attributes: product.attributes || {},
                        condition: product.condition || 'new',
                        delivery_info: {
                            delivery_time_estimate: product.deliveryTimeEstimate || product.delivery_time_estimate,
                            delivery_time_days: product.deliveryTimeDays || product.delivery_time_days,
                            free_delivery: product.freeDelivery || product.free_delivery,
                            delivery_cost: product.deliveryCost || product.delivery_cost,
                            delivery_scope: product.deliveryScope || product.delivery_scope,
                            is_express_delivery: product.isExpressDelivery || product.is_express_delivery,
                        },
                        vendor_context: vendorContext,
                        question: questionToAsk
                    }
                }
            });

            if (error) throw error;
            const result = (data as any)?.result;
            const functionError = (data as any)?.error;
            if (functionError) {
                throw new Error(String(functionError));
            }

            setAnswer(String(result ?? '').replace(/^"|"$/g, ''));
        } catch (err: any) {
            console.error('AI Q&A Error:', err);
            setAnswer("I'm having trouble connecting to the AI helper right now. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-orange-50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-3xl p-6 border border-orange-100 dark:border-slate-700 shadow-sm mt-8">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <span className="material-icons text-orange-500">auto_awesome</span>
                    <h3 className="text-lg font-black text-gray-900">AI Product spotlights</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/70 border border-orange-200 text-orange-700 px-2 py-1 rounded-lg">
                        AI
                    </span>
                </div>
                <span className="material-icons text-gray-400" title="AI-generated summary based on available product details.">info</span>
            </div>

            {(spotlightsLoading || spotlights) && (
                <div className="bg-orange-50/60 dark:bg-slate-800/60 border border-orange-100 dark:border-slate-700 rounded-2xl p-5 mb-5">
                    {spotlightsLoading && !spotlights ? (
                        <div className="flex items-center gap-2 text-orange-700 text-sm animate-pulse">
                            <span className="material-icons text-base">hourglass_empty</span>
                            Generating highlights...
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm text-gray-800">
                            {spotlights?.feature_highlights && (
                                <div>
                                    <span className="font-black text-gray-900">Feature highlights:</span>{' '}
                                    <SimpleMarkdown text={spotlights.feature_highlights} />
                                </div>
                            )}
                            {spotlights?.vendor_highlights && (
                                <div>
                                    <span className="font-black text-gray-900">Vendor highlights:</span>{' '}
                                    <SimpleMarkdown text={spotlights.vendor_highlights} />
                                </div>
                            )}
                            {spotlights?.positive_retail_outlook && (
                                <div>
                                    <span className="font-black text-gray-900">Positive retail outlook:</span>{' '}
                                    <SimpleMarkdown text={spotlights.positive_retail_outlook} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {!aiEnabled && (
                <div className="mb-4 bg-white border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-icons text-amber-700 text-sm">info</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">AI Q&A is turned off</p>
                            <p className="text-xs text-gray-600 mt-1">
                                This feature is currently disabled by the platform admin.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!!spotlights?.suggested_questions?.length && (
                <div className="mb-4 bg-white/70 dark:bg-slate-800/40 border border-orange-100 dark:border-slate-700 rounded-2xl p-4">
                    <div className="text-sm font-black text-gray-900 mb-2">You might want to ask</div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {spotlights.suggested_questions.slice(0, 6).map((q) => (
                            <button
                                key={q}
                                type="button"
                                onClick={() => handleAsk(q)}
                                disabled={!aiEnabled || loading}
                                className="whitespace-nowrap px-4 py-2 rounded-xl border border-orange-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-orange-700 dark:text-orange-300 font-bold text-sm hover:bg-orange-50 dark:hover:bg-slate-800 disabled:opacity-50"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="E.g., Is this machine washable? What material is it?"
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                    disabled={!aiEnabled}
                />
            </div>

            {loading && (
                <div className="flex items-center gap-2 text-orange-700 text-sm animate-pulse">
                    <span className="material-icons text-base">hourglass_empty</span>
                    Thinking...
                </div>
            )}

            {answer && !loading && (
                <div className="bg-white border border-orange-100 rounded-2xl p-4 animate-fade-in">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-icons text-orange-700 text-sm">smart_toy</span>
                        </div>
                        <p className="text-gray-800 text-sm leading-relaxed pt-1">
                            {answer}
                        </p>
                    </div>
                    <div className="mt-2 text-[10px] text-gray-400 text-right">
                        Answer generated by AI based on product details.
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductQuestions;
