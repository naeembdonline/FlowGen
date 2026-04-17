# 🔧 FLOWGEN SETUP VERIFICATION SCRIPT

## 🚀 **QUICK SETUP CHECK**

Run this verification before your first test to ensure everything is configured correctly.

---

## **✅ STEP 1: ENVIRONMENT VARIABLES CHECK**

### **Backend Environment Variables (.env)**

Run this in your backend directory:
```bash
cd backend
cat .env | grep -E "(SUPABASE|Z_AI|OPENAI)"
```

**Expected Output:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
Z_AI_API_KEY=your-z-ai-key
OPENAI_API_KEY=your-openai-key
```

**If any are missing:** Add them to `backend/.env`

---

## **✅ STEP 2: DATABASE CONNECTION TEST**

### **Test Supabase Connection**

**Option 1: Using Supabase Dashboard**
1. Go to your Supabase project
2. Click on **SQL Editor**
3. Run: `SELECT NOW();`
4. Should return current timestamp

**Option 2: Using Backend API**
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-16T...",
  "environment": "development"
}
```

---

## **✅ STEP 3: AUTHENTICATION TEST**

### **Create Test User (if needed)**

**In Supabase Dashboard:**
1. Go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Email: `test@fikerflow.com`
4. Password: `test123456`
5. Click **"Auto Confirm User"**
6. Click **"Create user"**

### **Get Test User ID**

1. In the Users list, find `test@fikerflow.com`
2. Copy the **UID** (UUID format)
3. Save it for next step

### **Assign Tenant to User**

In Supabase SQL Editor, run:
```sql
-- First, create a tenant if needed
INSERT INTO tenants (id, name, plan)
VALUES ('11111111-1111-1111-1111-111111111111', 'Fikerflow Agency', 'pro')
ON CONFLICT (id) DO NOTHING;

-- Then, assign tenant to user
INSERT INTO users (id, tenant_id, role, full_name)
VALUES (
  '<PASTE_USER_UID_HERE>',
  '11111111-1111-1111-1111-111111111111',
  'admin',
  'Fikerflow Admin'
)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = '11111111-1111-1111-1111-111111111111',
  role = 'admin';
```

---

## **✅ STEP 4: RLS POLICIES VERIFICATION**

### **Check RLS is Enabled**

Run in Supabase SQL Editor:
```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('leads', 'campaigns', 'messages', 'users', 'tenants')
ORDER BY tablename;
```

**Expected Output:**
```
tablename    | rls_enabled
-------------+-------------
leads        | true
campaigns    | true
messages     | true
users        | true
tenants      | true
```

If any show `false`, enable them:
```sql
ALTER TABLE <tablename> ENABLE ROW LEVEL SECURITY;
```

### **Check Tenant Isolation Policies**

```sql
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY policyname;
```

**Expected:** Multiple policies for SELECT, INSERT, UPDATE, DELETE

---

## **✅ STEP 5: API AUTHENTICATION TEST**

### **Get Your JWT Token**

**Method 1: Direct API Call**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@fikerflow.com",
    "password": "test123456"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "test@fikerflow.com",
    "tenant_id": "11111111-1111-1111-1111-111111111111"
  }
}
```

**Method 2: Browser Login**
1. Go to `http://localhost:3000/login`
2. Enter: `test@fikerflow.com` / `test123456`
3. Open DevTools → Console
4. Run: `localStorage.getItem('sb-<project>-auth-token')`

---

## **✅ STEP 6: FRONTEND-BACKEND CONNECTION**

### **Test API Reachability**

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test protected endpoint (with JWT)
curl http://localhost:3001/api/v1/leads \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Expected:**
- Health: `200 OK`
- Leads: `200 OK` with empty leads array `[]`

---

## **✅ STEP 7: AI SERVICES TEST**

### **Test Z.ai Connection**

```bash
curl -X POST https://api.z.ai/v1/chat/completions \
  -H "Authorization: Bearer $Z_AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### **Test OpenAI Connection**

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## **✅ STEP 8: PUPPETEER SCRAPING TEST**

### **Check Puppeteer is Installed**

```bash
cd backend
npm list puppeteer puppeteer-cluster
```

**Expected:** Both packages listed

### **Test Google Maps Access**

```bash
curl -I "https://www.google.com/maps"
```

**Expected:** `200 OK` or `301 Redirect`

---

## **🎯 FINAL VERIFICATION**

### **Run This Complete Test:**

```bash
#!/bin/bash
echo "🔍 FLOWGEN SETUP VERIFICATION"
echo "=============================="

# Test 1: Backend Health
echo "1️⃣ Testing Backend Health..."
curl -s http://localhost:3001/health | grep -q "ok" && echo "✅ Backend is running" || echo "❌ Backend not responding"

# Test 2: Database Connection
echo "2️⃣ Testing Database Connection..."
cd backend && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
client.from('tenants').select('id').limit(1).then(({ error }) => {
  if (error) console.log('❌ Database connection failed');
  else console.log('✅ Database connection successful');
});
" || echo "❌ Database test failed"

# Test 3: Environment Variables
echo "3️⃣ Checking Environment Variables..."
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -n "$Z_AI_API_KEY" ] && [ -n "$OPENAI_API_KEY" ]; then
  echo "✅ All required environment variables set"
else
  echo "❌ Missing environment variables"
fi

# Test 4: Frontend
echo "4️⃣ Testing Frontend..."
curl -s http://localhost:3000 | grep -q "FlowGen" && echo "✅ Frontend is running" || echo "❌ Frontend not responding"

echo "=============================="
echo "✨ Verification Complete!"
```

---

## **🚨 COMMON ISSUES & FIXES**

### **Issue: "Backend not responding"**
**Fix:** Start backend server
```bash
cd backend
npm run dev
```

### **Issue: "Database connection failed"**
**Fix:** Check Supabase credentials
```bash
# Verify credentials
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

### **Issue: "Missing environment variables"**
**Fix:** Update `.env` file
```bash
cd backend
nano .env  # or use your preferred editor
```

### **Issue: "Puppeteer not found"**
**Fix:** Install dependencies
```bash
cd backend
npm install
```

---

## **📋 SETUP CHECKLIST**

Before your first test, confirm:

- [ ] ✅ Backend server running on port 3001
- [ ] ✅ Frontend running on port 3000
- [ ] ✅ Supabase connection working
- [ ] ✅ Environment variables configured
- [ ] ✅ Test user created in Supabase
- [ ] ✅ User assigned to tenant
- [ ] ✅ RLS policies enabled
- [ ] ✅ JWT token obtained
- [ ] ✅ AI services accessible
- [ ] ✅ Puppeteer installed

---

## **🎉 READY FOR FIRST TEST!**

If all checks pass, you're ready to start your first search!

**Open:** `http://localhost:3000/import`

**Search:** "Coconut Wholesaler" in "Dhaka"

**Good luck! 🚀**

