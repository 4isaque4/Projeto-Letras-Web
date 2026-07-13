import assert from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, describe, it } from "node:test";
import express from "express";

import { createLearnerActivitiesRouter } from "./learnerActivities.js";

const servers = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

describe("learner activities routes", () => {
  it("requires authentication", async () => {
    const baseUrl = await startApi();
    const response = await fetch(`${baseUrl}/catalog?studentId=student-1`);
    assert.equal(response.status, 401);
  });

  it("returns the learner catalog for an authenticated actor", async () => {
    const calls = [];
    const baseUrl = await startApi({
      resolveActor: async () => ({ id: "student-1", role: "alfabetizando" }),
      getCatalog: async (input) => {
        calls.push(input);
        return { themes: [], studentId: input.studentId };
      },
    });
    const response = await fetch(`${baseUrl}/catalog?studentId=student-1`, { headers: { Authorization: "Bearer valid" } });
    assert.equal(response.status, 200);
    assert.equal(calls[0].studentId, "student-1");
  });

  it("validates and forwards the idempotency key on completion", async () => {
    const completions = [];
    const baseUrl = await startApi({
      resolveActor: async () => ({ id: "student-1", role: "alfabetizando" }),
      completeActivity: async (input) => {
        completions.push(input);
        return { lessonCompleted: true, stageCompleted: false, pointsAwardedNow: 10 };
      },
    });
    const missingKey = await fetch(`${baseUrl}/activity-1/complete`, {
      method: "POST",
      headers: { Authorization: "Bearer valid", "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: "student-1" }),
    });
    assert.equal(missingKey.status, 400);

    const response = await fetch(`${baseUrl}/activity-1/complete`, {
      method: "POST",
      headers: { Authorization: "Bearer valid", "Content-Type": "application/json", "Idempotency-Key": "attempt-1" },
      body: JSON.stringify({ studentId: "student-1", score: 90 }),
    });
    assert.equal(response.status, 200);
    assert.equal(completions[0].idempotencyKey, "attempt-1");
  });

  it("validates batch access changes", async () => {
    const changes = [];
    const baseUrl = await startApi({
      resolveActor: async () => ({ id: "tutor-1", role: "tutor" }),
      setAccess: async (input) => {
        changes.push(input);
        return { updated: input.changes.length };
      },
    });
    const invalid = await fetch(`${baseUrl}/access`, {
      method: "PATCH",
      headers: { Authorization: "Bearer valid", "Content-Type": "application/json" },
      body: JSON.stringify({ linkId: "link-1", changes: [] }),
    });
    assert.equal(invalid.status, 400);

    const response = await fetch(`${baseUrl}/access`, {
      method: "PATCH",
      headers: { Authorization: "Bearer valid", "Content-Type": "application/json" },
      body: JSON.stringify({ linkId: "link-1", changes: [{ activityId: "activity-1", accessStatus: "available" }] }),
    });
    assert.equal(response.status, 200);
    assert.equal(changes[0].linkId, "link-1");
  });

  it("applies the common grade via sync-grade", async () => {
    const calls = [];
    const baseUrl = await startApi({
      resolveActor: async () => ({ id: "admin-1", role: "admin" }),
      syncGrade: async (input) => {
        calls.push(input);
        return { gradeSize: 3, totalLinks: 2, updatedLinks: 2, unchangedLinks: 0 };
      },
    });
    const response = await fetch(`${baseUrl}/sync-grade`, {
      method: "POST",
      headers: { Authorization: "Bearer valid", "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 200);
    assert.equal(calls[0].actor.id, "admin-1");
    assert.deepEqual(await response.json(), { gradeSize: 3, totalLinks: 2, updatedLinks: 2, unchangedLinks: 0 });
  });
});

async function startApi(overrides = {}) {
  const app = express();
  app.use(express.json());
  app.use(createLearnerActivitiesRouter({
    resolveActor: overrides.resolveActor ?? (async () => null),
    getCatalog: overrides.getCatalog ?? (async () => ({ themes: [] })),
    completeActivity: overrides.completeActivity ?? (async () => ({ lessonCompleted: true })),
    setAccess: overrides.setAccess ?? (async () => ({ updated: 0 })),
    syncGrade: overrides.syncGrade ?? (async () => ({ updatedLinks: 0 })),
  }));
  const server = createServer(app);
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}
