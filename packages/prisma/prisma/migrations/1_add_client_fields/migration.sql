-- CreateEnum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientStatus') THEN
    CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
  END IF;
END $$;

-- AlterTable (idempotent)
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "specialty" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "notes" TEXT;
