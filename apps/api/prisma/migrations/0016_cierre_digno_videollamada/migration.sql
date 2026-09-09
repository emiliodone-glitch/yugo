-- Cierre digno (RF-CON-11) y videollamada dentro de la app (RF-CON-12).
ALTER TABLE "Match" ADD COLUMN "closingTemplate" TEXT;
ALTER TABLE "Match" ADD COLUMN "closingMessage" TEXT;

CREATE TABLE "VideoCall" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMin" INTEGER NOT NULL DEFAULT 15,
  "provider" TEXT NOT NULL DEFAULT 'STUB',
  "roomName" TEXT,
  "roomUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoCall_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VideoCall_matchId_scheduledAt_idx" ON "VideoCall"("matchId", "scheduledAt");
ALTER TABLE "VideoCall" ADD CONSTRAINT "VideoCall_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
