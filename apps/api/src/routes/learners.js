import { randomUUID } from "node:crypto";
import { Router } from "express";
import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabase.js";
import { getLearningThemes, toHttpError } from "../services/letrasDataService.js";

export const learnersRouter = Router();

function requireSupabase() {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    const err = new Error("Supabase nao configurado.");
    err.status = 503;
    throw err;
  }
  return supabaseAdmin;
}

function toProfileAsLearner(profile) {
  return {
    id: profile.id,
    displayName: profile.full_name ?? "",
    notes: profile.metadata?.notes ?? null,
    educatorId: profile.metadata?.educatorId ?? null,
    createdAt: profile.created_at ?? null,
    updatedAt: profile.updated_at ?? null,
  };
}

// GET /themes — lista todos os temas (usado no onboarding do educador)
learnersRouter.get("/themes-list", async (_req, res) => {
  try {
    const themes = await getLearningThemes();
    const mapped = (themes ?? []).map((t) => ({
      id: t.id,
      name: t.title ?? t.slug ?? "",
      description: t.description ?? null,
      createdAt: t.created_at ?? null,
      updatedAt: t.updated_at ?? null,
    }));
    return res.json(mapped);
  } catch (err) {
    const httpError = toHttpError(err);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});

// POST /learners — cria perfil de aluno mínimo (pelo app do educador)
learnersRouter.post("/", async (req, res) => {
  try {
    const client = requireSupabase();
    const { displayName, notes, educatorId } = req.body ?? {};

    if (!displayName || !String(displayName).trim()) {
      return res.status(400).json({ message: "displayName e obrigatorio." });
    }

    const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const fakeEmail = `aluno.${suffix}@mobile.letras.app`;
    const fakePassword = `Letras@${suffix}`;

    const { data: userData, error: authError } = await client.auth.admin.createUser({
      email: fakeEmail,
      password: fakePassword,
      email_confirm: true,
      user_metadata: { full_name: String(displayName).trim(), role: "alfabetizando" },
    });

    if (authError) {
      return res.status(400).json({ message: authError.message ?? "Falha ao criar aluno." });
    }

    const userId = userData?.user?.id;
    if (!userId) {
      return res.status(500).json({ message: "Falha ao obter usuario criado." });
    }

    const metadata = {
      email: fakeEmail,
      notes: notes ?? null,
      ...(educatorId ? { educatorId } : {}),
    };

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .update({
        full_name: String(displayName).trim(),
        role: "alfabetizando",
        metadata,
      })
      .eq("id", userId)
      .select("id, full_name, role, metadata, created_at, updated_at")
      .single();

    if (profileError) {
      await client.auth.admin.deleteUser(userId).catch(() => {});
      return res.status(500).json({ message: `Perfil nao criado: ${profileError.message}` });
    }

    // Cria vínculo se educatorId fornecido
    if (educatorId) {
      await client
        .from("tutor_student_links")
        .insert({
          id: randomUUID(),
          tutor_id: educatorId,
          student_id: userId,
          status: "confirmado",
          created_at: new Date().toISOString(),
        })
        .catch(() => {});
    }

    return res.status(201).json(toProfileAsLearner(profile));
  } catch (err) {
    const httpError = toHttpError(err);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});

// GET /learners/:learnerProfileId/themes — temas atribuídos ao aluno
learnersRouter.get("/:learnerProfileId/themes", async (req, res) => {
  try {
    const client = requireSupabase();
    const { learnerProfileId } = req.params;

    const { data: profile } = await client
      .from("profiles")
      .select("metadata")
      .eq("id", learnerProfileId)
      .maybeSingle();

    if (!profile) {
      return res.status(404).json({ message: "Aluno nao encontrado." });
    }

    const themeId = profile.metadata?.assignedThemeId ?? null;
    if (!themeId) {
      return res.json([]);
    }

    // Busca detalhes do tema
    const themes = await getLearningThemes();
    const theme = themes?.find((t) => t.id === themeId);

    if (!theme) {
      return res.json([]);
    }

    return res.json([{
      themeId: theme.id,
      assignedAt: profile.metadata?.themeAssignedAt ?? null,
      theme: {
        id: theme.id,
        name: theme.title ?? theme.slug ?? "",
        description: theme.description ?? null,
      },
    }]);
  } catch (err) {
    const httpError = toHttpError(err);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});

// POST /learners/:learnerProfileId/themes — atribui tema ao aluno
learnersRouter.post("/:learnerProfileId/themes", async (req, res) => {
  try {
    const client = requireSupabase();
    const { learnerProfileId } = req.params;
    const { themeId } = req.body ?? {};

    if (!themeId) {
      return res.status(400).json({ message: "themeId e obrigatorio." });
    }

    const { data: profile } = await client
      .from("profiles")
      .select("metadata")
      .eq("id", learnerProfileId)
      .maybeSingle();

    if (!profile) {
      return res.status(404).json({ message: "Aluno nao encontrado." });
    }

    const updatedMeta = {
      ...(profile.metadata ?? {}),
      assignedThemeId: themeId,
      themeAssignedAt: new Date().toISOString(),
    };

    const { error } = await client
      .from("profiles")
      .update({ metadata: updatedMeta })
      .eq("id", learnerProfileId);

    if (error) {
      return res.status(400).json({ message: error.message ?? "Falha ao atribuir tema." });
    }

    return res.json({ learnerProfileId, themeId });
  } catch (err) {
    const httpError = toHttpError(err);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});
