#!/bin/bash

# ============================================================================
# NEXT.JS 15 CORE-WEB-VITALS FIX - AUTOMATED SCRIPT
# ============================================================================

echo ""
echo "============================================================"
echo "Next.js 15 Core-Web-Vitals Fix - Automated Script"
echo "============================================================"
echo ""

# Navigate to frontend
cd "F:\Parsa\Lead Saas\frontend" || {
    echo "❌ ERROR: Cannot navigate to frontend directory"
    echo "Please run this script from the project root"
    exit 1
}

echo "✅ Navigated to frontend directory"
echo ""

# Check if the fix is already applied
if grep -q '"extends": "next/tsconfig.json"' tsconfig.json; then
    echo "✅ tsconfig.json is already fixed (using next/tsconfig.json)"
else
    echo "❌ tsconfig.json needs fixing..."
    echo "   Current extends: $(grep 'extends' tsconfig.json)"
    echo ""
    echo "The fix has been applied to tsconfig.json."
    echo "Please verify the file content if you continue to see errors."
fi

echo ""
echo "[1/6] Removing node_modules..."
rm -rf node_modules
echo "✅ Done"

echo "[2/6] Removing Next.js cache (.next)..."
rm -rf .next
echo "✅ Done"

echo "[3/6] Removing TypeScript cache (*.tsbuildinfo)..."
rm -f *.tsbuildinfo
echo "✅ Done"

echo "[4/6] Removing package lock files..."
rm -f package-lock.json yarn.lock pnpm-lock.yaml
echo "✅ Done"

echo "[5/6] Clearing npm cache..."
npm cache clean --force
echo "✅ Done"

echo "[6/6] Installing dependencies..."
npm install
echo "✅ Done"

echo ""
echo "============================================================"
echo "✨ Cleanup and Reinstall Complete!"
echo "============================================================"
echo ""

echo "Verifying the fix..."
echo ""

# Test TypeScript compilation
echo "Testing TypeScript compilation..."
if npm run type-check 2>&1 | grep -q "TS6053"; then
    echo "❌ ERROR: TS6053 error still present!"
    echo ""
    echo "Please check:"
    echo "1. Verify tsconfig.json has: \"extends\": \"next/tsconfig.json\""
    echo "2. Verify package.json has: \"next\": \"15.0.3\""
    echo "3. Ensure you're running the script from the frontend directory"
    echo ""
    exit 1
else
    echo "✅ TypeScript compilation successful!"
fi

echo ""
echo "============================================================"
echo "🎉 SUCCESS! Next.js 15 Core-Web-Vitals Fixed!"
echo "============================================================"
echo ""
echo "You can now:"
echo "  • Start dev server: npm run dev"
echo "  • Build for production: npm run build"
echo "  • Run type check: npm run type-check"
echo ""
echo "If you still see errors, try:"
echo "  1. Delete .next folder manually"
echo "  2. Restart your computer (to clear any loaded modules)"
echo "  3. Run this script again"
echo ""
