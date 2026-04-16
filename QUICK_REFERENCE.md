# 🚀 Quick Reference - Local Development

## One-Command Startup (Windows)

**Option 1: Automated Script**
```bash
# Double-click this file:
start-dev.bat
```

**Option 2: Manual Steps**
```bash
# Terminal 1: Start Redis
docker-compose up -d redis

# Terminal 2: Start Backend
cd backend
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

## Access URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:3001 |
| **Import Page** | http://localhost:3000/import |
| **Health Check** | http://localhost:3001/health |
| **Queue Stats** | http://localhost:3001/api/v1/leads/queue/stats |

## Test the Queue System

### Via UI (Recommended)
1. Open: http://localhost:3000/import
2. Fill form:
   - Location: `San Francisco, CA`
   - Max Results: `100`
   - Batch Size: `20`
3. Click "Start Import"
4. Watch progress bar appear below

### Via cURL
```bash
# Start import
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type": application/json" \
  -d '{"location": "San Francisco, CA", "maxResults": 100}'

# Check progress (use returned jobId)
curl http://localhost:3001/api/v1/leads/import/progress/{jobId}
```

## Monitor Progress

### Watch Logs
```bash
# Backend logs (in Terminal 2)
# You'll see:
[INFO] Processing batch { batchNumber: 1, totalBatches: 5 }
[INFO] Scraping Google Maps...
[INFO] Imported 18 leads, 2 duplicates
```

### Check Redis
```bash
redis-cli
> keys bull:scraping-queue:*
> LLEN bull:scraping-queue:active
> exit
```

## Expected Timeline

| Leads | Batches | Time | Memory |
|-------|---------|------|--------|
| 20    | 1       | 30-60s   | ~200MB |
| 100   | 5       | 2-3min   | ~250MB |
| 500   | 25      | 4-6min   | ~350MB |

## Stop Everything

**Option 1: Automated Script**
```bash
# Double-click this file:
stop-dev.bat
```

**Option 2: Manual**
```bash
# In Backend terminal: Ctrl+C
# In Frontend terminal: Ctrl+C
# Stop Redis:
docker-compose down
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Redis connection failed | `docker-compose up -d redis` |
| Port 3001 in use | `lsof -ti :3001 \| xargs kill -9` |
| Module not found | `cd backend && npm install` |
| Jobs stuck waiting | `curl -X POST http://localhost:3001/api/v1/leads/queue/resume` |

## Environment Variables (Required)

### Backend `.env`
```bash
REDIS_URL=redis://localhost:6379
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
```

### Frontend `.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
```

## Progress Bar Features

What you'll see:
- ✅ Progress bar (0-100%)
- ✅ Processed/Imported/Duplicates/Errors counts
- ✅ Current batch (X of Y)
- ✅ Time elapsed and remaining
- ✅ Status updates
- ✅ Pause/resume polling
- ✅ Final statistics on completion

## Success Indicators

✅ Redis: `redis-cli ping` → `PONG`
✅ Backend: `http://localhost:3001/health` → `{"status":"ok"}`
✅ Frontend: `http://localhost:3000` → Loads without errors
✅ Queue: Backend logs show "Scraping queue service initialized"
✅ Import: Can start import and see progress bar
✅ Progress: Percentage increases over time
✅ Completion: Import completes with statistics

## Next Test After Success

1. ✅ Test small import (20 leads)
2. ✅ Test large import (500 leads) - see queue system!
3. ✅ View imported leads at http://localhost:3000/leads
4. ✅ Test error handling (invalid location)
5. ✅ Monitor memory usage (should stay stable)

---

**Quick Start:** Double-click `start-dev.bat` then open http://localhost:3000/import
