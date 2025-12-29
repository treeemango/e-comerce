import { SITE_CONFIG } from './seo-utils';
import { CountrySEOConfig } from './country-seo';

// Category-specific SEO configuration
export interface CategorySEOConfig {
    id: string;
    name: string;
    slug: string;

    // SEO-specific config
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    searchTerms: string[];

    // Category-specific structured data
    categoryType: 'electronics' | 'fashion' | 'home-garden' | 'books-stationery' | 'sports-outdoors' | 'phones-tablets' | 'other';
    subcategories: string[];

    // Content for category pages
    heroTitle: string;
    heroDescription: string;
    features: string[];

    // Popular products/brands in this category
    popularBrands: string[];
    trendingProducts: string[];
}

// Category-specific SEO configurations
export const CATEGORY_SEO_CONFIGS: Record<string, CategorySEOConfig> = {
    // Electronics
    'electronics': {
        id: 'electronics',
        name: 'Electronics',
        slug: 'electronics',

        metaTitle: 'Shop Electronics Online - Latest Gadgets, Smartphones & More',
        metaDescription: 'Discover the latest electronics at unbeatable prices. Shop smartphones, laptops, TVs, gaming consoles, and smart home devices with fast delivery and warranty.',
        keywords: ['electronics online', 'smartphones', 'laptops', 'TVs', 'gaming', 'smart home', 'gadgets', 'latest technology'],
        searchTerms: ['buy electronics online', 'latest smartphones', 'best laptops', 'smart TVs', 'gaming consoles', 'smart home devices'],

        categoryType: 'electronics',
        subcategories: ['smartphones', 'laptops', 'tablets', 'TVs', 'audio', 'gaming', 'cameras', 'smart-home'],

        heroTitle: 'Latest Electronics & Technology',
        heroDescription: 'Stay ahead with cutting-edge technology and innovative gadgets.',
        features: ['Latest Models', 'Warranty Protection', 'Expert Support', 'Fast Delivery'],

        popularBrands: ['Samsung', 'Apple', 'Huawei', 'Xiaomi', 'Sony', 'LG', 'Dell', 'HP'],
        trendingProducts: ['iPhone 15', 'Samsung Galaxy S24', 'MacBook Air', 'iPad Pro', 'Sony PlayStation 5']
    },

    // Fashion
    'fashion': {
        id: 'fashion',
        name: 'Fashion & Clothing',
        slug: 'fashion',

        metaTitle: 'Shop Fashion Online - Trendy Clothing, Shoes & Accessories',
        metaDescription: 'Express your style with our curated fashion collection. Shop trendy clothing, shoes, bags, and accessories for men, women, and kids. Quality fashion at affordable prices.',
        keywords: ['fashion online', 'clothing', 'shoes', 'bags', 'accessories', 'mens fashion', 'womens fashion', 'kids clothing'],
        searchTerms: ['buy clothes online', 'fashion shopping', 'trendy clothing', 'designer shoes', 'fashion accessories', 'online boutique'],

        categoryType: 'fashion',
        subcategories: ['mens-clothing', 'womens-clothing', 'kids-clothing', 'shoes', 'bags', 'jewelry', 'watches'],

        heroTitle: 'Express Your Style',
        heroDescription: 'Discover the latest fashion trends and timeless classics.',
        features: ['Latest Trends', 'Quality Materials', 'Size Guide', 'Fashion Advice'],

        popularBrands: ['Nike', 'Adidas', 'Zara', 'H&M', 'Gucci', 'Louis Vuitton', 'Chanel', 'Prada'],
        trendingProducts: ['Nike Air Max', 'Adidas Ultraboost', 'Zara Dress', 'Levi\'s Jeans', 'Gucci Bag']
    },

    // Phones & Tablets
    'phones-tablets': {
        id: 'phones-tablets',
        name: 'Phones & Tablets',
        slug: 'phones-tablets',

        metaTitle: 'Buy Phones & Tablets Online - Latest Smartphones & iPads',
        metaDescription: 'Find the perfect phone or tablet for your needs. Compare latest smartphones, iPhones, Android devices, and tablets with expert reviews and best prices.',
        keywords: ['phones online', 'smartphones', 'iPhone', 'Samsung Galaxy', 'tablets', 'iPad', 'Android phones', 'mobile phones'],
        searchTerms: ['buy phone online', 'latest smartphones', 'iPhone deals', 'Samsung Galaxy', 'best tablets', 'iPad Pro'],

        categoryType: 'phones-tablets',
        subcategories: ['smartphones', 'feature-phones', 'tablets', 'accessories', 'cases', 'screen-protectors'],

        heroTitle: 'Stay Connected',
        heroDescription: 'Discover the latest smartphones and tablets with cutting-edge features.',
        features: ['Latest Models', 'Network Unlocked', 'Warranty', 'Trade-in Options'],

        popularBrands: ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'Google', 'Oppo', 'Vivo'],
        trendingProducts: ['iPhone 15 Pro', 'Samsung Galaxy S24', 'iPad Air', 'Google Pixel 8', 'OnePlus 12']
    },

    // Home & Garden
    'home-garden': {
        id: 'home-garden',
        name: 'Home & Garden',
        slug: 'home-garden',

        metaTitle: 'Shop Home & Garden Online - Furniture, Decor & Garden Supplies',
        metaDescription: 'Transform your home with our home and garden collection. Shop furniture, decor, kitchenware, and garden supplies. Create your perfect living space.',
        keywords: ['home decor', 'furniture online', 'garden supplies', 'kitchenware', 'home improvement', 'interior design', 'outdoor furniture'],
        searchTerms: ['buy furniture online', 'home decor ideas', 'garden supplies', 'kitchen appliances', 'bedroom furniture', 'outdoor decor'],

        categoryType: 'home-garden',
        subcategories: ['furniture', 'decor', 'kitchen', 'bathroom', 'garden', 'lighting', 'bedding'],

        heroTitle: 'Your Home, Your Style',
        heroDescription: 'Create the perfect living space with our home and garden essentials.',
        features: ['Quality Materials', 'Modern Designs', 'Assembly Service', 'Interior Design Tips'],

        popularBrands: ['IKEA', 'Wayfair', 'West Elm', 'Pottery Barn', 'Crate & Barrel', 'Home Depot', 'Gardeners Supply'],
        trendingProducts: ['Modern Sofa', 'Dining Table Set', 'Garden Tools', 'Kitchen Appliances', 'Bedroom Furniture']
    },

    // Books & Stationery
    'books-stationery': {
        id: 'books-stationery',
        name: 'Books & Stationery',
        slug: 'books-stationery',

        metaTitle: 'Buy Books & Stationery Online - Educational & Office Supplies',
        metaDescription: 'Expand your mind and stay organized. Shop books, stationery, educational materials, and office supplies. Free delivery on orders over minimum amount.',
        keywords: ['books online', 'stationery', 'educational books', 'office supplies', 'notebooks', 'pens', 'textbooks', 'study materials'],
        searchTerms: ['buy books online', 'stationery supplies', 'textbooks', 'notebooks', 'writing instruments', 'office stationery'],

        categoryType: 'books-stationery',
        subcategories: ['books', 'notebooks', 'pens', 'art-supplies', 'office-supplies', 'educational-materials'],

        heroTitle: 'Knowledge & Creativity',
        heroDescription: 'Fuel your mind and express your creativity with our books and stationery collection.',
        features: ['Wide Selection', 'Educational Focus', 'Quality Materials', 'Bulk Discounts'],

        popularBrands: ['Penguin', 'HarperCollins', 'Oxford University Press', 'BIC', 'Stabilo', 'Moleskine', 'Pilot'],
        trendingProducts: ['Bestseller Books', 'College Notebooks', 'Art Supplies', 'Office Stationery', 'Educational Toys']
    },

    // Sports & Outdoors
    'sports-outdoors': {
        id: 'sports-outdoors',
        name: 'Sports & Outdoors',
        slug: 'sports-outdoors',

        metaTitle: 'Shop Sports & Outdoors Online - Fitness Gear & Outdoor Equipment',
        metaDescription: 'Gear up for your active lifestyle. Shop sports equipment, fitness gear, outdoor clothing, and camping supplies. Quality products for every adventure.',
        keywords: ['sports equipment', 'fitness gear', 'outdoor clothing', 'camping supplies', 'running shoes', 'gym equipment', 'sports accessories'],
        searchTerms: ['buy sports gear online', 'fitness equipment', 'outdoor clothing', 'camping supplies', 'running shoes', 'gym accessories'],

        categoryType: 'sports-outdoors',
        subcategories: ['fitness', 'running', 'camping', 'sports-clothing', 'sports-shoes', 'outdoor-gear'],

        heroTitle: 'Active Living',
        heroDescription: 'Equip yourself for sports, fitness, and outdoor adventures.',
        features: ['Performance Gear', 'Quality Materials', 'Expert Advice', 'Fitness Guides'],

        popularBrands: ['Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'The North Face', 'Columbia', 'Patagonia'],
        trendingProducts: ['Running Shoes', 'Yoga Mats', 'Camping Gear', 'Sports Clothing', 'Fitness Equipment']
    }
};

/**
 * Get category SEO config by category ID or slug
 */
export function getCategorySEOConfig(categoryId: string): CategorySEOConfig | null {
    return CATEGORY_SEO_CONFIGS[categoryId.toLowerCase()] || null;
}

/**
 * Get all category IDs
 */
export function getAllCategoryIds(): string[] {
    return Object.keys(CATEGORY_SEO_CONFIGS);
}

/**
 * Generate country-specific category meta tags
 */
export function generateCategoryMetaTags(
    categoryConfig: CategorySEOConfig,
    countryConfig: CountrySEOConfig,
    pageType: 'category' | 'subcategory' = 'category'
) {
    const baseTitle = categoryConfig.metaTitle;
    const baseDescription = categoryConfig.metaDescription;

    let title = baseTitle;
    let description = baseDescription;

    // Customize for country
    if (pageType === 'category') {
        title = `${categoryConfig.name} in ${countryConfig.name} - ${SITE_CONFIG.name}`;
        description = `Shop ${categoryConfig.name.toLowerCase()} in ${countryConfig.name}. ${categoryConfig.heroDescription} Fast delivery, secure payments, and trusted sellers.`;
    }

    return {
        title: title.includes(SITE_CONFIG.name) ? title : `${title} | ${SITE_CONFIG.name}`,
        description,
        keywords: [...categoryConfig.keywords, ...countryConfig.keywords].join(', '),
        geoRegion: countryConfig.geoRegion,
        geoPlacename: countryConfig.geoPlacename,
        locale: countryConfig.locale,
    };
}

/**
 * Generate category-specific structured data
 */
export function generateCategoryStructuredData(
    categoryConfig: CategorySEOConfig,
    countryConfig: CountrySEOConfig
) {
    return {
        '@context': 'https://schema.org',
        '@graph': [
            // CollectionPage for category
            {
                '@type': 'CollectionPage',
                '@id': `${SITE_CONFIG.url}/category/${categoryConfig.slug}#webpage`,
                url: `${SITE_CONFIG.url}/category/${categoryConfig.slug}`,
                name: categoryConfig.heroTitle,
                description: categoryConfig.heroDescription,
                inLanguage: countryConfig.locale,
                isPartOf: {
                    '@type': 'WebSite',
                    '@id': `${SITE_CONFIG.url}#website`,
                    url: SITE_CONFIG.url,
                    name: SITE_CONFIG.fullName,
                },
                about: {
                    '@type': 'Thing',
                    name: categoryConfig.name,
                    description: categoryConfig.metaDescription,
                },
                mainEntity: {
                    '@type': 'ItemList',
                    name: `${categoryConfig.name} Collection`,
                    description: `Browse our ${categoryConfig.name.toLowerCase()} collection featuring ${categoryConfig.subcategories.join(', ')}`,
                    numberOfItems: categoryConfig.subcategories.length,
                    itemListElement: categoryConfig.subcategories.map((subcategory, index) => ({
                        '@type': 'ListItem',
                        position: index + 1,
                        item: {
                            '@type': 'Product',
                            category: subcategory,
                            offers: {
                                '@type': 'Offer',
                                availability: 'https://schema.org/InStock',
                                priceCurrency: countryConfig.currencyCode,
                                seller: {
                                    '@type': 'Organization',
                                    name: countryConfig.businessName,
                                },
                            },
                        },
                    })),
                },
            },
            // Organization schema for the category page
            {
                '@type': 'Organization',
                '@id': `${SITE_CONFIG.url}#organization`,
                name: countryConfig.businessName,
                url: SITE_CONFIG.url,
                logo: `${SITE_CONFIG.url}${SITE_CONFIG.logo}`,
                areaServed: {
                    '@type': 'Country',
                    name: countryConfig.name,
                },
                hasOfferCatalog: {
                    '@type': 'OfferCatalog',
                    name: `${categoryConfig.name} Catalog`,
                    itemListElement: categoryConfig.popularBrands.map((brand, index) => ({
                        '@type': 'ListItem',
                        position: index + 1,
                        item: {
                            '@type': 'Brand',
                            name: brand,
                        },
                    })),
                },
            },
        ],
    };
}

/**
 * Generate category FAQ structured data
 */
export function generateCategoryFAQData(
    categoryConfig: CategorySEOConfig,
    countryConfig: CountrySEOConfig
) {
    const faqs = [
        {
            question: `How can I buy ${categoryConfig.name.toLowerCase()} online in ${countryConfig.name}?`,
            answer: `Browse our ${categoryConfig.name.toLowerCase()} collection and add items to your cart. Choose from multiple payment options including ${countryConfig.paymentMethods.slice(0, 3).join(', ')}. Enjoy ${countryConfig.shippingTime} delivery across ${countryConfig.name}.`
        },
        {
            question: `What brands of ${categoryConfig.name.toLowerCase()} do you offer?`,
            answer: `We carry premium brands including ${categoryConfig.popularBrands.slice(0, 5).join(', ')}, and many more. All products come with warranty and quality guarantee.`
        },
        {
            question: `Do you offer delivery for ${categoryConfig.name.toLowerCase()} in ${countryConfig.name}?`,
            answer: `Yes! We provide fast delivery across ${countryConfig.name} with ${countryConfig.shippingTime}. Track your order in real-time and enjoy our customer support.`
        },
        {
            question: `What payment methods are accepted for ${categoryConfig.name.toLowerCase()} purchases?`,
            answer: `We accept ${countryConfig.paymentMethods.join(', ')} for secure and convenient payments. Your payment information is protected with bank-level security.`
        }
    ];

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
 * Get category-specific content for hero sections
 */
export function getCategoryHeroContent(
    categoryConfig: CategorySEOConfig,
    countryConfig: CountrySEOConfig
) {
    return {
        title: `${categoryConfig.heroTitle} in ${countryConfig.name}`,
        subtitle: categoryConfig.heroDescription,
        features: [
            ...categoryConfig.features,
            `Delivery in ${countryConfig.shippingTime}`,
            `Trusted by ${countryConfig.trustSignals[0]}`,
        ],
        ctaText: `Shop ${categoryConfig.name}`,
        backgroundImage: `/images/categories/${categoryConfig.slug}-hero.jpg`,
    };
}

/**
 * Get trending products for category
 */
export function getCategoryTrendingProducts(categoryConfig: CategorySEOConfig): string[] {
    return categoryConfig.trendingProducts;
}

/**
 * Get related categories for cross-selling
 */
export function getRelatedCategories(categoryId: string): string[] {
    const relatedMap: Record<string, string[]> = {
        'electronics': ['phones-tablets', 'fashion'],
        'fashion': ['electronics', 'home-garden'],
        'phones-tablets': ['electronics', 'fashion'],
        'home-garden': ['fashion', 'sports-outdoors'],
        'books-stationery': ['electronics', 'home-garden'],
        'sports-outdoors': ['fashion', 'electronics'],
    };

    return relatedMap[categoryId] || [];
}
