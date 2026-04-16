#!/bin/bash

# ============================================================================
# FLOWGEN - INSTALLATION VERIFICATION SCRIPT
# ============================================================================

echo ""
echo "============================================================"
echo "FlowGen Installation Verification"
echo "============================================================"
echo ""

errors=0

# Check root package.json
echo "[1/10] Checking root package.json..."
if [ -f "package.json" ] && grep -q "flowgen-lead-saas" package.json; then
    echo "[OK] Root package.json is correct"
else
    echo "[FAIL] Root package.json has issues"
    errors=$((errors + 1))
fi

# Check frontend package.json
echo "[2/10] Checking frontend package.json..."
if [ -f "frontend/package.json" ] && grep -q "flowgen-frontend" frontend/package.json; then
    echo "[OK] Frontend package.json is correct"
else
    echo "[FAIL] Frontend package.json has issues"
    errors=$((errors + 1))
fi

# Check backend package.json
echo "[3/10] Checking backend package.json..."
if [ -f "backend/package.json" ] && grep -q "flowgen-backend" backend/package.json; then
    echo "[OK] Backend package.json is correct"
else
    echo "[FAIL] Backend package.json has issues"
    errors=$((errors + 1))
fi

# Check next.config.js
echo "[4/10] Checking next.config.js..."
if [ -f "frontend/next.config.js" ]; then
    echo "[OK] next.config.js exists"
else
    echo "[FAIL] next.config.js missing"
    errors=$((errors + 1))
fi

# Check node_modules
echo "[5/10] Checking root node_modules..."
if [ -d "node_modules" ]; then
    echo "[OK] Root node_modules exists"
else
    echo "[WARNING] Root node_modules missing (run: npm run install:all)"
fi

echo "[6/10] Checking frontend node_modules..."
if [ -d "frontend/node_modules" ]; then
    echo "[OK] Frontend node_modules exists"
else
    echo "[WARNING] Frontend node_modules missing (run: npm run install:all)"
fi

echo "[7/10] Checking backend node_modules..."
if [ -d "backend/node_modules" ]; then
    echo "[OK] Backend node_modules exists"
else
    echo "[WARNING] Backend node_modules missing (run: npm run install:all)"
fi

# Check for common errors in package.json files
echo "[8/10] Checking for JSON syntax errors..."
if cat package.json > /dev/null 2>&1 && cat frontend/package.json > /dev/null 2>&1 && cat backend/package.json > /dev/null 2>&1; then
    echo "[OK] All package.json files have valid JSON"
else
    echo "[FAIL] JSON syntax errors detected"
    errors=$((errors + 1))
fi

# Check for workspaces (should not exist)
echo "[9/10] Checking for workspaces configuration..."
if grep -q '"workspaces"' package.json; then
    echo "[WARNING] Workspaces configuration found (may cause circular dependencies)"
else
    echo "[OK] No workspaces configuration (good)"
fi

# Check for postinstall (should not exist)
echo "[10/10] Checking for problematic postinstall script..."
if grep -q '"postinstall"' package.json; then
    echo "[WARNING] Postinstall script found (may cause recursive installation)"
else
    echo "[OK] No postinstall script (good)"
fi

echo ""
echo "============================================================"

if [ $errors -eq 0 ]; then
    echo "[SUCCESS] All checks passed!"
    echo ""
    echo "You can now start FlowGen:"
    echo "  1. Start Redis: docker-compose up -d"
    echo "  2. Start Backend: cd backend && npm run dev"
    echo "  3. Start Frontend: cd frontend && npm run dev"
    echo "  OR use: ./start-dev.sh (or start-dev.bat on Windows)"
    echo ""
else
    echo "[WARNING] Found $errors issue(s) that need attention"
    echo "Please check the failed checks above"
fi

echo "============================================================"
echo ""
