-- AlterTable
ALTER TABLE "Educator"
ADD COLUMN "birthDate" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "cpf" TEXT,
ADD COLUMN "educationLevel" TEXT,
ADD COLUMN "facebook" TEXT,
ADD COLUMN "instagram" TEXT,
ADD COLUMN "linkedin" TEXT,
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "phoneDigits" TEXT,
ADD COLUMN "photoUri" TEXT,
ADD COLUMN "trainingArea" TEXT,
ADD COLUMN "uf" TEXT,
ADD COLUMN "xHandle" TEXT;

-- CreateTable
CREATE TABLE "EducatorAuthSession" (
    "id" TEXT NOT NULL,
    "educatorId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducatorAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Educator_cpf_key" ON "Educator"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "EducatorAuthSession_token_key" ON "EducatorAuthSession"("token");

-- CreateIndex
CREATE INDEX "EducatorAuthSession_educatorId_idx" ON "EducatorAuthSession"("educatorId");

-- CreateIndex
CREATE INDEX "EducatorAuthSession_expiresAt_idx" ON "EducatorAuthSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "EducatorAuthSession" ADD CONSTRAINT "EducatorAuthSession_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "Educator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
