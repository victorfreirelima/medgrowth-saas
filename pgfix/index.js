const { Client } = require('pg');
const crypto = require('crypto');

const DB_URL = 'postgresql://postgres:QZkWuibKMWaxePXVqDztWLTmzgUaziWZ@turntable.proxy.rlwy.net:31011/railway';
const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

const SQL = `
-- 1. Helper to map old statuses to new statuses if they exist
DO $$ 
BEGIN
  -- Check if NEW exists in LeadStatus (meaning it hasn't been migrated yet)
  IF EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid WHERE pg_type.typname = 'LeadStatus' AND pg_enum.enumlabel = 'NEW') THEN
    
    -- Rename old type
    ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
    
    -- Create new type
    CREATE TYPE "LeadStatus" AS ENUM ('NOVO', 'EM_CONTATO', 'QUALIFICADO', 'AGENDADO', 'COMPARECEU', 'FECHADO', 'PERDIDO');
    
    -- Update leads table
    ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT;
    
    ALTER TABLE "leads" ALTER COLUMN "status" TYPE "LeadStatus" USING (
      CASE "status"::text
        WHEN 'NEW' THEN 'NOVO'::"LeadStatus"
        WHEN 'CONTACTED' THEN 'EM_CONTATO'::"LeadStatus"
        WHEN 'QUALIFIED' THEN 'QUALIFICADO'::"LeadStatus"
        WHEN 'SCHEDULED' THEN 'AGENDADO'::"LeadStatus"
        WHEN 'ATTENDED' THEN 'COMPARECEU'::"LeadStatus"
        WHEN 'WON' THEN 'FECHADO'::"LeadStatus"
        WHEN 'LOST' THEN 'PERDIDO'::"LeadStatus"
        ELSE 'NOVO'::"LeadStatus"
      END
    );
    
    ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'NOVO';
    
    -- Drop old type
    DROP TYPE "LeadStatus_old";
  END IF;
END $$;

-- 2. Add new columns
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "firstContactAt"   TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "appointmentDate"  TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "revenue"          DOUBLE PRECISION;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lostReason"       TEXT;

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS "leads_statusUpdatedAt_idx" ON "leads"("statusUpdatedAt");
`;

async function main() {
  await client.connect();
  console.log('Connected.');

  await client.query(SQL);
  console.log('✅ Migration 3_crm_pipeline applied.');

  // Register in _prisma_migrations
  const migrationName = '3_crm_pipeline';
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
  const statusCheck = await client.query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid WHERE pg_type.typname = 'LeadStatus'`);
  console.log('✅ Current LeadStatus labels:', statusCheck.rows.map(r => r.enumlabel).join(', '));

  const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='leads' AND column_name IN ('statusUpdatedAt','firstContactAt','revenue','lostReason') ORDER BY column_name`);
  console.log('✅ New crm columns:', cols.rows.map(r => r.column_name).join(', '));

  await client.end();
  console.log('🎉 Migration complete.');
}

main().catch(async e => { console.error(e.message); try { await client.end(); } catch { } process.exit(1); });
