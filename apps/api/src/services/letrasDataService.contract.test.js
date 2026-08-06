import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  __setSupabaseAdminForTests,
  computeLearnerStageStatus,
  createSupportRequest,
  deleteProfileRecord,
  updateActivityProgressStatus,
  upsertActivityProgressFromMobile,
} from "./letrasDataService.js";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const ACTIVITY_ID = "22222222-2222-4222-8222-222222222222";
const TUTOR_ID = "33333333-3333-4333-8333-333333333333";

// Cenário de currículo por etapa (tema A com Etapa 1 e Etapa 2; tema B com uma
// Etapa 1 própria — usado para provar o escopo por tema do gate e do crédito).
const THEME_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const THEME_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STAGE_A1 = "a1a1a1a1-1111-4111-8111-111111111111";
const STAGE_A2 = "a2a2a2a2-2222-4222-8222-222222222222";
const MODULE_A1 = "m1111111-1111-4111-8111-111111111111";
const MODULE_A2 = "m2222222-2222-4222-8222-222222222222";
const MODULE_B1 = "mb111111-1111-4111-8111-111111111111";
const ACT_A1a = "c1111111-1111-4111-8111-111111111111";
const ACT_A1b = "c1222222-2222-4222-8222-222222222222";
const ACT_A2a = "c2111111-1111-4111-8111-111111111111";
const ACT_B1a = "cb111111-1111-4111-8111-111111111111";

function createCurriculumSeed(overrides = {}) {
  return {
    tutor_student_links: [
      {
        id: "link-1",
        student_id: STUDENT_ID,
        tutor_id: TUTOR_ID,
        status: "confirmado",
        updated_at: "2026-05-14T10:00:00.000Z",
      },
    ],
    learning_stages: [
      { id: STAGE_A1, theme_id: THEME_A, stage_number: 1, title: "Etapa 1", sort_order: 0, is_active: true },
      { id: STAGE_A2, theme_id: THEME_A, stage_number: 2, title: "Etapa 2", sort_order: 1, is_active: true },
    ],
    learning_modules: [
      { id: MODULE_A1, theme_id: THEME_A, stage_id: STAGE_A1, stage_number: 1, is_active: true },
      { id: MODULE_A2, theme_id: THEME_A, stage_id: STAGE_A2, stage_number: 2, is_active: true },
      { id: MODULE_B1, theme_id: THEME_B, stage_id: null, stage_number: 1, is_active: true },
    ],
    learning_activities: [
      { id: ACT_A1a, module_id: MODULE_A1, is_published: true },
      { id: ACT_A1b, module_id: MODULE_A1, is_published: true },
      { id: ACT_A2a, module_id: MODULE_A2, is_published: true },
      { id: ACT_B1a, module_id: MODULE_B1, is_published: true },
    ],
    ...overrides,
  };
}

afterEach(() => {
  __setSupabaseAdminForTests(null);
});

describe("mobile-web support and lock contracts", () => {
  it("creates a durable support request, notification and sync event from mobile", async () => {
    const supabase = new FakeSupabase({
      tutor_student_links: [
        {
          id: "link-1",
          student_id: STUDENT_ID,
          tutor_id: TUTOR_ID,
          status: "confirmado",
          updated_at: "2026-05-14T10:00:00.000Z",
        },
      ],
    });
    __setSupabaseAdminForTests(supabase);

    const result = await createSupportRequest({
      learnerProfileId: STUDENT_ID,
      activityId: ACTIVITY_ID,
      currentView: "lesson-screen",
      currentActivityId: "screen-1",
      sourcePlatform: "mobile",
      metadata: { attempts: 3 },
    });

    assert.equal(result.duplicated, false);
    assert.equal(result.request.student_id, STUDENT_ID);
    assert.equal(result.request.tutor_id, TUTOR_ID);
    assert.equal(result.request.status, "aberto");
    assert.equal(result.request.priority, "alta");
    assert.equal(result.request.message, "Preciso de ajuda para continuar.");

    assert.equal(supabase.rows("support_requests").length, 1);
    assert.equal(supabase.rows("educator_notifications").length, 1);
    assert.equal(supabase.rows("educator_notifications")[0].type, "support_request");
    assert.equal(supabase.rows("sync_events").at(-1).event_type, "support.created");
  });

  it("deduplicates open support requests for the same student and activity", async () => {
    const supabase = new FakeSupabase({
      support_requests: [
        {
          id: "support-1",
          student_id: STUDENT_ID,
          tutor_id: TUTOR_ID,
          activity_id: ACTIVITY_ID,
          current_view: "lesson-screen",
          current_activity_id: "screen-1",
          message: "Ja pedi ajuda.",
          status: "aberto",
          priority: "alta",
          source_platform: "mobile",
          requested_at: "2026-05-14T10:00:00.000Z",
        },
      ],
    });
    __setSupabaseAdminForTests(supabase);

    const result = await createSupportRequest({
      learnerProfileId: STUDENT_ID,
      activityId: ACTIVITY_ID,
      currentView: "lesson-screen",
      currentActivityId: "screen-1",
      message: "Novo clique em ajuda.",
    });

    assert.equal(result.duplicated, true);
    assert.equal(result.request.id, "support-1");
    assert.equal(supabase.rows("support_requests").length, 1);
    assert.equal(supabase.rows("educator_notifications").length, 0);
  });

  it("locks the mobile session when mobile progress is sent as LOCKED", async () => {
    const supabase = createProgressSupabase();
    __setSupabaseAdminForTests(supabase);

    const result = await upsertActivityProgressFromMobile({
      learnerProfileId: STUDENT_ID,
      activityId: ACTIVITY_ID,
      status: "LOCKED",
      elapsedSeconds: 42,
      attempts: 3,
      errorsCount: 3,
      maxAttempts: 3,
      lockReason: "Errou tres vezes a letra A",
    });

    assert.equal(result.progress.status, "travado");
    assert.equal(result.progress.attempts, 3);
    assert.equal(result.progress.metadata.errorsCount, 3);
    assert.equal(result.progress.metadata.maxAttempts, 3);
    assert.equal(result.progress.metadata.lockReason, "Errou tres vezes a letra A");
    assert.equal(supabase.rows("SessionState")[0].isLocked, true);
    assert.equal(supabase.rows("educator_notifications")[0].type, "progress_locked");
    assert.equal(
      supabase.rows("sync_events").some((row) => row.event_type === "progress.locked"),
      true,
    );
  });

  it("rejects local mobile learner ids on canonical progress writes", async () => {
    const supabase = createProgressSupabase();
    __setSupabaseAdminForTests(supabase);

    await assert.rejects(
      upsertActivityProgressFromMobile({
        learnerProfileId: "cmnqr706f000jvlf4u222r8s8",
        activityId: ACTIVITY_ID,
        status: "LOCKED",
      }),
      (error) => error.status === 400 && /UUID/.test(error.message),
    );

    assert.equal(supabase.rows("activity_progress").length, 0);
  });

  it("unlocks SessionState when panel progress moves out of travado", async () => {
    const supabase = createProgressSupabase({
      activity_progress: [
        {
          id: "progress-1",
          student_id: STUDENT_ID,
          activity_id: ACTIVITY_ID,
          status: "travado",
          metadata: {},
        },
      ],
    });
    supabase.rows("SessionState")[0].isLocked = true;
    __setSupabaseAdminForTests(supabase);

    const result = await updateActivityProgressStatus({
      progressId: "progress-1",
      status: "em_andamento",
      metadataPatch: { unlockedBy: "educator" },
    });

    assert.equal(result.status, "em_andamento");
    assert.equal(supabase.rows("SessionState")[0].isLocked, false);
    assert.equal(
      supabase.rows("sync_events").some((row) => row.event_type === "progress.unlocked"),
      true,
    );
  });

  it("never lets IN_PROGRESS downgrade an activity already marked concluido", async () => {
    const supabase = createProgressSupabase({
      activity_progress: [
        {
          id: "progress-1",
          student_id: STUDENT_ID,
          activity_id: ACTIVITY_ID,
          status: "concluido",
          completed_at: "2026-05-14T10:00:00.000Z",
          metadata: {},
        },
      ],
    });
    __setSupabaseAdminForTests(supabase);

    const result = await upsertActivityProgressFromMobile({
      learnerProfileId: STUDENT_ID,
      activityId: ACTIVITY_ID,
      status: "IN_PROGRESS",
    });

    assert.equal(result.skipped, true);
    assert.equal(result.progress.status, "concluido");
    assert.equal(supabase.rows("activity_progress")[0].status, "concluido");
    assert.equal(supabase.rows("activity_progress")[0].completed_at, "2026-05-14T10:00:00.000Z");
  });

  it("deletes a mobile-only educator even when its id is UUID-shaped", async () => {
    const mobileEducatorId = "44444444-4444-4444-8444-444444444444";
    const supabase = new FakeSupabase({
      Educator: [
        {
          id: mobileEducatorId,
          name: "Tutor Teste",
          email: "teste@example.com",
          cpf: "12345678901",
          phoneDigits: "11999999999",
          supabaseAuthUserId: null,
        },
      ],
    });
    __setSupabaseAdminForTests(supabase);

    const result = await deleteProfileRecord({
      profileId: mobileEducatorId,
      role: "tutor",
    });

    assert.equal(result.deleted, true);
    assert.equal(result.id, mobileEducatorId);
    assert.equal(supabase.rows("Educator").length, 0);
  });
});

describe("stage status gate (Etapa 1 → Etapa 2 + espelhamento)", () => {
  it("reports Etapa 1 completed, Etapa 2 unlocked and mirror unlocked once all Etapa 1 activities are done", async () => {
    const supabase = new FakeSupabase(
      createCurriculumSeed({
        activity_progress: [
          { id: "p1", student_id: STUDENT_ID, activity_id: ACT_A1a, status: "concluido", completed_at: "2026-05-14T10:00:00.000Z", metadata: {} },
          { id: "p2", student_id: STUDENT_ID, activity_id: ACT_A1b, status: "concluido", completed_at: "2026-05-14T10:05:00.000Z", metadata: {} },
        ],
      }),
    );
    __setSupabaseAdminForTests(supabase);

    const status = await computeLearnerStageStatus({ learnerProfileId: STUDENT_ID, themeId: THEME_A });

    assert.equal(status.etapa1Completed, true);
    assert.equal(status.mirrorUnlocked, true);
    assert.equal(status.currentStageNumber, 2);

    const stage1 = status.stages.find((s) => s.stageNumber === 1);
    const stage2 = status.stages.find((s) => s.stageNumber === 2);
    assert.equal(stage1.completed, true);
    assert.equal(stage1.unlocked, true);
    assert.equal(stage1.totalActivities, 2);
    assert.equal(stage2.completed, false);
    assert.equal(stage2.unlocked, true);
  });

  it("keeps Etapa 2 and mirror locked while Etapa 1 is partial", async () => {
    const supabase = new FakeSupabase(
      createCurriculumSeed({
        activity_progress: [
          { id: "p1", student_id: STUDENT_ID, activity_id: ACT_A1a, status: "concluido", completed_at: "2026-05-14T10:00:00.000Z", metadata: {} },
        ],
      }),
    );
    __setSupabaseAdminForTests(supabase);

    const status = await computeLearnerStageStatus({ learnerProfileId: STUDENT_ID, themeId: THEME_A });

    assert.equal(status.etapa1Completed, false);
    assert.equal(status.mirrorUnlocked, false);
    assert.equal(status.currentStageNumber, 1);
    assert.equal(status.stages.find((s) => s.stageNumber === 2).unlocked, false);
  });

  it("locks the mirror when Etapa 1 has no published activities (safe default)", async () => {
    const supabase = new FakeSupabase(
      createCurriculumSeed({
        learning_activities: [
          { id: ACT_A2a, module_id: MODULE_A2, is_published: true },
        ],
      }),
    );
    __setSupabaseAdminForTests(supabase);

    const status = await computeLearnerStageStatus({ learnerProfileId: STUDENT_ID, themeId: THEME_A });

    assert.equal(status.etapa1Completed, false);
    assert.equal(status.mirrorUnlocked, false);
    assert.equal(status.stages.find((s) => s.stageNumber === 1).totalActivities, 0);
  });

  it("credits stage completion scoped by theme and emits a fresh stage.completed signal", async () => {
    const supabase = new FakeSupabase(
      createCurriculumSeed({
        activity_progress: [
          // Etapa 1 do tema A já 1/2 concluída; a atividade B (outro tema) segue
          // pendente — não pode bloquear o crédito da Etapa 1 do tema A.
          { id: "p1", student_id: STUDENT_ID, activity_id: ACT_A1a, status: "concluido", completed_at: "2026-05-14T10:00:00.000Z", metadata: {} },
        ],
      }),
    );
    __setSupabaseAdminForTests(supabase);

    const result = await upsertActivityProgressFromMobile({
      learnerProfileId: STUDENT_ID,
      activityId: ACT_A1b,
      status: "COMPLETED",
    });

    assert.ok(result.stageCompleted, "esperava sinal de conclusão de etapa");
    assert.equal(result.stageCompleted.stageNumber, 1);
    assert.equal(result.stageCompleted.themeId, THEME_A);
    assert.equal(result.stageCompleted.tutorId, TUTOR_ID);

    const scoreEvents = supabase.rows("educator_score_events");
    assert.equal(scoreEvents.length, 1);
    assert.equal(scoreEvents[0].event_type, "stage_completed");
    assert.equal(scoreEvents[0].stage_number, 1);
    assert.equal(scoreEvents[0].points, 10);
    assert.equal(
      supabase.rows("sync_events").some((row) => row.event_type === "stage.completed"),
      true,
    );
  });

  it("does not re-signal stage completion when only Etapa 2 remains open", async () => {
    const supabase = new FakeSupabase(
      createCurriculumSeed({
        activity_progress: [
          { id: "p1", student_id: STUDENT_ID, activity_id: ACT_A1a, status: "concluido", completed_at: "2026-05-14T10:00:00.000Z", metadata: {} },
          { id: "p2", student_id: STUDENT_ID, activity_id: ACT_A1b, status: "concluido", completed_at: "2026-05-14T10:05:00.000Z", metadata: {} },
        ],
      }),
    );
    __setSupabaseAdminForTests(supabase);

    // Concluir uma atividade da Etapa 2 (que ainda não fecha a Etapa 2).
    const result = await upsertActivityProgressFromMobile({
      learnerProfileId: STUDENT_ID,
      activityId: ACT_A2a,
      status: "COMPLETED",
    });

    // Etapa 2 tem só 1 atividade publicada; ao concluí-la a Etapa 2 fecha e
    // credita +15 — mas nunca a Etapa 1 de novo.
    assert.equal(result.stageCompleted.stageNumber, 2);
    const scoreEvents = supabase.rows("educator_score_events");
    assert.equal(scoreEvents.length, 1);
    assert.equal(scoreEvents[0].stage_number, 2);
    assert.equal(scoreEvents[0].points, 15);
  });
});

function createProgressSupabase(overrides = {}) {
  return new FakeSupabase({
    tutor_student_links: [
      {
        id: "link-1",
        student_id: STUDENT_ID,
        tutor_id: TUTOR_ID,
        status: "confirmado",
        updated_at: "2026-05-14T10:00:00.000Z",
      },
    ],
    LearnerSession: [
      {
        id: "session-1",
        learnerProfileId: STUDENT_ID,
      },
    ],
    SessionState: [
      {
        id: "state-1",
        sessionId: "session-1",
        currentView: "lesson-screen",
        currentActivityId: ACTIVITY_ID,
        statePayload: {},
        isLocked: false,
      },
    ],
    ...overrides,
  });
}

class FakeSupabase {
  constructor(seed = {}) {
    this.tables = new Map();
    this.sequence = 0;

    for (const [name, rows] of Object.entries(seed)) {
      this.tables.set(
        name,
        rows.map((row) => ({ ...row })),
      );
    }
  }

  from(tableName) {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }
    return new FakeQuery(this, tableName);
  }

  rows(tableName) {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }
    return this.tables.get(tableName);
  }

  nextId(tableName) {
    this.sequence += 1;
    return `${tableName}-${this.sequence}`;
  }
}

class FakeQuery {
  constructor(client, tableName) {
    this.client = client;
    this.tableName = tableName;
    this.mode = "select";
    this.filters = [];
    this.payload = null;
    this.conflictKeys = [];
    this.orderBy = null;
    this.limitCount = null;
  }

  select() {
    return this;
  }

  insert(payload) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  upsert(payload, options = {}) {
    this.mode = "upsert";
    this.payload = payload;
    this.conflictKeys = String(options.onConflict ?? "")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);
    return this;
  }

  eq(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in(column, values) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  neq(column, value) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  gte(column, value) {
    this.filters.push((row) => row[column] != null && row[column] >= value);
    return this;
  }

  is(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  order(column, options = {}) {
    this.orderBy = { column, ascending: Boolean(options.ascending) };
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  maybeSingle() {
    return this.execute("maybeSingle");
  }

  single() {
    return this.execute("single");
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute(singleMode) {
    const table = this.client.rows(this.tableName);
    let rows = [];

    if (this.mode === "insert") {
      rows = this.toArray(this.payload).map((payload) => this.materializeRow(payload));
      table.push(...rows);
    } else if (this.mode === "update") {
      rows = this.applyFilters(table);
      for (const row of rows) {
        Object.assign(row, this.payload, { updated_at: row.updated_at ?? nowIso() });
      }
    } else if (this.mode === "upsert") {
      const existing = table.find((row) =>
        this.conflictKeys.every((key) => row[key] === this.payload[key]),
      );
      if (existing) {
        Object.assign(existing, this.payload, { updated_at: nowIso() });
        rows = [existing];
      } else {
        const row = this.materializeRow(this.payload);
        table.push(row);
        rows = [row];
      }
    } else if (this.mode === "delete") {
      rows = this.applyFilters(table);
      const rowsToDelete = new Set(rows);
      this.client.tables.set(
        this.tableName,
        table.filter((row) => !rowsToDelete.has(row)),
      );
    } else {
      rows = this.applyFilters(table);
    }

    rows = this.applyOrderAndLimit(rows).map((row) => ({ ...row }));

    if (singleMode === "maybeSingle") {
      return { data: rows[0] ?? null, error: null };
    }

    if (singleMode === "single") {
      return { data: rows[0] ?? null, error: rows[0] ? null : { message: "No rows returned" } };
    }

    return { data: rows, error: null };
  }

  toArray(value) {
    return Array.isArray(value) ? value : [value];
  }

  materializeRow(payload) {
    const row = { ...payload };
    row.id ??= this.client.nextId(this.tableName);
    row.created_at ??= nowIso();
    row.updated_at ??= nowIso();

    if (this.tableName === "support_requests") {
      row.status ??= "aberto";
      row.priority ??= "alta";
      row.requested_at ??= nowIso();
    }

    if (this.tableName === "educator_notifications") {
      row.read_at ??= null;
    }

    return row;
  }

  applyFilters(rows) {
    return rows.filter((row) => this.filters.every((filter) => filter(row)));
  }

  applyOrderAndLimit(rows) {
    let result = [...rows];
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      result.sort((left, right) => {
        const leftValue = left[column] ?? "";
        const rightValue = right[column] ?? "";
        return ascending
          ? String(leftValue).localeCompare(String(rightValue))
          : String(rightValue).localeCompare(String(leftValue));
      });
    }

    if (Number.isFinite(this.limitCount)) {
      result = result.slice(0, this.limitCount);
    }

    return result;
  }
}

function nowIso() {
  return new Date().toISOString();
}
