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

