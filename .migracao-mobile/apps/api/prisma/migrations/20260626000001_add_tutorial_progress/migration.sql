-- Add tags column to ContentAsset
ALTER TABLE "ContentAsset" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "EducatorTutorialProgress" (
    "id" TEXT NOT NULL,
    "educatorId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "watchCount" INTEGER NOT NULL DEFAULT 0,
    "positionSec" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducatorTutorialProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EducatorTutorialProgress_educatorId_assetId_key" ON "EducatorTutorialProgress"("educatorId", "assetId");

-- CreateIndex
CREATE INDEX "EducatorTutorialProgress_educatorId_idx" ON "EducatorTutorialProgress"("educatorId");

-- CreateIndex
CREATE INDEX "EducatorTutorialProgress_assetId_idx" ON "EducatorTutorialProgress"("assetId");

-- AddForeignKey
ALTER TABLE "EducatorTutorialProgress" ADD CONSTRAINT "EducatorTutorialProgress_educatorId_fkey"
    FOREIGN KEY ("educatorId") REFERENCES "Educator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducatorTutorialProgress" ADD CONSTRAINT "EducatorTutorialProgress_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "ContentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
