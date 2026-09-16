import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function browserStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }
  return globalThis.localStorage;
}

export async function getPlatformSecureItem(key: string): Promise<string | null> {
  const storage = browserStorage();
  return storage ? storage.getItem(key) : SecureStore.getItemAsync(key);
}

export async function setPlatformSecureItem(key: string, value: string): Promise<void> {
  const storage = browserStorage();
  if (storage) {
    storage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deletePlatformSecureItem(key: string): Promise<void> {
  const storage = browserStorage();
  if (storage) {
    storage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}