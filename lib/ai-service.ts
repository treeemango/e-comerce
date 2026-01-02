import { supabase } from './supabase';
import { assertAIFeatureEnabled } from './ai-feature-flags';

export interface AIResult {
    result: string;
    error?: string;
}

export interface SEOMetadata {
    seo_title: string;
    meta_description: string;
    keywords: string;
}

export interface ImageAnalysisResult {
    product_type: string;
    keywords: string[];
    color: string;
    style: string;
    search_query: string;
}

export interface AttributeSuggestion {
    attribute_id?: string;
    attribute_name?: string;
    value: string;
}

class AIService {
    private async callFunction(action: string, params: any): Promise<string> {
        // Default to allowing calls if the flag table isn't present.
        // Enforced again server-side in the Edge Function.
        if (
            action === 'improve_title' ||
            action === 'generate_description' ||
            action === 'generate_seo' ||
            action === 'generate_tags' ||
            action === 'generate_use_case_tags' ||
            action === 'generate_occasion_tags' ||
            action === 'suggest_attributes'
        ) {
            await assertAIFeatureEnabled('listing_assistant');
        }
        if (action === 'analyze_product_image') {
            await assertAIFeatureEnabled('image_matching');
        }

        const { data, error } = await supabase.functions.invoke('ai-assistant', {
            body: { action, params }
        });

        if (error) {
            console.error(`AI Assistant Error (${action}):`, error);
            throw new Error(error.message || 'Failed to call AI Assistant');
        }

        if (data.error) {
            throw new Error(data.error);
        }

        return data.result;
    }

    private parseJsonResult<T>(result: string, fallback: T): T {
        if (!result) return fallback;
        try {
            const jsonStr = result.replace(/```json|```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch {
            return fallback;
        }
    }

    async improveTitle(title: string, category?: string, focus?: string): Promise<string> {
        if (!title.trim()) return '';
        return this.callFunction('improve_title', { title, category, focus });
    }

    async generateDescription(title: string, category?: string, attributes?: any, focus?: string): Promise<string> {
        if (!title.trim()) return '';
        return this.callFunction('generate_description', { title, category, attributes, focus });
    }

    async generateSEO(title: string, description: string): Promise<SEOMetadata> {
        if (!title.trim()) return { seo_title: '', meta_description: '', keywords: '' };
        const result = await this.callFunction('generate_seo', { title, description });
        try {
            // The AI might return JSON wrapped in code blocks or just plain JSON
            const jsonStr = result.replace(/```json|```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse SEO JSON:', result);
            return {
                seo_title: title,
                meta_description: description.substring(0, 160),
                keywords: title.split(' ').join(', ')
            };
        }
    }

    async generateTags(title: string, category?: string): Promise<string[]> {
        if (!title.trim()) return [];
        const result = await this.callFunction('generate_tags', { title, category });
        if (!result) return [];
        return result.split(',').map(t => t.trim()).filter(Boolean);
    }

    async generateUseCaseTags(title: string, category?: string): Promise<string[]> {
        if (!title.trim()) return [];
        const result = await this.callFunction('generate_use_case_tags', { title, category });
        if (!result) return [];
        return result.split(',').map(t => t.trim()).filter(Boolean);
    }

    async generateOccasionTags(title: string, category?: string): Promise<string[]> {
        if (!title.trim()) return [];
        const result = await this.callFunction('generate_occasion_tags', { title, category });
        if (!result) return [];
        return result.split(',').map(t => t.trim()).filter(Boolean);
    }

    /**
     * Analyze a product image using Grok Vision to extract search keywords
     * @param imageBase64 - Base64 encoded image data (with or without data: prefix)
     * @returns Product analysis with keywords, category, and search query
     */
    async analyzeProductImage(imageBase64: string): Promise<ImageAnalysisResult> {
        if (!imageBase64) {
            throw new Error('Image data is required');
        }

        const result = await this.callFunction('analyze_product_image', { image_base64: imageBase64 });

        try {
            // Parse the JSON response
            const jsonStr = result.replace(/```json|```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse image analysis JSON:', result);
            // Return a fallback with the raw result as search query
            return {
                product_type: 'Product',
                keywords: result.split(/[,\s]+/).filter(Boolean).slice(0, 5),
                color: '',
                style: '',
                search_query: result.substring(0, 50)
            };
        }
    }

    /**
     * Suggest attribute values for a listing based on title/category/brand.
     * Returns structured suggestions; caller can map to option ids.
     */
    async suggestAttributes(params: {
        title: string;
        category?: string;
        brand?: string;
        description?: string;
        attributes: Array<{ id: string; name: string; options?: string[] }>;
    }): Promise<AttributeSuggestion[]> {
        if (!params?.title?.trim()) return [];
        const result = await this.callFunction('suggest_attributes', params);

        const parsed = this.parseJsonResult<any>(result, null);
        if (!parsed) return [];

        // Accept either an array of suggestions or an object map.
        if (Array.isArray(parsed)) {
            return parsed
                .filter(Boolean)
                .map((s: any) => ({
                    attribute_id: typeof s.attribute_id === 'string' ? s.attribute_id : undefined,
                    attribute_name: typeof s.attribute_name === 'string' ? s.attribute_name : (typeof s.name === 'string' ? s.name : undefined),
                    value: typeof s.value === 'string' ? s.value : (typeof s.value_text === 'string' ? s.value_text : '')
                }))
                .filter((s: AttributeSuggestion) => !!s.value);
        }

        if (typeof parsed === 'object') {
            return Object.entries(parsed)
                .map(([key, value]) => ({
                    attribute_name: key,
                    value: typeof value === 'string' ? value : String(value ?? '')
                }))
                .filter(s => !!s.value);
        }

        return [];
    }
}

export const aiService = new AIService();
