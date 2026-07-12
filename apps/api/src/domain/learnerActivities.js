function normalizedOrder(assignment) {
  const value = Number(assignment?.order ?? assignment?.sequenceOrder ?? assignment?.sequence_order);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function assignmentActivityId(assignment) {
  return assignment?.activityId ?? assignment?.activity_id ?? null;
}

function assignmentStageNumber(assignment) {
  const value = Number(assignment?.stageNumber ?? assignment?.stage_number);
  return Number.isFinite(value) ? value : null;
}

function isRequiredAssignment(assignment) {
  return (assignment?.required ?? assignment?.isRequired ?? assignment?.is_required) !== false;
}

export function getNextAssignedActivity(assignments, activityId) {
  const ordered = [...(assignments ?? [])].sort((left, right) => normalizedOrder(left) - normalizedOrder(right));
  const currentIndex = ordered.findIndex((assignment) => assignmentActivityId(assignment) === activityId);

  if (currentIndex < 0 || currentIndex >= ordered.length - 1) {
    return null;
  }

  return ordered[currentIndex + 1];
}

export function isAssignedStageComplete(assignments, completedActivityIds, stageNumber) {
  const requiredActivityIds = (assignments ?? [])
    .filter(
      (assignment) =>
        assignmentStageNumber(assignment) === Number(stageNumber) && isRequiredAssignment(assignment),
    )
    .map(assignmentActivityId)
    .filter(Boolean);

  if (requiredActivityIds.length === 0) {
    return false;
  }

  const completed = completedActivityIds instanceof Set ? completedActivityIds : new Set(completedActivityIds ?? []);
  return requiredActivityIds.every((activityId) => completed.has(activityId));
}

export function shouldAwardFirstCompletion(existingCredit) {
  return existingCredit == null;
}
