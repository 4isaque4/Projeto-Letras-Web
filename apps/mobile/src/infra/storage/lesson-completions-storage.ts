import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'completed_lesson_ids';

export async function getCompletedLessonIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export async function markLessonCompleted(lessonId: string): Promise<void> {
  try {
    const current = await getCompletedLessonIds();
    current.add(lessonId);
    await AsyncStorage.setItem(KEY, JSON.stringify([...current]));
  } catch {
    // falha silenciosa — o desbloqueio tenta novamente no próximo load
  }
}
