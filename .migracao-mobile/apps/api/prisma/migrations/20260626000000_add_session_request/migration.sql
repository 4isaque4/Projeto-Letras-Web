-- CreateEnum
CREATE TYPE "SessionRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DENIED');

-- CreateTable
CREATE TABLE "LearnerSessionRequest" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "educatorId" TEXT NOT NULL,
    "status" "SessionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "denialReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "LearnerSessionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearnerSessionRequest_learnerProfileId_idx" ON "LearnerSessionRequest"("learnerProfileId");

-- CreateIndex
CREATE INDEX "LearnerSessionRequest_educatorId_status_idx" ON "LearnerSessionRequest"("educatorId", "status");

-- AddForeignKey
ALTER TABLE "LearnerSessionRequest" ADD CONSTRAINT "LearnerSessionRequest_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerSessionRequest" ADD CONSTRAINT "LearnerSessionRequest_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "Educator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
