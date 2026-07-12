import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  completeLearnerActivity,
  getLearnerActivityCatalog,
  setLearnerActivityAccess,
} from "./learnerActivityService.js";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const TUTOR_ID = "22222222-2222-4222-8222-222222222222";
const LINK_ID = "33333333-3333-4333-8333-333333333333";
const ACTIVITY_A = "44444444-4444-4444-8444-444444444444";
const ACTIVITY_B = "55555555-5555-4555-8555-555555555555";

describe("learner activity service", () => {
  it("returns assigned lessons with explicit access and completed lessons replayable", async () => {
    const repository = createRepository();

    const catalog = await getLearnerActivityCatalog({
      actor: { id: STUDENT_ID, role: "alfabetizando" },
      studentId: STUDENT_ID,
      repository,
    });

    const [first, second] = catalog.themes[0].stages[0].modules[0].lessons;
    assert.deepEqual(
      {
        accessStatus: first.accessStatus,
        progressStatus: first.progressStatus,
        canReplay: first.canReplay,
        attemptCount: first.attemptCount,
        pointsAwarded: first.pointsAwarded,
      },
      {
        accessStatus: "available",
        progressStatus: "completed",
        canReplay: true,
        attemptCount: 2,
        pointsAwarded: 10,
      },
    );
    assert.equal(second.accessStatus, "locked");
    assert.equal(catalog.stageCompleted, false);
  });

  it("rejects a learner trying to read another learner catalog", async () => {
    await assert.rejects(
      getLearnerActivityCatalog({
        actor: { id: "99999999-9999-4999-8999-999999999999", role: "alfabetizando" },
        studentId: STUDENT_ID,
        repository: createRepository(),
      }),
      (error) => error.status === 403,
    );
  });

  it("forwards an idempotency key and returns the transactional completion result", async () => {
    const repository = createRepository();
    const result = await completeLearnerActivity({
      actor: { id: STUDENT_ID, role: "alfabetizando" },
      studentId: STUDENT_ID,
      activityId: ACTIVITY_A,
      idempotencyKey: "attempt-1",
      attempt: { score: 90, elapsedSeconds: 30 },
      repository,
    });

    assert.equal(repository.completed[0].idempotencyKey, "attempt-1");
    assert.deepEqual(result, {
      lessonCompleted: true,
      stageCompleted: false,
      pointsAwardedNow: 10,
      totalPoints: 10,
      nextActivityId: ACTIVITY_B,
      attemptId: "attempt-row-1",
    });
  });

  it("allows the linked tutor to change access and records the sync event", async () => {
    const repository = createRepository();
    const result = await setLearnerActivityAccess({
      actor: { id: TUTOR_ID, role: "tutor" },
      linkId: LINK_ID,
      changes: [{ activityId: ACTIVITY_B, accessStatus: "available" }],
      repository,
    });

    assert.equal(result.updated, 1);
    assert.equal(repository.accessChanges[0].changedBy, TUTOR_ID);
    assert.equal(repository.events[0].eventType, "content.access_updated");
  });
});

function createRepository() {
  return {
    completed: [],
    accessChanges: [],
    events: [],
    async getActiveLinkByStudent(studentId) {
      return studentId === STUDENT_ID
        ? { id: LINK_ID, studentId: STUDENT_ID, tutorId: TUTOR_ID, status: "confirmado" }
        : null;
    },
    async getLink(linkId) {
      return linkId === LINK_ID
        ? { id: LINK_ID, studentId: STUDENT_ID, tutorId: TUTOR_ID, status: "confirmado" }
        : null;
    },
    async listAccess() {
      return [
        { linkId: LINK_ID, studentId: STUDENT_ID, activityId: ACTIVITY_A, accessStatus: "available", sequenceOrder: 1, isRequired: true },
        { linkId: LINK_ID, studentId: STUDENT_ID, activityId: ACTIVITY_B, accessStatus: "locked", sequenceOrder: 2, isRequired: true },
      ];
    },
    async listActivities() {
      return [
        { id: ACTIVITY_A, moduleId: "module-1", title: "Aula A", instructions: "Primeira aula", sortOrder: 1 },
        { id: ACTIVITY_B, moduleId: "module-1", title: "Aula B", instructions: "Segunda aula", sortOrder: 2 },
      ];
    },
    async listModules() {
      return [{ id: "module-1", themeId: "theme-1", title: "Reconhecimento", stageNumber: 1, sortOrder: 1 }];
    },
    async listThemes() {
      return [{ id: "theme-1", title: "Animais", sortOrder: 1 }];
    },
    async listProgress() {
      return [{ activityId: ACTIVITY_A, status: "concluido", completedAt: "2026-07-12T12:00:00.000Z" }];
    },
    async listAttemptCounts() {
      return [{ activityId: ACTIVITY_A, count: 2 }];
    },
    async listScoreEvents() {
      return [{ activityId: ACTIVITY_A, points: 10 }];
    },
    async completeAssignedActivity(input) {
      this.completed.push(input);
      return {
        lessonCompleted: true,
        stageCompleted: false,
        pointsAwardedNow: 10,
        totalPoints: 10,
        nextActivityId: ACTIVITY_B,
        attemptId: "attempt-row-1",
      };
    },
    async updateAccess(input) {
      this.accessChanges.push(input);
      return input.changes.length;
    },
    async appendSyncEvent(event) {
      this.events.push(event);
    },
  };
}
