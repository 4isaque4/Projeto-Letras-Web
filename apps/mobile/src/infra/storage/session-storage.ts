import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, createLocalId } from '@letras/shared-utils';

export class SessionStorage {
  static async getLearnerProfileId(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.LEARNER_PROFILE_ID);
  }

  static async setLearnerProfileId(learnerProfileId: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LEARNER_PROFILE_ID, learnerProfileId);
  }

  static async clearLearnerSession(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.LEARNER_PROFILE_ID,
      STORAGE_KEYS.LEARNER_DEVICE_ID,
    ]);
  }

  static async getOrCreateLearnerDeviceId(): Promise<string> {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.LEARNER_DEVICE_ID);

    if (existing) {
      return existing;
    }

    const created = createLocalId('learner-device');
    await AsyncStorage.setItem(STORAGE_KEYS.LEARNER_DEVICE_ID, created);
    return created;
  }
}
