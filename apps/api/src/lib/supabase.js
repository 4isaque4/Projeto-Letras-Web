import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export const isSupabaseConfigured =
  Boolean(env.supabaseUrl) && Boolean(env.supabaseServiceRoleKey);

export const supabaseAdmin = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// Cliente dedicado aos fluxos que estabelecem sessao de usuario
// (signInWithPassword / verifyOtp). PRECISA ser separado do supabaseAdmin:
// logar um usuario grava a sessao na memoria do cliente, e o supabase-js passa
// a enviar o access_token do usuario (role "authenticated") no Authorization de
// TODAS as chamadas seguintes, sobrepondo a service_role key. Isso quebra as
// escritas protegidas por RLS (ex.: insert em learning_activities exige admin).
// Um cliente novo por request evita vazamento de sessao entre requisicoes.
export function createSupabaseAuthClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

