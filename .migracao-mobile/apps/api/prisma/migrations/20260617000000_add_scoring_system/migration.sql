-- CreateEnum
CREATE TYPE "EducatorScoreEventType" AS ENUM ('STAGE_COMPLETE', 'ADVANCE_BONUS_1H', 'ADVANCE_BONUS_24H', 'ADVANCE_BONUS_3D', 'INACTIVITY_PENALTY');

-- AlterTable Educator: add totalScore
ALTER TABLE "Educator" ADD COLUMN "totalScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable SessionState: add helpRequestedAt
ALTER TABLE "SessionState" ADD COLUMN "helpRequestedAt" TIMESTAMP(3);

-- CreateTable EducatorScoreEvent
CREATE TABLE "EducatorScoreEvent" (
    "id" TEXT NOT NULL,
    "educatorId" TEXT NOT NULL,
    "learnerId" TEXT,
    "type" "EducatorScoreEventType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducatorScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EducatorScoreEvent_educatorId_createdAt_idx" ON "EducatorScoreEvent"("educatorId", "createdAt");

-- CreateIndex
CREATE INDEX "EducatorScoreEvent_learnerId_idx" ON "EducatorScoreEvent"("learnerId");

-- AddForeignKey
ALTER TABLE "EducatorScoreEvent" ADD CONSTRAINT "EducatorScoreEvent_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "Educator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
