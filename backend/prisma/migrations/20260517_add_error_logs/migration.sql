-- CreateTable: error_logs
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "business" TEXT,
    "source" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "url" TEXT,
    "userAgent" TEXT,
    "userName" TEXT,
    "metadata" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: filtro por resolved + orden por fecha
CREATE INDEX "error_logs_resolved_createdAt_idx" ON "error_logs"("resolved", "createdAt");

-- CreateIndex: filtro por business + source + orden por fecha
CREATE INDEX "error_logs_business_source_createdAt_idx" ON "error_logs"("business", "source", "createdAt");
