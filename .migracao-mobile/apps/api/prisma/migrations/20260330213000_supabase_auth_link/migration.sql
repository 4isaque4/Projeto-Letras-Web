ALTER TABLE "Educator"
ADD COLUMN IF NOT EXISTS "supabaseAuthUserId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Educator_supabaseAuthUserId_key"
ON "Educator"("supabaseAuthUserId");
