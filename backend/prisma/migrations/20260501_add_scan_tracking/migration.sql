-- AlterTable: Add scan tracking fields to orders
ALTER TABLE "orders" ADD COLUMN "scanCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "lastScannedAt" TEXT;
