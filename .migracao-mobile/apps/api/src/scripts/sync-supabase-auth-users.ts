import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { SupabaseAuthService } from '../common/supabase/supabase-auth.service';

function loadLocalEnvFile(): void {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const delimiterIndex = line.indexOf('=');
    if (delimiterIndex <= 0) {
      continue;
    }

    const key = line.slice(0, delimiterIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(delimiterIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function isUserAlreadyExistsError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('already') ||
    normalized.includes('exists') ||
    normalized.includes('duplicate') ||
    normalized.includes('registered')
  );
}

async function main() {
  loadLocalEnvFile();

  const prisma = new PrismaClient();
  const supabaseAuthService = new SupabaseAuthService();
  supabaseAuthService.ensureConfigured();

  const pendingEducators = await prisma.educator.findMany({
    where: {
      supabaseAuthUserId: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`[sync] Educators pending: ${pendingEducators.length}`);

  let linkedCount = 0;
  let createdSupabaseUsersCount = 0;
  let skippedNoEmailCount = 0;
  const failed: Array<{ educatorId: string; email: string | null; reason: string }> = [];

  for (const educator of pendingEducators) {
    const email = educator.email?.trim().toLowerCase() ?? null;
    if (!email) {
      skippedNoEmailCount += 1;
      console.log(`[skip] educator=${educator.id} reason=no-email`);
      continue;
    }

    try {
      let supabaseUserId = await supabaseAuthService.findUserIdByEmail(email);
      let createdNow = false;

      if (!supabaseUserId) {
        const generatedPassword = `sync_${randomBytes(24).toString('hex')}`;
        try {
          const created = await supabaseAuthService.createUser(email, generatedPassword, educator.name);
          supabaseUserId = created.id;
          createdNow = true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown-supabase-error';
          if (isUserAlreadyExistsError(message)) {
            supabaseUserId = await supabaseAuthService.findUserIdByEmail(email);
          } else {
            throw error;
          }
        }
      }

      if (!supabaseUserId) {
        throw new Error('user-not-found-after-create-attempt');
      }

      await prisma.educator.update({
        where: { id: educator.id },
        data: { supabaseAuthUserId: supabaseUserId },
      });

      linkedCount += 1;
      if (createdNow) {
        createdSupabaseUsersCount += 1;
      }

      console.log(
        `[ok] educator=${educator.id} email=${email} linked=${supabaseUserId} created_now=${createdNow}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown-error';
      failed.push({
        educatorId: educator.id,
        email,
        reason,
      });
      console.log(`[fail] educator=${educator.id} email=${email} reason=${reason}`);
    }
  }

  console.log('[sync] Summary');
  console.log(`  linked: ${linkedCount}`);
  console.log(`  created_in_auth_users: ${createdSupabaseUsersCount}`);
  console.log(`  skipped_no_email: ${skippedNoEmailCount}`);
  console.log(`  failed: ${failed.length}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[sync] Fatal error: ${message}`);
  process.exitCode = 1;
});
