import { Router } from "express";

import { supabaseAdmin } from "../lib/supabase.js";
import {
  completeLearnerActivity,
  getLearnerActivityCatalog,
  setLearnerActivityAccess,
  reorderLearnerActivities,
} from "../services/learnerActivityService.js";

async function defaultResolveActor(req) {
  const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  const learnerProfileId = String(req.headers["x-learner-profile-id"] ?? "").trim();
  if (!token && learnerProfileId) {
    return { id: learnerProfileId, role: "alfabetizando" };
  }
  if (!token || !supabaseAdmin) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,role")
    .eq("id", user.id)
    .limit(1);
  if (profileError || !profiles?.[0]) return null;
  return { id: profiles[0].id, role: profiles[0].role };
}

function sendError(res, error) {
  const status = Number(error?.status);
  res.status(Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500).json({
    message: error?.message ?? "Não foi possível processar a solicitação.",
  });
}

export function createLearnerActivitiesRouter({
  resolveActor = defaultResolveActor,
  getCatalog = getLearnerActivityCatalog,
  completeActivity = completeLearnerActivity,
  setAccess = setLearnerActivityAccess,
  reorderActivities = reorderLearnerActivities,
} = {}) {
  const router = Router();

  router.use(async (req, res, next) => {
    try {
      const actor = await resolveActor(req);
      if (!actor) {
        res.status(401).json({ message: "Autenticação obrigatória." });
        return;
      }
      req.actor = actor;
      next();
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/catalog", async (req, res) => {
    try {
      const studentId = String(req.query.studentId ?? "").trim();
      if (!studentId) return res.status(400).json({ message: "studentId é obrigatório." });
      return res.json(await getCatalog({ actor: req.actor, studentId }));
    } catch (error) {
      return sendError(res, error);
    }
  });

  router.post("/:activityId/complete", async (req, res) => {
    try {
      const studentId = String(req.body?.studentId ?? "").trim();
      const activityId = String(req.params.activityId ?? "").trim();
      const idempotencyKey = String(req.headers["idempotency-key"] ?? req.body?.idempotencyKey ?? "").trim();
      if (!studentId || !activityId || !idempotencyKey) {
        return res.status(400).json({ message: "studentId, activityId e Idempotency-Key são obrigatórios." });
      }
      return res.json(await completeActivity({
        actor: req.actor,
        studentId,
        activityId,
        idempotencyKey,
        attempt: {
          score: req.body?.score,
          elapsedSeconds: req.body?.elapsedSeconds,
          metadata: req.body?.metadata,
          sourcePlatform: req.body?.sourcePlatform ?? "mobile",
        },
      }));
    } catch (error) {
      return sendError(res, error);
    }
  });

  router.patch("/access", async (req, res) => {
    try {
      const linkId = String(req.body?.linkId ?? "").trim();
      const changes = req.body?.changes;
      if (!linkId || !Array.isArray(changes) || changes.length === 0) {
        return res.status(400).json({ message: "linkId e ao menos uma alteração são obrigatórios." });
      }
      return res.json(await setAccess({
        actor: req.actor,
        linkId,
        changes,
        reason: String(req.body?.reason ?? "manual"),
      }));
    } catch (error) {
      return sendError(res, error);
    }
  });

  router.post("/reorder", async (req, res) => {
    try {
      const linkId = String(req.body?.linkId ?? "").trim();
      if (!linkId) return res.status(400).json({ message: "Vínculo obrigatório." });
      return res.json(await reorderActivities({
        actor: req.actor,
        linkId,
        movement: {
          activityId: String(req.body?.activityId ?? "").trim(),
          targetModuleId: String(req.body?.targetModuleId ?? "").trim(),
          targetIndex: Number(req.body?.targetIndex ?? 0),
          confirmedCrossGroup: req.body?.confirmedCrossGroup === true,
        },
      }));
    } catch (error) {
      return sendError(res, error);
    }
  });

  return router;
}

export const learnerActivitiesRouter = createLearnerActivitiesRouter();
