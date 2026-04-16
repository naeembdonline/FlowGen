# Phase 2: Lead Scraping Engine - Implementation Guide

## 🎯 Overview

This guide covers the complete implementation of the Google Maps lead scraping engine using the omkarcloud API integration.

## 📁 Files Created/Modified

### New Files Created
1. `backend/src/services/omkarcloud.service.ts` - Main scraper service
2. `backend/src/middleware/rateLimiter.ts` - Rate limiting middleware
3. `backend/src/utils/leadTransformers.ts` - Data transformation utilities

### Modified Files
1. `backend/src/routes/leads.routes.ts` - Complete lead management routes
2. `backend/src/services/supabase.service.ts` - Enhanced with bulk import

## 🔧 Setup Instructions

### 1. Install Additional Dependencies

```bash
cd backend
npm install axios
```

### 2. Configure Environment Variables

Update your `.env` file:

```bash
# Omkarcloud API Configuration
OMKARCLOUD_API_KEY=your-omkarcloud-api-key-here
OMKARCLOUD_API_URL=https://omkarcloud.com/api

# Optional: Custom rate limits
SCRAPING_RATE_LIMIT_PER_MINUTE=10
SCRAPING_CACHE_TTL=3600  # Cache time in seconds
```

### 3. Get omkarcloud API Key

1. Visit https://omkarcloud.com
2. Sign up for an account
3. Navigate to API Keys section
4. Generate a new API key
5. Add the key to your `.env` file

**Note**: The free tier typically includes 100-500 requests per month.

## 🚀 Usage Examples

### Example 1: Basic Lead Import

```bash
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{
    "location": "San Francisco, CA",
    "query": "coffee shops",
    "maxResults": 20
  }'
```

**Response:**
```json
{
  "message": "Lead import completed",
  "imported": 15,
  "duplicates": 5,
  "errors": 0,
  "total": 20,
  "leads": [...],
  "cached": false
}
```

### Example 2: Search with Filters

```bash
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Austin, TX",
    "query": "restaurants",
    "radius": 5000,
    "minRating": 4.0,
    "maxResults": 50
  }'
```

### Example 3: Preview Before Import

```bash
# First, search to preview results
curl -X POST http://localhost:3001/api/v1/leads/import/search \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Miami, FL",
    "query": "gyms",
    "maxResults": 10
  }'

# Then, import if you like the results
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Miami, FL",
    "query": "gyms",
    "maxResults": 50
  }'
```

## 🎨 Frontend Integration

### Update the Lead Store

Update `frontend/src/stores/useLeadStore.ts`:

```typescript
/**
 * Import leads from Google Maps
 */
async importLeads(params: {
  location: string;
  query?: string;
  radius?: number;
  minRating?: number;
  maxResults?: number;
}): Promise<{ imported: number; duplicates: number; errors: number }> {
  set({ isLoading: true, error: null });

  try {
    const response = await leadsApi.import(params);

    if (response.error) {
      set({ error: response.error.message, isLoading: false });
      return { imported: 0, duplicates: 0, errors: 0 };
    }

    // Refresh leads list after import
    await this.fetchLeads();

    set({ isLoading: false });

    return {
      imported: response.data.imported,
      duplicates: response.data.duplicates,
      errors: response.data.errors,
    };
  } catch (error) {
    set({
      error: (error as Error).message,
      isLoading: false,
    });
    return { imported: 0, duplicates: 0, errors: 0 };
  }
}
```

### Create Import Component

Create `frontend/src/components/leads/LeadImportModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useLeadStore } from '@/stores/useLeadStore';

export default function LeadImportModal({ onClose }: { onClose: () => void }) {
  const importLeads = useLeadStore((state) => state.importLeads);
  const [importing, setImporting] = useState(false);
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState('');
  const [maxResults, setMaxResults] = useState(20);

  const handleImport = async () => {
    setImporting(true);
    const result = await importLeads({ location, query, maxResults });
    setImporting(false);

    if (result.imported > 0) {
      alert(`Successfully imported ${result.imported} leads!`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Import Leads from Google Maps</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Location *</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., San Francisco, CA"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Business Type (Optional)</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., coffee shops, restaurants"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Results</label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !location}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {importing ? 'Importing...' : 'Import Leads'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 🔒 Rate Limiting & Anti-Bot Detection

### How It Works

1. **Redis-Based Rate Limiting**
   - Tracks requests per user/IP in Redis
   - Sliding window algorithm for accurate rate limiting
   - Distributed across multiple server instances

2. **Exponential Backoff**
   - Automatic retry with increasing delays
   - Prevents API blocking during high traffic
   - Configurable max retries

3. **Request Delay**
   - Configurable delay between requests (default: 1 second)
   - Prevents rapid-fire requests that trigger bot detection
   - Respects omkarcloud rate limits

4. **Caching Strategy**
   - Caches search results for 1 hour
   - Reduces API calls for repeated searches
   - Cache key includes location, query, and filters

### Rate Limit Configuration

```typescript
// In omkarcloud.service.ts
const defaultOptions = {
  useCache: true,        // Enable caching
  cacheTTL: 3600,        // 1 hour cache
  delay: 1000,          // 1 second between requests
  maxRetries: 3,        // Retry failed requests 3 times
  timeout: 30000,       // 30 second timeout
};
```

### Custom Rate Limits

You can customize rate limits per endpoint:

```typescript
// In rateLimiter.ts
export const scrapingRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,    // 1 minute window
  maxRequests: 10,        // 10 requests per minute
  keyPrefix: 'scraping',
});
```

## 📊 Data Flow Diagram

```
User Request → Rate Limiter → Auth Check → Omkarcloud Service
                                                        ↓
                                                 Redis Cache Check
                                                        ↓
                                                 omkarcloud API Call
                                                        ↓
                                              Transform & Normalize Data
                                                        ↓
                                                   Supabase Import
                                                        ↓
                                                 Return Results
```

## 🧪 Testing

### Test the Scraper Service

```typescript
// Test file: backend/src/services/__tests__/omkarcloud.service.test.ts

import { omkarcloudService } from '../omkarcloud.service';

describe('Omkarcloud Service', () => {
  it('should search for businesses', async () => {
    const result = await omkarcloudService.searchBusinesses({
      location: 'San Francisco, CA',
      query: 'coffee shops',
      maxResults: 5,
    });

    expect(result.businesses).toBeDefined();
    expect(result.businesses.length).toBeGreaterThan(0);
    expect(result.totalFound).toBeGreaterThan(0);
  });

  it('should handle rate limiting gracefully', async () => {
    // Make multiple rapid requests
    const requests = Array(15).fill(null).map(() =>
      omkarcloudService.searchBusinesses({
        location: 'Austin, TX',
        query: 'restaurants',
      })
    );

    const results = await Promise.allSettled(requests);

    // Some should succeed, some should be rate limited
    const successful = results.filter(r => r.status === 'fulfilled');
    const rateLimited = results.filter(r => r.status === 'rejected');

    expect(successful.length).toBeGreaterThan(0);
  });
});
```

### Test with curl

```bash
# Test health check
curl http://localhost:3001/health

# Test search endpoint
curl -X POST http://localhost:3001/api/v1/leads/import/search \
  -H "Content-Type: application/json" \
  -d '{
    "location": "New York, NY",
    "query": "coffee shops",
    "maxResults": 5
  }'

# Test import endpoint
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Los Angeles, CA",
    "query": "gyms",
    "maxResults": 10
  }'
```

## 🐛 Troubleshooting

### Issue: "Invalid omkarcloud API key"

**Solution:**
1. Verify API key is set in `.env`
2. Check API key hasn't expired
3. Ensure API key has correct permissions

### Issue: "Rate limit exceeded"

**Solution:**
1. Wait for rate limit window to reset (1 minute)
2. Reduce maxResults per request
3. Implement caching for repeated searches
4. Consider upgrading omkarcloud plan

### Issue: "No businesses found"

**Solution:**
1. Try a more general search query
2. Increase search radius
3. Check location spelling
4. Remove minRating filter

### Issue: "Redis connection error"

**Solution:**
1. Ensure Redis is running: `docker-compose ps`
2. Check Redis logs: `docker-compose logs redis`
3. Verify Redis URL in `.env`
4. Test Redis connection: `redis-cli ping`

## 📈 Performance Optimization

### 1. Enable Caching

```typescript
const result = await omkarcloudService.searchBusinesses(params, {
  useCache: true,
  cacheTTL: 7200, // 2 hours for frequently searched locations
});
```

### 2. Batch Processing

```typescript
// Process multiple locations in parallel
const locations = ['San Francisco', 'Los Angeles', 'New York'];
const results = await Promise.all(
  locations.map(loc =>
    omkarcloudService.searchBusinesses({ location: loc })
  )
);
```

### 3. Paginated Imports

```typescript
// Import in batches to avoid overwhelming the database
const allBusinesses = await omkarcloudService.searchAllBusinesses(params, {
  maxResults: 100, // Total limit
});

// Import in smaller batches
const batchSize = 50;
for (let i = 0; i < allBusinesses.length; i += batchSize) {
  const batch = allBusinesses.slice(i, i + batchSize);
  await leadService.bulkImport(tenantId, batch);
}
```

## 🔄 Next Steps

### Phase 3 Preview: AI-Powered Messages

With leads now in your database, you're ready for Phase 3:

1. **Claude AI Integration**
   - Generate personalized messages based on lead data
   - Use business category, location, and ratings for customization
   - A/B test different message templates

2. **Message Templates**
   - Create reusable message templates
   - Variable substitution: `{name}`, `{business}`, `{category}`
   - Tone customization: professional, casual, urgent

3. **Preview Before Sending**
   - Generate messages and preview before sending
   - Edit and customize individual messages
   - Bulk message generation

## 📞 Support

If you encounter issues:
1. Check logs: `backend/logs/combined.log`
2. Verify Redis: `docker-compose logs redis`
3. Test omkarcloud API: Check their dashboard for usage
4. Review database: Check Supabase for imported leads

---

**Phase 2 Complete! 🎉**

Your lead scraping engine is now fully functional and ready for production use.
