import { Product, VendorInfo } from '../types';

// Base configuration for your e-commerce site
export const SITE_CONFIG = {
    name: 'JuaExpress',
    fullName: 'JuaExpress Marketplace',
    description: 'Your African shopping destination - Modern e-commerce with personalized recommendations, fast delivery, and exceptional customer service',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://juaexpress.com',
    logo: '/images/icon-512.png',
    email: 'support@juaexpress.com',
    phone: '+254-700-000-000',
    country: 'Kenya',
    currency: 'KES',
    locale: 'en_KE',
    socialMedia: {
        twitter: '@JuaExpress',
        facebook: 'https://facebook.com/juaexpress',
        instagram: '@juaexpress',
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
    const price = product.price.toLocaleString('en-KE', { style: 'currency', currency: SITE_CONFIG.currency });
    const title = `${product.title} - ${price}`;
    const description = product.description
        ? `${product.description.substring(0, 150)}... Price: ${price}. ${product.rating ? `Rated ${product.rating}/5 from ${product.reviews} reviews.` : ''}`
        : `Buy ${product.title} at ${price}. ${vendor?.business_name ? `Sold by ${vendor.business_name}.` : ''} Fast delivery on JuaExpress.`;

    return {
        title,
        description,
        keywords: `${product.title}, ${product.categoryName || 'products'}, online shopping, Kenya, ${vendor?.business_name || 'JuaExpress'}`,
        image: product.image,
        url: `${SITE_CONFIG.url}/product/${product.id}`,
        type: 'product',
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
