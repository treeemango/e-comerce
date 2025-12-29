# 🚀 JuaExpress Multi-Country SEO Deployment Guide

## 🔒 Security First - Critical Pre-Deployment Steps

### Step 1: Run Security Check
```bash
# Run this BEFORE any deployment
chmod +x deploy-security-check.sh
./deploy-security-check.sh
```

If this fails, **STOP** and fix the issues before proceeding.

### Step 2: Environment Variables Setup

#### Development (.env)
✅ **SECURE**: Contains only client-safe variables
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### Production (.env.production)
❌ **NEVER COMMIT**: Contains server-only secrets
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
HF_API_KEY=your_hf_api_key
GROK_API_KEY=your_grok_api_key
```

### Step 3: Deployment Platform Configuration

#### Vercel/Netlify Deployment
Set these environment variables in your deployment dashboard:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
HF_API_KEY=hf_your_key_here
GROK_API_KEY=xai-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

#### Build Command
```json
{
  "scripts": {
    "build": "vite build",
    "postbuild": "npm run generate-sitemap"
  }
}
```

## 🌍 Multi-Country SEO Configuration

### Step 4: Supported Countries
Your system now supports:
- 🇬🇧 United Kingdom (GBP)
- 🇰🇪 Kenya (KES)
- 🇳🇬 Nigeria (NGN)
- 🇿🇦 South Africa (ZAR)
- 🇬🇭 Ghana (GHS)
- 🇺🇬 Uganda (UGX)
- 🇹🇿 Tanzania (TZS)

### Step 5: URL Structure
```
/                           # Auto-detects country
/?country=ke              # Kenya version
/?country=uk              # UK version
/category/electronics      # Default (Kenya)
/category/electronics?country=ng  # Nigeria
/product/123               # Default (Kenya)
/product/123?country=za    # South Africa
```

### Step 6: Sitemap Generation
The system generates:
- `sitemap.xml` - Default (Kenya) sitemap
- `sitemap-index.xml` - Index of all country sitemaps
- `sitemap-gb.xml` - UK sitemap
- `sitemap-ke.xml` - Kenya sitemap
- `sitemap-ng.xml` - Nigeria sitemap
- etc.

Submit `sitemap-index.xml` to Google Search Console.

## 🔧 Implementation Steps

### Step 7: Add SEO to Your Components

#### Home Page
```tsx
import { useCountrySEO } from '../hooks/useCountrySEO';

function HomePage() {
  const { countryConfig, isLoading } = useCountrySEO({
    pageType: 'home'
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{countryConfig.businessName}</h1>
      <p>{countryConfig.businessDescription}</p>
      {/* Rest of your content */}
    </div>
  );
}
```

#### Category Page
```tsx
function CategoryPage({ categoryId }) {
  const { countryConfig, categoryConfig } = useCountrySEO({
    pageType: 'category',
    categoryId: categoryId
  });

  return (
    <div>
      <h1>{categoryConfig.name} in {countryConfig.name}</h1>
      {/* Country-specific content */}
    </div>
  );
}
```

#### Product Page
```tsx
function ProductPage({ productId }) {
  const { countryConfig } = useCountrySEO({
    pageType: 'product'
  });

  return (
    <div>
      {/* Product content with country-specific pricing */}
    </div>
  );
}
```

## 🎯 SEO Benefits

### What You'll Get
1. **Localized Search Results**: "Buy electronics in Kenya" shows Kenyan results
2. **Improved CTR**: Country-specific titles and descriptions
3. **Better Rankings**: Proper hreflang signals to search engines
4. **Enhanced UX**: Content matches user location and preferences

### Search Engine Visibility
- **Google Search Console**: Set up separate properties for each country
- **Bing Webmaster Tools**: Submit country-specific sitemaps
- **Hreflang Validation**: Use Google's hreflang testing tool

## 📊 Monitoring & Analytics

### Google Search Console Setup
1. Add separate properties for each country:
   - `juaexpress.com` (default)
   - `juaexpress.com/?country=ke` (Kenya)
   - `juaexpress.com/?country=uk` (UK)
   - etc.

2. Submit country-specific sitemaps to each property

### Analytics Tracking
```javascript
// Track country-specific events
gtag('event', 'country_detected', {
  country: countryConfig.countryCode,
  currency: countryConfig.currencyCode
});
```

## 🚨 Emergency Security Checklist

### Before Going Live
- [ ] Run `./deploy-security-check.sh` - must pass
- [ ] Check no `VITE_*` variables contain secrets
- [ ] Verify `.env.production` is gitignored
- [ ] Test build doesn't contain API keys
- [ ] Confirm server environment variables are set

### If Secrets Are Exposed
1. **IMMEDIATELY** regenerate all exposed API keys
2. Update Supabase service role key if exposed
3. Clear any cached build artifacts
4. Monitor for unauthorized access

## 🔄 Post-Deployment

### Submit to Search Engines
```bash
# Submit sitemaps after deployment
curl "https://www.google.com/ping?sitemap=https://juaexpress.com/sitemap-index.xml"
curl "https://www.bing.com/ping?sitemap=https://juaexpress.com/sitemap-index.xml"
```

### Monitor Performance
- Check Google Search Console for indexing
- Monitor Core Web Vitals by country
- Track conversion rates by market
- Analyze search query performance

## 🆘 Troubleshooting

### Common Issues

**SEO not working:**
- Check browser console for JavaScript errors
- Verify environment variables are set correctly
- Test sitemap URLs are accessible

**Country detection failing:**
- Check user's IP geolocation service
- Verify currency detection is working
- Test localStorage functionality

**Build failing:**
- Ensure all environment variables are set
- Check TypeScript compilation
- Verify no circular imports

---

## ✅ Ready for Secure Deployment!

Your multi-country SEO system is now secure and ready for production. The country-aware architecture will give you a significant competitive advantage in international e-commerce search results.

**Remember**: Security first! Always run the security check before deployment.
