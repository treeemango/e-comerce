// @ts-nocheck
/**
 * Supabase Edge Function: process-image
 * 
 * Generates optimized image variants using Sharp library.
 * Called after initial upload to create thumbnail, grid, detail, and zoom variants.
 * 
 * Usage:
 * POST /functions/v1/process-image
 * Body: { storagePath: string, sellerId: string, bucket?: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sharp is available in Deno via npm specifier
import sharp from "npm:sharp@0.33.2";

// ============================================================================
// Types
// ============================================================================

interface ProcessImageRequest {
    storagePath: string;
    sellerId: string;
    bucket?: string;
    generateVariants?: ('thumb' | 'grid' | 'detail' | 'zoom')[];
}

interface ImageVariantConfig {
    name: string;
    maxWidth: number;
    quality: number;
    suffix: string;
}

interface ProcessingResult {
    variant: string;
    path: string;
    url: string;
    size: number;
    width: number;
    height: number;
}

// ============================================================================
// Configuration
// ============================================================================

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IMAGE_VARIANTS: ImageVariantConfig[] = [
    { name: 'thumb', maxWidth: 300, quality: 75, suffix: '_thumb' },
    { name: 'grid', maxWidth: 600, quality: 78, suffix: '_grid' },
    { name: 'detail', maxWidth: 1200, quality: 80, suffix: '_detail' },
    { name: 'zoom', maxWidth: 1600, quality: 85, suffix: '_zoom' },
];

// ============================================================================
// Helpers
// ============================================================================

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

/**
 * Get file extension from path
 */
function getFileExtension(path: string): string {
    const match = path.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : 'webp';
}

/**
 * Generate variant path from original path
 */
function getVariantPath(originalPath: string, suffix: string): string {
    // Replace extension with webp and add suffix
    const basePath = originalPath.replace(/\.[^.]+$/, '');
    return `${basePath}${suffix}.webp`;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return json(405, { error: "Method not allowed" });
    }

    try {
        // Get Supabase credentials
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return json(500, { error: "Missing Supabase configuration" });
        }

        // Create admin client (bypass RLS for storage operations)
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Parse request
        const payload: ProcessImageRequest = await req.json();
        const {
            storagePath,
            sellerId,
            bucket = 'products',
            generateVariants = ['thumb', 'grid', 'detail', 'zoom']
        } = payload;

        if (!storagePath) {
            return json(400, { error: "Missing storagePath" });
        }

        console.log(`📸 Processing image: ${storagePath}`);

        // Download original image
        const { data: originalData, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(storagePath);

        if (downloadError || !originalData) {
            console.error("Download error:", downloadError);
            return json(400, { error: `Failed to download original: ${downloadError?.message}` });
        }

        // Convert to ArrayBuffer for Sharp
        const arrayBuffer = await originalData.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Get original image metadata
        const metadata = await sharp(buffer).metadata();
        console.log(`📐 Original: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

        // Filter variants to generate
        const variantsToGenerate = IMAGE_VARIANTS.filter(v =>
            generateVariants.includes(v.name as any)
        );

        // Process each variant
        const results: ProcessingResult[] = [];

        for (const variant of variantsToGenerate) {
            try {
                // Skip if original is smaller than target
                if (metadata.width && metadata.width <= variant.maxWidth) {
                    console.log(`⏭️ Skipping ${variant.name}: original smaller than target`);
                    continue;
                }

                // Process with Sharp
                const processedBuffer = await sharp(buffer)
                    .resize(variant.maxWidth, null, {
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .webp({ quality: variant.quality })
                    .toBuffer();

                // Get processed metadata
                const processedMeta = await sharp(processedBuffer).metadata();

                // Generate variant path
                const variantPath = getVariantPath(storagePath, variant.suffix);

                // Upload variant
                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(variantPath, processedBuffer, {
                        contentType: 'image/webp',
                        cacheControl: '31536000', // 1 year cache
                        upsert: true
                    });

                if (uploadError) {
                    console.error(`Upload error for ${variant.name}:`, uploadError);
                    continue;
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(variantPath);

                results.push({
                    variant: variant.name,
                    path: variantPath,
                    url: urlData.publicUrl,
                    size: processedBuffer.length,
                    width: processedMeta.width || variant.maxWidth,
                    height: processedMeta.height || 0
                });

                console.log(`✅ ${variant.name}: ${(processedBuffer.length / 1024).toFixed(1)}KB`);

            } catch (variantError) {
                console.error(`Error processing ${variant.name}:`, variantError);
            }
        }

        // Calculate stats
        const originalSize = buffer.length;
        const totalVariantSize = results.reduce((sum, r) => sum + r.size, 0);
        const savings = originalSize > 0
            ? Math.round((1 - (results[0]?.size || 0) / originalSize) * 100)
            : 0;

        console.log(`📊 Stats: Original ${(originalSize / 1024).toFixed(1)}KB, Generated ${results.length} variants`);

        return json(200, {
            success: true,
            originalPath: storagePath,
            originalSize,
            variants: results,
            stats: {
                variantsGenerated: results.length,
                totalVariantSize,
                gridSavings: savings
            }
        });

    } catch (error: any) {
        console.error("Processing error:", error);
        return json(500, { error: error?.message || "Unknown error during processing" });
    }
});
