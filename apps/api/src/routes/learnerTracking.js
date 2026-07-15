function toFiniteNonNegative(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function buildLearnerTrackingMetrics({
  stageStatus,
  session,
  latestActivityAt,
  fallbackProgressPercent = 0,
  now = Date.now(),
} = {}) {
  const currentStage = stageStatus?.stages?.find(
    (stage) => Number(stage.stageNumber) === Number(stageStatus.currentStageNumber),
  );
  const totalActivities = toFiniteNonNegative(currentStage?.totalActivities);
  const completedCount = toFiniteNonNegative(currentStage?.completedCount);
  const progressPercent =
    totalActivities && completedCount != null
      ? Math.round((completedCount / totalActivities) * 100)
      : Math.max(0, Math.min(100, Number(fallbackProgressPercent) || 0));

  const statePayload = session?.sessionState?.statePayload;
  const snapshot =
    statePayload?.snapshot && typeof statePayload.snapshot === "object"
      ? statePayload.snapshot
      : null;
  const zeroBasedScreenIndex = toFiniteNonNegative(snapshot?.screenIndex);
  const screenCount = toFiniteNonNegative(snapshot?.totalScreens);

  const parsedLatestActivityAt = latestActivityAt
    ? new Date(latestActivityAt).getTime()
    : Number.NaN;
  const inactiveDays = Number.isFinite(parsedLatestActivityAt)
    ? Math.max(0, Math.floor((now - parsedLatestActivityAt) / 86_400_000))
    : null;

  return {
    progressPercent,
    currentScreenIndex:
      zeroBasedScreenIndex == null ? null : zeroBasedScreenIndex + 1,
    screenCount,
    inactiveDays,
  };
}
