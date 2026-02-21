-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "clients" ADD COLUMN "specialty" TEXT;
ALTER TABLE "clients" ADD COLUMN "city" TEXT;
ALTER TABLE "clients" ADD COLUMN "notes" TEXT;
