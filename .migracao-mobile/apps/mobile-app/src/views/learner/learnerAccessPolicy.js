export function canOpenLesson(lesson) {
  return lesson?.accessStatus === 'available';
}

export function getLessonActionLabel(lesson) {
  if (!canOpenLesson(lesson)) return 'Bloqueada';
  return lesson?.progressStatus === 'completed' ? 'Refazer' : 'Abrir';
}

export function shouldShowStageConclusion(result) {
  return result?.lessonCompleted === true && result?.stageCompleted === true;
}
