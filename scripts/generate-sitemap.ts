import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
function loadEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = envContent.split('\n').reduce((acc, line) => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                acc[key.trim()] = valueParts.join('=').trim();
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

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
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
 * Generate sitemap.xml dynamically from database
 */
async function generateSitemap() {
    console.log('🚀 Starting sitemap generation...');

    const baseUrl = 'https://juaexpress.com';
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Main Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/five-star</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/best-selling</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/help</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/seller-login</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;

    // Fetch categories
    console.log('📂 Fetching categories...');
    const { data: categories, error: categoriesError } = await supabase
        .from('shopify_categories')
        .select('id, name')
        .limit(100);

    if (categoriesError) {
        console.warn('⚠️ Warning: Could not fetch categories:', categoriesError.message);
    } else if (categories) {
        console.log(`✅ Found ${categories.length} categories`);
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
    }

    // Fetch products
    console.log('📦 Fetching products...');
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, title, updated_at')
        .in('status', ['active', 'approved'])
        .limit(1000); // Adjust limit as needed

    if (productsError) {
        console.warn('⚠️ Warning: Could not fetch products:', productsError.message);
    } else if (products) {
        console.log(`✅ Found ${products.length} products`);
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
    }

    xml += '\n</urlset>\n';

    // Write to file
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    fs.writeFileSync(sitemapPath, xml);

    console.log(`✅ Sitemap generated successfully at: ${sitemapPath}`);
    console.log(`📊 Total URLs: ${(xml.match(/<url>/g) || []).length}`);
}

// Run the generator
generateSitemap().catch((error) => {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
});
