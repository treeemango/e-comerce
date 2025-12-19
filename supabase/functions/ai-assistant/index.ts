import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// @ts-ignore: Deno is available in the Edge Function environment
const GROK_API_KEY = (Deno as any).env.get("GROK_API_KEY");
console.log("GROK_API_KEY detected:", !!GROK_API_KEY);

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
        console.log(`Action: ${action}`, "Params:", JSON.stringify(params));

        if (!GROK_API_KEY) {
            throw new Error("GROK_API_KEY is not set");
        }

        let prompt = "";
        let systemPrompt = "You are a helpful e-commerce copywriter assistant. Your goal is to help sellers create high-quality, SEO-optimized product listings. Provide concise, professional, and engaging content.";

        switch (action) {
            case "improve_title":
                prompt = `Improve this product title for better visibility and sales: "${params.title}"${params.category ? ` in the category "${params.category}"` : ""}. Return ONLY the improved title string. Do not include any tags, quotes, or word counts.`;
                break;
            case "generate_description":
                prompt = `Generate a compelling product description for: "${params.title}"${params.category ? ` in category "${params.category}"` : ""}. ${params.attributes ? `Key features: ${JSON.stringify(params.attributes)}` : ""}. 
                Guidelines:
                - Use professional and engaging language.
                - Use bullet points for features.
                - Keep it under 200 words.
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
            default:
                throw new Error("Invalid action");
        }

        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROK_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "grok-4-1-fast-non-reasoning",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt },
                ],
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        console.log("xAI Response Data:", JSON.stringify(data));

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
