DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('HELP_REQUEST','AUTO_LOCK','POINTS_EARNED','SUPPORT_DEADLINE','MILESTONE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"         TEXT PRIMARY KEY,
  "educatorId" TEXT NOT NULL REFERENCES "Educator"("id") ON DELETE CASCADE,
  "learnerId"  TEXT,
  "type"       "NotificationType" NOT NULL,
  "title"      TEXT NOT NULL,
  "body"       TEXT,
  "deadlineAt" TIMESTAMP(3),
  "metadata"   JSONB,
  "readAt"     TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Notification_educatorId_createdAt_idx" ON "Notification" ("educatorId","createdAt");
CREATE INDEX IF NOT EXISTS "Notification_educatorId_readAt_idx" ON "Notification" ("educatorId","readAt");
