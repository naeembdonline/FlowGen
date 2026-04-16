# 🚀 FlowGen Lead Generation SaaS

A complete, production-ready multi-tenant SaaS platform for automated lead generation and personalized outreach. Built with Next.js 14, Express.js, TypeScript, and Supabase.

## ✨ Features

- **🔍 Lead Discovery**: Search and import leads from Google Maps via omkarcloud API
- **🤖 AI-Powered Messages**: Generate personalized outreach messages using Claude AI
- **📱 Multi-Channel Outreach**: Send messages via WhatsApp (Evolution API) and Email (Brevo)
- **📊 Analytics Dashboard**: Track campaigns, responses, and conversions
- **🏢 Multi-Tenant**: Complete data isolation for multiple agencies/clients
- **💳 SaaS Ready**: Built-in Stripe integration for subscription billing (Phase 6)
- **⚡ Job Queue**: Redis-backed Bull queue for reliable message delivery
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
- **Redis + Bull** - Job queue for async processing
- **Winston** - Logging

### External Services
- **Claude AI** - Message generation
- **Evolution API** - WhatsApp integration
- **Brevo** - Email delivery
- **omkarcloud** - Google Maps scraping
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
cd fikerflow-lead-saas
```

### 2. Environment Setup

Copy the environment variables template and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys (see [External Services Setup](#external-services-setup)).

### 3. Start Services

Start Redis and other dependencies with Docker Compose:

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
3. Run the database migration:

In Supabase Dashboard → SQL Editor, run:
```sql
-- Paste contents of: backend/src/db/migrations/001_initial_schema.sql
```

4. (Optional) Load seed data for development:
```sql
-- Paste contents of: backend/src/db/seeds/001_seed_data.sql
```

### 5. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 6. Start Development Servers

Terminal 1 - Backend API:
```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
# App runs on http://localhost:3000
```

### 7. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/health
- **Login**: http://localhost:3000/login

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
3. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
4. Free tier available for testing

### omkarcloud (Google Maps Scraping)

1. Visit https://omkarcloud.com
2. Sign up and get API key
3. Add to `.env`:
   ```
   OMKARCLOUD_API_KEY=your-key-here
   ```
4. Check pricing and rate limits

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
fikerflow-lead-saas/
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
│   │   ├── jobs/            # Bull queue workers
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

## 🗄️ Database Migrations

### Create a New Migration

1. Create file: `backend/src/db/migrations/002_your_migration.sql`
2. Write your SQL changes
3. Run in Supabase SQL Editor

### Rollback

```sql
-- Write rollback SQL in reverse order
-- Manually execute in Supabase SQL Editor
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Log in
- `POST /api/v1/auth/logout` - Log out
- `GET /api/v1/auth/me` - Get current user

### Lead Endpoints (Phase 2)

- `GET /api/v1/leads` - List leads
- `GET /api/v1/leads/:id` - Get lead details
- `POST /api/v1/leads/import` - Import from Google Maps
- `PATCH /api/v1/leads/:id` - Update lead
- `DELETE /api/v1/leads/:id` - Delete lead

### Campaign Endpoints (Phase 3)

- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign
- `POST /api/v1/campaigns/:id/launch` - Launch campaign

### Health Endpoints

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed service status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

Full API documentation with Swagger is coming soon!

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────┐
│         Next.js Frontend                │
│  (Dashboard, Leads, Campaigns, Analytics) │
└─────────────────┬───────────────────────┘
                  │ REST API
┌─────────────────▼───────────────────────┐
│          Express.js Backend              │
│  (Routes, Business Logic, Job Queue)     │
└───┬─────────┬─────────┬─────────┬───────┘
    │         │         │         │
    ▼         ▼         ▼         ▼
 Supabase   Redis    Claude   Evolution
(Auth+DB)  (Jobs)   (AI)     (WhatsApp)
               │
               ▼
             Brevo
            (Email)
```

### Multi-Tenancy

- **Tenant Isolation**: Row-Level Security (RLS) in PostgreSQL
- **User-Tenant Association**: Each user belongs to one tenant
- **Data Segregation**: All queries automatically filtered by `tenant_id`
- **Secure by Default**: Backend uses service role key with proper auth checks

### Job Queue Flow

1. User creates campaign → Messages added to Bull queue
2. Worker processes messages with rate limiting
3. Messages sent via Evolution API (WhatsApp) or Brevo (Email)
4. Webhooks update delivery status
5. Analytics updated in real-time

## 🔐 Security

### Authentication

- Supabase Auth for user management
- JWT tokens for API authentication
- Token refresh mechanism
- Secure password hashing (handled by Supabase)

### Authorization

- Role-based access control (admin, user, viewer)
- Row-Level Security (RLS) for tenant isolation
- API route protection with auth middleware

### Best Practices

- Environment variables for sensitive data
- CORS configuration
- Helmet.js for security headers
- Rate limiting (coming soon)
- Input validation with express-validator

## 🚀 Deployment

### Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel
```

### Backend Deployment (Railway/Render)

```bash
# Using Railway
npm i -g railway
railway login
railway init
railway up

# Or use Render, AWS, GCP, etc.
```

### Environment Variables

Set these in your deployment platform:

**Frontend:**
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Backend:**
- All variables from `.env.example`

## 📈 Roadmap

### ✅ Phase 1: Foundation (Current)
- Project structure
- Database schema
- Authentication system
- Basic API and UI

### 🔨 Phase 2: Lead Management
- Google Maps integration
- Lead import and management
- Bulk operations

### 🤖 Phase 3: AI Messages
- Claude AI integration
- Message templates
- A/B testing

### 📤 Phase 4: Messaging Infrastructure
- Bull queue implementation
- WhatsApp integration
- Email integration
- Delivery tracking

### 📊 Phase 5: Analytics
- Campaign performance
- Response tracking
- Conversion metrics

### 💳 Phase 6: SaaS Features
- Stripe integration
- Subscription billing
- Plan limits
- Client management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation**: See this README and code comments
- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions for questions

## 🎉 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database and auth by [Supabase](https://supabase.com/)
- AI powered by [Anthropic](https://www.anthropic.com/)
- Icons by [Lucide](https://lucide.dev/)

---

**Made with ❤️ by Fikerflow**

Happy coding! 🚀
