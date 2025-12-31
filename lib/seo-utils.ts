import { Product, VendorInfo } from '../types';
import { generateCountryMetaTags, generateCountryBusinessSchema } from './country-seo';
import { generateCategoryMetaTags, generateCategoryStructuredData, generateCategoryFAQData } from './category-seo';
import { slugify } from './utils';

// Base configuration for your e-commerce site
export const SITE_CONFIG = {
    name: 'JuaExpress',
    fullName: 'JuaExpress Marketplace',
    description: 'Your African shopping destination - Modern e-commerce with personalized recommendations, fast delivery, and exceptional customer service',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://juaexpress.com',
    logo: '/images/icon-512.png',
    email: 'juaexpress01@gmail.com',
    phone: '0792345628',
    country: 'Kenya',
    currency: 'KES',
    locale: 'en_KE',
    socialMedia: {
        twitter: '@juaexpress1',
        facebook: 'https://www.facebook.com/people/Juaexpress/61585676611998/',
        instagram: '@juaexpress_online',
        tiktok: '@juaexpress_online',
        pinterest: 'https://www.pinterest.com/juaexpress01/',
        youtube: 'https://www.youtube.com/@JuaExpress',
    },
};

/**
 * Generate Organization structured data (Schema.org)
 * This helps search engines and AI understand your business
 */
export function generateOrganizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_CONFIG.fullName,
        alternateName: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
        logo: `${SITE_CONFIG.url}${SITE_CONFIG.logo}`,
        description: SITE_CONFIG.description,
        email: SITE_CONFIG.email,
        telephone: SITE_CONFIG.phone,
        address: {
            '@type': 'PostalAddress',
            addressCountry: SITE_CONFIG.country,
        },
        sameAs: [
            SITE_CONFIG.socialMedia.facebook,
            `https://twitter.com/${SITE_CONFIG.socialMedia.twitter.replace('@', '')}`,
            `https://instagram.com/${SITE_CONFIG.socialMedia.instagram.replace('@', '')}`,
            `https://tiktok.com/${SITE_CONFIG.socialMedia.tiktok}`,
            SITE_CONFIG.socialMedia.pinterest,
            SITE_CONFIG.socialMedia.youtube,
        ],
    };
}

/**
 * Generate WebSite structured data with search functionality
 * This enables rich search results and helps AI understand site structure
 */
export function generateWebSiteSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_CONFIG.fullName,
        url: SITE_CONFIG.url,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_CONFIG.url}/search?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };
}

/**
 * Generate Product structured data
 * Critical for e-commerce SEO and AI product understanding
 */
export function generateProductSchema(product: Product, vendor?: VendorInfo) {
    const schema: any = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.description || product.title,
        image: product.gallery_media?.map(m => m.image_url || m.thumbnail_url).filter(Boolean) || [product.image],
        sku: product.id.toString(),
        brand: vendor?.business_name ? {
            '@type': 'Brand',
            name: vendor.business_name,
        } : undefined,
        offers: {
            '@type': 'Offer',
            url: `${SITE_CONFIG.url}/product/${product.id}`,
            priceCurrency: SITE_CONFIG.currency,
            price: product.price,
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: vendor ? {
                '@type': 'Organization',
                name: vendor.business_name,
            } : undefined,
        },
    };

    // Add aggregate rating if available
    if (product.rating && product.reviews > 0) {
        schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviews,
            bestRating: 5,
            worstRating: 1,
        };
    }

    // Add category if available
    if (product.categoryName || product.category) {
        schema.category = product.categoryName || product.category;
    }

    return schema;
}

/**
 * Generate BreadcrumbList structured data
 * Helps with site navigation understanding
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: crumb.url,
        })),
    };
}

/**
 * Generate ItemList structured data for product listings
 * Useful for category and search result pages
 */
export function generateItemListSchema(products: Product[], listName: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: listName,
        numberOfItems: products.length,
        itemListElement: products.slice(0, 10).map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
                '@type': 'Product',
                name: product.title,
                image: product.image,
                url: `${SITE_CONFIG.url}/product/${product.id}`,
                offers: {
                    '@type': 'Offer',
                    price: product.price,
                    priceCurrency: SITE_CONFIG.currency,
                },
            },
        })),
    };
}

/**
 * Generate FAQ structured data
 * Great for AI assistants and featured snippets
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };
}

/**
 * Generate Organization AggregateRating structured data
 * Perfect for platform/company reviews and ratings
 */
export function generateOrganizationRatingSchema(reviews: Array<{
    rating: number;
    content: string;
    author: string;
    datePublished: string;
    verified?: boolean;
}>, overallRating: number, totalReviews: number) {
    const schema: any = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_CONFIG.fullName,
        url: SITE_CONFIG.url,
        logo: `${SITE_CONFIG.url}${SITE_CONFIG.logo}`,
        description: SITE_CONFIG.description,
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: overallRating,
            reviewCount: totalReviews,
            bestRating: 5,
            worstRating: 1,
        },
        review: reviews.slice(0, 10).map(review => ({
            '@type': 'Review',
            author: {
                '@type': 'Person',
                name: review.author,
            },
            reviewRating: {
                '@type': 'Rating',
                ratingValue: review.rating,
                bestRating: 5,
                worstRating: 1,
            },
            reviewBody: review.content,
            datePublished: review.datePublished,
            ...(review.verified && {
                additionalProperty: {
                    '@type': 'PropertyValue',
                    name: 'Verified Purchase',
                    value: 'true',
                },
            }),
        })),
    };

    return schema;
}

/**
 * Generate WebPage with Review collection structured data
 * For review aggregation pages
 */
export function generateReviewCollectionSchema(
    pageTitle: string,
    pageDescription: string,
    reviews: Array<{
        rating: number;
        content: string;
        author: string;
        datePublished: string;
        verified?: boolean;
    }>,
    overallRating: number,
    totalReviews: number
) {
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `${SITE_CONFIG.url}/reviews#webpage`,
                url: `${SITE_CONFIG.url}/reviews`,
                name: pageTitle,
                description: pageDescription,
                isPartOf: {
                    '@type': 'WebSite',
                    '@id': `${SITE_CONFIG.url}#website`,
                    url: SITE_CONFIG.url,
                    name: SITE_CONFIG.fullName,
                    publisher: {
                        '@type': 'Organization',
                        '@id': `${SITE_CONFIG.url}#organization`,
                        name: SITE_CONFIG.fullName,
                        logo: {
                            '@type': 'ImageObject',
                            url: `${SITE_CONFIG.url}${SITE_CONFIG.logo}`,
                        },
                    },
                },
                about: {
                    '@type': 'Organization',
                    '@id': `${SITE_CONFIG.url}#organization`,
                    name: SITE_CONFIG.fullName,
                    aggregateRating: {
                        '@type': 'AggregateRating',
                        ratingValue: overallRating,
                        reviewCount: totalReviews,
                        bestRating: 5,
                        worstRating: 1,
                    },
                },
                mainEntity: {
                    '@type': 'ItemList',
                    numberOfItems: reviews.length,
                    itemListElement: reviews.slice(0, 20).map((review, index) => ({
                        '@type': 'ListItem',
                        position: index + 1,
                        item: {
                            '@type': 'Review',
                            author: {
                                '@type': 'Person',
                                name: review.author,
                            },
                            reviewRating: {
                                '@type': 'Rating',
                                ratingValue: review.rating,
                                bestRating: 5,
                                worstRating: 1,
                            },
                            reviewBody: review.content,
                            datePublished: review.datePublished,
                            ...(review.verified && {
                                additionalProperty: {
                                    '@type': 'PropertyValue',
                                    name: 'Verified Purchase',
                                    value: 'true',
                                },
                            }),
                        },
                    })),
                },
            },
        ],
    };
}

/**
 * Generate Article structured data
 * Perfect for corporate, news, and complex info pages
 */
export function generateArticleSchema(page: { title: string; description: string; image?: string; url: string; lastUpdated?: string }) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: page.title,
        description: page.description,
        image: page.image || `${SITE_CONFIG.url}${SITE_CONFIG.logo}`,
        dateModified: page.lastUpdated || new Date().toISOString(),
        author: {
            '@type': 'Organization',
            name: SITE_CONFIG.fullName,
            url: SITE_CONFIG.url
        },
        publisher: {
            '@type': 'Organization',
            name: SITE_CONFIG.fullName,
            logo: {
                '@type': 'ImageObject',
                url: `${SITE_CONFIG.url}${SITE_CONFIG.logo}`
            }
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': page.url
        }
    };
}

/**
 * Generate WebPage structured data
 * General purpose schema for static informational pages
 */
export function generateWebPageSchema(page: { title: string; description: string; url: string }) {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.title,
        description: page.description,
        url: page.url,
        publisher: {
            '@type': 'Organization',
            name: SITE_CONFIG.fullName
        }
    };
}

/**
 * Update document meta tags dynamically
 */
export function updatePageMeta(config: {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: string;
    noindex?: boolean;
}) {
    const {
        title = SITE_CONFIG.fullName,
        description = SITE_CONFIG.description,
        keywords,
        image = `${SITE_CONFIG.url}${SITE_CONFIG.logo}`,
        url = SITE_CONFIG.url,
        type = 'website',
        noindex = false,
    } = config;

    // Update title
    document.title = title.includes(SITE_CONFIG.name) ? title : `${title} | ${SITE_CONFIG.name}`;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
        const attribute = isProperty ? 'property' : 'name';
        let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attribute, name);
            document.head.appendChild(element);
        }
        element.content = content;
    };

    // Standard meta tags
    updateMeta('description', description);
    if (keywords) updateMeta('keywords', keywords);
    if (noindex) updateMeta('robots', 'noindex, nofollow');

    // Open Graph tags
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:image', image, true);
    updateMeta('og:url', url, true);
    updateMeta('og:type', type, true);
    updateMeta('og:site_name', SITE_CONFIG.fullName, true);
    updateMeta('og:locale', SITE_CONFIG.locale, true);

    // Twitter Card tags
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:site', SITE_CONFIG.socialMedia.twitter);
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', image);

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = url;
}

/**
 * Inject structured data (JSON-LD) into the page
 */
export function injectStructuredData(schema: object, id = 'structured-data') {
    // Remove existing if present
    const existing = document.getElementById(id);
    if (existing) {
        existing.remove();
    }

    // Create new script element
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

/**
 * Remove structured data from the page
 */
export function removeStructuredData(id = 'structured-data') {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

/**
 * Generate complete page SEO config for product detail page
 */
export function getProductPageSEO(product: Product, vendor?: VendorInfo) {
    const price = typeof product.price === 'number'
        ? product.price.toLocaleString('en-KE', { style: 'currency', currency: SITE_CONFIG.currency })
        : '';

    // Priority: Product SEO Title > Derived Title
    const title = (product as any).seo_title || (price ? `${product.title} - ${price}` : product.title);

    // Priority: Product Meta Description > Derived Description
    let description = (product as any).meta_description;
    if (!description) {
        description = product.description
            ? `${product.description.substring(0, 150)}... ${price ? `Price: ${price}. ` : ''}${product.rating ? `Rated ${product.rating}/5 from ${product.reviews} reviews.` : ''}`
            : `Buy ${product.title}${price ? ` at ${price}` : ''}. ${vendor?.business_name ? `Sold by ${vendor.business_name}.` : ''} Fast delivery on JuaExpress.`;
    }

    // Append keywords
    const keywords = [
        ...((product as any).seo_keywords || []),
        ...((product as any).tags || []),
        product.title,
        product.categoryName || 'products',
        'online shopping',
        'Kenya',
        vendor?.business_name || 'JuaExpress'
    ].filter(Boolean).join(', ');

    // Auto-generate slug from title if not provided
    const slug = (product as any).url_slug || (product.title ? slugify(product.title) : '');

    return {
        title,
        description,
        keywords,
        image: product.image,
        url: (product as any).canonical_url || (slug ? `${SITE_CONFIG.url}/product/${product.id}/${slug}` : `${SITE_CONFIG.url}/product/${product.id}`),
        type: 'product',
        noindex: !product.title // Example safety, though usually we want to index
    };
}


/**
 * Generate SEO config for category pages
 */
export function getCategoryPageSEO(categoryName: string, productCount: number) {
    return {
        title: `${categoryName} - Shop Online`,
        description: `Browse ${productCount} ${categoryName.toLowerCase()} products on JuaExpress. Best prices, fast delivery, and secure payment options.`,
        keywords: `${categoryName}, online shopping, Kenya, e-commerce, best deals`,
        type: 'website',
    };
}

/**
 * Generate SEO config for search results
 */
export function getSearchPageSEO(query: string, resultCount: number) {
    return {
        title: `Search Results for "${query}"`,
        description: `Found ${resultCount} products matching "${query}". Shop with confidence on JuaExpress.`,
        keywords: `${query}, search, online shopping, Kenya`,
        type: 'website',
        noindex: true, // Don't index search result pages
    };
}

/**
 * Generate comprehensive hreflang tags for all supported countries
 * This should be called dynamically based on the current page and available countries
 */
export function generateHreflangTags(currentUrl: string, pageType: 'home' | 'category' | 'product' = 'home') {
    // Import country configs dynamically to avoid circular dependencies
    const getCountryConfigs = async () => {
        const { getSupportedCountryCodes, getCountrySEOConfig } = await import('./country-seo');
        const countryCodes = getSupportedCountryCodes();
        return countryCodes.map(code => getCountrySEOConfig(code)).filter(Boolean);
    };

    return getCountryConfigs().then(countryConfigs => {
        const hreflangTags: string[] = [];

        // Add x-default (default/fallback)
        hreflangTags.push(`<link rel="alternate" hreflang="x-default" href="${SITE_CONFIG.url}" />`);

        // Add country-specific alternates
        countryConfigs.forEach(config => {
            if (config) {
                let countryUrl = SITE_CONFIG.url;

                // Customize URL based on page type and country
                switch (pageType) {
                    case 'category':
                        // For category pages, keep the same structure but add country param
                        countryUrl = `${SITE_CONFIG.url}${currentUrl.replace(SITE_CONFIG.url, '')}?country=${config.countryCode.toLowerCase()}`;
                        break;
                    case 'product':
                        // For product pages, keep the same structure but add country param
                        countryUrl = `${SITE_CONFIG.url}${currentUrl.replace(SITE_CONFIG.url, '')}?country=${config.countryCode.toLowerCase()}`;
                        break;
                    default:
                        // For home page, add country parameter
                        countryUrl = `${SITE_CONFIG.url}?country=${config.countryCode.toLowerCase()}`;
                }

                hreflangTags.push(`<link rel="alternate" hreflang="${config.locale}" href="${countryUrl}" />`);
            }
        });

        return hreflangTags.join('\n  ');
    });
}

/**
 * Inject hreflang tags into the document head
 */
export async function injectHreflangTags(currentUrl: string, pageType: 'home' | 'category' | 'product' = 'home') {
    try {
        const hreflangHtml = await generateHreflangTags(currentUrl, pageType);

        // Remove existing hreflang tags
        const existingHreflangs = document.querySelectorAll('link[rel="alternate"][hreflang]');
        existingHreflangs.forEach(tag => tag.remove());

        // Create a temporary container to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = hreflangHtml;

        // Append each link tag to head
        const linkTags = tempDiv.querySelectorAll('link');
        linkTags.forEach(tag => {
            document.head.appendChild(tag);
        });
    } catch (error) {
        console.error('Failed to inject hreflang tags:', error);
    }
}

/**
 * Generate country-specific canonical URL
 */
export function generateCanonicalUrl(baseUrl: string, countryCode?: string): string {
    if (!countryCode || countryCode.toUpperCase() === 'KE') {
        return baseUrl; // Default to Kenya
    }
    return `${baseUrl}?country=${countryCode.toLowerCase()}`;
}

/**
 * Update page with country-specific SEO (meta tags, structured data, hreflang)
 */
export async function updateCountrySEO(countryConfig: any, pageType: 'home' | 'category' | 'product' = 'home', categoryConfig?: any) {
    // Update meta tags
    const metaTags = pageType === 'category' && categoryConfig
        ? generateCategoryMetaTags(categoryConfig, countryConfig)
        : generateCountryMetaTags(countryConfig, pageType);

    updatePageMeta({
        title: metaTags.title,
        description: metaTags.description,
        keywords: metaTags.keywords,
        url: generateCanonicalUrl(window.location.href, countryConfig.countryCode),
    });

    // Inject country-specific structured data
    const businessSchema = generateCountryBusinessSchema(countryConfig);
    injectStructuredData(businessSchema, 'country-business-schema');

    // Inject category-specific schema if applicable
    if (pageType === 'category' && categoryConfig) {
        const categorySchema = generateCategoryStructuredData(categoryConfig, countryConfig);
        injectStructuredData(categorySchema, 'category-schema');

        const faqSchema = generateCategoryFAQData(categoryConfig, countryConfig);
        injectStructuredData(faqSchema, 'category-faq-schema');
    }

    // Update hreflang tags
    await injectHreflangTags(window.location.href, pageType);
}

/**
 * Initialize country-aware SEO for the current page
 */
export async function initializeCountrySEO(pageType: 'home' | 'category' | 'product' = 'home', categoryId?: string) {
    try {
        // Detect user's country
        const { detectUserCountrySEO, getCountrySEOConfig } = await import('./country-seo');
        const countryConfig = await detectUserCountrySEO();

        // Get category config if applicable
        let categoryConfig = null;
        if (pageType === 'category' && categoryId) {
            const { getCategorySEOConfig } = await import('./category-seo');
            categoryConfig = getCategorySEOConfig(categoryId);
        }

        // Apply country-specific SEO
        await updateCountrySEO(countryConfig, pageType, categoryConfig);

        return { countryConfig, categoryConfig };
    } catch (error) {
        console.error('Failed to initialize country SEO:', error);
        // Fallback to default Kenya config
        const { COUNTRY_SEO_CONFIGS } = await import('./country-seo');
        return { countryConfig: COUNTRY_SEO_CONFIGS['KE'], categoryConfig: null };
    }
}
