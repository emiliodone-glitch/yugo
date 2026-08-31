-- CreateEnum
CREATE TYPE "EventAudience" AS ENUM ('CONGREGATION', 'SINGLES');

-- AlterEnum
ALTER TYPE "EventAttendanceStatus" ADD VALUE 'WAITLIST';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "audience" "EventAudience" NOT NULL DEFAULT 'CONGREGATION';

-- CreateIndex
CREATE INDEX "EventAttendance_eventId_status_createdAt_idx" ON "EventAttendance"("eventId", "status", "createdAt");

