import assert from "node:assert/strict";
import test from "node:test";

import { syncLearnerAssignmentsWithGrade } from "./learnerActivityService.js";

function createFakeRepository({ grade, links, accessByLink = {}, progressByStudent = {} }) {
  const calls = { replacements: [], syncEvents: [] };
  const repository = {
    async listPublishedGradeActivities() {
      return grade;
    },
    async listActiveConfirmedLinks() {
      return links;
    },
    async listAccess({ linkId }) {
      return accessByLink[linkId] ?? [];
    },
    async listProgress({ studentId }) {
      return progressByStudent[studentId] ?? [];
    },
    async replaceLinkAssignments(input) {
      calls.replacements.push(input);
      return input.assignments.length;
    },
    async appendSyncEvent(event) {
      calls.syncEvents.push(event);
    },
  };
  return { repository, calls };
}

const GRADE = [
  { activityId: "b", moduleId: "mod-2", activitySortOrder: 1, stageNumber: 2, moduleSortOrder: 1, themeSortOrder: 1 },
  { activityId: "a", moduleId: "mod-1", activitySortOrder: 1, stageNumber: 1, moduleSortOrder: 1, themeSortOrder: 1 },
  { activityId: "c", moduleId: "mod-2", activitySortOrder: 2, stageNumber: 2, moduleSortOrder: 1, themeSortOrder: 1 },
];

test("sync-grade exige perfil admin", async () => {
  const { repository } = createFakeRepository({ grade: GRADE, links: [] });
  await assert.rejects(
    syncLearnerAssignmentsWithGrade({ actor: { id: "tutor-1", role: "tutor" }, repository }),
    (error) => error.status === 403,
  );
});

test("aplica a grade ordenada por tema/etapa/módulo aos vínculos ativos", async () => {
  const { repository, calls } = createFakeRepository({
    grade: GRADE,
    links: [{ id: "link-1", tutorId: "tutor-1", studentId: "student-1", status: "confirmado" }],
    progressByStudent: { "student-1": [{ activityId: "b", status: "concluido", completedAt: "2026-07-10" }] },
  });

  const result = await syncLearnerAssignmentsWithGrade({ actor: { id: "admin-1", role: "admin" }, repository });

  assert.equal(result.updatedLinks, 1);
  assert.equal(result.gradeSize, 3);
  const { assignments } = calls.replacements[0];
  assert.deepEqual(assignments.map((row) => row.activityId), ["a", "b", "c"]);
  assert.deepEqual(assignments.map((row) => row.sequenceOrder), [1, 2, 3]);
  // 1ª aula disponível, concluída disponível, restante bloqueada
  assert.deepEqual(assignments.map((row) => row.accessStatus), ["available", "available", "locked"]);
  assert.equal(assignments[1].assignedModuleId, "mod-2");
  assert.equal(calls.syncEvents.length, 1);
  assert.equal(calls.syncEvents[0].eventType, "content.grade_synced");
});

test("preserva o status de acesso das aulas já atribuídas", async () => {
  const { repository, calls } = createFakeRepository({
    grade: GRADE,
    links: [{ id: "link-1", tutorId: "tutor-1", studentId: "student-1", status: "confirmado" }],
    accessByLink: {
      "link-1": [
        { activityId: "c", assignedModuleId: "mod-2", sequenceOrder: 1, accessStatus: "available", isRequired: true },
      ],
    },
  });

  await syncLearnerAssignmentsWithGrade({ actor: { id: "admin-1", role: "admin" }, repository });

  const { assignments } = calls.replacements[0];
  const rowC = assignments.find((row) => row.activityId === "c");
  assert.equal(rowC.accessStatus, "available");
  assert.equal(rowC.sequenceOrder, 3);
});

test("não regrava vínculos que já estão idênticos à grade", async () => {
  const { repository, calls } = createFakeRepository({
    grade: GRADE,
    links: [{ id: "link-1", tutorId: "tutor-1", studentId: "student-1", status: "confirmado" }],
    accessByLink: {
      "link-1": [
        { activityId: "a", assignedModuleId: "mod-1", sequenceOrder: 1, accessStatus: "available", isRequired: true },
        { activityId: "b", assignedModuleId: "mod-2", sequenceOrder: 2, accessStatus: "locked", isRequired: true },
        { activityId: "c", assignedModuleId: "mod-2", sequenceOrder: 3, accessStatus: "locked", isRequired: true },
      ],
    },
  });

  const result = await syncLearnerAssignmentsWithGrade({ actor: { id: "admin-1", role: "admin" }, repository });

  assert.equal(result.unchangedLinks, 1);
  assert.equal(calls.replacements.length, 0);
  assert.equal(calls.syncEvents.length, 0);
});
