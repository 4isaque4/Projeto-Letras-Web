import type { Page } from "@playwright/test";

const SUPABASE_PROJECT_REF = "wfyjprjjhmcejovfozug";
const STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

const ADMIN_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "admin.e2e@letras.test",
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"], role: "admin" },
  user_metadata: { full_name: "Admin E2E", role: "admin" },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

/**
 * Cria uma sessao somente no navegador e intercepta a consulta de usuario do
 * Supabase. Nenhuma credencial e usada e nenhum login chega ao ambiente real.
 */
export async function autenticarAdminSemBackend(page: Page) {
  const session = {
    access_token: "token-e2e-sem-valor-real",
    refresh_token: "refresh-e2e-sem-valor-real",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: ADMIN_USER,
  };

  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: session },
  );

  await page.route("**/auth/v1/user", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", json: ADMIN_USER });
  });
}
