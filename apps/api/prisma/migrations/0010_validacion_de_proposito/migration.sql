-- AlterEnum
ALTER TYPE "ModerationCaseKind" ADD VALUE 'PURPOSE';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "purposeBadge" BOOLEAN NOT NULL DEFAULT false;

