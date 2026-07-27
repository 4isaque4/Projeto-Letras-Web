-- CreateEnum
CREATE TYPE "TutorLearnerLinkStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DENIED');

-- CreateEnum
CREATE TYPE "ContentAssetKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'SVG', 'OTHER');

-- CreateEnum
CREATE TYPE "MobileBlueprintStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SyncEntityType" AS ENUM ('TUTOR_LEARNER_LINK', 'THEME', 'LEARNING_UNIT', 'ACTIVITY', 'CONTENT_ASSET', 'MOBILE_BLUEPRINT', 'LEARNER_PROFILE', 'EDUCATOR');

-- CreateEnum
CREATE TYPE "SyncAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'IMPORTED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "LearnerProfile"
  ADD COLUMN "cpfOrPassport" TEXT,
  ADD COLUMN "phoneDigits" TEXT,
  ADD COLUMN "birthDate" TEXT,
  ADD COLUMN "uf" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "photoUri" TEXT;

-- AlterTable
ALTER TABLE "Activity"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "instructorGuidance" TEXT,
  ADD COLUMN "learnerGuidance" TEXT;

-- CreateTable
CREATE TABLE "TutorLearnerLink" (
    "id" TEXT NOT NULL,
    "educatorId" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "status" "TutorLearnerLinkStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "responseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorLearnerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAsset" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "kind" "ContentAssetKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "originalFileName" TEXT,
    "bytes" INTEGER,
    "durationSeconds" INTEGER,
    "checksum" TEXT,
    "createdByEducatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityAsset" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileBlueprint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stage" INTEGER,
    "screenType" TEXT NOT NULL,
    "layoutJson" JSONB NOT NULL,
    "previewImageUrl" TEXT,
    "status" "MobileBlueprintStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByEducatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintManifestImport" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT,
    "importedCount" INTEGER NOT NULL,
    "manifestJson" JSONB NOT NULL,
    "importedByEducatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlueprintManifestImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncEvent" (
    "id" TEXT NOT NULL,
    "entityType" "SyncEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "SyncAction" NOT NULL,
    "actorEducatorId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearnerProfile_cpfOrPassport_key" ON "LearnerProfile"("cpfOrPassport");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerProfile_phoneDigits_key" ON "LearnerProfile"("phoneDigits");

-- CreateIndex
CREATE INDEX "LearnerProfile_uf_city_idx" ON "LearnerProfile"("uf", "city");

-- CreateIndex
CREATE UNIQUE INDEX "TutorLearnerLink_educatorId_learnerProfileId_key" ON "TutorLearnerLink"("educatorId", "learnerProfileId");

-- CreateIndex
CREATE INDEX "TutorLearnerLink_status_requestedAt_idx" ON "TutorLearnerLink"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "TutorLearnerLink_learnerProfileId_idx" ON "TutorLearnerLink"("learnerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentAsset_key_key" ON "ContentAsset"("key");

-- CreateIndex
CREATE INDEX "ContentAsset_kind_createdAt_idx" ON "ContentAsset"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "ContentAsset_createdByEducatorId_idx" ON "ContentAsset"("createdByEducatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityAsset_activityId_assetId_key" ON "ActivityAsset"("activityId", "assetId");

-- CreateIndex
CREATE INDEX "ActivityAsset_assetId_idx" ON "ActivityAsset"("assetId");

-- CreateIndex
CREATE INDEX "MobileBlueprint_stage_status_idx" ON "MobileBlueprint"("stage", "status");

-- CreateIndex
CREATE INDEX "MobileBlueprint_createdAt_idx" ON "MobileBlueprint"("createdAt");

-- CreateIndex
CREATE INDEX "MobileBlueprint_createdByEducatorId_idx" ON "MobileBlueprint"("createdByEducatorId");

-- CreateIndex
CREATE INDEX "BlueprintManifestImport_createdAt_idx" ON "BlueprintManifestImport"("createdAt");

-- CreateIndex
CREATE INDEX "BlueprintManifestImport_importedByEducatorId_idx" ON "BlueprintManifestImport"("importedByEducatorId");

-- CreateIndex
CREATE INDEX "SyncEvent_entityType_entityId_idx" ON "SyncEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SyncEvent_createdAt_idx" ON "SyncEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SyncEvent_actorEducatorId_idx" ON "SyncEvent"("actorEducatorId");

-- AddForeignKey
ALTER TABLE "TutorLearnerLink" ADD CONSTRAINT "TutorLearnerLink_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "Educator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorLearnerLink" ADD CONSTRAINT "TutorLearnerLink_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAsset" ADD CONSTRAINT "ContentAsset_createdByEducatorId_fkey" FOREIGN KEY ("createdByEducatorId") REFERENCES "Educator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAsset" ADD CONSTRAINT "ActivityAsset_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAsset" ADD CONSTRAINT "ActivityAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ContentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileBlueprint" ADD CONSTRAINT "MobileBlueprint_createdByEducatorId_fkey" FOREIGN KEY ("createdByEducatorId") REFERENCES "Educator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintManifestImport" ADD CONSTRAINT "BlueprintManifestImport_importedByEducatorId_fkey" FOREIGN KEY ("importedByEducatorId") REFERENCES "Educator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_actorEducatorId_fkey" FOREIGN KEY ("actorEducatorId") REFERENCES "Educator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
