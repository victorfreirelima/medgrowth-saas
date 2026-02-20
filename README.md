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

## 🛠️ Configuração de Produção

### 1. Meta Ads (Facebook)
- Vá em [developers.facebook.com](https://developers.facebook.com).
- Crie um App do tipo "Business" ou "Consumer".
- Adicione o produto "Facebook Login for Business" ou "Marketing API".
- Configure a Redirect URI: `https://seu-backend.railway.app/ads/meta/callback`.
- Pegue o `App ID` e `App Secret`.

### 2. Google Ads
- Vá em [console.cloud.google.com](https://console.cloud.google.com).
- Crie um projeto e configure a "OAuth Consent Screen".
- Crie credenciais de "OAuth Client ID" (Web Application).
- Configure a Redirect URI: `https://seu-backend.railway.app/ads/google/callback`.
- Pegue o `Client ID` e `Client Secret`.

### 3. Variáveis de Ambiente
Copie o `.env.example` para `.env` e preencha as chaves:
```bash
# Essencial para segurança (32 caracteres)
ENCRYPTION_KEY="sua-chave-secreta-de-32-chars"

# OAuth
META_APP_ID="..."
META_APP_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
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
