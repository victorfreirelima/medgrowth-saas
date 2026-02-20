# MedGrowth — Medical Marketing Agency SaaS

A complete multi-tenant SaaS platform for medical marketing agencies, featuring dashboards for Meta Ads and Google Ads campaigns, a CRM for leads and appointments, and role-based access control.

## 🏗️ Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui |
| Backend | NestJS + TypeScript + Fastify |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + Refresh Token + RBAC |
| Queue | BullMQ + Redis |
| Deploy | Vercel (web) + Railway (api + db + redis) |

## 📁 Project Structure

```
MedGrowth/
├── apps/
│   ├── api/         # NestJS backend (port 3001)
│   └── web/         # Next.js frontend (port 3000)
└── packages/
    └── prisma/      # Shared Prisma schema + seed
```

## 🚀 Running Locally

### Prerequisites
- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- PostgreSQL 15+ running locally
- Redis running locally

### 1. Clone & Install

```bash
git clone <repo-url>
cd MedGrowth
cp .env.example .env  # Fill in your values
pnpm install
```

### 2. Database Setup

```bash
cd packages/prisma
pnpm migrate:dev  # Creates tables
pnpm seed        # Seeds fake data
```

### 3. Start API

```bash
cd apps/api
pnpm dev          # Starts on http://localhost:3001
# Swagger docs: http://localhost:3001/docs
```

### 4. Start Web

```bash
cd apps/web
pnpm dev          # Starts on http://localhost:3000
```

### Seed Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@medgrowth.com | Admin123! |
| Commercial | comercial@medgrowth.com | Comercial123! |
| Manager | gestor@medgrowth.com | Gestor123! |

## 🌐 Deployment

### Vercel (Frontend)

```bash
cd apps/web
npx vercel          # Follow prompts
# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

### Railway (Backend + DB + Redis)

1. Create a new Railway project
2. Add services: **PostgreSQL**, **Redis**, **GitHub repo** (NestJS)
3. Set `RAILWAY_SERVICE_ROOT` to `apps/api`
4. Add all environment variables from `.env.example`
5. Set start command: `pnpm build && pnpm start`
6. Run migrations: `pnpm --filter @medgrowth/prisma migrate:deploy`

## 🔌 Configuring Ad Integrations

### Meta Ads
1. Create an app at [developers.facebook.com](https://developers.facebook.com)
2. Enable **Marketing API** product
3. Set `META_APP_ID` and `META_APP_SECRET` in your environment
4. Add the OAuth redirect URI: `https://your-api-url.railway.app/ads/meta/callback`
5. In the dashboard → Settings → Connections → Connect Meta Ads

### Google Ads
1. Create credentials at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Google Ads API**
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DEVELOPER_TOKEN`
4. Add redirect URI: `https://your-api-url.railway.app/ads/google/callback`

## 🔐 RBAC Roles

| Role | Permissions |
|---|---|
| `ADMIN` | Full access to all clients and settings |
| `COMMERCIAL` | Manage leads and appointments for assigned clients |
| `MANAGER` | Read-only view of their client's data |

## 📡 Key API Routes

```
POST  /auth/login         - Login
GET   /auth/me            - Current user profile
GET   /dashboard/kpis     - KPI metrics
GET   /dashboard/campaigns - Campaign ranking
GET   /leads              - List leads (paginated, filtered)
POST  /leads/:clientId    - Create lead
PATCH /leads/:id          - Update lead
GET   /appointments       - List appointments
GET   /ads/connections    - Ad account connections
POST  /ads/connections/:id/sync - Trigger sync
GET   /docs               - Swagger UI
```

## 🧪 Running Tests

```bash
# API unit tests
cd apps/api
pnpm test

# API e2e tests  
pnpm test:e2e

# Frontend type check
cd apps/web
pnpm typecheck
```

## ✅ MVP Checklist

- [x] Multi-tenant data isolation
- [x] JWT Auth + Refresh Token + RBAC
- [x] Lead CRM (CRUD + status funnel + notes)
- [x] Appointments management
- [x] Dashboard with KPI cards + chart + campaign table
- [x] Reports page with funnel visualization
- [x] Ad account connections (Meta/Google) with AES-256 token encryption
- [x] Sync jobs (mock in dev, real API plumbing ready)
- [x] 60 days of seed data for demo
- [x] Swagger API docs at `/docs`
- [x] Unit tests for metrics calculations
- [x] Rate limiting, CORS, security headers
