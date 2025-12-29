#!/bin/bash

# ===========================================
# ✅ JUAEXPRESS DEPLOYMENT READINESS TEST
# ===========================================

echo "🚀 Testing JuaExpress Multi-Country SEO Deployment Readiness..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECKS_PASSED=0
TOTAL_CHECKS=0

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    echo -e "   $2"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo -e "   $2"
}

((TOTAL_CHECKS++))
echo "📋 Check 1: Environment file security..."
if grep -q "VITE_SUPABASE_SERVICE_ROLE_KEY\|VITE_HF_API_KEY\|VITE_GROK_API_KEY" .env 2>/dev/null; then
    check_fail "Sensitive keys found in .env" "Remove VITE_ prefixed sensitive variables"
else
    check_pass "No sensitive keys in client environment"
fi

((TOTAL_CHECKS++))
echo "📋 Check 2: Production secrets protection..."
if [ -f ".env.production" ] && ! git ls-files .env.production >/dev/null 2>&1; then
    check_pass "Production secrets are gitignored"
else
    check_fail ".env.production not properly protected" "Add .env.production to .gitignore"
fi

((TOTAL_CHECKS++))
echo "📋 Check 3: Build safety..."
if npm run build >/dev/null 2>&1; then
    if grep -r "SUPABASE_SERVICE_ROLE_KEY\|HF_API_KEY\|GROK_API_KEY" dist/ >/dev/null 2>&1; then
        check_fail "Secrets found in build output" "Clean build artifacts and check environment variables"
    else
        check_pass "Build output contains no secrets"
    fi
else
    check_warn "Build failed" "Cannot verify build security - fix build issues first"
fi

((TOTAL_CHECKS++))
echo "📋 Check 4: Multi-country SEO system..."
if [ -f "lib/country-seo.ts" ] && [ -f "lib/category-seo.ts" ] && [ -f "lib/seo-utils.ts" ]; then
    check_pass "SEO system files present"
else
    check_fail "SEO system files missing" "Run the multi-country SEO setup again"
fi

((TOTAL_CHECKS++))
echo "📋 Check 5: React hooks..."
if [ -f "hooks/useCountrySEO.ts" ]; then
    check_pass "React hooks for SEO integration present"
else
    check_fail "SEO hooks missing" "useCountrySEO hook not found"
fi

((TOTAL_CHECKS++))
echo "📋 Check 6: Sitemap generation..."
if [ -f "scripts/generate-sitemap.ts" ]; then
    check_pass "Sitemap generation script present"
else
    check_fail "Sitemap script missing" "Multi-country sitemap generation not available"
fi

echo ""
echo "========================================="
echo -e "${BLUE}📊 DEPLOYMENT READINESS SUMMARY${NC}"
echo "========================================="

if [ $CHECKS_PASSED -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
    echo ""
    echo -e "${GREEN}✅ Your JuaExpress multi-country SEO system is SECURE and READY for deployment!${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Set environment variables in your deployment platform"
    echo "2. Run: npm run build && npm run generate-sitemap"
    echo "3. Deploy to production"
    echo "4. Submit sitemap-index.xml to Google Search Console"
    echo "5. Monitor international search performance"
    echo ""
    echo -e "${BLUE}📖 See DEPLOYMENT-GUIDE.md for detailed instructions${NC}"
else
    echo -e "${RED}❌ $((TOTAL_CHECKS - CHECKS_PASSED)) checks failed${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Fix the failed checks before deploying!${NC}"
    echo "Run: ./deploy-security-check.sh for detailed security analysis"
fi

echo "========================================="
echo "Checks passed: $CHECKS_PASSED/$TOTAL_CHECKS"
