-- Perfil con voz propia (RF-PER-12): audio de testimonio moderado.
CREATE TABLE "VoiceNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoiceNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VoiceNote_userId_key" ON "VoiceNote"("userId");
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationCase" ADD COLUMN "voiceNoteId" TEXT;
