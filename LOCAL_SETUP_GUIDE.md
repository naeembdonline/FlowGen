# 🚀 Local Setup Guide - Queue System

## Step 1: Environment Variables Setup

### Backend `.env` File
Create `F:\Parsa\Lead Saas\backend\.env`:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Supabase (Get from https://supabase.com)
SUPABASE_URL=your-supabase-url-here
SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Redis (REQUIRED for Queue System)
REDIS_URL=redis://localhost:6379

# Queue Configuration
QUEUE_CONCURRENCY=2
QUEUE_BATCH_SIZE=20
QUEUE_RETRY_ATTEMPTS=3
QUEUE_RETRY_DELAY=5000
QUEUE_BATCH_DELAY=2000

# Puppeteer
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=60000

# Rate Limiting
SCRAPING_RATE_LIMIT_PER_MINUTE=5
API_RATE_LIMIT_PER_MINUTE=100
```

### Frontend `.env.local` File
Create `F:\Parsa\Lead Saas\frontend\.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

## Step 2: Start Redis (Required for Queue)

```bash
# Option 1: Using Docker Compose (Recommended)
cd "F:\Parsa\Lead Saas"
docker-compose up -d redis

# Option 2: Using Redis directly (if installed)
redis-server

# Option 3: Using Docker
docker run -d -p 6379:6379 redis:7-alpine
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

## Step 3: Install Dependencies

```bash
# Backend dependencies
cd "F:\Parsa\Lead Saas\backend"
npm install

# Frontend dependencies
cd "F:\Parsa\Lead Saas\frontend"
npm install
```

## Step 4: Start the Servers

### Option 1: Start in Separate Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
cd "F:\Parsa\Lead Saas\backend"
npm run dev
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║            FLOWGEN LEAD GENERATION SAAS API               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

Environment:  development
Server:       http://localhost:3001
Health:       http://localhost:3001/health
API Base:     http://localhost:3001/api/v1

✓ Database connected successfully
✓ Redis connected successfully
✓ Job queue initialized successfully
✓ Scraping queue service initialized
✓ Server is ready to accept requests
```

**Terminal 2 - Frontend:**
```bash
cd "F:\Parsa\Lead Saas\frontend"
npm run dev
```

You should see:
```
  ▲ Next.js 15.0.3
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.3s
```

### Option 2: Start with Docker Compose

```bash
cd "F:\Parsa\Lead Saas"
docker-compose up -d
```

## Step 5: Verify Everything is Working

### Check Backend Health
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 15.5,
  "environment": "development"
}
```

### Check Queue Status
```bash
curl http://localhost:3001/api/v1/leads/queue/stats
```

**Expected Response:**
```json
{
  "queue": {
    "waiting": 0,
    "active": 0,
    "completed": 0,
    "failed": 0,
    "delayed": 0,
    "total": 0
  },
  "jobs": []
}
```

## Step 6: Access the UI

**Open in Browser:**
```
http://localhost:3000
```

## Step 7: Test the Lead Import with Progress Bar

### Method 1: Using the UI (Recommended)

1. **Navigate to Import Page**
   - Go to: `http://localhost:3000/import`
   - Or create a link in your navigation: `/import`

2. **Fill the Import Form**
   ```
   Location: San Francisco, CA
   Business Type: coffee shops
   Max Results: 100 (or 500 to test queue system)
   Batch Size: 20
   Extract Emails: No (for faster testing)
   ```

3. **Click "Start Import"**
   - You'll immediately see: "Import job started successfully!"
   - Progress component appears below the form

4. **Watch the Progress Bar**
   ```
   Progress: 45% [████████████░░░░░░░░░░]

   Processed: 45
   Imported: 42
   Duplicates: 2
   Errors: 1

   Current Batch: 3/5
   Status: "Scraping Google Maps..."
   Elapsed Time: 2m 15s
   Remaining: ~2m 45s
   ```

5. **Wait for Completion**
   - Progress bar reaches 100%
   - Shows final statistics
   - "View Imported Leads" button appears

### Method 2: Using cURL (For Testing)

**Terminal 3 - Test Import:**
```bash
# Start a 100-lead import
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{
    "location": "San Francisco, CA",
    "query": "coffee shops",
    "maxResults": 100,
    "batchSize": 20,
    "extractEmails": false
  }'
```

**Response (Immediate):**
```json
{
  "message": "Lead import job queued successfully",
  "jobId": "scraping-1715421234567-abc123xyz",
  "estimatedBatches": 5,
  "statusUrl": "/api/v1/leads/import/status/scraping-1715421234567-abc123xyz",
  "progressUrl": "/api/v1/leads/import/progress/scraping-1715421234567-abc123xyz"
}
```

**Monitor Progress:**
```bash
# Replace with actual jobId from response
curl http://localhost:3001/api/v1/leads/import/progress/scraping-1715421234567-abc123xyz
```

## Step 8: Monitor the Queue System

### Watch Backend Logs
```bash
# In Terminal 1 (where backend is running)
# You'll see logs like:

[INFO] Processing batch { jobId: '...', batchNumber: 1, totalBatches: 5 }
[INFO] Scraping Google Maps...
[INFO] Imported 18 leads, 2 duplicates
[INFO] Batch 1/5 completed
[INFO] Job processing completed { totalProcessed: 100, totalImported: 92 }
```

### Check Redis Queue
```bash
# Connect to Redis CLI
redis-cli

# List all queue keys
keys bull:scraping-queue:*

# Check waiting jobs
LLEN bull:scraping-queue:waiting

# Check active jobs
LLEN bull:scraping-queue:active

# Exit
exit
```

## Step 9: View Imported Leads

1. **After Import Completes**
   - Click "View Imported Leads" button
   - Or navigate to: `http://localhost:3000/leads`

2. **View All Leads**
   - See your imported businesses
   - Filter by status, category, etc.
   - Export to CSV if needed

## Step 10: Stop the Servers

**When done:**

```bash
# Stop Backend
# In Terminal 1: Ctrl+C

# Stop Frontend
# In Terminal 2: Ctrl+C

# Stop Redis (if using Docker)
docker-compose down

# Or stop Redis container
docker stop <redis-container-id>
```

## Troubleshooting

### Issue: "Redis connection failed"

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not running, start Redis
docker-compose up -d redis

# Or start Redis directly
redis-server
```

### Issue: "Port 3001 already in use"

**Solution:**
```bash
# Find and kill process on port 3001
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti :3001 | xargs kill -9
```

### Issue: "Module not found"

**Solution:**
```bash
# Install missing dependencies
cd backend
npm install

cd ../frontend
npm install
```

### Issue: "Jobs stuck in waiting"

**Solution:**
```bash
# Check queue status
curl http://localhost:3001/api/v1/leads/queue/stats

# Resume queue
curl -X POST http://localhost:3001/api/v1/leads/queue/resume
```

### Issue: "Progress bar not updating"

**Solution:**
- Check browser console for errors
- Verify backend is running
- Check if jobId is correct
- Try refreshing the page

## Quick Commands Reference

### Start Everything
```bash
# Terminal 1: Redis + Backend
docker-compose up -d redis
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Test Import
```bash
# Small test (20 leads)
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{"location": "Austin, TX", "maxResults": 20}'

# Large test (500 leads - queue system!)
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{"location": "New York, NY", "maxResults": 500, "batchSize": 20}'
```

### Check Status
```bash
# Health check
curl http://localhost:3001/health

# Queue stats
curl http://localhost:3001/api/v1/leads/queue/stats

# Job progress (replace with actual jobId)
curl http://localhost:3001/api/v1/leads/import/progress/{jobId}
```

## Expected Timeline

### Small Import (20 leads)
- **Batches:** 1 batch of 20
- **Time:** 30-60 seconds
- **Memory:** ~200MB

### Medium Import (100 leads)
- **Batches:** 5 batches of 20
- **Time:** 2-3 minutes
- **Memory:** ~250MB

### Large Import (500 leads)
- **Batches:** 25 batches of 20
- **Time:** 4-6 minutes
- **Memory:** ~350MB

## Success Indicators

✅ **Redis running:** `redis-cli ping` returns `PONG`
✅ **Backend running:** `http://localhost:3001/health` returns `{"status":"ok"}`
✅ **Frontend running:** `http://localhost:3000` loads without errors
✅ **Queue initialized:** Backend logs show "Scraping queue service initialized"
✅ **Import working:** Can start import and see progress bar
✅ **Progress updating:** Progress percentage increases over time
✅ **Completion:** Import completes with statistics

## Next Steps

1. ✅ **Test small import** (20 leads)
2. ✅ **Test large import** (500 leads) to see queue system
3. ✅ **Monitor memory usage** to verify stability
4. ✅ **Test error handling** (try invalid location)
5. ✅ **View imported leads** in the UI

---

**Your queue system is ready to test! 🚀**

Start with: `docker-compose up -d redis && cd backend && npm run dev`
