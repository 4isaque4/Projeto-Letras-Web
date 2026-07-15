import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createRealtimeEnvelope,
  emitLearnerLockChanged,
  emitOperationalRealtimeEvent,
  normalizeRealtimeRole,
  registerMobileRealtimeConnection,
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

  it("automatically subscribes educator home and bridges mobile events", () => {
    const handlers = new Map();
    const emissions = [];
    const socket = {
      id: "socket-educator",
      handshake: { query: { educatorId: "educator-1", role: "educator" } },
      joined: [],
      join(room) { this.joined.push(room); },
      on(event, handler) { handlers.set(event, handler); },
      emit(event, payload) { emissions.push({ target: "socket", event, payload }); },
      to(room) {
        return { emit: (event, payload) => emissions.push({ target: room, event, payload }) };
      },
    };
    const namespace = {
      to(room) {
        return { emit: (event, payload) => emissions.push({ target: room, event, payload }) };
      },
    };

    registerMobileRealtimeConnection({
      socket,
      namespace,
      learnerPresenceBySocketId: new Map([["learner-socket", "learner-1"]]),
    });

    assert.deepEqual(socket.joined, ["dashboard:default", "educator:educator-1"]);
    assert.deepEqual(emissions[0], {
      target: "socket",
      event: "learner_presence_snapshot",
      payload: { onlineIds: ["learner-1"] },
    });

    handlers.get("lock_set")({ learnerProfileId: "learner-1" });
    assert.ok(emissions.some((item) =>
      item.target === "learner:learner-1" &&
      item.event === "locked_changed" &&
      item.payload.isLocked === true));
  });

  it("publishes learner presence and state immediately to the educator dashboard", () => {
    const handlers = new Map();
    const emissions = [];
    const socket = {
      id: "socket-learner",
      handshake: {
        query: {
          learnerProfileId: "learner-2",
          participantId: "learner-2",
          role: "learner",
        },
      },
      join() {},
      on(event, handler) { handlers.set(event, handler); },
      emit(event, payload) { emissions.push({ target: "socket", event, payload }); },
      to(room) {
        return { emit: (event, payload) => emissions.push({ target: room, event, payload }) };
      },
    };
    const namespace = {
      to(room) {
        return { emit: (event, payload) => emissions.push({ target: room, event, payload }) };
      },
    };
    const presence = new Map();

    registerMobileRealtimeConnection({
      socket,
      namespace,
      learnerPresenceBySocketId: presence,
    });

    assert.equal(presence.get("socket-learner"), "learner-2");
    assert.ok(emissions.some((item) =>
      item.target === "dashboard:default" &&
      item.event === "learner_presence_changed" &&
      item.payload.online === true));

    handlers.get("learner_state_update")({
      learnerProfileId: "learner-2",
      currentView: "lesson",
      state: { snapshot: { screenIndex: 3 } },
    });
    assert.ok(emissions.some((item) =>
      item.target === "dashboard:default" && item.event === "learner_state_update"));
  });

  it("sends the current presence snapshot when an educator opens a live mirror", () => {
    const emissions = [];
    const socket = {
      id: "socket-mirror",
      handshake: { query: { learnerProfileId: "learner-3", role: "educator" } },
      join() {},
      on() {},
      emit(event, payload) { emissions.push({ event, payload }); },
      to() { return { emit() {} }; },
    };
    registerMobileRealtimeConnection({
      socket,
      namespace: { to() { return { emit() {} }; } },
      learnerPresenceBySocketId: new Map([["active-learner", "learner-3"]]),
    });

    assert.deepEqual(emissions, [{
      event: "presence_changed",
      payload: {
        learnerProfileId: "learner-3",
        learnersOnline: ["learner-3"],
        educatorsOnline: [],
      },
    }]);
  });
});
