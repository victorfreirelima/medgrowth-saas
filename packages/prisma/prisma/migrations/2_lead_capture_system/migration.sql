-- ============================================================
-- Migration 2: Lead Capture System (IDEMPOTENT)
-- Adds: LeadSource, IntegrationProvider enums
--       Lead fields: source, providerLeadId, adsetId, adId, wbraid, gbraid, rawPayload, formName, pageUrl, message
--       New table: client_integrations
-- ============================================================

-- LeadSource enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadSource') THEN
    CREATE TYPE "LeadSource" AS ENUM ('META_LEAD_ADS', 'WEBSITE', 'WHATSAPP', 'MANUAL');
  END IF;
END $$;

-- IntegrationProvider enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationProvider') THEN
    CREATE TYPE "IntegrationProvider" AS ENUM ('META');
  END IF;
END $$;

-- Lead table: new columns
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source"          "LeadSource";
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "providerLeadId"  TEXT         UNIQUE;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "adsetId"         TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "adId"            TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "wbraid"          TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "gbraid"          TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "rawPayload"      JSONB;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "formName"        TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "pageUrl"         TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "message"         TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "deviceType"      TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "timezone"        TEXT;

-- ClientIntegration table
CREATE TABLE IF NOT EXISTS "client_integrations" (
  "id"            TEXT        NOT NULL,
  "clientId"      TEXT        NOT NULL,
  "provider"      "IntegrationProvider" NOT NULL,
  "enabled"       BOOLEAN     NOT NULL DEFAULT false,
  "pageId"        TEXT,
  "formId"        TEXT,
  "pageName"      TEXT,
  "formName"      TEXT,
  "webhookActive" BOOLEAN     NOT NULL DEFAULT false,
  "lastLeadAt"    TIMESTAMP(3),
  "apiKey"        TEXT        NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "client_integrations_pkey" PRIMARY KEY ("id")
);

-- Unique constraints for client_integrations (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_integrations_apiKey_key'
  ) THEN
    ALTER TABLE "client_integrations" ADD CONSTRAINT "client_integrations_apiKey_key" UNIQUE ("apiKey");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_integrations_clientId_provider_key'
  ) THEN
    ALTER TABLE "client_integrations" ADD CONSTRAINT "client_integrations_clientId_provider_key" UNIQUE ("clientId", "provider");
  END IF;
END $$;

-- FK to clients
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_integrations_clientId_fkey'
  ) THEN
    ALTER TABLE "client_integrations" ADD CONSTRAINT "client_integrations_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "leads_source_idx" ON "leads"("source");
CREATE INDEX IF NOT EXISTS "leads_providerLeadId_idx" ON "leads"("providerLeadId");
CREATE INDEX IF NOT EXISTS "client_integrations_clientId_idx" ON "client_integrations"("clientId");
