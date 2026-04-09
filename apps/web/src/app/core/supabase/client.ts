import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

const hasSupabaseCredentials = Boolean(env.supabaseUrl) && Boolean(env.supabaseAnonKey);

export const isSupabaseConfigured = hasSupabaseCredentials;

export const supabaseClient = hasSupabaseCredentials
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
