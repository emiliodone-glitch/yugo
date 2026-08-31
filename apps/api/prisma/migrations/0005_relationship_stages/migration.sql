-- Etapas del vínculo: a connection stops being a boolean (ACTIVE/ENDED) and
-- becomes a bond with a stage the couple declares together.

CREATE TYPE "RelationshipStage" AS ENUM (
    'KNOWING',
    'INTENTIONAL_FRIENDSHIP',
    'COURTSHIP',
    'ENGAGED'
);

-- RELATIONSHIP notifications: proposals and agreed advances.
ALTER TYPE "NotificationCategory" ADD VALUE 'RELATIONSHIP';

ALTER TABLE "Match"
    ADD COLUMN "stage" "RelationshipStage" NOT NULL DEFAULT 'KNOWING',
    ADD COLUMN "stageChangedAt" TIMESTAMP(3),
    ADD COLUMN "proposedStage" "RelationshipStage",
    ADD COLUMN "proposedById" TEXT,
    ADD COLUMN "proposedAt" TIMESTAMP(3);

-- Descubrir's exclusion of COURTSHIP/ENGAGED bonds looks a candidate up by
-- either side of the pair; the existing (userAId, status) and (userBId, status)
-- indexes already answer that, and a person has a handful of matches, so stage
-- is filtered from the heap rather than indexed again.

-- Append-only history. Nothing here is ever updated: a bond that advanced and
-- later ended still advanced, and the metrics that matter depend on that being
-- true after the fact.
CREATE TABLE "RelationshipStageChange" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "fromStage" "RelationshipStage",
    "toStage" "RelationshipStage" NOT NULL,
    "proposedById" TEXT NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationshipStageChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RelationshipStageChange_matchId_createdAt_idx"
    ON "RelationshipStageChange"("matchId", "createdAt");

ALTER TABLE "RelationshipStageChange"
    ADD CONSTRAINT "RelationshipStageChange_matchId_fkey"
    FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
