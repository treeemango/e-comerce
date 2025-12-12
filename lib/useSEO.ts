import { useEffect } from 'react';
import { updatePageMeta, injectStructuredData, removeStructuredData } from './seo-utils';

/**
 * React hook for managing page SEO
 * Handles meta tags and structured data injection/cleanup
 * 
 * @example
 * ```tsx
 * useSEO({
 *   title: 'Product Name',
 *   description: 'Product description',
 *   structuredData: generateProductSchema(product)
 * });
 * ```
 */
export function useSEO(config: {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: string;
    noindex?: boolean;
    structuredData?: object | object[];
    structuredDataId?: string;
}) {
    useEffect(() => {
        // Update meta tags
        updatePageMeta({
            title: config.title,
            description: config.description,
            keywords: config.keywords,
            image: config.image,
            url: config.url,
            type: config.type,
            noindex: config.noindex,
        });

        // Inject structured data
        if (config.structuredData) {
            if (Array.isArray(config.structuredData)) {
                // Handle multiple schemas
                config.structuredData.forEach((schema, index) => {
                    const id = `${config.structuredDataId || 'structured-data'}-${index}`;
                    injectStructuredData(schema, id);
                });
            } else {
                // Single schema
                injectStructuredData(
                    config.structuredData,
                    config.structuredDataId || 'structured-data'
                );
            }
        }

        // Cleanup on unmount
        return () => {
            if (config.structuredData) {
                if (Array.isArray(config.structuredData)) {
                    config.structuredData.forEach((_, index) => {
                        const id = `${config.structuredDataId || 'structured-data'}-${index}`;
                        removeStructuredData(id);
                    });
                } else {
                    removeStructuredData(config.structuredDataId || 'structured-data');
                }
            }
        };
    }, [
        config.title,
        config.description,
        config.keywords,
        config.image,
        config.url,
        config.type,
        config.noindex,
        config.structuredData,
        config.structuredDataId,
    ]);
}
