import AsyncStorage from '@react-native-async-storage/async-storage';
import { EducatorAuthProfile } from '@letras/shared-types';
import { STORAGE_KEYS, createLocalId } from '@letras/shared-utils';

export class EducatorStorage {
  static async getOrCreateEducatorDeviceId(): Promise<string> {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.EDUCATOR_DEVICE_ID);

    if (existing) {
      return existing;
    }

    const created = createLocalId('educator-device');
    await AsyncStorage.setItem(STORAGE_KEYS.EDUCATOR_DEVICE_ID, created);
    return created;
  }

  static async saveAuthSession(token: string, expiresAt: string, educator: EducatorAuthProfile): Promise<void> {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.EDUCATOR_AUTH_TOKEN, token],
      [STORAGE_KEYS.EDUCATOR_AUTH_EXPIRES_AT, expiresAt],
      [STORAGE_KEYS.EDUCATOR_AUTH_PROFILE, JSON.stringify(educator)],
    ]);
  }

  static async getAuthToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.EDUCATOR_AUTH_TOKEN);
  }

  static async getAuthSessionExpiry(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.EDUCATOR_AUTH_EXPIRES_AT);
  }

  static async getAuthProfile(): Promise<EducatorAuthProfile | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.EDUCATOR_AUTH_PROFILE);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as EducatorAuthProfile;
    } catch {
      return null;
    }
  }

  static async clearAuthSession(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.EDUCATOR_AUTH_TOKEN,
      STORAGE_KEYS.EDUCATOR_AUTH_EXPIRES_AT,
      STORAGE_KEYS.EDUCATOR_AUTH_PROFILE,
    ]);
  }
}
