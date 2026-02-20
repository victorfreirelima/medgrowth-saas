# MedGrowth — SaaS de Marketing Médico (MVP)

Sistema completo de gestão de leads, agendamentos e performance de anúncios para agências de marketing médico.

## 🚀 Stack Tecnológica
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui.
- **Backend**: NestJS (Fastify), BullMQ (Background Jobs), Sentry (Observabilidade).
- **Banco de Dados**: PostgreSQL (Prisma ORM), Redis (Queue).
- **Auth**: NextAuth (Frontend), JWT + RBAC (Backend).

## 📊 O que foi implementado
- [x] **Dashboard Central**: Métricas de investimento, leads e CPL em tempo real.
- [x] **Gestão de Leads**: CRM completo com status de funil e notas.
- [x] **Agendamentos**: Controle de consultas integradas aos leads.
- [x] **Relatórios**: Visão consolidada de performance por canal e cliente.
- [x] **OAuth Real**: Integração oficial com Meta Ads e Google Ads.
- [x] **Automação**: Sync diário via background jobs (BullMQ).

## 🛠️ OAuth Production Setup

### 1. Meta Ads (Facebook Developer)
- Vá em [developers.facebook.com](https://developers.facebook.com) e crie/acesse seu App ("Business").
- Adicione o produto "Facebook Login for Business".
- **Valid OAuth Redirect URIs**: `https://api-production-8d75.up.railway.app/ads/meta/callback`
- **Permissões mínimas necessárias**: `ads_read`, `ads_management`, `business_management`.
- Pegue o `App ID` e `App Secret` e coloque na Railway.

### 2. Google Ads (Google Cloud Console)
- Vá em [console.cloud.google.com](https://console.cloud.google.com).
- Em "APIs & Services" > "Credentials", crie um "OAuth Client ID" (Web Application).
- **Authorized JavaScript origins**: `https://web-six-mu-72.vercel.app`
- **Authorized redirect URIs**: `https://api-production-8d75.up.railway.app/ads/google/callback`
- **Escopos mínimos necessários**: Google Ads API (adwords).
- Pegue o `Client ID` e `Client Secret` e coloque na Railway.

### 3. Variáveis de Ambiente (Railway - Serviço API)
Certifique-se de configurar (ou atualizar) estas variáveis na aba Variables da sua Railway:
```bash
META_APP_ID="seu-app-id"
META_APP_SECRET="seu-app-secret"
META_REDIRECT_URI="https://api-production-8d75.up.railway.app/ads/meta/callback"

GOOGLE_CLIENT_ID="seu-client-id"
GOOGLE_CLIENT_SECRET="seu-client-secret"
GOOGLE_REDIRECT_URI="https://api-production-8d75.up.railway.app/ads/google/callback"

ALLOWED_ORIGINS="https://web-six-mu-72.vercel.app"
```

### 4. Variáveis de Ambiente (Vercel - Frontend Web)
Certifique-se de configurar estas variáveis no seu projeto Vercel:
```bash
NEXT_PUBLIC_API_URL="https://api-production-8d75.up.railway.app"
```


## 📦 Deployment

### Backend + Workers (Railway)
1. Conecte seu repositório no Railway.
2. Adicione os plugins **PostgreSQL** e **Redis**.
3. O Railway usará o `railway.json` automaticamente.
4. Comando de início: `pnpm start:api`.

### Frontend (Vercel)
1. Conecte seu repositório na Vercel.
2. Configure a `Root Directory` para `apps/web`.
3. Adicione `NEXT_PUBLIC_API_URL` apontando para o seu backend no Railway.

## 💻 Rodando Localmente
1. `pnpm install`
2. `docker-compose up -d` (Postgres & Redis)
3. `pnpm db:migrate`
4. `pnpm db:seed`
5. `pnpm dev:api` & `pnpm dev:web`

---
*Desenvolvido como um protótipo funcional de alta performance.*
