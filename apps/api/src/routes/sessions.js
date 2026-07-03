import { randomUUID } from "node:crypto";
import { Router } from "express";
import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabase.js";
import {
  getMobileLearnerSessionState,
  setMobileLearnerSessionLockState,
  toHttpError,
} from "../services/letrasDataService.js";
import { emitLearnerLockChanged } from "../realtime/dashboardRealtime.js";

export const sessionsRouter = Router();

export function normalizeLearnerSessionRole(role) {
  const normalized = String(role ?? "").trim().toUpperCase();
  if (normalized === "EDUCATOR" || normalized === "TUTOR" || normalized === "ALFABETIZADOR") {
    return "EDUCATOR";
  }
  return "LEARNER";
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    const err = new Error("Supabase nao configurado.");
    err.status = 503;
    throw err;
  }
  return supabaseAdmin;
}

// POST /sessions — cria ou atualiza sessão do aluno no mobile
sessionsRouter.post("/", async (req, res) => {
  try {
    const client = requireSupabase();
    const { learnerProfileId, deviceId, role } = req.body ?? {};
    const sessionRole = normalizeLearnerSessionRole(role);

    if (!learnerProfileId || !deviceId) {
      return res.status(400).json({ message: "learnerProfileId e deviceId sao obrigatorios." });
    }

    // Verifica sessão existente
    const { data: existing } = await client
      .from("LearnerSession")
      .select("id, learnerProfileId, deviceId, connectedAt, createdAt, updatedAt")
      .eq("learnerProfileId", learnerProfileId)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      // Atualiza lastSeen
      const { data: updated } = await client
        .from("LearnerSession")
        .update({ deviceId, role: sessionRole, updatedAt: new Date().toISOString() })
        .eq("id", existing.id)
        .select("id, learnerProfileId, deviceId, connectedAt, createdAt, updatedAt")
        .single();
      return res.json(updated ?? existing);
    }

    // Cria nova sessão
    const now = new Date().toISOString();
    const { data: created, error } = await client
      .from("LearnerSession")
      .insert({
        id: randomUUID(),
        learnerProfileId,
        deviceId,
        role: sessionRole,
        connectedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .select("id, learnerProfileId, deviceId, connectedAt, createdAt, updatedAt")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message ?? "Falha ao criar sessao." });
    }

    return res.status(201).json(created);
  } catch (err) {
    const httpError = toHttpError(err);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});

// GET /sessions/:learnerProfileId — retorna estado da sessão + sessionState
sessionsRouter.get("/:learnerProfileId", async (req, res) => {
  try {
    const { learnerProfileId } = req.params;
    const data = await getMobileLearnerSessionState(learnerProfileId);
    if (!data) {
      return res.status(404).json({ message: "Sessao nao encontrada." });
    }
    return res.json(data);
  } catch (err) {
    const httpError = toHttpError(err);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});

// PATCH /sessions/:learnerProfileId/state — atualiza currentView, currentActivityId, statePayload
sessionsRouter.patch("/:learnerProfileId/state", async (req, res) => {
  try {
    const client = requireSupabase();
    const { learnerProfileId } = req.params;
    const { currentView, currentActivityId, statePayload } = req.body ?? {};

    if (!learnerProfileId) {
      return res.status(400).json({ message: "learnerProfileId obrigatorio." });
    }

    // Busca sessão
    const { data: session } = await client
      .from("LearnerSession")
      .select("id")
      .eq("learnerProfileId", learnerProfileId)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session?.id) {
      return res.status(404).json({ message: "Sessao nao encontrada." });
    }

    // Busca estado existente
    const { data: existingState } = await client
      .from("SessionState")
      .select("id")
      .eq("sessionId", session.id)
      .maybeSingle();

    const now = new Date().toISOString();
    const updates = {
      updatedAt: now,
      ...(currentView !== undefined ? { currentView } : {}),
      ...(currentActivityId !== undefined ? { currentActivityId } : {}),
      ...(statePayload !== undefined ? { statePayload } : {}),
    };

    let result;
    if (existingState?.id) {
      const { data } = await client
        .from("SessionState")
        .update(updates)
        .eq("id", existingState.id)
        .select("id, sessionId, currentView, currentActivityId, statePayload, isLocked, createdAt, updatedAt")
        .single();
      result = data;
    } else {
      const { data } = await client
        .from("SessionState")
        .insert({
          id: randomUUID(),
          sessionId: session.id,
          currentView: currentView ?? "home",
          currentActivityId: currentActivityId ?? null,
          statePayload: statePayload ?? {},
          isLocked: false,
          createdAt: now,
          updatedAt: now,
        })
        .select("id, sessionId, currentView, currentActivityId, statePayload, isLocked, createdAt, updatedAt")
        .single();
      result = data;
    }

    return res.json(result ?? {});
  } catch (err) {
    const httpError = toHttpError(err);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});

// PUT /sessions/:learnerProfileId/lock — bloqueia ou desbloqueia sessão
sessionsRouter.put("/:learnerProfileId/lock", async (req, res) => {
  try {
    const { learnerProfileId } = req.params;
    const isLocked = Boolean(req.body?.isLocked);

    if (!learnerProfileId) {
      return res.status(400).json({ message: "learnerProfileId obrigatorio." });
    }

    await setMobileLearnerSessionLockState(learnerProfileId, isLocked);
    emitLearnerLockChanged(learnerProfileId, isLocked);

    return res.json({ learnerProfileId, isLocked });
  } catch (err) {
    const httpError = toHttpError(err);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});
