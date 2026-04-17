# 🔧 ENVIRONMENT VARIABLE FIX - QUICK GUIDE

## 🚨 **ISSUE: "Missing Supabase credentials"**

### **✅ FIX APPLIED:**
Added `import 'dotenv/config'` at the top of `backend/src/index.ts`

---

## 📋 **STEP-BY-STEP FIX**

### **Step 1: Restart Your Backend Server**

**Current terminal:** Press `Ctrl+C` to stop the backend

**Then restart:**
```bash
cd backend
npm run dev
```

**Expected output:**
```
✓ Database connection verified successfully
✓ Server running on port 3001
```

---

### **Step 2: Verify Environment Variables**

**Run the verification script:**
```bash
cd backend
node verify-env.js
```

**Expected output:**
```
✅ SUPABASE_URL: https://your-project.supabase.co...
✅ SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1Ni...
✅ SUPABASE_SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1Ni...
✅ Z_AI_API_KEY: sk-ant-api03-...
✅ OPENAI_API_KEY: sk-proj-...
✅ All environment variables loaded successfully!
```

---

### **Step 3: If Still Seeing Errors**

**Check your .env file location:**
```bash
# The .env file should be here:
F:\Parsa\Lead Saas\backend\.env
```

**Check .env file format:**
```bash
# Should look like this (no quotes around values):
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Z_AI_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
PORT=3001
NODE_ENV=development
```

**Common mistakes:**
- ❌ Quotes around URLs: `SUPABASE_URL="https://..."`
- ❌ Spaces around `=`: `SUPABASE_URL = https://...`
- ❌ Missing newlines at end of file
- ❌ .env file in wrong location (should be in `backend/` folder)

---

## 🌐 **CORS CONFIGURATION (Already Fixed ✅)**

Your CORS is already configured correctly for Windows localhost!

**Current CORS settings in `backend/src/index.ts`:**
```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',  // ✅ Frontend
    'http://localhost:3001'   // ✅ Backend
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

**No CORS issues expected for Windows localhost development!**

---

## 🧪 **QUICK CONNECTIVITY TEST**

### **Test 1: Backend Health Check**
```bash
curl http://localhost:3001/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-16T...",
  "environment": "development"
}
```

### **Test 2: Frontend to Backend Connection**
```bash
curl http://localhost:3000/api/v1/health
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "API is healthy"
}
```

---

## 🎯 **AFTER FIX: READY FOR FIRST TEST**

### **1. Verify Backend is Running:**
```bash
# Backend terminal should show:
✓ Database connection verified successfully
🚀 Server running on http://localhost:3001
```

### **2. Open Frontend:**
```
http://localhost:3000/import
```

### **3. Run Your First Search:**
- **Keyword:** `Coconut Wholesaler`
- **Location:** `Dhaka`
- **Max Results:** `20`

---

## 🔍 **TROUBLESHOOTING**

### **If you still see "Missing Supabase credentials":**

**1. Double-check .env file location:**
```bash
# Must be exactly here:
cd F:\Parsa\Lead Saas\backend
ls .env
```

**2. Check .env file permissions:**
- Make sure the file is readable
- On Windows: Right-click .env → Properties → Uncheck "Hidden"

**3. Verify no extra spaces in .env:**
```bash
# Good:
SUPABASE_URL=https://project.supabase.co

# Bad:
SUPABASE_URL = https://project.supabase.co
SUPABASE_URL= "https://project.supabase.co"
```

**4. Try absolute path test:**
```bash
cd backend
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"
```

---

## ✅ **SUCCESS INDICATORS**

When everything is working, you should see:

**Backend terminal:**
```
✓ Database connection verified successfully
✓ Redis connection established
🚀 Server running on http://localhost:3001
```

**Environment verification:**
```
✅ All environment variables loaded successfully!
```

**No CORS errors** in browser console (F12 → Console)

---

## 🚀 **YOU'RE READY!**

After completing these steps:

1. **Backend running on port 3001** ✅
2. **Frontend running on port 3000** ✅
3. **Environment variables loaded** ✅
4. **CORS configured for localhost** ✅
5. **Database connection verified** ✅

**Open:** `http://localhost:3000/import`

**Search for:** "Coconut Wholesaler" in "Dhaka"

**Good luck! 🎉**

