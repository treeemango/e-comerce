import { useEffect, useState } from 'react';
import { initializeCountrySEO, updateCountrySEO } from '../lib/seo-utils';
import { detectUserCountrySEO, setPreferredCountry, CountrySEOConfig } from '../lib/country-seo';

interface UseCountrySEOOptions {
    pageType?: 'home' | 'category' | 'product';
    categoryId?: string;
    autoInitialize?: boolean;
}

interface UseCountrySEOReturn {
    countryConfig: CountrySEOConfig | null;
    categoryConfig: any;
    isLoading: boolean;
    error: string | null;
    updateCountry: (countryCode: string) => Promise<void>;
    refreshSEO: () => Promise<void>;
}

/**
 * React hook for managing country-aware SEO
 *
 * @example
 * ```tsx
 * // Home page
 * const { countryConfig, isLoading } = useCountrySEO({ pageType: 'home' });
 *
 * // Category page
 * const { countryConfig, categoryConfig } = useCountrySEO({
 *   pageType: 'category',
 *   categoryId: 'electronics'
 * });
 *
 * // Product page
 * const { countryConfig } = useCountrySEO({ pageType: 'product' });
 * ```
 */
export function useCountrySEO(options: UseCountrySEOOptions = {}): UseCountrySEOReturn {
    const {
        pageType = 'home',
        categoryId,
        autoInitialize = true
    } = options;

    const [countryConfig, setCountryConfig] = useState<CountrySEOConfig | null>(null);
    const [categoryConfig, setCategoryConfig] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Initialize or refresh SEO for current page
     */
    const refreshSEO = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await initializeCountrySEO(pageType, categoryId);

            setCountryConfig(result.countryConfig);
            setCategoryConfig(result.categoryConfig);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to initialize SEO';
            setError(errorMessage);
            console.error('SEO initialization error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Update to a different country
     */
    const updateCountry = async (countryCode: string) => {
        try {
            setIsLoading(true);
            setError(null);

            // Update user's preference
            setPreferredCountry(countryCode);

            // Get new country config
            const { getCountrySEOConfig } = await import('../lib/country-seo');
            const newCountryConfig = getCountrySEOConfig(countryCode);

            if (!newCountryConfig) {
                throw new Error(`Country configuration not found for: ${countryCode}`);
            }

            // Get category config if applicable
            let newCategoryConfig = null;
            if (pageType === 'category' && categoryId) {
                const { getCategorySEOConfig } = await import('../lib/category-seo');
                newCategoryConfig = getCategorySEOConfig(categoryId);
            }

            // Update page SEO
            await updateCountrySEO(newCountryConfig, pageType, newCategoryConfig);

            // Update state
            setCountryConfig(newCountryConfig);
            setCategoryConfig(newCategoryConfig);

            // Dispatch custom event for other components to react
            window.dispatchEvent(new CustomEvent('countryChanged', {
                detail: { countryCode, countryConfig: newCountryConfig }
            }));

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update country';
            setError(errorMessage);
            console.error('Country update error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-initialize on mount
    useEffect(() => {
        if (autoInitialize) {
            refreshSEO();
        }
    }, [pageType, categoryId, autoInitialize]);

    // Listen for country changes from other components
    useEffect(() => {
        const handleCountryChange = (event: CustomEvent) => {
            const { countryCode } = event.detail;
            if (countryCode !== countryConfig?.countryCode) {
                updateCountry(countryCode);
            }
        };

        window.addEventListener('countryChanged', handleCountryChange as EventListener);

        return () => {
            window.removeEventListener('countryChanged', handleCountryChange as EventListener);
        };
    }, [countryConfig]);

    return {
        countryConfig,
        categoryConfig,
        isLoading,
        error,
        updateCountry,
        refreshSEO,
    };
}

/**
 * Hook for getting current country context without full SEO initialization
 */
export function useCountryContext() {
    const [countryConfig, setCountryConfig] = useState<CountrySEOConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCountry = async () => {
            try {
                const config = await detectUserCountrySEO();
                setCountryConfig(config);
            } catch (error) {
                console.error('Failed to detect country:', error);
                // Fallback to Kenya
                const { COUNTRY_SEO_CONFIGS } = await import('../lib/country-seo');
                setCountryConfig(COUNTRY_SEO_CONFIGS['KE']);
            } finally {
                setIsLoading(false);
            }
        };

        loadCountry();
    }, []);

    return { countryConfig, isLoading };
}

/**
 * Hook for country-specific content adaptation
 */
export function useCountryContent() {
    const { countryConfig, isLoading } = useCountryContext();

    const adaptContent = (content: {
        title?: string;
        description?: string;
        keywords?: string[];
        features?: string[];
    }) => {
        if (!countryConfig || isLoading) return content;

        return {
            ...content,
            title: content.title?.replace('{country}', countryConfig.name) || content.title,
            description: content.description?.replace('{country}', countryConfig.name) || content.description,
            keywords: [
                ...(content.keywords || []),
                countryConfig.keywords.split(', ').slice(0, 3)
            ].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
            features: content.features?.map(feature =>
                feature.replace('{country}', countryConfig.name)
                      .replace('{shipping}', countryConfig.shippingTime)
                      .replace('{payment}', countryConfig.paymentMethods[0])
            ) || content.features,
        };
    };

    const getLocalizedUrl = (baseUrl: string) => {
        if (!countryConfig || countryConfig.countryCode === 'KE') return baseUrl;
        return `${baseUrl}?country=${countryConfig.countryCode.toLowerCase()}`;
    };

    return {
        countryConfig,
        isLoading,
        adaptContent,
        getLocalizedUrl,
    };
}
