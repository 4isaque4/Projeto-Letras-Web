import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@letras/educatorTutorial_';

export class EducatorTutorialStorage {
  static async getWatchedDate(videoId: string): Promise<string | null> {
    return AsyncStorage.getItem(`${KEY_PREFIX}${videoId}`);
  }

  static async markWatched(videoId: string, isoDate: string): Promise<void> {
    const existing = await AsyncStorage.getItem(`${KEY_PREFIX}${videoId}`);
    if (!existing) {
      await AsyncStorage.setItem(`${KEY_PREFIX}${videoId}`, isoDate);
    }
  }

  static async getAllWatchedDates(videoIds: string[]): Promise<Record<string, string | null>> {
    const pairs = await AsyncStorage.multiGet(videoIds.map(id => `${KEY_PREFIX}${id}`));
    return Object.fromEntries(pairs.map(([key, val]) => [key.replace(KEY_PREFIX, ''), val]));
  }

  static async isVideo1Watched(): Promise<boolean> {
    const val = await AsyncStorage.getItem(`${KEY_PREFIX}1`);
    return val !== null;
  }
}
