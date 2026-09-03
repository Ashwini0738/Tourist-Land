import * as SecureStore from 'expo-secure-store';
import { supabaseSecureStorage } from './supabaseSecureStorage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const values = new Map<string, string>();

beforeEach(() => {
  jest.clearAllMocks();
  values.clear();
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => values.get(key) ?? null);
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string, value: string) => {
    values.set(key, value);
  });
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (key: string) => {
    values.delete(key);
  });
});

it('round-trips a session larger than a single SecureStore value', async () => {
  const session = JSON.stringify({ access_token: 'a'.repeat(5000), refresh_token: 'r'.repeat(2000) });
  await supabaseSecureStorage.setItem('sb-project-auth-token', session);
  await expect(supabaseSecureStorage.getItem('sb-project-auth-token')).resolves.toBe(session);
  expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(5);
});

it('returns no session when a persisted chunk is missing', async () => {
  await supabaseSecureStorage.setItem('auth-token', 'a'.repeat(4000));
  const chunkKey = [...values.keys()].find((key) => key.endsWith('.1'));
  expect(chunkKey).toBeTruthy();
  values.delete(chunkKey!);
  await expect(supabaseSecureStorage.getItem('auth-token')).resolves.toBeNull();
});

it('removes every persisted chunk and its manifest', async () => {
  await supabaseSecureStorage.setItem('auth-token', 'a'.repeat(4000));
  await supabaseSecureStorage.removeItem('auth-token');
  expect(values.size).toBe(0);
});

it('removes stale chunks when a session becomes shorter', async () => {
  await supabaseSecureStorage.setItem('auth-token', 'a'.repeat(5000));
  await supabaseSecureStorage.setItem('auth-token', 'short-session');
  await expect(supabaseSecureStorage.getItem('auth-token')).resolves.toBe('short-session');
  expect([...values.keys()].filter((key) => /\.\d+$/.test(key))).toHaveLength(1);
});