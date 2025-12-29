#!/bin/bash

# ===========================================
# 🔒 JUAEXPRESS DEPLOYMENT SECURITY CHECK
# ===========================================
# Run this before deployment to ensure no secrets are exposed

echo "🔍 Running pre-deployment security checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Check 1: Ensure sensitive files are not in VITE_ variables
echo "📋 Check 1: Scanning for exposed secrets in .env files..."
if grep -r "VITE_SUPABASE_SERVICE_ROLE_KEY\|VITE_HF_API_KEY\|VITE_GROK_API_KEY" .env* 2>/dev/null; then
    echo -e "${RED}❌ FAIL: Sensitive API keys found in VITE_ variables!${NC}"
    echo "   These will be exposed to client-side bundle."
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✅ PASS: No sensitive keys in VITE_ variables${NC}"
fi

# Check 2: Ensure .env.production is not committed
echo "📋 Check 2: Checking if .env.production is gitignored..."
if git ls-files .env.production >/dev/null 2>&1; then
    echo -e "${RED}❌ FAIL: .env.production is committed to git!${NC}"
    echo "   This file contains sensitive server secrets."
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✅ PASS: .env.production is properly gitignored${NC}"
fi

# Check 3: Build test - ensure no secrets in dist/
echo "📋 Check 3: Testing build for secret exposure..."
if npm run build 2>/dev/null; then
    if grep -r "SUPABASE_SERVICE_ROLE_KEY\|HF_API_KEY\|GROK_API_KEY" dist/ 2>/dev/null; then
        echo -e "${RED}❌ FAIL: Secrets found in build output!${NC}"
        ERRORS=$((ERRORS+1))
    else
        echo -e "${GREEN}✅ PASS: Build output contains no secrets${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: Build failed - cannot check for secrets${NC}"
fi

# Check 4: Environment variables setup
echo "📋 Check 4: Checking environment variable configuration..."
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${YELLOW}⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not set in deployment environment${NC}"
fi

if [ -z "$HF_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  WARNING: HF_API_KEY not set in deployment environment${NC}"
fi

if [ -z "$GROK_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  WARNING: GROK_API_KEY not set in deployment environment${NC}"
fi

# Summary
echo ""
echo "========================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 SECURITY CHECK PASSED${NC}"
    echo "✅ Ready for deployment!"
else
    echo -e "${RED}🚨 SECURITY CHECK FAILED${NC}"
    echo "❌ $ERRORS critical issues found!"
    echo ""
    echo "🔧 FIXES REQUIRED:"
    echo "1. Remove sensitive keys from VITE_ variables in .env"
    echo "2. Ensure .env.production is in .gitignore"
    echo "3. Set server environment variables in deployment platform"
    echo "4. Regenerate any exposed API keys"
    exit 1
fi

echo "========================================"
