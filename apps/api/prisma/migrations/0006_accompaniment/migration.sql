-- CreateEnum
CREATE TYPE "AccompanimentStatus" AS ENUM ('INVITED', 'ACTIVE', 'DECLINED', 'ENDED');

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'ACCOMPANIMENT';

-- CreateTable
CREATE TABLE "Accompaniment" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "status" "AccompanimentStatus" NOT NULL DEFAULT 'INVITED',
    "invitedById" TEXT NOT NULL,
    "consentAId" BOOLEAN NOT NULL DEFAULT false,
    "consentBId" BOOLEAN NOT NULL DEFAULT false,
    "mentorAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,

    CONSTRAINT "Accompaniment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorProfile" (
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "spouseName" TEXT,
    "marriedSince" INTEGER,
    "bio" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "Accompaniment_mentorId_status_idx" ON "Accompaniment"("mentorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Accompaniment_matchId_mentorId_key" ON "Accompaniment"("matchId", "mentorId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorProfile_code_key" ON "MentorProfile"("code");

-- AddForeignKey
ALTER TABLE "Accompaniment" ADD CONSTRAINT "Accompaniment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accompaniment" ADD CONSTRAINT "Accompaniment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

