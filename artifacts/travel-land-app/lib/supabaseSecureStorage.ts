import * as SecureStore from 'expo-secure-store';
import type { MobileSupabaseStorage } from '@workspace/supabase/mobile';

const CHUNK_SIZE = 1800;
const VERSION = 1;

type Manifest = {
  version: number;
  chunks: number;
};

function storageKey(key: string) {
  return `travel-land.supabase.${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

function parseManifest(value: string | null): Manifest | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<Manifest>;
    return parsed.version === VERSION
      && Number.isInteger(parsed.chunks)
      && Number(parsed.chunks) > 0
      ? { version: VERSION, chunks: Number(parsed.chunks) }
      : null;
  } catch {
    return null;
  }
}

export const supabaseSecureStorage: MobileSupabaseStorage = {
  async getItem(key) {
    const base = storageKey(key);
    const manifest = parseManifest(await SecureStore.getItemAsync(`${base}.manifest`));
    if (!manifest) return null;
    const chunks = await Promise.all(
      Array.from({ length: manifest.chunks }, (_, index) => SecureStore.getItemAsync(`${base}.${index}`)),
    );
    return chunks.some((chunk) => chunk === null) ? null : chunks.join('');
  },

  async setItem(key, value) {
    const base = storageKey(key);
    const previous = parseManifest(await SecureStore.getItemAsync(`${base}.manifest`));
    const chunks = Array.from(
      { length: Math.max(1, Math.ceil(value.length / CHUNK_SIZE)) },
      (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${base}.${index}`, chunk)));
    await SecureStore.setItemAsync(
      `${base}.manifest`,
      JSON.stringify({ version: VERSION, chunks: chunks.length }),
    );
    if (previous && previous.chunks > chunks.length) {
      await Promise.all(
        Array.from(
          { length: previous.chunks - chunks.length },
          (_, offset) => SecureStore.deleteItemAsync(`${base}.${chunks.length + offset}`),
        ),
      );
    }
  },

  async removeItem(key) {
    const base = storageKey(key);
    const manifest = parseManifest(await SecureStore.getItemAsync(`${base}.manifest`));
    if (manifest) {
      await Promise.all(
        Array.from({ length: manifest.chunks }, (_, index) => SecureStore.deleteItemAsync(`${base}.${index}`)),
      );
    }
    await SecureStore.deleteItemAsync(`${base}.manifest`);
  },
};