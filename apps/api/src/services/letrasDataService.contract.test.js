import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  __setSupabaseAdminForTests,
  createSupportRequest,
  updateActivityProgressStatus,
  upsertActivityProgressFromMobile,
} from "./letrasDataService.js";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const ACTIVITY_ID = "22222222-2222-4222-8222-222222222222";
const TUTOR_ID = "33333333-3333-4333-8333-333333333333";

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
    });

    assert.equal(result.progress.status, "travado");
    assert.equal(supabase.rows("SessionState")[0].isLocked, true);
    assert.equal(supabase.rows("educator_notifications")[0].type, "progress_locked");
    assert.equal(
      supabase.rows("sync_events").some((row) => row.event_type === "progress.locked"),
      true,
    );
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
