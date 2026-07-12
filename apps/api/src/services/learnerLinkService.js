import { isSupabaseConfigured, supabaseAdmin } from "../lib/supabase.js";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function requireRepository(repository) {
  if (repository) return repository;
  if (!isSupabaseConfigured || !supabaseAdmin) throw httpError(503, "Supabase não configurado.");
  return createSupabaseLearnerLinkRepository(supabaseAdmin);
}

function validateMutation({ studentId, changedBy, reason, tutorId, requireTutor }) {
  if (!studentId || !changedBy || !String(reason ?? "").trim() || (requireTutor && !tutorId)) {
    throw httpError(400, requireTutor
      ? "studentId, tutorId, changedBy e reason são obrigatórios."
      : "studentId, changedBy e reason são obrigatórios.");
  }
}

export async function replaceLearnerLink({ studentId, tutorId, changedBy, reason, repository } = {}) {
  validateMutation({ studentId, tutorId, changedBy, reason, requireTutor: true });
  const repo = requireRepository(repository);
  const result = await repo.replaceActiveLink({ studentId, tutorId, changedBy, reason: String(reason).trim() });
  await repo.appendSyncEvent({
    sourcePlatform: "web",
    eventType: result.previous ? "link.transferred" : "link.created",
    entityType: "tutor_student_link",
    entityId: result.active.id,
    payload: { studentId, tutorId, previousLinkId: result.previous?.id ?? null, changedBy, reason },
  });
  return result;
}

export async function removeLearnerLink({ studentId, changedBy, reason, repository } = {}) {
  validateMutation({ studentId, changedBy, reason, requireTutor: false });
  const repo = requireRepository(repository);
  const ended = await repo.endActiveLink({ studentId, changedBy, reason: String(reason).trim() });
  if (!ended) throw httpError(404, "Vínculo ativo não encontrado.");
  await repo.appendSyncEvent({
    sourcePlatform: "web",
    eventType: "link.removed",
    entityType: "tutor_student_link",
    entityId: ended.id,
    payload: { studentId, tutorId: ended.tutorId, changedBy, reason },
  });
  return { ended };
}

function mapLink(row) {
  return row ? {
    id: row.id,
    tutorId: row.tutor_id,
    studentId: row.student_id,
    status: row.lifecycle_status === "ended" ? "encerrado" : row.status,
    reason: row.reason ?? null,
  } : null;
}

export function createSupabaseLearnerLinkRepository(client) {
  return {
    async replaceActiveLink(input) {
      const { data, error } = await client.rpc("replace_learner_link", {
        p_student_id: input.studentId,
        p_tutor_id: input.tutorId,
        p_changed_by: input.changedBy,
        p_reason: input.reason,
      });
      if (error) throw httpError(400, `Falha ao trocar vínculo: ${error.message}`);
      return { previous: mapLink(data?.previous), active: mapLink(data?.active) };
    },
    async endActiveLink(input) {
      const { data, error } = await client.rpc("end_learner_link", {
        p_student_id: input.studentId,
        p_changed_by: input.changedBy,
        p_reason: input.reason,
      });
      if (error) throw httpError(400, `Falha ao remover vínculo: ${error.message}`);
      return mapLink(data?.ended);
    },
    async appendSyncEvent(event) {
      const { error } = await client.from("sync_events").insert({
        source_platform: event.sourcePlatform,
        event_type: event.eventType,
        entity_type: event.entityType,
        entity_id: event.entityId,
        payload: event.payload,
      });
      if (error) throw httpError(500, `Falha ao registrar sincronização: ${error.message}`);
    },
  };
}
