# 🚀 FlowGen Lead Generation - Quick Start Guide

## ⚡ **Get Started in 3 Minutes**

### **Step 1: Start Your Services**

#### **Option A: Minimal Backend (Recommended for Testing)**
```bash
# Terminal 1 - Backend
cd "F:\Parsa\Lead Saas\backend"
npm run dev:minimal
```

#### **Option B: Full Backend (Requires Redis)**
```bash
# Terminal 1 - Backend
cd "F:\Parsa\Lead Saas\backend"
npm run dev
```

#### **Frontend (Always)**
```bash
# Terminal 2 - Frontend
cd "F:\Parsa\Lead Saas\frontend"
npm run dev
```

### **Step 2: Access Dashboard**
```
http://localhost:3000/import
```

### **Step 3: Generate Your First Leads**

1. **Enter Search Criteria:**
   - **Keyword:** `coffee shops`
   - **Location:** `San Francisco, CA`

2. **Configure Options (Optional):**
   - **Max Results:** `50` (good for testing)
   - **Minimum Rating:** `4` (high-quality businesses)
   - **Search Radius:** `5000` (5km radius)

3. **Click "Start Lead Generation"**

### **Step 4: Watch Real-Time Results**
- ✅ **Progress bar** fills as leads are found
- ✅ **Statistics** update in real-time
- ✅ **Leads appear** automatically in Results tab
- ✅ **Auto-switch** when complete

### **Step 5: Generate AI Messages**
- Go to **Results tab**
- Click **"AI Message"** on any lead
- OR click **"Generate All Messages"**
- View personalized messages in **Messages tab**

---

## 🎯 **Example Workflows**

### **Workflow 1: Coffee Shop Leads**
```bash
Keyword: coffee shops
Location: Seattle, WA
Max Results: 50
Min Rating: 4.0
Radius: 10000

Expected: 30-50 high-quality coffee shop leads with AI messages
```

### **Workflow 2: Restaurant Leads**
```bash
Keyword: restaurants
Location: Austin, TX
Max Results: 100
Min Rating: 4.5
Radius: 5000

Expected: 80-100 top-rated restaurants with personalized outreach
```

### **Workflow 3: Agency Partnerships**
```bash
Keyword: marketing agencies
Location: New York, NY
Max Results: 30
Min Rating: 0
Radius: 25000

Expected: 30 marketing agencies for B2B partnership outreach
```

---

## 🔧 **Environment Setup**

### **Required Environment Variables**
```bash
# backend/.env
Z_AI_API_KEY=your_z_ai_key_here
OPENAI_API_KEY=your_openai_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
REDIS_URL=redis://localhost:6379
```

### **Verify Setup**
```bash
# Check backend
curl http://localhost:3001/health

# Check frontend
curl http://localhost:3000

# Check Supabase connection
# (Automatic - will use placeholder if not configured)
```

---

## 🧪 **Test Your Setup**

### **Test 1: Health Check**
```bash
curl http://localhost:3001/api/v1/health/detailed
```

**Expected Response:**
```json
{
  "status": "healthy",
  "services": {
    "database": { "status": "configured" },
    "redis": { "status": "configured" }
  }
}
```

### **Test 2: API Endpoints**
```bash
# Test scraping endpoint
curl -X POST http://localhost:3001/api/v1/campaigns/scrape \
  -H "Content-Type: application/json" \
  -d '{"keyword":"coffee","location":"San Francisco","maxResults":10}'
```

**Expected Response:**
```json
{
  "message": "Lead generation job started",
  "jobId": "job-1234567890-0",
  "statusUrl": "/api/v1/campaigns/scrape/progress/job-1234567890-0"
}
```

### **Test 3: Progress Polling**
```bash
# Replace with actual jobId from previous response
curl http://localhost:3001/api/v1/campaigns/scrape/progress/job-1234567890-0
```

**Expected Response:**
```json
{
  "jobId": "job-1234567890-0",
  "status": "processing",
  "progress": 45,
  "totalFound": 10,
  "totalImported": 7,
  "totalDuplicates": 2,
  "totalErrors": 1
}
```

---

## 🐛 **Troubleshooting**

### **Issue: "Connection Refused"**
```bash
# Check if backend is running
curl http://localhost:3001/health

# Restart backend
cd backend
npm run dev:minimal
```

### **Issue: "No leads found"**
```bash
# Try different location
# Use more generic keyword
# Increase radius
# Check browser console for errors
```

### **Issue: "AI message generation failed"**
```bash
# Check API keys in backend/.env
cat backend/.env | grep API_KEY

# Verify keys are set correctly
Z_AI_API_KEY should be present
OPENAI_API_KEY should be present
```

### **Issue: "Database errors"**
```bash
# Check Supabase credentials
# Ensure Supabase project is active
# Check database has 'leads' table
```

---

## 📊 **Performance Tips**

### **For Speed:**
- ✅ Use **smaller radius** (1000-5000m)
- ✅ Set **lower maxResults** (20-50)
- ✅ **Disable** email extraction
- ✅ Use **minimum rating** (4+)

### **For Quality:**
- ✅ Use **higher maxResults** (100-200)
- ✅ Set **minimum rating** (4.5+)
- ✅ **Enable** email extraction
- ✅ Use **specific keywords**

### **For Cost Efficiency:**
- ✅ Start with **small batches** (20 leads)
- ✅ Use **AI fallback** (templates)
- ✅ **Disable** email extraction (slow)
- ✅ **Reuse** generated messages

---

## 🎉 **Success Indicators**

### **When Everything Works:**
- ✅ Backend health endpoint returns 200
- ✅ Dashboard loads without errors
- ✅ "Start Lead Generation" button works
- ✅ Progress bar fills over time
- ✅ Leads appear in Results tab
- ✅ "AI Message" buttons work
- ✅ Personalized messages generated
- ✅ No error messages in console

---

## 🚀 **Next Steps**

### **After Testing Works:**
1. ✅ **Configure your AI API keys** (Z.ai, OpenAI)
2. ✅ **Set up your Supabase database** (create leads table)
3. ✅ **Adjust scraping parameters** for your use case
4. ✅ **Customize AI prompts** for your agency
5. ✅ **Set up Redis** for better performance
6. ✅ **Deploy to production**

### **For Production:**
```bash
# Use full backend with Redis
cd backend
npm run dev

# Or use Docker
docker-compose up -d
```

---

## 📞 **Support**

### **Common Issues:**
- **Backend not starting:** Check port 3001 availability
- **Frontend not connecting:** Check CORS settings
- **No leads found:** Try different keyword/location combination
- **AI not working:** Verify API keys are set

### **Logs Location:**
- **Backend:** Console output in terminal
- **Frontend:** Browser console (F12)
- **Database:** Supabase dashboard

---

**Ready to start generating leads!** 🚀

Access the dashboard now: `http://localhost:3000/import`
