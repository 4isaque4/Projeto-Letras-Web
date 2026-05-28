import { Router } from "express";
import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabase.js";

export const authRouter = Router();

function requireSupabase() {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    const err = new Error("Supabase nao configurado.");
    err.status = 503;
    throw err;
  }
  return supabaseAdmin;
}

function toEducatorProfile(profile, email) {
  return {
    id: profile.id,
    fullName: profile.full_name ?? "",
    email: email ?? profile.metadata?.email ?? null,
    cpf: profile.cpf ?? null,
    phoneDigits: profile.phone ?? null,
    birthDate: profile.metadata?.birthDate ?? null,
    uf: profile.metadata?.uf ?? null,
    city: profile.metadata?.city ?? null,
    photoUri: profile.metadata?.photoUri ?? null,
  };
}

// POST /auth/educators/login
authRouter.post("/educators/login", async (req, res) => {
  try {
    const client = requireSupabase();
    const identifier = String(req.body?.identifier ?? "").trim();
    const password = String(req.body?.password ?? "").trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: "Credenciais obrigatorias." });
    }

    let email = identifier.toLowerCase();

    // Se parece CPF, busca o email cadastrado no perfil
    if (!email.includes("@")) {
      const cpfDigits = identifier.replace(/\D/g, "");
      const { data: profiles } = await client
        .from("profiles")
        .select("id, full_name, phone, cpf, role, metadata")
        .eq("role", "tutor");

      const found = (profiles ?? []).find((p) => {
        const profileCpf = String(p.cpf ?? "").replace(/\D/g, "");
        return profileCpf.length > 0 && profileCpf === cpfDigits;
      });

      if (!found) {
        return res.status(401).json({ message: "Educador nao encontrado pelo CPF informado." });
      }

      email = found.metadata?.email ?? null;
      if (!email) {
        return res.status(401).json({ message: "Email nao cadastrado para este CPF." });
      }
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data?.session) {
      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    const { data: profile } = await client
      .from("profiles")
      .select("id, full_name, phone, cpf, role, metadata, created_at")
      .eq("id", data.user.id)
      .single();

    if (!profile || profile.role !== "tutor") {
      return res.status(403).json({ message: "Acesso restrito a alfabetizadores." });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return res.json({
      token: data.session.access_token,
      expiresAt,
      educator: toEducatorProfile(profile, data.user.email),
    });
  } catch (err) {
    return res.status(err.status ?? 500).json({ message: err.message ?? "Erro interno." });
  }
});

// GET /auth/educators/me
authRouter.get("/educators/me", async (req, res) => {
  try {
    const client = requireSupabase();
    const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return res.status(401).json({ message: "Token nao informado." });
    }

    const { data: { user }, error } = await client.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Sessao expirada ou invalida." });
    }

    const { data: profile } = await client
      .from("profiles")
      .select("id, full_name, phone, cpf, role, metadata")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "tutor") {
      return res.status(403).json({ message: "Acesso restrito." });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return res.json({
      expiresAt,
      educator: toEducatorProfile(profile, user.email),
    });
  } catch (err) {
    return res.status(err.status ?? 500).json({ message: err.message ?? "Erro interno." });
  }
});

// POST /auth/setup-admin — cria ou recria a conta admin@gmail.com no Supabase
authRouter.post("/setup-admin", async (req, res) => {
  try {
    const client = requireSupabase();
    const email = "admin@gmail.com";
    const password = "123456";

    // Remove conta existente se houver (ignora erro)
    const { data: list } = await client.auth.admin.listUsers({ perPage: 1000 });
    const existing = (list?.users ?? []).find((u) => u.email === email);
    if (existing) {
      await client.auth.admin.deleteUser(existing.id);
    }

    // Cria conta admin no Supabase Auth
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Admin", role: "admin" },
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // Garante entrada na tabela profiles
    await client.from("profiles").upsert({
      id: data.user.id,
      full_name: "Admin",
      role: "admin",
      metadata: { email },
    });

    return res.json({ ok: true, id: data.user.id, email });
  } catch (err) {
    return res.status(500).json({ message: err.message ?? "Erro interno." });
  }
});
