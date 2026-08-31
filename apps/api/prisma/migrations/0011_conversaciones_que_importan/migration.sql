-- CreateTable
CREATE TABLE "StageQuestionAnswer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageQuestionAnswer_matchId_questionId_idx" ON "StageQuestionAnswer"("matchId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "StageQuestionAnswer_matchId_userId_questionId_key" ON "StageQuestionAnswer"("matchId", "userId", "questionId");

-- AddForeignKey
ALTER TABLE "StageQuestionAnswer" ADD CONSTRAINT "StageQuestionAnswer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageQuestionAnswer" ADD CONSTRAINT "StageQuestionAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

