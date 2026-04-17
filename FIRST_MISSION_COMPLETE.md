# 🚀 FLOWGEN FIRST MISSION - COMPLETE GUIDE

## 🎯 **SYSTEM READINESS CONFIRMED**

### **✅ Backend Configuration Status:**

**FIXED:** Lead generation service now uses `supabaseAdmin` client (bypasses RLS) ✅

**Environment Variables:**
- ✅ SUPABASE_SERVICE_ROLE_KEY configured
- ✅ Z_AI_API_KEY configured  
- ✅ OPENAI_API_KEY configured
- ✅ Authentication middleware active
- ✅ All routes secured

**Security Layers:**
- ✅ Application-level authentication (JWT)
- ✅ Database-level tenant isolation (RLS)
- ✅ Service role bypass for lead insertion
- ✅ AI personalization ready

---

## 🔑 **STEP 1: USER SETUP & AUTHENTICATION**

### **Create Your Test Account:**

**Option A: Use Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"** → **"Create new user"**
4. Enter your email and create a password
5. Click **"Create user"**

**Option B: Use Signup Page:**

1. Open: `http://localhost:3000/signup`
2. Enter your email and password
3. Click **"Sign up"**

### **Get Your JWT Token:**

**Method 1: Browser DevTools (Easiest)**

1. Open `http://localhost:3000/login`
2. Log in with your credentials
3. Open **Browser DevTools** (F12)
4. Go to **Console** tab
5. Type: `localStorage.getItem('sb-<your-project-id>-auth-token')`
6. Copy the JWT token

**Method 2: Network Tab**

1. Open **Browser DevTools** (F12) → **Network** tab
2. Log in to your app
3. Find the **login** request
4. Check the **Response** for the JWT token

### **Find Your Tenant ID:**

After logging in:
1. Go to **Console** tab in DevTools
2. Type: `localStorage.getItem('user-tenant-id')` 
3. Note down your tenant_id (you'll need it for testing)

---

## 🌐 **STEP 2: OPEN THE FIRST TEST PAGE**

### **Primary Import Dashboard:**
```
http://localhost:3000/import
```

### **Alternative Routes:**
- Main Dashboard: `http://localhost:3000/dashboard`
- Leads Management: `http://localhost:3000/leads`

---

## 🧪 **STEP 3: FIRST GOOGLE MAPS SCRAPE TEST**

### **Test Configuration:**
- **Keyword:** `Coconut Wholesaler`
- **Location:** `Dhaka`
- **Max Results:** `20` (start small for testing)

### **Step-by-Step Execution:**

#### **3.1 Open the Import Page**
1. Navigate to: `http://localhost:3000/import`
2. Make sure you're logged in (you should see your email/profile)
3. The dashboard should load with the "Scrape" tab active

#### **3.2 Configure Your Search**
```
Search Parameters:
┌─────────────────────────────────────┐
│ Keyword:      Coconut Wholesaler    │
│ Location:     Dhaka                 │
│ Max Results:  20                    │
│ Min Rating:   0                     │
│ Radius:       5000                  │
│ Extract Emails: ☐                   │
└─────────────────────────────────────┘
```

#### **3.3 Start the Scrape**
1. Click the **"Start Scraping"** button
2. You should see a **real-time progress dashboard** appear

#### **3.4 Monitor Progress**
```
Expected Progress Display:
┌─────────────────────────────────────┐
│ Status: Processing                  │
│ Progress: ████████░░ 80%           │
│ Found: 18 businesses                │
│ Imported: 15 leads                  │
│ Duplicates: 3                        │
│ Errors: 0                           │
│                                      │
│ Current batch: 4/5                  │
└─────────────────────────────────────┘
```

#### **3.5 View Results**
1. Once complete, switch to **"Results"** tab
2. You should see a table of imported businesses
3. Each row shows: Name, Phone, Email, Website, Address, Category

---

## 🤖 **STEP 4: AI PERSONALIZATION TEST**

### **4.1 Generate Personalized Messages**

#### **Option A: Single Lead Personalization**

1. In the **"Results"** tab, find a lead
2. Click the **"✨ Generate Message"** button
3. A dialog will appear with:
   ```
   Lead: Coconut Wholesaler Ltd
   Agency: Fikerflow
   
   Configuration:
   ┌─────────────────────────────────┐
   │ Campaign Type: Cold Outreach    │
   │ Tone: Professional              │
   │ Agency: Fikerflow               │
   │ Services: [Web Development,     │
   │            Digital Marketing]    │
   └─────────────────────────────────┘
   
   Click: "Generate AI Message"
   ```

4. **Expected AI Output:**
   ```
   Subject: Partnership Opportunity - Coconut Wholesaler Ltd
   
   Dear Coconut Wholesaler Ltd Team,
   
   I hope this message finds you well. I'm reaching out 
   from Fikerflow, where we specialize in helping businesses 
   like yours establish a strong digital presence.
   
   I noticed that Coconut Wholesaler Ltd is a well-established 
   wholesaler in Dhaka. We believe our web development and 
   digital marketing expertise could help you reach more 
   customers and expand your distribution network.
   
   Would you be open to a brief call to discuss how we can 
   help grow your online presence?
   
   Best regards,
   Fikerflow Team
   ```

#### **Option B: Batch Personalization**

1. Select multiple leads using checkboxes
2. Click **"🚀 Generate Batch Messages"**
3. Choose your campaign settings
4. Click **"Generate All Messages"**
5. AI will process each lead and create personalized messages

### **4.2 Verify AI Functionality**

**Check AI Provider Used:**
1. Look at the generated message metadata
2. You should see:
   ```
   AI Provider: z.ai (primary) or openai (fallback)
   Tokens Used: ~150-300
   Generated: [timestamp]
   ```

**Test Message Quality:**
- ✅ Lead's name mentioned correctly
- ✅ Business type referenced
- ✅ Location mentioned (Dhaka)
- ✅ Fikerflow services included
- ✅ Professional tone maintained

---

## 🔍 **STEP 5: VERIFY RESULTS**

### **5.1 Check Database**

**Query Supabase Directly:**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this query:
   ```sql
   SELECT 
     name, 
     phone, 
     email, 
     category, 
     city, 
     rating,
     imported_at
   FROM leads 
   WHERE category LIKE '%Coconut%' 
     OR name LIKE '%Coconut%'
   ORDER BY imported_at DESC 
   LIMIT 20;
   ```

3. **Expected Results:**
   - You should see coconut wholesalers from Dhaka
   - Each lead has your tenant_id
   - Imported timestamps are recent

### **5.2 Verify Tenant Isolation**

**Test that you can only see YOUR leads:**

1. In Supabase SQL Editor, run:
   ```sql
   SELECT 
     tenant_id,
     COUNT(*) as lead_count
   FROM leads
   GROUP BY tenant_id;
   ```

2. **Expected:** You should only see leads with YOUR tenant_id

### **5.3 Check Dashboard Analytics**

1. Go to: `http://localhost:3000/dashboard`
2. You should see:
   - Total leads count
   - Recent imports
   - Campaign statistics
   - Activity timeline

---

## 🎯 **SUCCESS CRITERIA**

### **✅ Successful Test Indicators:**

**Scraping:**
- [ ] Progress bar updates in real-time
- [ ] Coconut wholesalers found in Dhaka
- [ ] Leads saved to database
- [ ] No authentication errors
- [ ] No cross-tenant data leakage

**AI Personalization:**
- [ ] Messages generated successfully
- [ ] Lead names used correctly
- [ ] Fikerflow services mentioned
- [ ] Professional tone maintained
- [ ] AI provider logged (z.ai or openai)

**Database:**
- [ ] Leads have correct tenant_id
- [ ] No duplicate leads within your tenant
- [ ] RLS policies preventing cross-tenant access
- [ ] Service role bypass working for insertion

---

## 🚨 **TROUBLESHOOTING**

### **Issue 1: "Unauthorized" Error**

**Solution:**
1. Check you're logged in: `http://localhost:3000/login`
2. Get fresh JWT token from DevTools
3. Clear browser cache and log in again

### **Issue 2: "No coconut wholesalers found"**

**Possible Causes:**
- Location spelling: Try "Dhaka, Bangladesh"
- Keyword too specific: Try just "Coconut"
- Google Maps restrictions: Puppeteer blocked

**Solutions:**
1. Try broader search: "Wholesale" in "Dhaka"
2. Check Puppeteer logs in backend
3. Try smaller maxResults: 10

### **Issue 3: AI not generating messages**

**Check API Keys:**
1. Verify Z_AI_API_KEY in backend `.env`
2. Verify OPENAI_API_KEY in backend `.env`
3. Check backend logs for AI errors

**Fallback:**
The system should fallback to template messages if AI fails

### **Issue 4: Leads not saving to database**

**Check Service Role:**
1. Verify SUPABASE_SERVICE_ROLE_KEY in `.env`
2. Check backend logs for RLS bypass errors
3. Test database connection in Supabase Dashboard

---

## 📊 **PERFORMANCE EXPECTATIONS**

### **Scraping Speed:**
- **First scrape:** ~30-60 seconds (Puppeteer initialization)
- **Subsequent scrapes:** ~10-20 seconds
- **Per lead:** ~0.5-1 second

### **AI Generation Speed:**
- **Z.ai:** ~2-5 seconds per message
- **OpenAI:** ~3-8 seconds per message
- **Fallback:** <1 second

### **Database Operations:**
- **Insert:** ~50-100ms per lead
- **Duplicate check:** ~20-50ms per lead
- **Query:** ~100-200ms for 20 leads

---

## 🎉 **MISSION SUCCESS CHECKLIST**

- [ ] ✅ Backend configured with service role key
- [ ] ✅ User account created and logged in
- [ ] ✅ JWT token obtained and verified
- [ ] ✅ Import page loads successfully
- [ ] ✅ First scrape completed with "Coconut Wholesaler" in "Dhaka"
- [ ] ✅ Leads visible in dashboard
- [ ] ✅ AI personalization working
- [ ] ✅ Tenant isolation verified
- [ ] ✅ No authentication errors
- [ ] ✅ No data leakage between tenants

---

## 🚀 **NEXT STEPS AFTER SUCCESS**

### **Phase 2: Expand Testing**
1. Try different keywords and locations
2. Test with larger result sets (50, 100)
3. Experiment with AI personalization options
4. Test batch message generation

### **Phase 3: Campaign Management**
1. Create your first campaign
2. Add leads to campaigns
3. Generate message variations
4. A/B test different approaches

### **Phase 4: Message Delivery**
1. Set up WhatsApp (Evolution API)
2. Configure email (Brevo)
3. Launch your first campaign
4. Track responses and analytics

---

## 📞 **NEED HELP?**

**Quick Checks:**
1. **Backend logs:** Check console for errors
2. **Frontend console:** Open DevTools → Console
3. **Supabase logs:** Dashboard → Logs
4. **Network tab:** Check API call responses

**Common Issues:**
- Authentication: Verify JWT token
- Database: Check service role key
- AI: Verify API keys
- Scraping: Check Puppeteer is running

---

**🎯 YOUR FIRST MISSION AWAITS!**

Open `http://localhost:3000/import` and start your first search for "Coconut Wholesaler" in "Dhaka"!

**Good luck! 🚀**

