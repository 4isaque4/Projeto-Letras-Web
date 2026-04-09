import type { User } from "@supabase/supabase-js";
import { env } from "../config/env";
import { isSupabaseConfigured, supabaseClient } from "../supabase/client";
import { AuthProvider, AuthUser, UserRole } from "./contracts";

function getProvider(): AuthProvider {
  return "supabase";
}

function parseRole(input: unknown, email: string): UserRole {
  if (typeof input === "string") {
    if (input === "admin" || input === "tutor" || input === "alfabetizando") {
      return input;
    }
  }

  const normalizedEmail = email.toLowerCase();
  if (normalizedEmail.includes("tutor")) {
    return "tutor";
  }
  if (normalizedEmail.includes("aluno") || normalizedEmail.includes("student")) {
    return "alfabetizando";
  }

  return "admin";
}

function mapSupabaseUser(user: User): AuthUser {
  const email = user.email ?? "";
  const metadataName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    (email ? email.split("@")[0] : "Usuario");

  const metadataRole =
    user.user_metadata?.role ?? user.app_metadata?.role ?? user.user_metadata?.user_role;

  return {
    id: user.id,
    email,
    name: metadataName,
    role: parseRole(metadataRole, email),
  };
}

export function getAuthProvider() {
  return getProvider();
}

export function getAuthWarnings() {
  const warnings: string[] = [];

  if (!env.useSupabaseAuth) {
    warnings.push("VITE_USE_SUPABASE_AUTH esta false. O login web exige Supabase.");
  }

  if (!isSupabaseConfigured) {
    warnings.push("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no apps/web/.env.");
  }

  return warnings;
}

export async function getCurrentAuthUser() {
  if (!supabaseClient) {
    return null;
  }

  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return mapSupabaseUser(data.user);
}

export async function signInWithEmailPassword(email: string, password: string) {
  if (!supabaseClient) {
    throw new Error("Supabase nao configurado no ambiente.");
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Nao foi possivel carregar o usuario autenticado.");
  }

  return mapSupabaseUser(data.user);
}

export async function signOut() {
  if (!supabaseClient) {
    return;
  }

  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeAuthState(listener: (user: AuthUser | null) => void) {
  if (!supabaseClient) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabaseClient.auth.onAuthStateChange((_event, session) => {
    listener(session?.user ? mapSupabaseUser(session.user) : null);
  });

  return () => {
    subscription.unsubscribe();
  };
}
