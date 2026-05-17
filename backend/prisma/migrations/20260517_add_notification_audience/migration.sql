-- AlterTable: notifications.audience
-- "client" = aviso al cliente final; "staff" = alerta para Ana/back office
ALTER TABLE "notifications" ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'client';

-- CreateIndex
CREATE INDEX "notifications_audience_idx" ON "notifications"("audience");
