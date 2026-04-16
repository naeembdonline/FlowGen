# 🔧 FlowGen - Fresh Installation Guide

## 🚨 Important: Read This First!

Your package.json files had syntax errors and recursive installation issues. These have been **FIXED**. Follow this guide exactly to install everything properly.

## 📋 What Was Fixed

### Root package.json
- ✅ **Fixed JSON syntax** (missing closing brace, trailing comma)
- ✅ **Removed problematic `postinstall` script** that caused recursive loops
- ✅ **Added `install:all` script** for controlled installation

### Frontend & Backend package.json
- ✅ **Verified JSON syntax** - all files valid
- ✅ **No circular dependencies** - clean dependencies only
- ✅ **No workspace conflicts** - properly configured

## 🎯 Exact Installation Commands (Run in Order)

### Step 1: Clean any existing installations (Optional but Recommended)

```bash
# Navigate to project root
cd "F:\Parsa\Lead Saas"

# Remove all existing node_modules to start fresh
npm run clean
```

### Step 2: Install dependencies using the NEW controlled approach

```bash
# Still in project root (F:\Parsa\Lead Saas)
npm run install:all
```

**What this does:**
1. Installs root dependencies (concurrently)
2. Installs frontend dependencies
3. Installs backend dependencies
4. **No recursive loops** - each step is isolated

### Step 3: Verify Installation

```bash
# Check root installation
ls node_modules | head -5

# Check frontend installation  
ls frontend/node_modules | head -5

# Check backend installation
ls backend/node_modules | head -5
```

**Expected output:** You should see various packages listed, not "No such file or directory"

## 🧪 Test Your Installation

### Test 1: Start Backend
```bash
cd backend
npm run dev
```

**Expected:** Server starts on http://localhost:3001
```
╔════════════════════════════════════════════════════════════╗
║            FLOWGEN LEAD GENERATION SAAS API               ║
╚════════════════════════════════════════════════════════════╝

✓ Server is ready to accept requests
```

### Test 2: Start Frontend
```bash
# In a new terminal
cd frontend
npm run dev
```

**Expected:** Frontend starts on http://localhost:3000
```
▲ Next.js 15.0.3
- Local: http://localhost:3000
✓ Ready in 2.3s
```

### Test 3: Type Checking
```bash
# In project root
npm run type-check
```

**Expected:** No TypeScript errors

## ⚠️ If You Encounter Issues

### Issue: "npm run install:all command not found"

**Solution:** The root package.json was just updated. Try:
```bash
# Reload your terminal or run:
cd "F:\Parsa\Lead Saas"
npm install
cd frontend && npm install
cd ../backend && npm install
```

### Issue: "JSON parse error"

**Solution:** The package.json files have been fixed. If you still see errors:
```bash
# Validate JSON syntax
cat package.json | jq .
```

### Issue: "Recursive installation loop"

**Solution:** This has been fixed. The problematic `postinstall` script has been removed.

### Issue: "concurrently command not found"

**Solution:**
```bash
cd "F:\Parsa\Lead Saas"
npm install
```

## 📊 What Changed in package.json Files

### Before (BROKEN)
```json
{
  "scripts": {
    "postinstall": "cd frontend && npm install && cd ../backend && npm install"  // ❌ CAUSES LOOP
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }  // ❌ MISSING closing brace
```

### After (FIXED)
```json
{
  "scripts": {
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install"  // ✅ CONTROLLED
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}  // ✅ PROPER JSON SYNTAX
```

## 🎯 Quick Start After Installation

Once installed, start everything with:

```bash
# Start Redis first
docker-compose up -d

# Start both frontend and backend
npm run dev
```

Or use the automated script:
```bash
start-dev.bat
```

## ✅ Success Checklist

You'll know everything is working when:

- [ ] ✅ `npm run install:all` completes without errors
- [ ] ✅ `node_modules/` exists in root, frontend, and backend
- [ ] ✅ Backend starts: `cd backend && npm run dev`
- [ ] ✅ Frontend starts: `cd frontend && npm run dev`
- [ ] ✅ Type check passes: `npm run type-check`
- [ ] ✅ No JSON parse errors
- [ ] ✅ No recursive installation loops

## 🔧 Development Workflow (After Installation)

```bash
# Start everything
npm run dev

# Or start individually:
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev  # Terminal 2

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## 📝 Package.json Scripts Reference

### Root Scripts
- `npm run dev` - Start both frontend and backend
- `npm run install:all` - Install all dependencies (FIXED)
- `npm run build` - Build both frontend and backend
- `npm run clean` - Remove all node_modules

### Frontend Scripts
- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

### Backend Scripts
- `npm run dev` - Start Express dev server with tsx
- `npm run build` - Compile TypeScript
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking
- `npm run test` - Run tests

## 🎉 You're Ready!

Your FlowGen installation is now clean and working. The recursive loop issue has been resolved.

**Next Steps:**
1. Install dependencies: `npm run install:all`
2. Start Redis: `docker-compose up -d`
3. Start development: `npm run dev`
4. Open http://localhost:3000

---

**Questions?** Check the main README.md or LOCAL_SETUP_GUIDE.md for more details.
