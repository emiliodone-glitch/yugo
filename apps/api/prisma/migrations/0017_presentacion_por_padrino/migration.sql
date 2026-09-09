-- Presentación por padrino con doble consentimiento (RF-ACO-05).
CREATE TABLE "Introduction" (
  "id" TEXT NOT NULL,
  "proposerId" TEXT NOT NULL,
  "userAId" TEXT NOT NULL,
  "userBId" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "statusA" TEXT NOT NULL DEFAULT 'PENDING',
  "statusB" TEXT NOT NULL DEFAULT 'PENDING',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "matchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "Introduction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Introduction_userAId_status_idx" ON "Introduction"("userAId", "status");
CREATE INDEX "Introduction_userBId_status_idx" ON "Introduction"("userBId", "status");
CREATE INDEX "Introduction_proposerId_createdAt_idx" ON "Introduction"("proposerId", "createdAt");
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
