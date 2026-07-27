export interface LearnerAccessState {
  accessStatus: 'locked' | 'available';
  progressStatus: 'not_started' | 'in_progress' | 'completed';
}

export interface LessonCompletionResult {
  lessonCompleted: boolean;
  stageCompleted: boolean;
  pointsAwardedNow?: number;
  totalPoints?: number;
  nextActivityId?: string | null;
  attemptId?: string;
}

export function canOpenLesson(lesson: LearnerAccessState): boolean;
export function getLessonActionLabel(lesson: LearnerAccessState): 'Bloqueada' | 'Refazer' | 'Abrir';
export function shouldShowStageConclusion(result: LessonCompletionResult): boolean;
