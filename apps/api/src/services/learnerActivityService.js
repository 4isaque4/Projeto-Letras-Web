import { isSupabaseConfigured, supabaseAdmin } from "../lib/supabase.js";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function requireRepository(repository) {
  if (repository) return repository;
  if (!isSupabaseConfigured || !supabaseAdmin) {
    throw httpError(503, "Supabase não configurado para gerenciar atividades.");
  }
  return createSupabaseLearnerActivityRepository(supabaseAdmin);
}

function normalizeRole(role) {
  const value = String(role ?? "").toLowerCase();
  if (value === "learner" || value === "student") return "alfabetizando";
  if (value === "educator") return "tutor";
  return value;
}

function assertCanReadStudent(actor, link, studentId) {
  if (!actor?.id) throw httpError(401, "Autenticação obrigatória.");
  const role = normalizeRole(actor.role);
  if (role === "admin") return;
  if (role === "alfabetizando" && actor.id === studentId) return;
  if (role === "tutor" && link?.tutorId === actor.id && link?.status === "confirmado") return;
  throw httpError(403, "Você não tem acesso às atividades deste alfabetizando.");
}

function assertCanManageLink(actor, link) {
  if (!actor?.id) throw httpError(401, "Autenticação obrigatória.");
  const role = normalizeRole(actor.role);
  if (role === "admin") return;
  if (role === "tutor" && link?.tutorId === actor.id && link?.status === "confirmado") return;
  throw httpError(403, "Você não pode alterar as atividades deste vínculo.");
}

function sortByOrder(left, right) {
  return Number(left.sortOrder ?? left.sequenceOrder ?? 0) - Number(right.sortOrder ?? right.sequenceOrder ?? 0);
}

export async function getLearnerActivityCatalog({ actor, studentId, repository } = {}) {
  if (!studentId) throw httpError(400, "studentId é obrigatório.");
  const repo = requireRepository(repository);
  const link = await repo.getActiveLinkByStudent(studentId);
  if (!link) throw httpError(404, "Vínculo ativo não encontrado.");
  assertCanReadStudent(actor, link, studentId);

  const access = await repo.listAccess({ linkId: link.id, studentId });
  const activityIds = access.map((row) => row.activityId);
  const [activities, progress, attemptCounts, scoreEvents] = await Promise.all([
    repo.listActivities({ ids: activityIds }),
    repo.listProgress({ studentId, activityIds }),
    repo.listAttemptCounts({ studentId, activityIds }),
    repo.listScoreEvents({ studentId, activityIds }),
  ]);
  const moduleIds = [...new Set(activities.map((row) => row.moduleId).filter(Boolean))];
  const modules = await repo.listModules({ ids: moduleIds });
  const themeIds = [...new Set(modules.map((row) => row.themeId).filter(Boolean))];
  const themes = await repo.listThemes({ ids: themeIds });

  const activityById = new Map(activities.map((row) => [row.id, row]));
  const progressByActivity = new Map(progress.map((row) => [row.activityId, row]));
  const attemptsByActivity = new Map(attemptCounts.map((row) => [row.activityId, Number(row.count) || 0]));
  const pointsByActivity = new Map();
  for (const event of scoreEvents) {
    pointsByActivity.set(event.activityId, (pointsByActivity.get(event.activityId) ?? 0) + Number(event.points || 0));
  }

  const lessonsByModule = new Map();
  for (const assignment of [...access].sort(sortByOrder)) {
    const activity = activityById.get(assignment.activityId);
    if (!activity) continue;
    const progressRow = progressByActivity.get(activity.id);
    const completed = progressRow?.status === "concluido" || Boolean(progressRow?.completedAt);
    const lesson = {
      id: activity.id,
      title: activity.title,
      instructions: activity.instructions ?? "",
      type: activity.type ?? null,
      sequenceOrder: assignment.sequenceOrder,
      isRequired: assignment.isRequired !== false,
      accessStatus: assignment.accessStatus,
      progressStatus: completed ? "completed" : progressRow?.status ?? "not_started",
      firstCompletedAt: progressRow?.completedAt ?? null,
      attemptCount: attemptsByActivity.get(activity.id) ?? 0,
      canReplay: completed,
      pointsAwarded: pointsByActivity.get(activity.id) ?? 0,
    };
    const list = lessonsByModule.get(activity.moduleId) ?? [];
    list.push(lesson);
    lessonsByModule.set(activity.moduleId, list);
  }

  const modulesByThemeAndStage = new Map();
  for (const module of [...modules].sort(sortByOrder)) {
    const lessons = lessonsByModule.get(module.id) ?? [];
    if (lessons.length === 0) continue;
    const key = `${module.themeId}:${module.stageNumber}`;
    const list = modulesByThemeAndStage.get(key) ?? [];
    list.push({ id: module.id, title: module.title, sortOrder: module.sortOrder ?? 0, lessons });
    modulesByThemeAndStage.set(key, list);
  }

  const resultThemes = [...themes].sort(sortByOrder).map((theme) => {
    const stageNumbers = [...new Set(modules.filter((module) => module.themeId === theme.id).map((module) => module.stageNumber))]
      .sort((a, b) => Number(a) - Number(b));
    const stages = stageNumbers
      .map((stageNumber) => {
        const stageModules = modulesByThemeAndStage.get(`${theme.id}:${stageNumber}`) ?? [];
        const requiredLessons = stageModules.flatMap((module) => module.lessons).filter((lesson) => lesson.isRequired);
        return {
          stageNumber,
          title: `Etapa ${stageNumber}`,
          completed: requiredLessons.length > 0 && requiredLessons.every((lesson) => lesson.progressStatus === "completed"),
          modules: stageModules,
        };
      })
      .filter((stage) => stage.modules.length > 0);
    return { id: theme.id, title: theme.title, stages };
  }).filter((theme) => theme.stages.length > 0);

  const requiredLessons = resultThemes.flatMap((theme) => theme.stages).flatMap((stage) => stage.modules)
    .flatMap((module) => module.lessons).filter((lesson) => lesson.isRequired);

  return {
    link: { id: link.id, tutorId: link.tutorId, studentId: link.studentId },
    studentId,
    stageCompleted: requiredLessons.length > 0 && requiredLessons.every((lesson) => lesson.progressStatus === "completed"),
    themes: resultThemes,
  };
}

export async function completeLearnerActivity({ actor, studentId, activityId, idempotencyKey, attempt = {}, repository } = {}) {
  if (!studentId || !activityId || !idempotencyKey) {
    throw httpError(400, "studentId, activityId e idempotencyKey são obrigatórios.");
  }
  const repo = requireRepository(repository);
  const link = await repo.getActiveLinkByStudent(studentId);
  if (!link) throw httpError(404, "Vínculo ativo não encontrado.");
  assertCanReadStudent(actor, link, studentId);
  return repo.completeAssignedActivity({
    studentId,
    activityId,
    idempotencyKey,
    score: attempt.score ?? null,
    elapsedSeconds: attempt.elapsedSeconds ?? null,
    metadata: attempt.metadata ?? {},
    sourcePlatform: attempt.sourcePlatform ?? "mobile",
  });
}

export async function setLearnerActivityAccess({ actor, linkId, changes, reason = "manual", repository } = {}) {
  if (!linkId || !Array.isArray(changes) || changes.length === 0) {
    throw httpError(400, "linkId e ao menos uma alteração são obrigatórios.");
  }
  for (const change of changes) {
    if (!change.activityId || !["locked", "available"].includes(change.accessStatus)) {
      throw httpError(400, "Cada alteração precisa de activityId e accessStatus válido.");
    }
  }
  const repo = requireRepository(repository);
  const link = await repo.getLink(linkId);
  if (!link) throw httpError(404, "Vínculo não encontrado.");
  assertCanManageLink(actor, link);
  const updated = await repo.updateAccess({ linkId, changes, changedBy: actor.id, reason });
  await repo.appendSyncEvent({
    sourcePlatform: "web",
    eventType: "content.access_updated",
    entityType: "tutor_student_link",
    entityId: linkId,
    payload: { studentId: link.studentId, changes, changedBy: actor.id, reason },
  });
  return { updated };
}

function mapLink(row) {
  return row ? { id: row.id, tutorId: row.tutor_id, studentId: row.student_id, status: row.status } : null;
}

async function queryData(query, message) {
  const { data, error } = await query;
  if (error) throw httpError(500, `${message}: ${error.message}`);
  return data ?? [];
}

export function createSupabaseLearnerActivityRepository(client) {
  return {
    async getActiveLinkByStudent(studentId) {
      const rows = await queryData(
        client.from("tutor_student_links").select("id,tutor_id,student_id,status").eq("student_id", studentId).eq("status", "confirmado").limit(1),
        "Falha ao consultar vínculo",
      );
      return mapLink(rows[0]);
    },
    async getLink(linkId) {
      const rows = await queryData(client.from("tutor_student_links").select("id,tutor_id,student_id,status").eq("id", linkId).limit(1), "Falha ao consultar vínculo");
      return mapLink(rows[0]);
    },
    async listAccess({ linkId }) {
      const rows = await queryData(client.from("learner_activity_access").select("*").eq("link_id", linkId).order("sequence_order"), "Falha ao listar acesso às atividades");
      return rows.map((row) => ({ linkId: row.link_id, studentId: row.student_id, activityId: row.activity_id, accessStatus: row.access_status, sequenceOrder: row.sequence_order, isRequired: row.is_required }));
    },
    async listActivities({ ids }) {
      if (ids.length === 0) return [];
      const rows = await queryData(client.from("learning_activities").select("id,module_id,title,instructions,type,sort_order").in("id", ids), "Falha ao listar aulas");
      return rows.map((row) => ({ id: row.id, moduleId: row.module_id, title: row.title, instructions: row.instructions, type: row.type, sortOrder: row.sort_order }));
    },
    async listModules({ ids }) {
      if (ids.length === 0) return [];
      const rows = await queryData(client.from("learning_modules").select("id,theme_id,title,stage_number,sort_order").in("id", ids), "Falha ao listar módulos");
      return rows.map((row) => ({ id: row.id, themeId: row.theme_id, title: row.title, stageNumber: row.stage_number, sortOrder: row.sort_order }));
    },
    async listThemes({ ids }) {
      if (ids.length === 0) return [];
      const rows = await queryData(client.from("learning_themes").select("id,title,sort_order").in("id", ids), "Falha ao listar temas");
      return rows.map((row) => ({ id: row.id, title: row.title, sortOrder: row.sort_order }));
    },
    async listProgress({ studentId, activityIds }) {
      if (activityIds.length === 0) return [];
      const rows = await queryData(client.from("activity_progress").select("activity_id,status,completed_at").eq("student_id", studentId).in("activity_id", activityIds), "Falha ao listar progresso");
      return rows.map((row) => ({ activityId: row.activity_id, status: row.status, completedAt: row.completed_at }));
    },
    async listAttemptCounts({ studentId, activityIds }) {
      if (activityIds.length === 0) return [];
      const rows = await queryData(client.from("activity_attempts").select("activity_id").eq("student_id", studentId).in("activity_id", activityIds), "Falha ao listar tentativas");
      const counts = new Map();
      for (const row of rows) counts.set(row.activity_id, (counts.get(row.activity_id) ?? 0) + 1);
      return [...counts].map(([activityId, count]) => ({ activityId, count }));
    },
    async listScoreEvents({ studentId, activityIds }) {
      if (activityIds.length === 0) return [];
      const rows = await queryData(client.from("learner_score_events").select("activity_id,points").eq("student_id", studentId).in("activity_id", activityIds), "Falha ao listar pontos");
      return rows.map((row) => ({ activityId: row.activity_id, points: row.points }));
    },
    async completeAssignedActivity(input) {
      const { data, error } = await client.rpc("complete_assigned_activity", {
        p_student_id: input.studentId,
        p_activity_id: input.activityId,
        p_idempotency_key: input.idempotencyKey,
        p_source_platform: input.sourcePlatform,
        p_score: input.score,
        p_elapsed_seconds: input.elapsedSeconds,
        p_metadata: input.metadata,
      });
      if (error) throw httpError(error.code === "42501" ? 403 : 500, `Falha ao concluir aula: ${error.message}`);
      return data;
    },
    async updateAccess({ linkId, changes, changedBy, reason }) {
      let updated = 0;
      for (const change of changes) {
        const now = new Date().toISOString();
        const patch = {
          access_status: change.accessStatus,
          changed_by: changedBy,
          change_reason: reason,
          available_at: change.accessStatus === "available" ? now : null,
          locked_at: change.accessStatus === "locked" ? now : null,
        };
        const rows = await queryData(client.from("learner_activity_access").update(patch).eq("link_id", linkId).eq("activity_id", change.activityId).select("id"), "Falha ao alterar acesso");
        updated += rows.length;
      }
      return updated;
    },
    async appendSyncEvent(event) {
      await queryData(client.from("sync_events").insert({ source_platform: event.sourcePlatform, event_type: event.eventType, entity_type: event.entityType, entity_id: event.entityId, payload: event.payload }).select("id"), "Falha ao registrar sincronização");
    },
  };
}
