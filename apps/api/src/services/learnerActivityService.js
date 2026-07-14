import { isSupabaseConfigured, supabaseAdmin } from "../lib/supabase.js";
import { reorderAssignments } from "../domain/activityOrdering.js";

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
  const moduleIds = [...new Set([
    ...activities.map((row) => row.moduleId),
    ...access.map((row) => row.assignedModuleId),
  ].filter(Boolean))];
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
      moduleId: assignment.assignedModuleId ?? activity.moduleId,
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
    const effectiveModuleId = assignment.assignedModuleId ?? activity.moduleId;
    const list = lessonsByModule.get(effectiveModuleId) ?? [];
    list.push(lesson);
    lessonsByModule.set(effectiveModuleId, list);
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

export async function reorderLearnerActivities({ actor, linkId, movement, repository } = {}) {
  if (!linkId || !movement?.activityId || !movement?.targetModuleId) {
    throw httpError(400, "Vínculo, aula e módulo de destino são obrigatórios.");
  }
  const repo = requireRepository(repository);
  const link = await repo.getLink(linkId);
  if (!link) throw httpError(404, "Vínculo não encontrado.");
  assertCanManageLink(actor, link);
  const current = await repo.listAccess({ linkId, studentId: link.studentId });
  const assignments = reorderAssignments(current, movement);
  await repo.replaceAssignmentOrder({ linkId, assignments, changedBy: actor.id });
  await repo.appendSyncEvent({
    sourcePlatform: "web",
    eventType: "content.assignment_reordered",
    entityType: "tutor_student_link",
    entityId: linkId,
    payload: { studentId: link.studentId, movement, changedBy: actor.id },
  });
  return { updated: assignments.length, assignments };
}

function compareGradeOrder(left, right) {
  return (
    Number(left.themeSortOrder ?? 0) - Number(right.themeSortOrder ?? 0) ||
    Number(left.stageNumber ?? 0) - Number(right.stageNumber ?? 0) ||
    Number(left.moduleSortOrder ?? 0) - Number(right.moduleSortOrder ?? 0) ||
    Number(left.activitySortOrder ?? 0) - Number(right.activitySortOrder ?? 0) ||
    String(left.activityId).localeCompare(String(right.activityId))
  );
}

function resolveLinkThemeId({ link, orderedGrade, progress }) {
  const themeIds = [...new Set(orderedGrade.map((row) => row.themeId).filter(Boolean))];
  if (link.themeId && themeIds.includes(link.themeId)) return link.themeId;

  const themeByActivity = new Map(
    orderedGrade.filter((row) => row.themeId).map((row) => [row.activityId, row.themeId]),
  );
  const progressCountByTheme = new Map();
  for (const row of progress) {
    const themeId = themeByActivity.get(row.activityId);
    if (themeId) progressCountByTheme.set(themeId, (progressCountByTheme.get(themeId) ?? 0) + 1);
  }
  if (progressCountByTheme.size > 0) {
    return themeIds.reduce((selected, themeId) => {
      if (!selected) return themeId;
      return (progressCountByTheme.get(themeId) ?? 0) > (progressCountByTheme.get(selected) ?? 0)
        ? themeId
        : selected;
    }, null);
  }

  return themeIds.length === 1 ? themeIds[0] : null;
}

// Reaplica a grade publicada do tema de cada alfabetizando (etapa → módulo →
// aula) aos vínculos ativos. Preserva o status de acesso e o progresso; para
// vínculos legados, recupera o tema pelo histórico antes de alterar a grade.
export async function syncLearnerAssignmentsWithGrade({ actor, repository } = {}) {
  if (!actor?.id) throw httpError(401, "Autenticação obrigatória.");
  if (normalizeRole(actor.role) !== "admin") {
    throw httpError(403, "Apenas administradores podem aplicar a grade comum.");
  }
  const repo = requireRepository(repository);
  const grade = await repo.listPublishedGradeActivities();
  const ordered = [...grade].sort(compareGradeOrder).map((row, index) => ({
    ...row,
    sequenceOrder: index + 1,
  }));
  const links = await repo.listActiveConfirmedLinks();

  let updatedLinks = 0;
  let unchangedLinks = 0;
  let unresolvedLinks = 0;
  for (const link of links) {
    const current = await repo.listAccess({ linkId: link.id, studentId: link.studentId });
    const currentByActivity = new Map(current.map((row) => [row.activityId, row]));
    const progress = await repo.listProgress({
      studentId: link.studentId,
      activityIds: ordered.map((row) => row.activityId),
    });
    const themeId = resolveLinkThemeId({ link, orderedGrade: ordered, progress });
    if (!themeId) {
      unresolvedLinks += 1;
      continue;
    }
    const themeGrade = ordered
      .filter((row) => row.themeId === themeId)
      .map((row, index) => ({ ...row, sequenceOrder: index + 1 }));
    const completedIds = new Set(
      progress
        .filter((row) => row.status === "concluido" || Boolean(row.completedAt))
        .map((row) => row.activityId),
    );

    const assignments = themeGrade.map((row) => {
      const existing = currentByActivity.get(row.activityId);
      const accessStatus = existing
        ? existing.accessStatus
        : completedIds.has(row.activityId) || row.sequenceOrder === 1
          ? "available"
          : "locked";
      return {
        activityId: row.activityId,
        assignedModuleId: row.moduleId,
        sequenceOrder: row.sequenceOrder,
        accessStatus,
        isRequired: existing ? existing.isRequired !== false : true,
      };
    });

    const unchanged =
      current.length === assignments.length &&
      assignments.every((assignment) => {
        const existing = currentByActivity.get(assignment.activityId);
        return (
          existing &&
          Number(existing.sequenceOrder) === assignment.sequenceOrder &&
          (existing.assignedModuleId ?? null) === (assignment.assignedModuleId ?? null) &&
          existing.accessStatus === assignment.accessStatus
        );
      });
    if (unchanged) {
      unchangedLinks += 1;
      continue;
    }

    await repo.replaceLinkAssignments({
      linkId: link.id,
      studentId: link.studentId,
      assignments,
      changedBy: actor.id,
    });
    updatedLinks += 1;
  }

  if (updatedLinks > 0) {
    await repo.appendSyncEvent({
      sourcePlatform: "web",
      eventType: "content.grade_synced",
      entityType: "learning_catalog",
      entityId: "common-grade",
      payload: {
        gradeSize: ordered.length,
        totalLinks: links.length,
        updatedLinks,
        unresolvedLinks,
        changedBy: actor.id,
      },
    });
  }
  return { gradeSize: ordered.length, totalLinks: links.length, updatedLinks, unchangedLinks, unresolvedLinks };
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
    async listActiveConfirmedLinks() {
      const rows = await queryData(
        client.from("tutor_student_links").select("id,tutor_id,student_id,status").eq("status", "confirmado").eq("lifecycle_status", "active"),
        "Falha ao listar vínculos ativos",
      );
      const studentIds = [...new Set(rows.map((row) => row.student_id).filter(Boolean))];
      const profiles = studentIds.length === 0
        ? []
        : await queryData(
            client.from("profiles").select("id,metadata").in("id", studentIds),
            "Falha ao consultar o tema dos alfabetizandos",
          );
      const themeByStudent = new Map(
        profiles.map((profile) => [profile.id, profile.metadata?.assignedThemeId ?? null]),
      );
      return rows.map((row) => ({ ...mapLink(row), themeId: themeByStudent.get(row.student_id) ?? null }));
    },
    async listPublishedGradeActivities() {
      const rows = await queryData(
        client
          .from("learning_activities")
          .select("id,module_id,sort_order,learning_modules!inner(id,theme_id,stage_number,sort_order,is_active,learning_themes!inner(id,sort_order,is_active))")
          .eq("is_published", true)
          .eq("learning_modules.is_active", true)
          .eq("learning_modules.learning_themes.is_active", true),
        "Falha ao listar a grade publicada",
      );
      return rows.map((row) => ({
        activityId: row.id,
        moduleId: row.module_id,
        themeId: row.learning_modules?.theme_id,
        activitySortOrder: row.sort_order,
        stageNumber: row.learning_modules?.stage_number,
        moduleSortOrder: row.learning_modules?.sort_order,
        themeSortOrder: row.learning_modules?.learning_themes?.sort_order,
      }));
    },
    async replaceLinkAssignments({ linkId, studentId, assignments, changedBy }) {
      await queryData(
        client.from("learner_activity_access").delete().eq("link_id", linkId).select("id"),
        "Falha ao limpar a grade do vínculo",
      );
      if (assignments.length === 0) return 0;
      const now = new Date().toISOString();
      const payload = assignments.map((assignment) => ({
        link_id: linkId,
        student_id: studentId,
        activity_id: assignment.activityId,
        assigned_module_id: assignment.assignedModuleId,
        access_status: assignment.accessStatus,
        sequence_order: assignment.sequenceOrder,
        is_required: assignment.isRequired !== false,
        available_at: assignment.accessStatus === "available" ? now : null,
        locked_at: assignment.accessStatus === "locked" ? now : null,
        changed_by: changedBy,
        change_reason: "Grade comum do tema aplicada pelo painel",
      }));
      const rows = await queryData(
        client.from("learner_activity_access").insert(payload).select("id"),
        "Falha ao aplicar a grade ao vínculo",
      );
      return rows.length;
    },
    async listAccess({ linkId }) {
      const rows = await queryData(client.from("learner_activity_access").select("*").eq("link_id", linkId).order("sequence_order"), "Falha ao listar acesso às atividades");
      return rows.map((row) => ({ linkId: row.link_id, studentId: row.student_id, activityId: row.activity_id, assignedModuleId: row.assigned_module_id, accessStatus: row.access_status, sequenceOrder: row.sequence_order, isRequired: row.is_required }));
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
    async replaceAssignmentOrder({ linkId, assignments, changedBy }) {
      const rows = assignments.map((row) => ({
        activityId: row.activityId,
        assignedModuleId: row.assignedModuleId,
        sequenceOrder: row.sequenceOrder,
      }));
      const { data, error } = await client.rpc("reorder_learner_activity_assignments", {
        p_link_id: linkId,
        p_assignments: rows,
        p_changed_by: changedBy,
      });
      if (error) throw httpError(400, `Falha ao reorganizar aulas: ${error.message}`);
      return data;
    },
    async appendSyncEvent(event) {
      await queryData(client.from("sync_events").insert({ source_platform: event.sourcePlatform, event_type: event.eventType, entity_type: event.entityType, entity_id: event.entityId, payload: event.payload }).select("id"), "Falha ao registrar sincronização");
    },
  };
}
