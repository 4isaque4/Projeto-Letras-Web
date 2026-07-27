import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppMode } from '../../types';

const APP_MODE_STORAGE_KEY = '@letras/mobileAppMode';

export class AppModeStorage {
  static async getPreferredMode(): Promise<AppMode | null> {
    const value = await AsyncStorage.getItem(APP_MODE_STORAGE_KEY);

    if (value === 'educator' || value === 'learner') {
      return value;
    }

    return null;
  }

  static async setPreferredMode(mode: AppMode): Promise<void> {
    await AsyncStorage.setItem(APP_MODE_STORAGE_KEY, mode);
  }

  static async clearPreferredMode(): Promise<void> {
    await AsyncStorage.removeItem(APP_MODE_STORAGE_KEY);
  }
}
