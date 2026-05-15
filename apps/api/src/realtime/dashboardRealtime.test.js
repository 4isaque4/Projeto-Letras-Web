import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createRealtimeEnvelope,
  emitLearnerLockChanged,
  emitOperationalRealtimeEvent,
  normalizeRealtimeRole,
} from "./dashboardRealtime.js";

describe("dashboard realtime contract", () => {
  it("wraps socket.io payloads in the web realtime envelope", () => {
    const emittedAt = "2026-05-15T10:00:00.000Z";
    const event = createRealtimeEnvelope(
      "presence.snapshot",
      { users: [] },
      emittedAt,
    );

    assert.deepEqual(event, {
      type: "presence.snapshot",
      payload: { users: [] },
      emittedAt,
      version: "1.0",
    });
  });

  it("normalizes known mobile/web presence roles", () => {
    assert.equal(normalizeRealtimeRole("alfabetizador"), "tutor");
    assert.equal(normalizeRealtimeRole("learner"), "alfabetizando");
    assert.equal(normalizeRealtimeRole("unknown"), "admin");
  });

  it("keeps operational realtime best-effort when socket.io is not installed", async () => {
    const emitted = await emitOperationalRealtimeEvent("support.created", { id: "support-1" });

    assert.equal(emitted, false);
  });

  it("keeps learner lock realtime best-effort when socket.io is not installed", () => {
    assert.equal(emitLearnerLockChanged("learner-1", false), false);
  });
});
