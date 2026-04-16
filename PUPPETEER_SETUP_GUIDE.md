# 🎭 Self-Hosted Google Maps Scraper - Setup Guide

## 🎯 Overview

This guide covers the complete setup of a **100% free and open-source** Google Maps scraper using Puppeteer. No third-party APIs required!

## 📋 Prerequisites

### System Requirements

- **Node.js** 18+ and npm 9+
- **Docker** and Docker Compose
- **4GB+ RAM** recommended for Puppeteer
- **VPS** with public IP (for production)

### Browser Dependencies

Puppeteer will download Chromium automatically, but for manual installation:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
    chromium-browser \
    fonts-liberation \
    fonts-indic \
    fonts-freetype \
    fonts-freefont-ttf \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fonts-rooto

# CentOS/RHEL
sudo yum install -y chromium \
    google-noto-sans-cjk-fonts \
    google-noto-color-emoji-fonts \
    fontconfig

# macOS (using Homebrew)
brew install --cask chromium
```

## 🔧 Installation Steps

### 1. Install Dependencies

```bash
# Navigate to backend
cd backend

# Install Node dependencies
npm install

# This will install:
# - puppeteer (latest Chromium bundled)
# - puppeteer-extra
# - puppeteer-extra-plugin-stealth
```

### 2. Verify Installation

```bash
# Test Puppeteer installation
cd backend
node -e "const puppeteer = require('puppeteer'); console.log('✓ Puppeteer installed');"

# Check Chromium version
npx puppeteer browsers --help
```

### 3. Update Environment Variables

Update your `.env` file:

```bash
# Puppeteer Configuration
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=60000
PUPPETEER_MAX_RETRIES=3

# Rate Limiting for Scraping
SCRAPING_RATE_LIMIT_PER_MINUTE=5
SCRAPING_CACHE_TTL=3600

# Email Extraction (Optional)
ENABLE_EMAIL_EXTRACTION=false  # Slower but gets more data
```

## 🐳 Docker Configuration

### For Production Docker Deployment

Create `Dockerfile` in the backend directory:

```dockerfile
# Backend Dockerfile with Puppeteer support
FROM node:18-alpine

# Install Chromium dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
```

Update `docker-compose.yml` to include the backend service:

```yaml
services:
  # ... (existing redis service)

  # Backend API with Puppeteer support
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: fikerflow-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - PUPPETEER_HEADLESS=true
      - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - redis
    networks:
      - fikerflow-network
```

## 🚀 Testing Your Puppeteer Scraper

### 1. Basic Scraping Test

```bash
# Start Redis
docker-compose up -d

# Start Backend
cd backend
npm run dev
```

### 2. Test the Scraper

```bash
# Test basic import
curl -X POST http://localhost:3001/api/v1/leads/import \
  -H "Content-Type: application/json" \
  -d '{
    "location": "San Francisco, CA",
    "query": "coffee shops",
    "maxResults": 5
  }'
```

**Expected Response:**
```json
{
  "message": "Lead import completed",
  "imported": 5,
  "duplicates": 0,
  "errors": 0,
  "total": 5,
  "scrapingTime": 15000,
  "cached": false
}
```

### 3. Test Stealth Mode

```bash
# This should work without rate limiting issues
curl -X POST http://localhost:3001/api/v1/leads/import/search \
  -H "Content-Type: application/json" \
  -d '{
    "location": "New York, NY",
    "query": "restaurants",
    "maxResults": 3
  }'
```

## 🔒 Stealth Mode Features

The Puppeteer scraper includes several anti-detection techniques:

### 1. **User-Agent Spoofing**
```javascript
// Mimics real Chrome browser
userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
```

### 2. **Navigator Property Override**
```javascript
// Hides automation indicators
Object.defineProperty(navigator, 'webdriver', {
  get: () => false,
});
```

### 3. **Plugin Simulation**
```javascript
// Simulates having plugins
Object.defineProperty(navigator, 'plugins', {
  get: () => [1, 2, 3, 4, 5],
});
```

### 4. **Random Delays**
```javascript
// Human-like delays between actions
await randomDelay(500, 1500); // 0.5-1.5 seconds
```

### 5. **Headless Mode**
```javascript
// Runs without visible browser
headless: 'new'  // Puppeteer's new headless mode
```

## 📊 Performance Comparison

| Metric | Puppeteer (Self-Hosted) | omkarcloud API |
|--------|-------------------------|----------------|
| Cost | $0 (free) | Paid tiers |
| Rate Limits | None (your VPS) | API limits |
| Customization | Full control | Fixed API |
| Maintenance | Your updates | Provider updates |
| Data Quality | Direct from Google | Via API |
| Speed | 5-15s per search | 1-3s per search |

## 🛠️ Advanced Configuration

### Custom Scraping Options

```typescript
// In puppeteerScraper.service.ts
const options = {
  useStealth: true,           // Enable stealth mode
  timeout: 60000,             // 60 second timeout
  headless: true,             // Run in background
  maxRetries: 3,              // Retry failed attempts
  useCache: true,             // Cache results
  cacheTTL: 7200,             // 2 hour cache
};
```

### Rate Limiting Configuration

```typescript
// In rateLimiter.ts
export const scrapingRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 5,           // 5 requests per minute (conservative)
  keyPrefix: 'scraping',
});
```

### Timeout Settings

```typescript
// For faster scraping (may reduce reliability)
const options = {
  timeout: 15000,  // 15 seconds
  maxRetries: 1,   // Fewer retries
};

// For more reliable scraping
const options = {
  timeout: 90000,  // 90 seconds
  maxRetries: 5,  // More retries
};
```

## 🌍 Location Testing

### Test Different Locations

```bash
# US Locations
curl -X POST http://localhost:3001/api/v1/leads/import/search \
  -H "Content-Type: application/json" \
  -d '{"location": "Austin, TX", "query": "bbq", "maxResults": 3}'

# European Locations
curl -X POST http://localhost:3001/api/v1/leads/import/search \
  -H "Content-Type: application/json" \
  -d '{"location": "London, UK", "query": "coffee", "maxResults": 3}'

# Asian Locations
curl -X POST http://localhost:3001/api/v1/leads/import/search \
  -H "Content-Type: application/json" \
  -d '{"location": "Tokyo, Japan", "query": "sushi", "maxResults": 3}'
```

## 🐛 Troubleshooting

### Issue: "Failed to launch the browser process"

**Solution:**
```bash
# Install Chromium dependencies
# Ubuntu/Debian
sudo apt-get install -y chromium-browser

# Or let Puppeteer download Chromium
export PUPPETEER_SKIP_DOWNLOAD=false
npx puppeteer install
```

### Issue: "Timeout waiting for results"

**Solution:**
```typescript
// Increase timeout
const options = {
  timeout: 90000,  // 90 seconds
};
```

### Issue: "No businesses found"

**Solution:**
- Try a more popular location
- Remove the query parameter (search all businesses)
- Check location spelling
- Try without minRating filter

### Issue: "High memory usage"

**Solution:**
```bash
# Close browser after each scraping session
await puppeteerScraper.cleanup();

# Or use shared browser instance
# (advanced - modify service to reuse browser)
```

### Issue: "Google Maps blocking"

**Solution:**
```typescript
// Increase delays between requests
await randomDelay(3000, 5000); // 3-5 seconds

// Add more stealth techniques
// (see puppeteerScraper.service.ts)
```

## 🚀 Production Deployment

### VPS Requirements

**Minimum:**
- 2 CPU cores
- 4GB RAM
- 20GB storage
- Ubuntu 20.04+ or similar

**Recommended:**
- 4 CPU cores
- 8GB RAM
- 50GB storage
- Static IP address

### Deployment Steps

```bash
# 1. Clone repository
git clone <your-repo>
cd fikerflow-lead-saas

# 2. Install dependencies
cd backend
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your values

# 4. Start services
docker-compose up -d

# 5. Start backend
npm run dev

# 6. Test scraper
curl -X POST http://localhost:3001/api/v1/leads/import/search \
  -H "Content-Type: application/json" \
  -d '{"location": "Test City", "maxResults": 3}'
```

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start backend with PM2
pm2 start dist/index.js --name fikerflow-api

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

## 📈 Monitoring

### Log Files

```bash
# View scraper logs
tail -f backend/logs/combined.log | grep Puppeteer

# View error logs
tail -f backend/logs/error.log
```

### Metrics to Monitor

- **Scraping Success Rate**: Percentage of successful scrapes
- **Average Scraping Time**: Time per search
- **Cache Hit Rate**: Percentage of cached results
- **Memory Usage**: Puppeteer memory consumption
- **Browser Instances**: Number of active browsers

### Health Check Endpoint

```bash
# Check scraper health
curl http://localhost:3001/health

# Check detailed health
curl http://localhost:3001/health/detailed
```

## 🔐 Security Best Practices

### 1. **Resource Limits**

```typescript
// Limit concurrent scraping instances
const MAX_CONCURRENT_SCRAPERS = 3;

// Limit scraping timeout
const MAX_SCRAPING_TIMEOUT = 90000; // 90 seconds
```

### 2. **Memory Management**

```typescript
// Always cleanup after scraping
await puppeteerScraper.cleanup();

// Monitor memory usage
process.on('memoryUsage', (stats) => {
  if (stats.heapUsed > 500 * 1024 * 1024) { // 500MB
    logger.warn('High memory usage, cleaning up...');
    await puppeteerScraper.cleanup();
  }
});
```

### 3. **Error Recovery**

```typescript
// Implement retry logic with exponential backoff
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    return await scrapeBusinesses(params);
  } catch (error) {
    if (attempt === maxRetries) throw error;
    await delay(Math.pow(2, attempt) * 1000); // Exponential backoff
  }
}
```

## 🎯 Next Steps

With Puppeteer successfully scraping leads, you're ready for:

### Phase 3: AI-Powered Messages
- Generate personalized messages with Claude AI
- Use scraped business data for customization
- Create message templates with variables

### Phase 4: Message Delivery
- Send via WhatsApp (Evolution API)
- Send via Email (Brevo)
- Track delivery and responses

### Phase 5: Analytics
- Track scraping performance
- Monitor lead quality
- Calculate conversion rates

---

**Congratulations! You now have a 100% free and self-hosted Google Maps scraper!** 🎉

*No more monthly API fees - complete control over your data pipeline*
