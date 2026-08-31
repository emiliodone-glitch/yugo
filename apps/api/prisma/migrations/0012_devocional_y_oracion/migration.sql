-- CreateTable
CREATE TABLE "Devotional" (
    "id" TEXT NOT NULL,
    "publishOn" DATE NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Devotional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevotionalRead" (
    "devotionalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reflection" TEXT,
    "reflectionStatus" "ModerationStatus",

    CONSTRAINT "DevotionalRead_pkey" PRIMARY KEY ("devotionalId","userId")
);

-- CreateTable
CREATE TABLE "PrayerRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "churchId" TEXT,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "answeredAt" TIMESTAMP(3),
    "answeredNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrayerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerIntercession" (
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrayerIntercession_pkey" PRIMARY KEY ("requestId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Devotional_publishOn_key" ON "Devotional"("publishOn");

-- CreateIndex
CREATE INDEX "DevotionalRead_devotionalId_reflectionStatus_idx" ON "DevotionalRead"("devotionalId", "reflectionStatus");

-- CreateIndex
CREATE INDEX "PrayerRequest_moderationStatus_createdAt_idx" ON "PrayerRequest"("moderationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "PrayerRequest_userId_createdAt_idx" ON "PrayerRequest"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "DevotionalRead" ADD CONSTRAINT "DevotionalRead_devotionalId_fkey" FOREIGN KEY ("devotionalId") REFERENCES "Devotional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevotionalRead" ADD CONSTRAINT "DevotionalRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerIntercession" ADD CONSTRAINT "PrayerIntercession_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrayerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerIntercession" ADD CONSTRAINT "PrayerIntercession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

