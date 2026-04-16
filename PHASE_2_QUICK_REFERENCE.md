# Phase 2: Quick Reference Guide

## 🚀 Common Commands

### Start Development Environment
```bash
# Start Redis
docker-compose up -d

# Start Backend
cd backend
npm run dev

# Start Frontend (new terminal)
cd frontend
npm run dev
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Import leads
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{
    "location": "San Francisco, CA",
    "query": "coffee shops",
    "maxResults": 20
  }'

# Search leads (preview)
curl -X POST http://localhost:3001/api/v1/leads/import/search \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Austin, TX",
    "query": "restaurants",
    "maxResults": 10
  }'

# Get all leads
curl http://localhost:3001/api/v1/leads

# Filter leads
curl "http://localhost:3001/api/v1/leads?status=new&category=Restaurant"

# Export leads to CSV
curl http://localhost:3001/api/v1/leads/export > leads.csv

# Delete lead
curl -X DELETE http://localhost:3001/api/v1/leads/{lead-id}
```

## 📋 API Parameters Reference

### Import Endpoint Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `location` | string | ✅ Yes | - | City, State or full address |
| `query` | string | No | "all" | Business type or category |
| `radius` | number | No | 5000 | Search radius in meters |
| `minRating` | number | No | 0 | Minimum Google rating (1-5) |
| `maxResults` | number | No | 20 | Maximum results (1-100) |

### Example Requests

**Basic Import:**
```json
{
  "location": "New York, NY"
}
```

**With Category:**
```json
{
  "location": "Los Angeles, CA",
  "query": "gyms"
}
```

**With Filters:**
```json
{
  "location": "Chicago, IL",
  "query": "restaurants",
  "radius": 10000,
  "minRating": 4.0,
  "maxResults": 50
}
```

## 🎨 Common Use Cases

### 1. Find Coffee Shops in a City
```json
{
  "location": "Seattle, WA",
  "query": "coffee shops",
  "minRating": 4.0,
  "maxResults": 25
}
```

### 2. Find All Businesses in an Area
```json
{
  "location": "Miami, FL",
  "radius": 10000,
  "maxResults": 100
}
```

### 3. Find High-Rated Restaurants
```json
{
  "location": "Austin, TX",
  "query": "restaurants",
  "minRating": 4.5,
  "maxResults": 20
}
```

### 4. Find Local Services
```json
{
  "location": "Denver, CO",
  "query": "plumbing"
}
```

## 🐛 Troubleshooting Quick Fixes

### Problem: "Connection refused" on port 3001
```bash
# Check if backend is running
lsof -i :3001

# If not, start it
cd backend && npm run dev
```

### Problem: "Redis connection error"
```bash
# Check Redis status
docker-compose ps

# Restart Redis
docker-compose restart redis

# Clear Redis cache
redis-cli FLUSHALL
```

### Problem: "Rate limit exceeded"
```bash
# Wait 1 minute for rate limit to reset
# OR reduce requests per batch
# OR enable caching (default: enabled)
```

### Problem: "No businesses found"
```bash
# Try:
# 1. More general search query (remove query parameter)
# 2. Larger radius
# 3. Remove minRating filter
# 4. Check location spelling
```

## 📊 Rate Limit Reference

### Default Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Import API | 10 requests | 1 minute |
| General API | 100 requests | 15 minutes |
| Auth API | 5 requests | 1 minute |

### Check Your Rate Limit Status

```bash
# Look for these headers in API responses:
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 2024-01-01T12:00:00Z
```

## 🗂️ Database Schema Quick Reference

### Leads Table Structure

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant (organization) |
| `name` | TEXT | Business name |
| `phone` | TEXT | Phone number |
| `email` | TEXT | Email address |
| `website` | TEXT | Website URL |
| `address` | TEXT | Full address |
| `category` | TEXT | Business category |
| `google_maps_id` | TEXT | Unique Google Maps ID |
| `status` | TEXT | new, contacted, responded, etc. |
| `created_at` | TIMESTAMPTZ | Import timestamp |

### Query Examples (SQL)

```sql
-- Get all leads for a tenant
SELECT * FROM leads WHERE tenant_id = 'your-tenant-id';

-- Filter by status
SELECT * FROM leads WHERE status = 'new';

-- Search by name
SELECT * FROM leads WHERE name ILIKE '%coffee%';

-- Count leads by category
SELECT category, COUNT(*) FROM leads
GROUP BY category;

-- Find duplicates
SELECT google_maps_id, COUNT(*)
FROM leads
GROUP BY google_maps_id
HAVING COUNT(*) > 1;
```

## 🔧 Environment Variables

### Required Variables
```bash
# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=redis://localhost:6379

# Omkarcloud API
OMKARCLOUD_API_KEY=your-api-key
```

### Optional Variables
```bash
# Rate Limits (override defaults)
SCRAPING_RATE_LIMIT_PER_MINUTE=10
SCRAPING_CACHE_TTL=3600

# Logging
LOG_LEVEL=debug
```

## 📈 Performance Tips

### 1. Use Caching
```typescript
// Results are cached for 1 hour by default
const result = await omkarcloudService.searchBusinesses(params);
```

### 2. Batch Processing
```typescript
// Process 100 leads in batches of 50
const allBusinesses = await omkarcloudService.searchAllBusinesses({
  location: 'New York, NY',
  maxResults: 100,
});
```

### 3. Import in Chunks
```json
// Import 50 at a time instead of 100
{
  "location": "Los Angeles, CA",
  "maxResults": 50
}
```

### 4. Use Filters Early
```json
{
  "location": "Chicago, IL",
  "query": "restaurants",
  "minRating": 4.0,
  "maxResults": 20
}
```

## 🎯 Frontend Integration Snippets

### Import Button Component
```tsx
<button onClick={() => setShowImportModal(true)}>
  Import Leads
</button>
```

### Import Handler
```typescript
const handleImport = async () => {
  const result = await leadsApi.import({
    location: 'San Francisco, CA',
    query: 'coffee shops',
    maxResults: 20,
  });

  console.log(`Imported: ${result.data.imported}`);
  console.log(`Duplicates: ${result.data.duplicates}`);
};
```

### Display Import Results
```tsx
<div className="import-results">
  <p>✅ Imported: {result.imported}</p>
  <p>⏭️ Duplicates: {result.duplicates}</p>
  <p>❌ Errors: {result.errors}</p>
</div>
```

## 🧪 Testing Commands

```bash
# Run all tests
npm test

# Run Phase 2 tests
npm test -- phase2

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- omkarcloud.service.test

# Watch mode
npm test -- --watch
```

## 📝 Checklists

### Before Deploying to Production
- [ ] All tests passing
- [ ] Redis configured and running
- [ ] Supabase migrations applied
- [ ] Environment variables set
- [ ] Rate limits configured
- [ ] Error logging enabled
- [ ] API keys secured
- [ ] HTTPS configured
- [ ] Monitoring set up

### Before Each Import Session
- [ ] Redis running (`docker-compose ps`)
- [ ] Backend server running
- [ ] Sufficient API quota
- [ ] Database connection verified
- [ ] Rate limit checked

---

**Need Help?**
- Implementation Guide: `PHASE_2_IMPLEMENTATION_GUIDE.md`
- Summary: `PHASE_2_SUMMARY.md`
- Test Suite: `backend/src/services/__tests__/`
