import assert from "node:assert/strict";
import test from "node:test";
import { buildLearnerTrackingMetrics } from "./learnerTracking.js";

test("builds tracking metrics from the current stage and persisted screen snapshot", () => {
  const metrics = buildLearnerTrackingMetrics({
    stageStatus: {
      currentStageNumber: 2,
      stages: [
        { stageNumber: 1, totalActivities: 2, completedCount: 2 },
        { stageNumber: 2, totalActivities: 4, completedCount: 1 },
      ],
    },
    session: {
      sessionState: {
        statePayload: { snapshot: { screenIndex: 4, totalScreens: 14 } },
      },
    },
    latestActivityAt: "2026-07-12T12:00:00.000Z",
    now: new Date("2026-07-14T13:00:00.000Z").getTime(),
  });

  assert.deepEqual(metrics, {
    progressPercent: 25,
    currentScreenIndex: 5,
    screenCount: 14,
    inactiveDays: 2,
  });
});

test("keeps nullable screen and inactivity values when no state exists", () => {
  assert.deepEqual(
    buildLearnerTrackingMetrics({ fallbackProgressPercent: 60 }),
    {
      progressPercent: 60,
      currentScreenIndex: null,
      screenCount: null,
      inactiveDays: null,
    },
  );
});
