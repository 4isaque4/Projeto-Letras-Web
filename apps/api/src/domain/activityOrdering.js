function orderingError(message) {
  return Object.assign(new Error(message), { status: 409 });
}

export function reorderAssignments(assignments, movement) {
  const ordered = [...(assignments ?? [])].sort((left, right) => Number(left.sequenceOrder) - Number(right.sequenceOrder));
  const sourceIndex = ordered.findIndex((row) => row.activityId === movement.activityId);
  if (sourceIndex < 0) throw Object.assign(new Error("Aula atribuída não encontrada."), { status: 404 });
  const [moving] = ordered.splice(sourceIndex, 1);
  const targetModuleId = String(movement.targetModuleId ?? moving.assignedModuleId ?? "").trim();
  const crossGroup = targetModuleId !== String(moving.assignedModuleId ?? "");
  if (crossGroup && movement.confirmedCrossGroup !== true) {
    throw orderingError("Confirmação obrigatória para mover a aula entre módulos ou etapas.");
  }
  moving.assignedModuleId = targetModuleId;
  const targetIndex = Math.max(0, Math.min(Number(movement.targetIndex) || 0, ordered.length));
  ordered.splice(targetIndex, 0, moving);
  const normalized = ordered.map((row, index) => ({ ...row, sequenceOrder: index + 1 }));
  normalized.crossGroup = crossGroup;
  return normalized;
}
