import { Router } from "express";
import { supabaseAdmin, isSupabaseConfigured, createSupabaseAuthClient } from "../lib/supabase.js";

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
  const meta = profile.metadata ?? {};
  return {
    id: profile.id,
    fullName: profile.full_name ?? "",
    email: email ?? meta.email ?? null,
    cpf: profile.cpf ?? null,
    phoneDigits: profile.phone ?? null,
    birthDate: meta.birthDate ?? null,
    uf: meta.uf ?? null,
    city: meta.city ?? null,
    photoUri: meta.photoUri ?? null,
    educationLevel: meta.educationLevel ?? null,
    trainingArea: meta.trainingArea ?? null,
    linkedin: meta.linkedin ?? null,
    facebook: meta.facebook ?? null,
    instagram: meta.instagram ?? null,
    xHandle: meta.xHandle ?? null,
  };
}

// POST /auth/educators/login
// Suporta dois modos:
//   1. identifier (CPF ou email) + password → signInWithPassword via Supabase Auth
//   2. identifier (CPF) sem password        → passwordless: gera magic-link e verifica OTP
authRouter.post("/educators/login", async (req, res) => {
  try {
    const client = requireSupabase();
    const identifier = String(req.body?.identifier ?? "").trim();
    const password = String(req.body?.password ?? "").trim();

    if (!identifier) {
      return res.status(400).json({ message: "Credenciais obrigatorias." });
    }

    // ── Resolve email a partir do CPF ───────────────────────────────────────
    let email = identifier.toLowerCase();
    let profileFromCpf = null;

    if (!email.includes("@")) {
      const cpfDigits = identifier.replace(/\D/g, "");
      const { data: profiles } = await client
        .from("profiles")
        .select("id, full_name, phone, cpf, role, metadata")
        .eq("role", "tutor");

      profileFromCpf = (profiles ?? []).find((p) => {
        const profileCpf = String(p.cpf ?? "").replace(/\D/g, "");
        return profileCpf.length > 0 && profileCpf === cpfDigits;
      });

      if (!profileFromCpf) {
        return res.status(401).json({ message: "Educador nao encontrado pelo CPF informado." });
      }

      email = profileFromCpf.metadata?.email ?? null;
      if (!email) {
        return res.status(401).json({ message: "Email nao cadastrado para este CPF." });
      }
    }

    // ── Modo 1: com senha ───────────────────────────────────────────────────
    if (password) {
      // Cliente dedicado: nunca contaminar o supabaseAdmin com a sessao do usuario.
      const authClient = createSupabaseAuthClient();
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });

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
    }

    // ── Modo 2: passwordless via CPF (magic-link interno) ───────────────────
    const { data: linkData, error: linkError } = await client.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData?.properties?.email_otp) {
      return res.status(401).json({ message: "Nao foi possivel autenticar com este CPF." });
    }

    // Cliente dedicado: verifyOtp estabelece sessao e nao pode contaminar o admin.
    const authClient = createSupabaseAuthClient();
    const { data: otpData, error: otpError } = await authClient.auth.verifyOtp({
      email,
      token: linkData.properties.email_otp,
      type: "email",
    });

    if (otpError || !otpData?.session) {
      return res.status(401).json({ message: "Falha ao verificar identidade. Tente novamente." });
    }

    const profileRow = profileFromCpf ?? null;
    if (!profileRow || profileRow.role !== "tutor") {
      return res.status(403).json({ message: "Acesso restrito a alfabetizadores." });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return res.json({
      token: otpData.session.access_token,
      expiresAt,
      educator: toEducatorProfile(profileRow, email),
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

// POST /auth/educators/register
authRouter.post("/educators/register", async (req, res) => {
  try {
    const client = requireSupabase();
    const {
      fullName, email, password, cpf, phoneDigits, birthDate, uf, city, photoUri,
      educationLevel, trainingArea, linkedin, facebook, instagram, xHandle,
    } = req.body ?? {};

    if (!fullName || (!email && !cpf)) {
      return res.status(400).json({ message: "Nome completo e email ou CPF sao obrigatorios." });
    }

    const cpfDigits = cpf ? String(cpf).replace(/\D/g, "") : null;
    const resolvedEmail = email
      ? String(email).toLowerCase().trim()
      : `tutor.${cpfDigits}@letras.app`;

    // profiles.cpf tem unique constraint cobrindo todos os papeis na mesma
    // tabela, mas ela compara string exata — "06604997111" e
    // "066.049.971-11" contam como valores diferentes pro Postgres, entao um
    // .eq() ingenuo (e a propria constraint) deixam passar uma colisao real
    // quando os dois cadastros usam formatacao diferente (caso real
    // encontrado em producao). Por isso a comparacao busca todos os cpf
    // cadastrados e compara em digitos, mesmo padrao ja usado em GET
    // /cadastros/alfabetizandos/buscar. Checar antes evita tambem criar um
    // usuario em auth.users so pra descartar em seguida, e evita expor o
    // erro cru do Postgres.
    if (cpfDigits) {
      const { data: cpfCandidates } = await client
        .from("profiles")
        .select("id, role, cpf")
        .not("cpf", "is", null);
      const existingCpfProfile = (cpfCandidates ?? []).find(
        (candidate) => String(candidate.cpf ?? "").replace(/\D/g, "") === cpfDigits,
      );
      if (existingCpfProfile) {
        return res.status(409).json({
          message:
            existingCpfProfile.role === "tutor"
              ? "Ja existe um cadastro com este CPF."
              : `Este CPF ja esta cadastrado como ${existingCpfProfile.role}. Um mesmo CPF nao pode ter mais de um papel no sistema.`,
        });
      }
    }

    const { randomBytes } = await import("node:crypto");
    const resolvedPassword = password && String(password).trim().length >= 8
      ? String(password).trim()
      : randomBytes(16).toString("base64url");

    const { data: userData, error: authError } = await client.auth.admin.createUser({
      email: resolvedEmail,
      password: resolvedPassword,
      email_confirm: true,
      user_metadata: { full_name: String(fullName).trim(), role: "tutor" },
    });

    if (authError) {
      const msg = authError.message ?? "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
        return res.status(409).json({ message: "Email ja cadastrado." });
      }
      return res.status(400).json({ message: msg || "Falha ao criar conta." });
    }

    const userId = userData?.user?.id;
    if (!userId) {
      return res.status(500).json({ message: "Falha ao obter usuario criado." });
    }

    const metadata = {
      email: resolvedEmail,
      ...(birthDate ? { birthDate } : {}),
      ...(uf ? { uf } : {}),
      ...(city ? { city } : {}),
      ...(photoUri !== undefined ? { photoUri } : {}),
      ...(educationLevel ? { educationLevel } : {}),
      ...(trainingArea ? { trainingArea } : {}),
      ...(linkedin ? { linkedin } : {}),
      ...(facebook ? { facebook } : {}),
      ...(instagram ? { instagram } : {}),
      ...(xHandle ? { xHandle } : {}),
    };

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .update({
        full_name: String(fullName).trim(),
        phone: phoneDigits ?? null,
        cpf: cpfDigits,
        role: "tutor",
        metadata,
      })
      .eq("id", userId)
      .select("id, full_name, phone, cpf, role, metadata, created_at, updated_at")
      .single();

    if (profileError) {
      await client.auth.admin.deleteUser(userId).catch(() => {});
      return res.status(500).json({ message: `Perfil nao criado: ${profileError.message}` });
    }

    const { data: linkData } = await client.auth.admin.generateLink({ type: "magiclink", email: resolvedEmail });
    // Cliente dedicado: verifyOtp estabelece sessao e nao pode contaminar o admin.
    const authClient = createSupabaseAuthClient();
    const { data: otpData } = await authClient.auth.verifyOtp({
      email: resolvedEmail,
      token: linkData?.properties?.email_otp ?? "",
      type: "email",
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return res.status(201).json({
      token: otpData?.session?.access_token ?? "",
      expiresAt,
      educator: toEducatorProfile(profile, resolvedEmail),
    });
  } catch (err) {
    return res.status(err.status ?? 500).json({ message: err.message ?? "Erro interno." });
  }
});

// PATCH /auth/educators/profile
authRouter.patch("/educators/profile", async (req, res) => {
  try {
    const client = requireSupabase();
    const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return res.status(401).json({ message: "Token nao informado." });
    }

    const { data: { user }, error: userError } = await client.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ message: "Sessao expirada ou invalida." });
    }

    const { data: existing } = await client
      .from("profiles")
      .select("id, full_name, phone, cpf, role, metadata")
      .eq("id", user.id)
      .single();

    if (!existing || existing.role !== "tutor") {
      return res.status(403).json({ message: "Acesso restrito." });
    }

    const {
      fullName, cpf, phoneDigits, birthDate, uf, city, photoUri,
      educationLevel, trainingArea, linkedin, facebook, instagram, xHandle,
    } = req.body ?? {};

    const existingMeta = existing.metadata ?? {};
    const updatedMeta = {
      ...existingMeta,
      ...(birthDate !== undefined ? { birthDate } : {}),
      ...(uf !== undefined ? { uf } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(photoUri !== undefined ? { photoUri } : {}),
      ...(educationLevel !== undefined ? { educationLevel } : {}),
      ...(trainingArea !== undefined ? { trainingArea } : {}),
      ...(linkedin !== undefined ? { linkedin } : {}),
      ...(facebook !== undefined ? { facebook } : {}),
      ...(instagram !== undefined ? { instagram } : {}),
      ...(xHandle !== undefined ? { xHandle } : {}),
    };

    const updates = { metadata: updatedMeta };
    if (fullName) updates.full_name = String(fullName).trim();
    if (phoneDigits !== undefined) updates.phone = phoneDigits || null;
    if (cpf !== undefined) updates.cpf = cpf ? String(cpf).replace(/\D/g, "") : null;

    const { data: profile, error } = await client
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("id, full_name, phone, cpf, role, metadata")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message ?? "Falha ao atualizar perfil." });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return res.json({ expiresAt, educator: toEducatorProfile(profile, user.email) });
  } catch (err) {
    return res.status(err.status ?? 500).json({ message: err.message ?? "Erro interno." });
  }
});

// POST /auth/educators/logout
authRouter.post("/educators/logout", async (req, res) => {
  try {
    const client = requireSupabase();
    const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
    if (token) {
      await client.auth.admin.signOut(token).catch(() => {});
    }
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true });
  }
});
