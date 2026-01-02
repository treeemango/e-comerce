// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROK_API_KEY = (Deno as any).env.get("GROK_API_KEY");
console.log("GROK_API_KEY detected:", !!GROK_API_KEY);

// Optional: enforce feature flags from DB (preferred). If env vars are missing,
// the function will default to allowing all actions.
const SUPABASE_URL = (Deno as any).env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = (Deno as any).env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// Helper function to compute MD5-like hash for cache detection
async function computeHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function featureKeyForAction(action: string): string | null {
    switch (action) {
        case "improve_title":
        case "generate_description":
        case "generate_seo":
        case "generate_tags":
        case "generate_use_case_tags":
        case "generate_occasion_tags":
        case "suggest_attributes":
            return "listing_assistant";
        case "suggest_chat_reply":
            return "seller_chat_reply";
        case "answer_product_question":
            return "product_questions";
        case "analyze_product_image":
            return "image_matching";
        case "explain_product":
            return "product_explain";
        default:
            return null;
    }
}

async function isFeatureEnabled(key: string): Promise<boolean> {
    if (!supabaseAdmin) return true;
    try {
        const { data, error } = await supabaseAdmin
            .from("ai_feature_flags")
            .select("enabled")
            .eq("key", key)
            .maybeSingle();

        if (error) return true;
        if (!data) return true;
        return !!data.enabled;
    } catch {
        return true;
    }
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { action, params } = await req.json();
        console.log(`Action: ${action}`, "Params:", JSON.stringify(params).slice(0, 200));

        const featureKey = featureKeyForAction(action);
        if (featureKey) {
            const enabled = await isFeatureEnabled(featureKey);
            if (!enabled) {
                return new Response(
                    JSON.stringify({
                        error: 'This AI feature is currently turned off by the platform admin.',
                        code: 'AI_FEATURE_DISABLED',
                        feature: featureKey,
                    }),
                    {
                        status: 403,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }
        }

        if (!GROK_API_KEY) {
            throw new Error("GROK_API_KEY is not set");
        }

        let prompt = "";
        let systemPrompt = "You are a helpful e-commerce copywriter assistant. Your goal is to help sellers create high-quality, SEO-optimized product listings. Provide concise, professional, and engaging content. CRITICAL: Never change brand names, model numbers, or technical specs from the original title.";
        let messages: any[] = [];
        let useVision = false;

        switch (action) {
            case "improve_title":
                prompt = `Improve this product title for better visibility and sales: "${params.title}"${params.category ? ` in the category "${params.category}"` : ""}.${params.focus ? `\nContext/Focus: "${params.focus}".\n` : ""} 
                IMPORTANT: 
                - Follow the context strictly. 
                - DO NOT change or hallucinate brand names (e.g., if it says Vitron, keep it Vitron, do not change to Vizio). 
                - Preserve all model numbers and technical specs.
                - Return ONLY the improved title string. Do not include any tags, quotes, or word counts.`;
                break;
            case "generate_description":
                prompt = `Generate a compelling product description for: "${params.title}"${params.category ? ` in category "${params.category}"` : ""}. ${params.focus ? `\nThe seller clarification (what the product actually is / what to focus on): "${params.focus}".\nIMPORTANT: Follow this clarification strictly. Do NOT describe adjacent items suggested by the category name.\n` : ""}${params.attributes ? `Key features: ${JSON.stringify(params.attributes)}` : ""}. 
                Guidelines:
                - Use professional and engaging language.
                - Use bullet points for features.
                - Keep it under 3000 characters.
                - Return ONLY the description text. 
                - Do NOT include keywords, labels, or word count footers.`;
                break;
            case "generate_seo":
                prompt = `Based on the product title "${params.title}" and description "${params.description}", provide SEO metadata in JSON format: { "seo_title": "...", "meta_description": "...", "keywords": "..." }. The keywords should be a comma-separated string. Return ONLY the JSON object.`;
                break;
            case "generate_tags":
                prompt = `Generate 5-8 relevant, highly-searchable product tags for: "${params.title}"${params.category ? ` in category "${params.category}"` : ""}. Return ONLY a comma-separated list of tags. Do not include quotes, numbering, or word counts. Example: trendy, summer, lightweight, breathable`;
                break;
            case "generate_use_case_tags":
                prompt = `Generate 5-8 product "Use Case" tags for: "${params.title}"${params.category ? ` in category "${params.category}"` : ""}. These should describe where or how the product is used. Return ONLY a comma-separated list. Example: gym, hiking, office, kitchen, travel`;
                break;
            case "generate_occasion_tags":
                prompt = `Generate 5-8 product "Occasion" tags for: "${params.title}"${params.category ? ` in category "${params.category}"` : ""}. These should describe events or times when the product is appropriate. Return ONLY a comma-separated list. Example: wedding, party, summer, gift, casual`;
                break;
            case "suggest_attributes": {
                // params: { title, category?, brand?, description?, attributes: [{id,name,options?:string[]}] }
                const attrs = Array.isArray(params.attributes) ? params.attributes : [];
                const trimmedAttrs = attrs
                    .filter((a: any) => a && (a.id || a.name))
                    .slice(0, 60)
                    .map((a: any) => ({
                        id: String(a.id || '').trim(),
                        name: String(a.name || '').trim(),
                        options: Array.isArray(a.options)
                            ? a.options.map((v: any) => String(v)).filter(Boolean).slice(0, 60)
                            : undefined,
                    }));

                systemPrompt = "You are a helpful e-commerce listing assistant. Your goal is to propose realistic, non-hallucinated attribute values for a product listing. CRITICAL: Never invent brand names, model numbers, sizes, materials, or technical specs not implied by the title/description/context. If unknown, leave the value empty.";

                prompt = `Suggest values for product attributes.

Context:
- Title: "${params.title}"
${params.category ? `- Category: "${params.category}"\n` : ""}${params.brand ? `- Brand: "${params.brand}"\n` : ""}${params.description ? `- Description: "${String(params.description).slice(0, 700)}"\n` : ""}

Attributes to fill (id, name, options if provided):
${JSON.stringify(trimmedAttrs)}

Rules:
- Return ONLY valid JSON.
- Output must be a JSON array of objects: [{"attribute_id":"...","attribute_name":"...","value":"..."}].
- Use the provided attribute_id when possible.
- If options are provided, prefer one of the exact option strings.
- If unsure, set value to "" (empty string).
`;
                break;
            }
            case "suggest_chat_reply":
                systemPrompt = "You are a helpful customer service assistant for an e-commerce seller. Your goal is to draft polite, professional, and helpful replies to buyer messages. Keep replies concise (under 50 words) and friendly.";
                prompt = `The buyer wrote: "${params.last_message}". \nContext: Selling product "${params.product_title || 'item'}". \nDraft a reply for the seller. Return ONLY the reply text.`;
                break;
            case "answer_product_question": {
                // Fetch attributes using RPC function if product_id is provided
                let fetchedAttributes: any[] = [];
                if (params.product_id && supabaseAdmin) {
                    try {
                        const { data: attrData, error: attrError } = await supabaseAdmin
                            .rpc('get_product_attributes', { p_product_id: params.product_id });

                        if (!attrError && attrData && Array.isArray(attrData) && attrData.length > 0) {
                            fetchedAttributes = attrData;
                            console.log('Fetched attributes via RPC:', fetchedAttributes.length);
                        }
                    } catch (err) {
                        console.warn('RPC fetch failed, trying direct query:', err);

                        // Fallback: Direct table query
                        const { data: directData } = await supabaseAdmin
                            .from('product_attribute_values')
                            .select('value_text, value_number, attribute_id')
                            .eq('product_id', params.product_id);

                        if (directData && directData.length > 0) {
                            // Get attribute names
                            const attrIds = directData.map((d: any) => d.attribute_id).filter(Boolean);
                            const { data: attrNames } = await supabaseAdmin
                                .from('shopify_attributes')
                                .select('id, name')
                                .in('id', attrIds);

                            const nameMap = new Map((attrNames || []).map((a: any) => [a.id, a.name]));

                            fetchedAttributes = directData.map((a: any) => ({
                                name: nameMap.get(a.attribute_id) || 'Unknown',
                                value: a.value_text || a.value_number?.toString() || ''
                            }));
                        }
                    }
                }

                // Fetch variants to include in context
                let variantsInfo = '';
                if (params.product_id && supabaseAdmin) {
                    try {
                        const { data: variantsData, error: variantsError } = await supabaseAdmin
                            .from('product_variants')
                            .select('options, price, stock, is_default')
                            .eq('product_id', params.product_id);

                        if (!variantsError && variantsData && variantsData.length > 0) {
                            const variantLines = variantsData.map((v: any) => {
                                const optStr = Object.entries(v.options || {}).map(([k, val]) => `${k}: ${val}`).join(', ');
                                return `- ${optStr || 'Default'}: Price ${v.price}, Stock ${v.stock}${v.is_default ? ' (Standard)' : ''}`;
                            }).join('\n');
                            variantsInfo = `\nAvailable Variants:\n${variantLines}`;
                        }
                    } catch (err) {
                        console.warn('Failed to fetch variants:', err);
                    }
                }

                // Use fetched attributes, or fallback to params.attributes
                const attributesToUse = fetchedAttributes.length > 0 ? fetchedAttributes : params.attributes;

                // Build comprehensive product context for accurate answers
                let attributesInfo = '';
                if (attributesToUse) {
                    if (Array.isArray(attributesToUse) && attributesToUse.length > 0) {
                        // Array format: [{name: "Storage", value: "128GB"}, ...]
                        const attrLines = attributesToUse.map((a: any) => `- ${a.name}: ${a.value}`).join('\n');
                        attributesInfo = `\nProduct Specifications:\n${attrLines}`;
                    } else if (typeof attributesToUse === 'object' && Object.keys(attributesToUse).length > 0) {
                        // Object format fallback: {Storage: "128GB", ...}
                        attributesInfo = `\nProduct Specifications: ${JSON.stringify(attributesToUse)}`;
                    }
                }

                const deliveryInfo = params.delivery_info
                    ? `\nDelivery Information:
- Estimated delivery: ${params.delivery_info.delivery_time_estimate || 'Not specified'}
- Delivery days: ${params.delivery_info.delivery_time_days || 'Not specified'}
- Free delivery: ${params.delivery_info.free_delivery ? 'Yes' : 'No'}
- Delivery cost: ${params.delivery_info.delivery_cost || 'Not specified'}
- Delivery scope: ${params.delivery_info.delivery_scope || 'Not specified'}
- Express delivery: ${params.delivery_info.is_express_delivery ? 'Available' : 'Not available'}`
                    : '';

                const vendorInfo = params.vendor_context
                    ? `\nSeller Information:
- Business name: ${params.vendor_context.business_name || 'Not specified'}
- Country: ${params.vendor_context.business_country || 'Not specified'}
- Verified: ${params.vendor_context.is_verified ? 'Yes' : 'No'}
- Rating: ${params.vendor_context.vendor_rating || 'Not rated'}
- Response time: ${params.vendor_context.response_time || 'Not specified'}`
                    : '';

                const conditionInfo = params.condition ? `\nProduct Condition: ${params.condition}` : '';

                systemPrompt = "You are a helpful product expert assistant. Your goal is to answer buyer questions based ONLY on the provided product information. Use the attributes, variants, delivery info, seller info, and description to give accurate answers. If the specific information is genuinely not available in any of the provided context, politely say 'This information is not specified in the listing. You can message the seller to confirm.' Stay very concise.";
                prompt = `Product: "${params.product_title}"
Description: ${params.description || 'No description provided'}${conditionInfo}${attributesInfo}${variantsInfo}${deliveryInfo}${vendorInfo}

Buyer Question: "${params.question}"

Answer based on the available product information above:`;
                break;
            }
            case "explain_product": {
                // Compute hashes for cache detection
                const productData = `${params.product_title || ''}|${String(params.description || '').slice(0, 2500)}|${JSON.stringify(params.attributes || {})}`;
                const vendorData = JSON.stringify(params.vendor_context || null);
                const productHash = await computeHash(productData);
                const vendorHash = await computeHash(vendorData);
                const productId = params.product_id;
                const vendorId = params.vendor_context?.vendor_id || null;

                // Try to get cached insights if product_id is provided
                if (productId && supabaseAdmin) {
                    try {
                        const { data: cacheResult } = await supabaseAdmin.rpc('get_cached_product_insights', {
                            p_product_id: productId,
                            p_product_hash: productHash,
                            p_vendor_hash: vendorHash
                        });

                        if (cacheResult && cacheResult.length > 0 && cacheResult[0].cache_status === 'hit') {
                            const cached = cacheResult[0];

                            // Check if only vendor_highlights needs regeneration
                            if (cached.needs_vendor_update) {
                                // Generate only vendor_highlights
                                const vendorPrompt = `Generate a vendor highlight for this seller.

Vendor data: ${vendorData}

Return ONLY a single sentence (max 180 chars) highlighting the vendor. Use ONLY the provided data. If null/empty, say 'No vendor details provided.'`;

                                const vendorResponse = await fetch("https://api.x.ai/v1/chat/completions", {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${GROK_API_KEY}`,
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        model: "grok-4-1-fast-non-reasoning",
                                        messages: [
                                            { role: "system", content: "You are a helpful e-commerce assistant. Provide concise vendor descriptions." },
                                            { role: "user", content: vendorPrompt }
                                        ],
                                        temperature: 0.7,
                                    }),
                                });

                                const vendorAiData = await vendorResponse.json();
                                const newVendorHighlights = vendorAiData.choices?.[0]?.message?.content?.trim()?.replace(/^"|"$/g, '') || cached.vendor_highlights;

                                // Update cache with new vendor_highlights
                                await supabaseAdmin.rpc('upsert_product_ai_insights', {
                                    p_product_id: productId,
                                    p_product_hash: productHash,
                                    p_vendor_hash: vendorHash,
                                    p_vendor_id: vendorId,
                                    p_vendor_highlights: newVendorHighlights,
                                    p_vendor_only: true
                                });

                                // Return merged result
                                const mergedResult = {
                                    feature_highlights: cached.feature_highlights,
                                    vendor_highlights: newVendorHighlights,
                                    positive_retail_outlook: cached.positive_retail_outlook,
                                    suggested_questions: cached.suggested_questions,
                                    knowledge_base: cached.knowledge_base
                                };

                                return new Response(JSON.stringify({ result: JSON.stringify(mergedResult), cached: true, vendor_updated: true }), {
                                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                                });
                            }

                            // Full cache hit - return cached data
                            const cachedResult = {
                                feature_highlights: cached.feature_highlights,
                                vendor_highlights: cached.vendor_highlights,
                                positive_retail_outlook: cached.positive_retail_outlook,
                                suggested_questions: cached.suggested_questions,
                                knowledge_base: cached.knowledge_base
                            };

                            return new Response(JSON.stringify({ result: JSON.stringify(cachedResult), cached: true }), {
                                headers: { ...corsHeaders, "Content-Type": "application/json" },
                            });
                        }
                    } catch (cacheError) {
                        console.warn("Cache lookup failed, proceeding with AI generation:", cacheError);
                    }
                }

                // Fetch attributes and variants for better lights
                let fullAttributes = params.attributes || {};
                let fullVariants = '';
                if (productId && supabaseAdmin) {
                    try {
                        const { data: attrData } = await supabaseAdmin.rpc('get_product_attributes', { p_product_id: productId });
                        if (attrData) fullAttributes = attrData;

                        const { data: varData } = await supabaseAdmin
                            .from('product_variants')
                            .select('options, price, stock')
                            .eq('product_id', productId);
                        if (varData && varData.length > 0) {
                            fullVariants = varData.map((v: any) => {
                                const opts = Object.entries(v.options || {}).map(([k, val]) => `${k}: ${val}`).join(', ');
                                return `- ${opts}: stock ${v.stock}`;
                            }).join('\n');
                        }
                    } catch (e) {
                        console.warn("Context fetch for highlights failed", e);
                    }
                }

                // No cache hit - generate full spotlights
                systemPrompt = "You are a helpful e-commerce product analyst. Create SHORT product spotlights that add value beyond the description. Use ONLY the provided product information (including specs and variants). Do NOT invent certs, material, or specs. If details are missing, say so briefly.";
                prompt = `Create concise product spotlights in JSON (NOT a second description).

Context:
- Title: "${params.product_title}"
- Description: "${String(params.description || '').slice(0, 2500)}"
- Attributes: ${JSON.stringify(fullAttributes)}
- Variants: ${fullVariants || 'None'}
- Vendor (from vendor card): ${vendorData}

Return ONLY valid JSON with this exact shape:
{
    "feature_highlights": "1-2 short sentences (max 240 chars). You MAY use **bold** to emphasize key phrases.",
    "vendor_highlights": "1 short sentence (max 180 chars). Use ONLY the Vendor (from vendor card) data. If it is null/empty, say 'No vendor details provided.'",
    "positive_retail_outlook": "1 short sentence (max 180 chars). Do NOT claim bestseller ranks, profit margins, or resale prices unless present in the context.",
    "suggested_questions": ["3-6 short buyer questions (max 80 chars each)"],
    "knowledge_base": {
        "What is the engine size?": "Engine Capacity",
        "How is the mileage?": "Odometer",
        "What is it made of?": "Material/Fabric"
    },
    // IMPORTANT: For knowledge_base, map common questions to the exact Attribute Names provided. 
    // Prioritize quantitative specs (like '128GB', '4000mAh', '2.0L') over boolean 'Yes/No' attributes if both exist.
}

Rules for knowledge_base:
- It should map 5-10 likely buyer questions to the exact attribute NAME in the provided Attributes JSON.
- Create this map based on the specific CATEGORY of the product (e.g., if it is a car, map automotive questions).
- Only map questions that can be answered by the provided Attributes or Description.

Rules:
- Do not restate the product description or rewrite it.
- Prefer highlighting 2-3 concrete points that are easy to scan.
- Do not include markdown lists. No bullet points.
- Do not wrap JSON in code fences.
`;

                // Store caching context for after AI response
                (params as any)._cacheContext = { productId, productHash, vendorHash, vendorId };
                break;
            }
            case "analyze_product_image":
                // Visual search: analyze image and extract product keywords
                useVision = true;
                systemPrompt = "You are a product recognition AI assistant. Analyze images and identify what products are shown. Return search keywords that would help find similar products on an e-commerce platform.";

                if (!params.image_base64) {
                    throw new Error("image_base64 is required for analyze_product_image");
                }

                // Build vision message with image
                messages = [
                    { role: "system", content: systemPrompt },
                    {
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: {
                                    url: params.image_base64.startsWith('data:')
                                        ? params.image_base64
                                        : `data:image/jpeg;base64,${params.image_base64}`
                                }
                            },
                            {
                                type: "text",
                                text: "Analyze this product image. Return a JSON object with: { \"product_type\": \"main category\", \"keywords\": [\"keyword1\", \"keyword2\", ...], \"color\": \"primary color\", \"style\": \"style description\", \"search_query\": \"best search query to find similar products\" }. Return ONLY the JSON."
                            }
                        ]
                    }
                ];
                break;
            default:
                throw new Error("Invalid action");
        }

        // Build messages array if not using vision
        if (!useVision) {
            messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ];
        }

        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROK_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // grok-4-1-fast-non-reasoning supports both text and image input
                model: "grok-4-1-fast-non-reasoning",
                messages,
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        console.log("xAI Response Data:", JSON.stringify(data).slice(0, 500));

        if (!response.ok) {
            console.error("xAI API Error:", data);
            throw new Error(data.error?.message || `xAI API returned status ${response.status}`);
        }

        const result = data.choices[0].message.content.trim();

        // Store in cache if this was an explain_product action
        if (action === 'explain_product' && (params as any)._cacheContext && supabaseAdmin) {
            try {
                const ctx = (params as any)._cacheContext;
                // Parse the AI result to extract fields
                const parsed = JSON.parse(result.replace(/```json|```/g, '').trim());

                await supabaseAdmin.rpc('upsert_product_ai_insights', {
                    p_product_id: ctx.productId,
                    p_product_hash: ctx.productHash,
                    p_vendor_hash: ctx.vendorHash,
                    p_vendor_id: ctx.vendorId,
                    p_feature_highlights: parsed.feature_highlights || null,
                    p_vendor_highlights: parsed.vendor_highlights || null,
                    p_positive_retail_outlook: parsed.positive_retail_outlook || null,
                    p_suggested_questions: parsed.suggested_questions || [],
                    p_knowledge_base: parsed.knowledge_base || {},
                    p_vendor_only: false
                });
                console.log('Cached AI insights for product:', ctx.productId);
            } catch (cacheError) {
                console.warn('Failed to cache AI insights:', cacheError);
            }
        }

        return new Response(JSON.stringify({ result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Function Error:", error.message);
        return new Response(JSON.stringify({ error: error.message || "An unknown error occurred" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
