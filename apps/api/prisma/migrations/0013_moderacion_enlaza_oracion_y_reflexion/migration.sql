-- AlterTable
ALTER TABLE "ModerationCase" ADD COLUMN     "prayerAnsweredNoteId" TEXT,
ADD COLUMN     "prayerRequestId" TEXT,
ADD COLUMN     "reflectionDevotionalId" TEXT,
ADD COLUMN     "reflectionUserId" TEXT;

-- AlterTable
ALTER TABLE "PrayerRequest" ADD COLUMN     "answeredNoteStatus" "ModerationStatus";

