-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weeklyDigestOptOutAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CityWaitlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "CityWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchInvitation" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ChurchUserRole" NOT NULL DEFAULT 'EVENT_EDITOR',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,

    CONSTRAINT "ChurchInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "userHash" TEXT,
    "platform" TEXT,
    "props" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CityWaitlist_userId_key" ON "CityWaitlist"("userId");

-- CreateIndex
CREATE INDEX "CityWaitlist_city_notifiedAt_idx" ON "CityWaitlist"("city", "notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChurchInvitation_token_key" ON "ChurchInvitation"("token");

-- CreateIndex
CREATE INDEX "ChurchInvitation_churchId_acceptedAt_idx" ON "ChurchInvitation"("churchId", "acceptedAt");

-- CreateIndex
CREATE INDEX "ProductEvent_name_createdAt_idx" ON "ProductEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_anonymousId_createdAt_idx" ON "ProductEvent"("anonymousId", "createdAt");

-- AddForeignKey
ALTER TABLE "CityWaitlist" ADD CONSTRAINT "CityWaitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchInvitation" ADD CONSTRAINT "ChurchInvitation_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchInvitation" ADD CONSTRAINT "ChurchInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
