CREATE TABLE "SecurityRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SecurityRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "SecurityRateLimit_updatedAt_idx" ON "SecurityRateLimit"("updatedAt");
