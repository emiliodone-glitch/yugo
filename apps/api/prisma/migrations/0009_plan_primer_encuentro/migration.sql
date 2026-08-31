-- CreateEnum
CREATE TYPE "MeetingPlanStatus" AS ENUM ('PLANNED', 'SHARED', 'CHECKED_IN', 'CANCELED');

-- CreateTable
CREATE TABLE "MeetingPlan" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "meetsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "trustedContactLabel" TEXT,
    "status" "MeetingPlanStatus" NOT NULL DEFAULT 'PLANNED',
    "sharedAt" TIMESTAMP(3),
    "checkInAt" TIMESTAMP(3),
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingPlan_userId_meetsAt_idx" ON "MeetingPlan"("userId", "meetsAt");

-- CreateIndex
CREATE INDEX "MeetingPlan_status_meetsAt_idx" ON "MeetingPlan"("status", "meetsAt");

-- AddForeignKey
ALTER TABLE "MeetingPlan" ADD CONSTRAINT "MeetingPlan_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingPlan" ADD CONSTRAINT "MeetingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

