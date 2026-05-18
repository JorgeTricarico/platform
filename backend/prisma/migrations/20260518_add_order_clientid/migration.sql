-- Z36: relacionar Order con Client via FK opcional
-- Permite matchear entregas previas por clientId aunque cambie el clientPhone

ALTER TABLE "orders" ADD COLUMN "clientId" TEXT;

CREATE INDEX "orders_clientId_idx" ON "orders"("clientId");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
