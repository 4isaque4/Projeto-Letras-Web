import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LearnerLessonCheckpoint {
  learnerId: string;
  moduleId: string;
  lessonId: string;
  screenIndex: number;
  matchSelectedOptions: Record<string, string>;
  matchCompletedIds: string[];
  matchUnlockedIndex: number;
  selectedImageIds: string[];
  exerciseAttempts: number;
  exerciseLocked: boolean;
  instructionAudioPlayed: boolean;
  updatedAt: string;
}

const PREFIX = "@letras/learner-lesson-checkpoint/";
const keyFor = (learnerId: string, lessonId: string) =>
  `${PREFIX}${learnerId}/${lessonId}`;

export async function loadLearnerLessonCheckpoint(
  learnerId: string,
  lessonId: string,
) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(learnerId, lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LearnerLessonCheckpoint;
    return parsed.learnerId === learnerId && parsed.lessonId === lessonId
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export async function saveLearnerLessonCheckpoint(
  checkpoint: LearnerLessonCheckpoint,
) {
  await AsyncStorage.setItem(
    keyFor(checkpoint.learnerId, checkpoint.lessonId),
    JSON.stringify(checkpoint),
  );
}

export async function clearLearnerLessonCheckpoint(
  learnerId: string,
  lessonId: string,
) {
  await AsyncStorage.removeItem(keyFor(learnerId, lessonId));
}
