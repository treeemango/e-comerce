import { supabase } from './supabase';

export interface AIResult {
    result: string;
    error?: string;
}

export interface SEOMetadata {
    seo_title: string;
    meta_description: string;
    keywords: string;
}

class AIService {
    private async callFunction(action: string, params: any): Promise<string> {
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

    async improveTitle(title: string, category?: string): Promise<string> {
        if (!title.trim()) return '';
        return this.callFunction('improve_title', { title, category });
    }

    async generateDescription(title: string, category?: string, attributes?: any): Promise<string> {
        if (!title.trim()) return '';
        return this.callFunction('generate_description', { title, category, attributes });
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
}

export const aiService = new AIService();
