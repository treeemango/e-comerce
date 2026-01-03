import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { getSupportedCountryCodes, getCountrySEOConfig } from '../lib/country-seo';

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
  is_active?: boolean;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugifyCategoryName(name: string): string {
  // Preserve existing slugs like "mobile-&-smart-phones" if present in DB.
  // When slug missing, fall back to a conservative slugification.
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.~&]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildUrl(baseUrl: string, pathname: string, countryCode?: string): string {
  const url = new URL(pathname, baseUrl);
  if (countryCode && countryCode !== 'KE') {
    url.searchParams.set('country', countryCode.toLowerCase());
  }
  return url.toString();
}

function renderUrlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `
  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * Generate base sitemap structure for a specific country
 */
function generateBaseSitemapXML(baseUrl: string, today: string, countryCode?: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Main Pages -->
${renderUrlEntry(buildUrl(baseUrl, '/', countryCode), today, 'daily', '1.0')}
${renderUrlEntry(buildUrl(baseUrl, '/five-star', countryCode), today, 'daily', '0.9')}
${renderUrlEntry(buildUrl(baseUrl, '/best-selling', countryCode), today, 'daily', '0.9')}

  <!-- Static Pages -->
${renderUrlEntry(buildUrl(baseUrl, '/about', countryCode), today, 'monthly', '0.5')}
${renderUrlEntry(buildUrl(baseUrl, '/company-details', countryCode), today, 'monthly', '0.4')}
${renderUrlEntry(buildUrl(baseUrl, '/help', countryCode), today, 'monthly', '0.5')}
${renderUrlEntry(buildUrl(baseUrl, '/returns', countryCode), today, 'monthly', '0.4')}
${renderUrlEntry(buildUrl(baseUrl, '/shipping', countryCode), today, 'monthly', '0.4')}
${renderUrlEntry(buildUrl(baseUrl, '/protection', countryCode), today, 'monthly', '0.4')}
${renderUrlEntry(buildUrl(baseUrl, '/terms', countryCode), today, 'monthly', '0.4')}
${renderUrlEntry(buildUrl(baseUrl, '/privacy', countryCode), today, 'monthly', '0.4')}
${renderUrlEntry(buildUrl(baseUrl, '/contact', countryCode), today, 'monthly', '0.5')}
${renderUrlEntry(buildUrl(baseUrl, '/seller-login', countryCode), today, 'monthly', '0.6')}`;
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

  // Add categories (real DB slugs)
  categories
    .filter((c) => c && (c.is_active === undefined || c.is_active === true))
    .forEach((category: Category) => {
      const slug = (category.slug || slugifyCategoryName(category.name || '')).trim();
      if (!slug) return;
      xml += renderUrlEntry(buildUrl(baseUrl, `/category/${slug}`, countryCode), today, 'weekly', '0.8');
    });

  // Add products for this country (limit to top products per country)
  const productsPerCountry = 500; // Limit products per country sitemap
  products.slice(0, productsPerCountry).forEach((product: Product) => {
    const lastmod = product.updated_at
      ? new Date(product.updated_at).toISOString().split('T')[0]
      : today;

    xml += renderUrlEntry(buildUrl(baseUrl, `/product/${product.id}`, countryCode), lastmod, 'weekly', '0.7');
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
    const slug = (category.slug || slugifyCategoryName(category.name || '')).trim();
    if (!slug) return;
    xml += renderUrlEntry(buildUrl(baseUrl, `/category/${slug}`), today, 'weekly', '0.8');
  });

  // Add products
  products.forEach((product: Product) => {
    const lastmod = product.updated_at
      ? new Date(product.updated_at).toISOString().split('T')[0]
      : today;
    xml += renderUrlEntry(buildUrl(baseUrl, `/product/${product.id}`), lastmod, 'weekly', '0.7');
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
    .select('id, name, slug, is_active')
    .order('name')
    .limit(2000);

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
