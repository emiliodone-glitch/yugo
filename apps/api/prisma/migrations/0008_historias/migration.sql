-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED');

-- AlterEnum
ALTER TYPE "RelationshipStage" ADD VALUE 'MARRIED';

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "matchId" TEXT,
    "names" TEXT NOT NULL,
    "churchNames" TEXT NOT NULL,
    "city" TEXT,
    "marriedAt" TIMESTAMP(3) NOT NULL,
    "body" TEXT NOT NULL,
    "photoKey" TEXT,
    "status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
    "consentAId" BOOLEAN NOT NULL DEFAULT false,
    "consentBId" BOOLEAN NOT NULL DEFAULT false,
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Story_matchId_key" ON "Story"("matchId");

-- CreateIndex
CREATE INDEX "Story_status_publishedAt_idx" ON "Story"("status", "publishedAt");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

