-- RF-NOT-02: quiet hours per member, in whole hours (America/Santo_Domingo).
CREATE TABLE "NotificationQuietHours" (
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "startHour" INTEGER NOT NULL DEFAULT 22,
    "endHour" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "NotificationQuietHours_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "NotificationQuietHours"
    ADD CONSTRAINT "NotificationQuietHours_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
