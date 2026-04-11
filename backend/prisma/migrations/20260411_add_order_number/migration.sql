-- AlterTable: Add orderNumber as autoincrement
-- First add the column with a sequence for existing rows
CREATE SEQUENCE IF NOT EXISTS "orders_orderNumber_seq";
ALTER TABLE "orders" ADD COLUMN "orderNumber" INTEGER NOT NULL DEFAULT nextval('"orders_orderNumber_seq"');
ALTER SEQUENCE "orders_orderNumber_seq" OWNED BY "orders"."orderNumber";

-- Create unique index
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");
