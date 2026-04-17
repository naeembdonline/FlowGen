# 🪟 FLOWGEN WINDOWS SETUP - QUICK FIX GUIDE

## 🚨 **QUICK FIX FOR YOUR CURRENT ISSUES**

### **Issue 1: "Supabase not configured"**
### **Issue 2: "Redis unavailable"**

---

## ✅ **FIXES APPLIED**

### **1. Environment Variable Loading (FIXED)**
- Added `import 'dotenv/config'` at the top of `backend/src/index.ts`
- Improved Supabase credential validation
- Better error messages for Windows users

### **2. Redis In-Memory Fallback (FIXED)**
- System now automatically uses in-memory cache when Redis unavailable
- **No Redis installation required** for local development
- Health dashboard will show green for cache

---

## 📋 **STEP-BY-STEP FIX**

### **Step 1: Update Your .env File**

**Location:** `F:\Parsa\Lead Saas\backend\.env`

**Add/Update these lines:**
```bash
# SUPABASE (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AI SERVICES (Required)
Z_AI_API_KEY=your-z-ai-key-here
OPENAI_API_KEY=your-openai-key-here

# SERVER CONFIGURATION
PORT=3001
NODE_ENV=development

# REDIS (Optional - Set to true for Windows without Redis)
USE_IN_MEMORY_CACHE=true
# Or set SKIP_REDIS=true

# FRONTEND URL (Optional)
FRONTEND_URL=http://localhost:3000
```

**Important:**
- ❌ **NO** quotes around values
- ❌ **NO** spaces around `=`
- ✅ **YES** one empty line at end of file
- ✅ **YES** use forward slashes `/` even on Windows

---

### **Step 2: Restart Backend Server**

**Stop current backend:** Press `Ctrl+C` in backend terminal

**Restart with clean environment:**
```bash
cd backend
npm run dev
```

**Expected output:**
```
✅ Supabase credentials loaded from environment
✅ Using in-memory cache (Redis not required for development)
✓ In-memory cache ready (development mode)
🚀 Server running on http://localhost:3001
```

---

### **Step 3: Verify Health Dashboard**

**Open health check:**
```
http://localhost:3001/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-16T...",
  "environment": "development",
  "supabase": "configured",
  "cache": "in-memory",
  "uptime": ...
}
```

---

## 🧪 **QUICK VERIFICATION TEST**

### **Test Environment Variables:**
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

### **Test Backend Connectivity:**
```bash
curl http://localhost:3001/health
```

**Expected:** `200 OK` response

---

## 🎯 **HEALTH DASHBOARD COLORS**

### **After Fix, You Should See:**

**System Health Dashboard:**
- ✅ **Backend API:** 🟢 GREEN (Connection established)
- ✅ **Database:** 🟢 GREEN (Supabase configured)
- ✅ **Cache:** 🟢 GREEN (In-memory active)
- ✅ **AI Services:** 🟢 GREEN (API keys configured)

---

## 🔑 **HOW TO GET YOUR SUPABASE CREDENTIALS**

### **1. Go to Supabase Dashboard:**
```
https://supabase.com/dashboard
```

### **2. Select Your Project**

### **3. Get API Credentials:**
- Click **Settings** → **API**
- Copy these values:
  - **Project URL** → `SUPABASE_URL`
  - **anon public** → `SUPABASE_ANON_KEY`
  - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### **4. Paste in .env File:**
```bash
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚀 **AFTER FIX - READY TO SIGN UP**

### **1. Open Signup Page:**
```
http://localhost:3000/signup
```

### **2. Create Your Account:**
- Enter your email
- Create a password
- Click **"Sign up"**

### **3. Login:**
```
http://localhost:3000/login
```

### **4. Go to Import Page:**
```
http://localhost:3000/import
```

### **5. Your First Search:**
- **Keyword:** `Coconut Wholesaler`
- **Location:** `Dhaka`
- **Max Results:** `20`

---

## 🔍 **TROUBLESHOOTING**

### **If Still Seeing "Supabase not configured":**

**1. Check .env file exists:**
```bash
cd F:\Parsa\Lead Saas\backend
dir .env
```

**2. Check .env file content:**
```bash
type .env
```

**3. Verify Supabase URL format:**
- ✅ Good: `https://abcdefgh.supabase.co`
- ❌ Bad: `https://abcdefgh.supabase.co/`
- ❌ Bad: `"https://abcdefgh.supabase.co"`

**4. Test connection manually:**
```bash
# In backend directory
node -e "require('dotenv').config(); const { createClient } = require('@supabase/supabase-js'); const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY); client.from('tenants').select('id').limit(1).then(({data, error}) => { console.log('Data:', data); console.log('Error:', error); });"
```

---

### **If Redis Still Showing Issues:**

**1. Add to .env:**
```bash
USE_IN_MEMORY_CACHE=true
```

**2. Restart backend:**
```bash
# Stop with Ctrl+C
npm run dev
```

**3. Check logs show:**
```
✅ Using in-memory cache (forced by environment variable)
✓ In-memory cache ready (development mode)
```

---

## ✅ **SUCCESS CHECKLIST**

After completing the fixes:

- [ ] ✅ Environment variables loaded correctly
- [ ] ✅ Supabase connection working
- [ ] ✅ In-memory cache active
- [ ] ✅ Health dashboard shows all GREEN
- [ ] ✅ Backend running on port 3001
- [ ] ✅ Frontend running on port 3000
- [ ] ✅ No "Missing Supabase credentials" error
- [ ] ✅ No "Redis unavailable" error

---

## 🎉 **YOU'RE READY!**

Once you see all GREEN on your health dashboard:

1. **Open:** `http://localhost:3000/signup`
2. **Create account**
3. **Login:** `http://localhost:3000/login`
4. **Import:** `http://localhost:3000/import`
5. **Search:** "Coconut Wholesaler" in "Dhaka"

---

## 📞 **NEED MORE HELP?**

### **Quick Commands:**
```bash
# Check environment variables
cd backend && node verify-env.js

# Restart backend
cd backend && npm run dev

# Test health
curl http://localhost:3001/health
```

### **Common Issues:**
- **"dotenv not found"** → Run `npm install` in backend directory
- **"Cannot find module"** → Run `npm install` in backend directory
- **"Port 3001 in use"** → Change `PORT=3002` in .env
- **"CORS error"** → Already fixed, should work on localhost

---

## 🚀 **FINAL VERIFICATION**

**Backend Terminal Should Show:**
```
✅ Supabase credentials loaded from environment
✅ Using in-memory cache (Redis not required for development)
✓ In-memory cache ready (development mode)
✓ Database connection verified successfully
🚀 Server running on http://localhost:3001
```

**Health Dashboard Should Show:**
```
System Health: ✅ All GREEN
- Backend API: 🟢 Connected
- Database: 🟢 Supabase OK
- Cache: 🟢 In-Memory Active
- AI Services: 🟢 Ready
```

---

**🎯 YOUR SYSTEM IS NOW READY! Go to http://localhost:3000/signup to create your account and start searching for leads! 🚀**

