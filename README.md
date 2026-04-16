# 🚀 FlowGen Lead Generation SaaS

A complete, production-ready multi-tenant SaaS platform for automated lead generation and personalized outreach. Built with Next.js 14, Express.js, TypeScript, and Supabase.

## ✨ Features

- **🔍 Lead Discovery**: Queue-based Google Maps scraping with Puppeteer Cluster (100% free, no APIs)
- **🤖 AI-Powered Messages**: Generate personalized outreach messages using Claude AI
- **📱 Multi-Channel Outreach**: Send messages via WhatsApp (Evolution API) and Email (Brevo)
- **📊 Analytics Dashboard**: Track campaigns, responses, and conversions
- **🏢 Multi-Tenant**: Complete data isolation for multiple agencies/clients
- **💳 SaaS Ready**: Built-in Stripe integration for subscription billing (Phase 6)
- **⚡ Job Queue**: BullMQ queue system with Redis for batch processing (500+ leads)
- **🔒 Secure**: Row-level security (RLS) for tenant data isolation

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **TanStack Query** - Data fetching and caching
- **Shadcn/UI** - High-quality React components

### Backend
- **Express.js** - REST API server
- **TypeScript** - Type-safe backend
- **Supabase** - PostgreSQL database & authentication
- **Redis + BullMQ** - Job queue for batch processing
- **Puppeteer Cluster** - Memory-efficient web scraping
- **Winston** - Logging

### External Services
- **Claude AI** - Message generation
- **Evolution API** - WhatsApp integration
- **Brevo** - Email delivery
- **Puppeteer** - Self-hosted Google Maps scraping (no paid APIs!)
- **Stripe** - Payment processing (Phase 6)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm 9+
- **Docker** and Docker Compose (for Redis)
- **Git** for version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd flowgen-lead-saas
```

### 2. Environment Setup

Copy the environment variables template and fill in your values:

```bash
cp .env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env` and add your API keys (see [External Services Setup](#external-services-setup)).

### 3. Start Services

Start Redis with Docker Compose:
```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

### 4. Database Setup

1. Create a **Supabase project** at https://supabase.com
2. Get your credentials: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
3. Run the database migration in Supabase Dashboard → SQL Editor:
```sql
-- Paste contents of: backend/src/db/migrations/001_initial_schema.sql
```

### 5. Install Dependencies

```bash
# Install all dependencies from root
npm run install:all
```

### 6. Start Development Servers

**Option A: Start both frontend and backend**
```bash
npm run dev
```

**Option B: Start individually**
```bash
# Terminal 1 - Backend API:
cd backend
npm run dev
# Server runs on http://localhost:3001

# Terminal 2 - Frontend:
cd frontend
npm run dev
# App runs on http://localhost:3000
```

### 7. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/health
- **Import Leads**: http://localhost:3000/import

## 🔑 External Services Setup

### Supabase (Database + Auth)

1. Visit https://supabase.com
2. Create a new project
3. Get credentials from Settings → API:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Run migrations in SQL Editor

### Claude AI (Anthropic)

1. Visit https://console.anthropic.com
2. Create an API key
3. Add to `backend/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
4. Free tier available for testing

### Evolution API (WhatsApp)

1. Visit https://doc.evolution-api.com
2. Deploy instance or use cloud service
3. Get credentials:
   ```
   EVOLUTION_API_URL=https://your-instance.evolution-api.com
   EVOLUTION_API_KEY=your-key-here
   ```
4. Requires WhatsApp Business API access

### Brevo (Email)

1. Visit https://brevo.com
2. Create account and verify sender domain
3. Get API key:
   ```
   BREVO_API_KEY=xkeysib-your-key-here
   ```
4. Free tier: 300 emails/day

### Redis (Job Queue)

Redis is started via Docker Compose. No setup needed.

## 📁 Project Structure

```
flowgen-lead-saas/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities, API client
│   │   └── stores/          # Zustand state stores
│   ├── package.json
│   └── tsconfig.json
├── backend/                  # Express API
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── jobs/            # BullMQ queue workers
│   │   ├── middleware/      # Auth, validation
│   │   ├── config/          # Database, Redis config
│   │   ├── db/              # Migrations, seeds
│   │   └── utils/           # Helpers, logger
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml        # Local development
├── .env.example              # Environment template
└── README.md                 # This file
```

## 🔧 Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests (coming soon)
cd frontend
npm test
```

### Code Quality

```bash
# Lint backend
cd backend
npm run lint

# Lint frontend
cd frontend
npm run lint
```

### Type Checking

```bash
# Backend type check
cd backend
npm run type-check

# Frontend type check
cd frontend
npm run type-check
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Log in
- `POST /api/v1/auth/logout` - Log out
- `GET /api/v1/auth/me` - Get current user

### Lead Endpoints

- `GET /api/v1/leads` - List leads
- `GET /api/v1/leads/:id` - Get lead details
- `POST /api/v1/leads/import` - Import from Google Maps (queue-based)
- `GET /api/v1/leads/import/progress/:jobId` - Get import progress
- `PATCH /api/v1/leads/:id` - Update lead
- `DELETE /api/v1/leads/:id` - Delete lead

### Queue Management Endpoints

- `GET /api/v1/leads/queue/stats` - Get queue statistics
- `POST /api/v1/leads/queue/pause` - Pause queue processing
- `POST /api/v1/leads/queue/resume` - Resume queue processing

### Health Endpoints

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed service status

Full API documentation with Swagger is coming soon!

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
│  (Dashboard, Lead Management, Campaign Creation, Analytics)  │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│                   Express.js Backend                         │
│  (API Routes, Business Logic, Job Queue Management)          │
└─────┬─────────┬─────────┬─────────┬─────────┬───────────────┘
      │         │         │         │         │
      ▼         ▼         ▼         ▼         ▼
   Supabase   Redis    Claude   Evolution  Brevo
  (Auth+DB)  (Jobs)   (AI)     (WhatsApp) (Email)
```

### Data Flow

1. **User searches for leads** → Google Maps scraping (Puppeteer Cluster)
2. **Leads stored in Supabase** with tenant isolation
3. **User creates campaign** → Claude AI generates personalized messages
4. **Messages queued in Redis** (BullMQ) for rate-limited delivery
5. **Sent via Evolution API** (WhatsApp) or Brevo (Email)
6. **Responses tracked** and analytics updated

## 🎯 Phase Implementation

### ✅ Phase 1: Foundation & Core Architecture
- Project structure with Next.js + Express monorepo
- Supabase setup with database schema
- Authentication system using Supabase Auth
- Basic API structure with Express + TypeScript
- Frontend layout with Shadcn/UI components
- Docker configuration for local development

### ✅ Phase 2: Lead Scraping & Management
- Google Maps scraper service using Puppeteer with stealth mode
- Queue-based batch processing (BullMQ + Redis)
- Puppeteer Cluster for memory efficiency
- Lead management interface (list, search, filter)
- Bulk operations (export, delete, tag)
- Real-time progress tracking

### 🔜 Phase 3: AI-Powered Message Generation (Next)
- Claude AI integration for message generation
- Message template system with variable substitution
- A/B testing framework for message variants
- Message preview UI

### 🔜 Phase 4: Message Delivery
- WhatsApp integration (Evolution API)
- Email integration (Brevo)
- Job queue processing with rate limiting
- Delivery tracking and status updates

### 🔜 Phase 5: Analytics & Dashboard
- Analytics dashboard with charts
- Campaign performance metrics
- Lead conversion tracking
- Response rate calculations

### 🔜 Phase 6: SaaS Features
- Stripe integration for subscriptions
- Plan limits (messages per month, leads stored)
- Client management
- White-label branding options

## 🐛 Troubleshooting

### Common Issues

**Problem: "Module not found"**
```bash
cd backend && npm install
```

**Problem: "Port 3001 in use"**
```bash
lsof -ti :3001 | xargs kill -9
```

**Problem: "Redis connection failed"**
```bash
docker-compose up -d redis
```

**Problem: "Scraping too slow"**
- Reduce maxResults to 10-20
- Skip email extraction
- Use cached results

**Problem: "High memory usage"**
- Reduce batch size in queue configuration
- Check for memory leaks in Puppeteer cluster
- Restart the queue service

## 📖 Documentation

- **Setup Guide**: `LOCAL_SETUP_GUIDE.md`
- **Queue System**: `QUEUE_SYSTEM_GUIDE.md`
- **Puppeteer Cluster**: `PUPPETEER_CLUSTER_GUIDE.md`
- **Quick Reference**: `QUICK_REFERENCE.md`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🎉 Acknowledgments

Built with ❤️ using modern web technologies and open-source libraries.

---

**FlowGen** - AI-Powered Lead Generation & Outreach Platform

*For support and questions, please open an issue on GitHub.*
