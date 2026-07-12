import assert from "node:assert/strict";
import test from "node:test";

import {
  getNextAssignedActivity,
  isAssignedStageComplete,
  shouldAwardFirstCompletion,
} from "./learnerActivities.js";

test("returns the next assigned activity by sequence", () => {
  const assignments = [
    { activityId: "third", order: 3 },
    { activityId: "first", order: 1 },
    { activityId: "second", order: 2 },
  ];

  assert.equal(getNextAssignedActivity(assignments, "first")?.activityId, "second");
});

test("returns null when the completed activity is the last assignment", () => {
  assert.equal(getNextAssignedActivity([{ activityId: "only", order: 1 }], "only"), null);
});

test("stage completes only when every required assigned activity is complete", () => {
  const assignments = [
    { activityId: "a", stageNumber: 1, required: true },
    { activityId: "b", stageNumber: 1, required: true },
    { activityId: "optional", stageNumber: 1, required: false },
    { activityId: "other-stage", stageNumber: 2, required: true },
  ];

  assert.equal(isAssignedStageComplete(assignments, new Set(["a"]), 1), false);
  assert.equal(isAssignedStageComplete(assignments, new Set(["a", "b"]), 1), true);
});

test("an empty stage is not complete", () => {
  assert.equal(isAssignedStageComplete([], new Set(), 1), false);
});

test("awards only when first-completion credit is absent", () => {
  assert.equal(shouldAwardFirstCompletion(null), true);
  assert.equal(shouldAwardFirstCompletion(undefined), true);
  assert.equal(shouldAwardFirstCompletion({ id: "credit" }), false);
});
