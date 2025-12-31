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

function featureKeyForAction(action: string): string | null {
    switch (action) {
        case "improve_title":
        case "generate_description":
        case "generate_seo":
        case "generate_tags":
        case "generate_use_case_tags":
        case "generate_occasion_tags":
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
            case "suggest_chat_reply":
                systemPrompt = "You are a helpful customer service assistant for an e-commerce seller. Your goal is to draft polite, professional, and helpful replies to buyer messages. Keep replies concise (under 50 words) and friendly.";
                prompt = `The buyer wrote: "${params.last_message}". \nContext: Selling product "${params.product_title || 'item'}". \nDraft a reply for the seller. Return ONLY the reply text.`;
                break;
            case "answer_product_question":
                systemPrompt = "You are a helpful product expert assistant. Your goal is to answer buyer questions based ONLY on the provided product information. If the answer is not in the context, politely say 'I cannot find that information in the product details.' or similar. Keep answers concise (under 3 or 4 sentences).";
                prompt = `Product: "${params.product_title}".\nMatches Context: ${params.description || ''} ${JSON.stringify(params.attributes || {})}.\n\nQuestion: "${params.question}".\n\nAnswer:`;
                break;
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
