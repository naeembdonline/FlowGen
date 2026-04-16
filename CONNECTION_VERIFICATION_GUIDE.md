# 🎯 FlowGen Connection Verification - Complete Guide

## ✅ **Connection System Successfully Created**

I've set up a complete connection verification system for your FlowGen application with health checks, Docker networking, and testing utilities.

---

## 🚀 **Quick Start - Test Your Connections**

### **Option 1: Visual Health Check Dashboard (Recommended)**

Access the comprehensive health check dashboard:
```
http://localhost:3000/system-health
```

**What it tests:**
- ✅ Frontend health (browser APIs, localStorage)
- ✅ Backend connectivity (basic health endpoint)
- ✅ Backend services (database + Redis detailed status)
- ✅ Redis connection (via backend health check)

### **Option 2: Quick Terminal Tests**

```bash
# Test backend health
curl http://localhost:3001/health

# Test backend detailed health
curl http://localhost:3001/api/v1/health/detailed

# Test Redis via backend
curl http://localhost:3001/api/v1/health/detailed | grep redis
```

---

## 🔧 **Files Created/Updated**

### **1. Docker Configuration**
**File:** `docker-compose.yml` (Updated)

**Services Added:**
- ✅ **backend** - Express API server (port 3001)
- ✅ **frontend** - Next.js web app (port 3000)
- ✅ **redis** - Redis cache/queue (port 6379)

**Service Communication:**
```
Frontend → Backend:  http://backend:3001 (internal Docker network)
Backend → Redis:     redis://redis:6379 (internal Docker network)
Frontend → Backend:  http://localhost:3001 (external access)
```

### **2. Health Check Dashboard**
**File:** `frontend/src/app/system-health/page.tsx` (New)

**Features:**
- 🎨 Beautiful visual dashboard with real-time status
- 🔄 Auto-refresh capability (30-second intervals)
- ⏱️ Response time tracking for each service
- 📊 Detailed service information display
- 🚨 Error detection and troubleshooting tips
- 🐳 Docker service communication information

### **3. Connection Test Utility**
**File:** `frontend/src/lib/connectionTest.ts` (New)

**Functions:**
```typescript
// Test backend connectivity
testBackendConnection()

// Test backend services (DB + Redis)
testBackendServices()

// Test Redis connection
testRedisConnection()

// Run all tests at once
runAllConnectionTests()
```

### **4. Frontend Dockerfile**
**File:** `frontend/Dockerfile` (New)

**Features:**
- Multi-stage Next.js build
- Health check endpoint
- Production-ready configuration

---

## 🧪 **Testing Methods**

### **Method 1: Browser Dashboard (Easiest)**

1. **Start your services:**
   ```bash
   # Using start-dev.bat
   start-dev.bat

   # Or manually
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

2. **Access the health dashboard:**
   ```
   http://localhost:3000/system-health
   ```

3. **Click "Run Health Checks" button**

4. **Review the results:**
   - ✅ **Green badges** = Service is healthy
   - ❌ **Red badges** = Service has issues
   - ⏳ **Yellow badges** = Check is in progress

### **Method 2: API Testing with curl**

```bash
# Basic backend health check
curl http://localhost:3001/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-01-16T...",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0"
}

# Detailed health check (includes database and Redis)
curl http://localhost:3001/api/v1/health/detailed

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-16T...",
  "uptime": 123.456,
  "services": {
    "database": {
      "status": "healthy"
    },
    "redis": {
      "status": "healthy",
      "memoryUsage": "1.2M",
      "keyCount": 0
    }
  }
}
```

### **Method 3: Programmatic Testing**

```typescript
// In any React component or utility file
import { runAllConnectionTests } from '@/lib/connectionTest';

async function checkConnections() {
  const { allHealthy, results } = await runAllConnectionTests();

  if (allHealthy) {
    console.log('✅ All services are healthy!');
  } else {
    console.log('❌ Some services have issues:', results);
  }
}
```

---

## 🐳 **Docker Service Communication**

### **Service Names & Network Configuration**

All services are on the `flowgen-network` Docker bridge network:

```yaml
networks:
  flowgen-network:
    driver: bridge
```

### **Internal vs External Communication**

**Within Docker (Service-to-Service):**
```bash
# Frontend → Backend (internal)
http://backend:3001

# Backend → Redis (internal)
redis://redis:6379

# Backend → Frontend for CORS (internal)
http://frontend:3000
```

**Outside Docker (Browser/Client):**
```bash
# Frontend (external)
http://localhost:3000

# Backend (external)
http://localhost:3001

# Redis (external)
localhost:6379
```

### **Docker Commands for Testing**

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f redis

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## 🔍 **Backend Health Endpoints**

Your backend already has comprehensive health check endpoints:

### **1. Basic Health Check**
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-16T10:30:00.000Z",
  "uptime": 1234.567,
  "environment": "development",
  "version": "1.0.0"
}
```

### **2. Detailed Health Check**
```http
GET /api/v1/health/detailed
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T10:30:00.000Z",
  "uptime": 1234.567,
  "services": {
    "database": {
      "status": "healthy"
    },
    "redis": {
      "status": "healthy",
      "memoryUsage": "1.2M",
      "keyCount": 5
    }
  }
}
```

### **3. Readiness Probe**
```http
GET /api/v1/health/ready
```

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

### **4. Liveness Probe**
```http
GET /api/v1/health/live
```

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

---

## 🧪 **Frontend API Client Usage**

Your frontend API client (`src/lib/api.ts`) already includes health check methods:

```typescript
import { healthApi } from '@/lib/api';

// Basic health check
const response = await healthApi.check();

// Detailed health check
const detailed = await healthApi.detailed();

// Readiness check
const ready = await healthApi.ready();

// Liveness check
const live = await healthApi.live();
```

---

## 🚨 **Troubleshooting**

### **Issue: Backend Connection Refused**

**Symptoms:**
- Frontend shows "Connection refused" error
- curl to `http://localhost:3001/health` fails

**Solutions:**
```bash
# 1. Check if backend is running
cd backend && npm run dev

# 2. Check if port 3001 is available
netstat -an | grep 3001  # Windows/macOS
lsof -i :3001           # Linux

# 3. Check backend logs
cd backend && npm run dev
# Look for error messages in terminal

# 4. Verify environment variables
cat backend/.env
# Ensure PORT=3001 is set
```

### **Issue: Redis Connection Failed**

**Symptoms:**
- Backend shows "Redis connection failed"
- Health check shows Redis as "unhealthy"

**Solutions:**
```bash
# 1. Check if Redis is running
docker-compose ps redis

# 2. Start Redis if not running
docker-compose up -d redis

# 3. Test Redis connection
docker exec -it flowgen-redis redis-cli ping
# Should return: PONG

# 4. Check Redis logs
docker-compose logs redis
```

### **Issue: Docker Services Can't Communicate**

**Symptoms:**
- Services start but can't reach each other
- Health checks fail with "network error"

**Solutions:**
```bash
# 1. Check if all services are on same network
docker network inspect flowgen-network

# 2. Verify service names in docker-compose.yml
# Should be: backend, frontend, redis

# 3. Restart Docker network
docker-compose down
docker-compose up -d

# 4. Check container names
docker ps
# Should see: flowgen-backend, flowgen-frontend, flowgen-redis
```

### **Issue: CORS Errors**

**Symptoms:**
- Browser console shows CORS errors
- Frontend can't reach backend

**Solutions:**
```bash
# 1. Check backend CORS configuration
# File: backend/src/index.ts, lines 63-72

# 2. Verify FRONTEND_URL in backend/.env
FRONTEND_URL=http://localhost:3000

# 3. Check if CORS allows your frontend origin
# In development, should allow: http://localhost:3000
```

---

## ✅ **Success Criteria**

After testing, you should see:

### **Health Dashboard:**
- ✅ All 4 services show "Healthy" green badges
- ✅ Response times under 500ms
- ✅ No error messages
- ✅ Overall system status: "All Systems Operational"

### **API Tests:**
- ✅ `curl http://localhost:3001/health` returns 200
- ✅ `curl http://localhost:3001/api/v1/health/detailed` shows all services healthy
- ✅ No CORS errors in browser console
- ✅ No network errors in DevTools Network tab

### **Docker Services:**
- ✅ All containers running: `docker-compose ps`
- ✅ All health checks passing: `docker-compose ps`
- ✅ Services can communicate using service names
- ✅ No restart loops or crashes

---

## 🎯 **Next Steps**

### **1. Test Current Setup:**
```bash
# Start services
start-dev.bat

# Access health dashboard
# http://localhost:3000/system-health
```

### **2. Test Docker Setup:**
```bash
# Start Docker services
docker-compose up -d

# Check health dashboard
# http://localhost:3000/system-health
```

### **3. Monitor in Production:**
- Use health check endpoints for load balancers
- Set up monitoring with the detailed health endpoint
- Configure alerts for unhealthy services

---

## 📊 **Expected Results**

### **Healthy System:**
```
✅ Frontend: Healthy (45ms)
✅ Backend API: Healthy (78ms)
✅ Backend Services: Healthy (123ms)
✅ Redis Cache: Healthy (56ms)

Overall System Status: All Systems Operational
```

### **Service Details:**
```json
{
  "frontend": {
    "localStorage": "OK",
    "fetch": "OK",
    "userAgent": "Mozilla/5.0..."
  },
  "backend": {
    "status": "ok",
    "uptime": 1234.567,
    "environment": "development",
    "version": "1.0.0"
  },
  "services": {
    "database": {
      "status": "healthy"
    },
    "redis": {
      "status": "healthy",
      "memoryUsage": "1.2M",
      "keyCount": 5
    }
  }
}
```

---

## 🎉 **Summary**

**What's been set up:**
- ✅ Complete Docker networking with service names
- ✅ Visual health check dashboard at `/system-health`
- ✅ Backend health endpoints (already existed)
- ✅ Frontend connection test utilities
- ✅ Dockerfiles for all services
- ✅ Updated docker-compose.yml with health checks

**How to test:**
1. **Quick test:** Access `http://localhost:3000/system-health`
2. **API test:** `curl http://localhost:3001/health`
3. **Docker test:** `docker-compose up -d`

**Service communication:**
- Frontend → Backend: `http://backend:3001` (Docker internal)
- Backend → Redis: `redis://redis:6379` (Docker internal)
- External access: `http://localhost:3001` (from browser)

Your FlowGen application now has **comprehensive connection verification** with beautiful visual feedback and programmatic testing capabilities! 🚀
