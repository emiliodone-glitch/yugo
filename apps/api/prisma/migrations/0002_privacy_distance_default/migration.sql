-- RF-SEG-07: distance ranges are an opt-in privacy control, so new profiles
-- show the exact distance (as in the reference mockups) until the member
-- turns the setting on.
ALTER TABLE "Profile" ALTER COLUMN "hideExactDistance" SET DEFAULT false;
