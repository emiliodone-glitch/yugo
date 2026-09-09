-- Ruta de pareja después del sí (RF-REL-05): hitos con fecha y consejería
-- prematrimonial pedida a la iglesia con el sí de los dos.
CREATE TABLE "CoupleMilestone" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "doneAt" TIMESTAMP(3) NOT NULL,
  "doneById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoupleMilestone_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CoupleMilestone_matchId_key_key" ON "CoupleMilestone"("matchId", "key");
ALTER TABLE "CoupleMilestone" ADD CONSTRAINT "CoupleMilestone_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "CounselingStatus" AS ENUM ('PENDING_PARTNER', 'REQUESTED', 'ACCEPTED', 'DECLINED', 'CLOSED');

CREATE TABLE "CounselingRequest" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "churchId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "status" "CounselingStatus" NOT NULL DEFAULT 'PENDING_PARTNER',
  "partnerConsentAt" TIMESTAMP(3),
  "responseNote" TEXT,
  "respondedById" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CounselingRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CounselingRequest_churchId_status_idx" ON "CounselingRequest"("churchId", "status");
CREATE INDEX "CounselingRequest_matchId_createdAt_idx" ON "CounselingRequest"("matchId", "createdAt");
ALTER TABLE "CounselingRequest" ADD CONSTRAINT "CounselingRequest_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CounselingRequest" ADD CONSTRAINT "CounselingRequest_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
