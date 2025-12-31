import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { getSupportedCountryCodes, getCountrySEOConfig } from '../lib/country-seo';
import { getAllCategoryIds, getCategorySEOConfig } from '../lib/category-seo';

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = envContent.split(/\r?\n/).reduce((acc, line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return acc;

      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        acc[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
      return acc;
    }, {} as Record<string, string>);

    Object.entries(envVars).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

// Create Supabase client directly for Node.js environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Product {
  id: string;
  title: string;
  updated_at?: string;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
}

/**
 * Generate base sitemap structure for a specific country
 */
function generateBaseSitemapXML(baseUrl: string, today: string, countryCode?: string) {
  const countryParam = countryCode && countryCode !== 'KE' ? `?country=${countryCode.toLowerCase()}` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Main Pages -->
  <url>
    <loc>${baseUrl}/${countryParam}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>${baseUrl}/five-star${countryParam}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>${baseUrl}/best-selling${countryParam}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/about${countryParam}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <url>
    <loc>${baseUrl}/contact${countryParam}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <url>
    <loc>${baseUrl}/help${countryParam}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <url>
    <loc>${baseUrl}/seller-login${countryParam}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
}

/**
 * Generate main sitemap index that references country-specific sitemaps
 */
async function generateMainSitemapIndex(baseUrl: string, today: string) {
  const supportedCountries = getSupportedCountryCodes();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Default/Global Sitemap -->
  <sitemap>
    <loc>${baseUrl}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`;

  // Add country-specific sitemaps
  supportedCountries.forEach(countryCode => {
    const countryConfig = getCountrySEOConfig(countryCode);
    if (countryConfig) {
      xml += `
  <sitemap>
    <loc>${baseUrl}/sitemap-${countryCode.toLowerCase()}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`;
    }
  });

  xml += '\n</sitemapindex>\n';
  return xml;
}

/**
 * Generate country-specific sitemap
 */
async function generateCountrySitemap(countryCode: string, categories: Category[], products: Product[]) {
  const baseUrl = 'https://juaexpress.com';
  const today = new Date().toISOString().split('T')[0];
  const countryConfig = getCountrySEOConfig(countryCode);

  if (!countryConfig) {
    throw new Error(`Country config not found for: ${countryCode}`);
  }

  let xml = generateBaseSitemapXML(baseUrl, today, countryCode);

  // Add categories for this country
  const categoryIds = getAllCategoryIds();
  categoryIds.forEach(categoryId => {
    const categoryConfig = getCategorySEOConfig(categoryId);
    if (categoryConfig) {
      const countryParam = countryCode !== 'KE' ? `?country=${countryCode.toLowerCase()}` : '';
      xml += `
  <url>
    <loc>${baseUrl}/category/${categoryConfig.slug}${countryParam}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }
  });

  // Add products for this country (limit to top products per country)
  const productsPerCountry = 500; // Limit products per country sitemap
  products.slice(0, productsPerCountry).forEach((product: Product) => {
    const lastmod = product.updated_at
      ? new Date(product.updated_at).toISOString().split('T')[0]
      : today;
    const countryParam = countryCode !== 'KE' ? `?country=${countryCode.toLowerCase()}` : '';

    xml += `
  <url>
    <loc>${baseUrl}/product/${product.id}${countryParam}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  xml += '\n</urlset>\n';
  return xml;
}

/**
 * Generate default sitemap (Kenya-focused for backward compatibility)
 */
async function generateDefaultSitemap(categories: Category[], products: Product[]) {
  const baseUrl = 'https://juaexpress.com';
  const today = new Date().toISOString().split('T')[0];

  let xml = generateBaseSitemapXML(baseUrl, today);

  // Add categories
  categories.forEach((category: Category) => {
    const slug = category.slug || category.name.toLowerCase().replace(/\s+/g, '-');
    xml += `
  <url>
    <loc>${baseUrl}/category/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  // Add products
  products.forEach((product: Product) => {
    const lastmod = product.updated_at
      ? new Date(product.updated_at).toISOString().split('T')[0]
      : today;
    xml += `
  <url>
    <loc>${baseUrl}/product/${product.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  xml += '\n</urlset>\n';
  return xml;
}

/**
 * Generate all sitemaps (main index + default + country-specific)
 */
async function generateSitemap() {
  console.log('🚀 Starting multi-country sitemap generation...');

  const baseUrl = 'https://juaexpress.com';
  const today = new Date().toISOString().split('T')[0];
  const supportedCountries = getSupportedCountryCodes();

  // Fetch categories
  console.log('📂 Fetching categories...');
  const { data: categories, error: categoriesError } = await supabase
    .from('shopify_categories')
    .select('id, name')
    .limit(100);

  if (categoriesError) {
    console.warn('⚠️ Warning: Could not fetch categories:', categoriesError.message);
  }

  // Fetch products
  console.log('📦 Fetching products...');
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, title, updated_at')
    .in('status', ['active', 'approved'])
    .limit(2000); // Increased limit for multiple country sitemaps

  if (productsError) {
    console.warn('⚠️ Warning: Could not fetch products:', productsError.message);
  }

  const categoriesData = categories || [];
  const productsData = products || [];

  console.log(`✅ Found ${categoriesData.length} categories and ${productsData.length} products`);

  // Generate main sitemap index
  console.log('📄 Generating main sitemap index...');
  const mainIndexXml = await generateMainSitemapIndex(baseUrl, today);
  const mainIndexPath = path.join(process.cwd(), 'public', 'sitemap-index.xml');
  fs.writeFileSync(mainIndexPath, mainIndexXml);
  console.log(`✅ Main sitemap index saved: ${mainIndexPath}`);

  // Generate default sitemap (for backward compatibility)
  console.log('📄 Generating default sitemap...');
  const defaultXml = await generateDefaultSitemap(categoriesData, productsData);
  const defaultPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(defaultPath, defaultXml);
  console.log(`✅ Default sitemap saved: ${defaultPath}`);

  // Generate country-specific sitemaps
  console.log('🌍 Generating country-specific sitemaps...');
  for (const countryCode of supportedCountries) {
    try {
      console.log(`  📄 Generating sitemap for ${countryCode}...`);
      const countryXml = await generateCountrySitemap(countryCode, categoriesData, productsData);
      const countryPath = path.join(process.cwd(), 'public', `sitemap-${countryCode.toLowerCase()}.xml`);
      fs.writeFileSync(countryPath, countryXml);
      console.log(`  ✅ Saved: ${countryPath}`);
    } catch (error) {
      console.error(`  ❌ Failed to generate sitemap for ${countryCode}:`, error);
    }
  }

  // Generate robots.txt with sitemap references
  console.log('🤖 Updating robots.txt...');
  const robotsTxt = `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap-index.xml
Sitemap: ${baseUrl}/sitemap.xml

${supportedCountries.map(code => `Sitemap: ${baseUrl}/sitemap-${code.toLowerCase()}.xml`).join('\n')}

# Crawl delay for large sitemaps
Crawl-delay: 1
`;

  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  fs.writeFileSync(robotsPath, robotsTxt);
  console.log(`✅ Robots.txt updated: ${robotsPath}`);

  console.log('🎉 Multi-country sitemap generation completed!');
  console.log(`📊 Generated sitemaps for ${supportedCountries.length + 1} regions`);
  console.log(`📍 Main sitemap index: ${baseUrl}/sitemap-index.xml`);
}

// Run the generator
generateSitemap().catch((error) => {
  console.error('❌ Error generating sitemap:', error);
  process.exit(1);
});
