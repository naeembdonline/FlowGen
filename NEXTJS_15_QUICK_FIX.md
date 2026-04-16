# ⚡ NEXT.JS 15 FIX - QUICK REFERENCE

## 🚨 Problem
```
Error: File 'next/core-web-vitals' not found (TS6053)
```

## ✅ Solution (3 Steps)

### Step 1: Navigate to Frontend
```bash
cd "F:\Parsa\Lead Saas\frontend"
```

### Step 2: Complete Cleanup
```bash
# Remove all caches and dependencies
rm -rf node_modules .next *.tsbuildinfo package-lock.json

# Clear npm cache
npm cache clean --force
```

### Step 3: Fresh Install
```bash
npm install
```

## 🧪 Verify Fix
```bash
# Test TypeScript compilation
npm run type-check

# Test development server
npm run dev
```

## 📋 What Was Fixed

### tsconfig.json
```diff
- "extends": "next/core-web-vitals",  // ❌ OLD (Next.js 14)
+ "extends": "next/tsconfig.json",     // ✅ NEW (Next.js 15)
```

### package.json
```json
{
  "dependencies": {
    "next": "15.0.3",              // ✅ Stable
    "eslint-config-next": "15.0.3"  // ✅ Compatible
  }
}
```

## 🎯 One-Liner Fix (Copy & Paste)

```bash
cd "F:\Parsa\Lead Saas\frontend" && rm -rf node_modules .next *.tsbuildinfo package-lock.json && npm cache clean --force && npm install && npm run type-check
```

## ✅ Success Criteria

- [ ] ✅ No TS6053 error
- [ ] ✅ `npm run type-check` passes
- [ ] ✅ `npm run dev` starts successfully
- [ ] ✅ No core-web-vitals errors

## 🔍 If Still Broken

### Check Current Configuration
```bash
# Verify tsconfig.json fix
cat tsconfig.json | grep "extends"
# Should output: "extends": "next/tsconfig.json"

# Verify Next.js version
npm list next
# Should output: next@15.0.3
```

### Nuclear Option
```bash
cd "F:\Parsa\Lead Saas"

# Remove everything frontend-related
rm -rf frontend/node_modules
rm -rf frontend/.next
rm -f frontend/package-lock.json
rm -f frontend/*.tsbuildinfo

# Clear all caches
npm cache clean --force
cd frontend && npm cache clean --force

# Reinstall
cd frontend
npm install

# Rebuild
npm run build
```

---

**🏆 Fixed! Your Next.js 15 setup is now correct.**

The key change: `"extends": "next/tsconfig.json"` instead of `"extends": "next/core-web-vitals"`
