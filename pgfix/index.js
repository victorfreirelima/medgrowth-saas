const { Client } = require('pg');
const crypto = require('crypto');

const DB_URL = 'postgresql://postgres:QZkWuibKMWaxePXVqDztWLTmzgUaziWZ@turntable.proxy.rlwy.net:31011/railway';
const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

const SQL = `
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
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "providerLeadId"  TEXT;
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

-- Unique index for providerLeadId
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'leads_providerLeadId_key') THEN
    CREATE UNIQUE INDEX "leads_providerLeadId_key" ON "leads"("providerLeadId");
  END IF;
END $$;

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
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_integrations_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_integrations_apiKey_key') THEN
    ALTER TABLE "client_integrations" ADD CONSTRAINT "client_integrations_apiKey_key" UNIQUE ("apiKey");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_integrations_clientId_provider_key') THEN
    ALTER TABLE "client_integrations" ADD CONSTRAINT "client_integrations_clientId_provider_key" UNIQUE ("clientId", "provider");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_integrations_clientId_fkey') THEN
    ALTER TABLE "client_integrations" ADD CONSTRAINT "client_integrations_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "leads_source_idx" ON "leads"("source");
CREATE INDEX IF NOT EXISTS "client_integrations_clientId_idx" ON "client_integrations"("clientId");
`;

async function main() {
    await client.connect();
    console.log('Connected.');

    await client.query(SQL);
    console.log('✅ Migration 2_lead_capture_system applied.');

    // Register in _prisma_migrations
    const migrationName = '2_lead_capture_system';
    const existing = await client.query(`SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`, [migrationName]);
    if (existing.rows.length === 0) {
        const now = new Date().toISOString();
        const checksum = crypto.createHash('sha256').update(SQL).digest('hex');
        await client.query(
            `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ($1,$2,$3,$4,NULL,NULL,$5,1)`,
            [crypto.randomUUID(), checksum, now, migrationName, now]
        );
        console.log('✅ Recorded in _prisma_migrations.');
    } else {
        await client.query(`UPDATE "_prisma_migrations" SET applied_steps_count=1, finished_at=$1 WHERE migration_name=$2`, [new Date().toISOString(), migrationName]);
        console.log('✅ Updated existing migration record.');
    }

    // Verify
    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='leads' AND column_name IN ('source','providerLeadId','adsetId','adId','wbraid','gbraid','rawPayload','formName','pageUrl','message') ORDER BY column_name`);
    console.log('✅ New lead columns:', cols.rows.map(r => r.column_name).join(', '));

    const tbl = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_name='client_integrations'`);
    console.log('✅ client_integrations table exists:', tbl.rows.length > 0);

    await client.end();
    console.log('🎉 Migration complete.');
}

main().catch(async e => { console.error(e.message); try { await client.end(); } catch { } process.exit(1); });
