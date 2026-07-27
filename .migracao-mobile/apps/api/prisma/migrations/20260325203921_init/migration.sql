-- CreateEnum
CREATE TYPE "SessionRole" AS ENUM ('LEARNER', 'EDUCATOR');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('READING', 'WRITING', 'MATCHING', 'SPEAKING');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "Educator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Educator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerProfile" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "notes" TEXT,
    "educatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerTheme" (
    "learnerProfileId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnerTheme_pkey" PRIMARY KEY ("learnerProfileId","themeId")
);

-- CreateTable
CREATE TABLE "LearningUnit" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "learningUnitId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "content" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" "ActivityType" NOT NULL DEFAULT 'READING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerSession" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "role" "SessionRole" NOT NULL DEFAULT 'LEARNER',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionState" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "currentView" TEXT NOT NULL DEFAULT 'home',
    "currentActivityId" TEXT,
    "statePayload" JSONB,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Completion" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "status" "CompletionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" DOUBLE PRECISION,
    "elapsedSeconds" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Completion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Educator_email_key" ON "Educator"("email");

-- CreateIndex
CREATE INDEX "LearnerProfile_educatorId_idx" ON "LearnerProfile"("educatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_name_key" ON "Theme"("name");

-- CreateIndex
CREATE INDEX "LearnerTheme_themeId_idx" ON "LearnerTheme"("themeId");

-- CreateIndex
CREATE INDEX "LearningUnit_themeId_order_idx" ON "LearningUnit"("themeId", "order");

-- CreateIndex
CREATE INDEX "Activity_learningUnitId_order_idx" ON "Activity"("learningUnitId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerSession_learnerProfileId_key" ON "LearnerSession"("learnerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionState_sessionId_key" ON "SessionState"("sessionId");

-- CreateIndex
CREATE INDEX "Completion_activityId_idx" ON "Completion"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "Completion_learnerProfileId_activityId_key" ON "Completion"("learnerProfileId", "activityId");

-- AddForeignKey
ALTER TABLE "LearnerProfile" ADD CONSTRAINT "LearnerProfile_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "Educator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerTheme" ADD CONSTRAINT "LearnerTheme_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerTheme" ADD CONSTRAINT "LearnerTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningUnit" ADD CONSTRAINT "LearningUnit_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_learningUnitId_fkey" FOREIGN KEY ("learningUnitId") REFERENCES "LearningUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerSession" ADD CONSTRAINT "LearnerSession_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionState" ADD CONSTRAINT "SessionState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LearnerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
