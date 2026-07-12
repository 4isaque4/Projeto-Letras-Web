import assert from "node:assert/strict";
import test from "node:test";
import { reorderAssignments } from "./activityOrdering.js";

test("reorders assignments and normalizes sequence numbers", () => {
  const rows = [
    { activityId: "a", assignedModuleId: "m1", sequenceOrder: 1 },
    { activityId: "b", assignedModuleId: "m1", sequenceOrder: 2 },
    { activityId: "c", assignedModuleId: "m1", sequenceOrder: 3 },
  ];
  const result = reorderAssignments(rows, { activityId: "c", targetModuleId: "m1", targetIndex: 0, confirmedCrossGroup: false });
  assert.deepEqual(result.map((row) => [row.activityId, row.sequenceOrder]), [["c", 1], ["a", 2], ["b", 3]]);
  assert.equal(result.crossGroup, false);
});

test("requires confirmation before moving to another module", () => {
  const rows = [
    { activityId: "a", assignedModuleId: "m1", sequenceOrder: 1 },
    { activityId: "b", assignedModuleId: "m2", sequenceOrder: 2 },
  ];
  assert.throws(() => reorderAssignments(rows, { activityId: "a", targetModuleId: "m2", targetIndex: 1, confirmedCrossGroup: false }), /confirmação/i);
});

test("moves across modules without duplicating positions", () => {
  const rows = [
    { activityId: "a", assignedModuleId: "m1", sequenceOrder: 1 },
    { activityId: "b", assignedModuleId: "m2", sequenceOrder: 2 },
  ];
  const result = reorderAssignments(rows, { activityId: "a", targetModuleId: "m2", targetIndex: 1, confirmedCrossGroup: true });
  assert.deepEqual(result.map((row) => [row.activityId, row.assignedModuleId, row.sequenceOrder]), [["b", "m2", 1], ["a", "m2", 2]]);
  assert.equal(result.crossGroup, true);
});
