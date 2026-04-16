# 🚀 Puppeteer Scraper - Quick Reference

## 🎯 Common Commands

### Start Everything
```bash
# Start Redis
docker-compose up -d

# Start Backend
cd backend
npm run dev

# Ready to scrape! 🎉
```

### Test Import
```bash
# Basic import
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{"location": "San Francisco, CA", "maxResults": 5}'

# With category
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{"location": "Austin, TX", "query": "bbq", "maxResults": 10}'

# With filters
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{"location": "Miami, FL", "query": "restaurants", "minRating": 4.0, "maxResults": 15}'
```

### View Results
```bash
# All leads
curl http://localhost:3001/api/v1/leads

# Filtered leads
curl "http://localhost:3001/api/v1/leads?status=new"

# Export to CSV
curl http://localhost:3001/api/v1/leads/export > my_leads.csv
```

## 📋 Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `location` | string | ✅ Yes | - | City, State or address |
| `query` | string | No | "all" | Business type/category |
| `radius` | number | No | 5000 | Search radius (meters) |
| `minRating` | number | No | 0 | Minimum rating (1-5) |
| `maxResults` | number | No | 20 | Max results (1-100) |
| `extractEmails` | boolean | No | false | Extract emails from websites |

## 🎨 Example Requests

### Coffee Shops in San Francisco
```json
{
  "location": "San Francisco, CA",
  "query": "coffee shops",
  "minRating": 4.0,
  "maxResults": 25
}
```

### All Businesses in Austin
```json
{
  "location": "Austin, TX",
  "radius": 10000,
  "maxResults": 50
}
```

### High-Rated Restaurants in NYC
```json
{
  "location": "New York, NY",
  "query": "restaurants",
  "minRating": 4.5,
  "maxResults": 30,
  "extractEmails": true
}
```

## ⚡ Performance Tips

### Fast Scraping
```json
{
  "location": "Los Angeles, CA",
  "maxResults": 10,
  "extractEmails": false
}
```

### High Quality Scraping
```json
{
  "location": "Chicago, IL",
  "query": "restaurants",
  "minRating": 4.0,
  "maxResults": 20,
  "extractEmails": true
}
```

### Bulk Scraping
```json
{
  "location": "Miami, FL",
  "maxResults": 100,
  "extractEmails": false
}
```

## 🐛 Quick Fixes

### Problem: "Module not found"
```bash
cd backend && npm install
```

### Problem: "Port 3001 in use"
```bash
lsof -ti :3001 | xargs kill -9
```

### Problem: "Redis connection failed"
```bash
docker-compose up -d
```

### Problem: "Scraping too slow"
```json
{
  "location": "Test",
  "maxResults": 5,
  "extractEmails": false
}
```

## 📊 Response Format

### Success Response
```json
{
  "message": "Lead import completed",
  "imported": 15,
  "duplicates": 5,
  "errors": 0,
  "total": 20,
  "leads": [...],
  "cached": false,
  "scrapingTime": 12500
}
```

### Error Response
```json
{
  "error": "ValidationError",
  "message": "Location is required"
}
```

## 🔧 Environment Variables

```bash
# Required
REDIS_URL=redis://localhost:6379
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key

# Optional
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=60000
SCRAPING_RATE_LIMIT_PER_MINUTE=5
SCRAPING_CACHE_TTL=3600
```

## 📈 Performance Benchmarks

| Operation | Time | Cost |
|-----------|------|------|
| **10 results** | 5-8s | $0 |
| **20 results** | 8-12s | $0 |
| **50 results** | 12-18s | $0 |
| **100 results** | 18-25s | $0 |

## 🎯 Success Checklist

- [x ] Puppeteer installed
- [x ] Redis running
- [x ] Backend server started
- [x ] First import successful
- [x ] Leads in database
- [x ] Export to CSV works
- [x ] Caching works (repeat search)

## 🚀 Production Deployment

```bash
# Build Docker image
docker build -t fikerflow-backend -f backend/Dockerfile .

# Run container
docker run -p 3001:3001 \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e REDIS_URL=redis://redis:6379 \
  fikerflow-backend
```

---

**Ready to scrape? Start here:**

```bash
docker-compose up -d && cd backend && npm run dev
```

*Then test with: `curl -X POST http://localhost:3001/api/v1/leads/import -H "Content-Type: application/json" -d '{"location": "Your City", "maxResults": 5}'`*
