import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assertPublicSupabaseConfig,
  type PublicSupabaseConfig,
} from "./config.ts";

export type MobileSupabaseStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

export type MobileSupabaseConfig = PublicSupabaseConfig & {
  storage: MobileSupabaseStorage;
};

/**
 * Creates an Expo-only client with an explicitly injected secure storage
 * adapter. The migration step that replaces Clerk must provide an adapter
 * backed by the app's existing SecureStore architecture.
 */
export function createMobileSupabaseClient({
  storage,
  ...config
}: MobileSupabaseConfig): SupabaseClient {
  const { url, publishableKey } = assertPublicSupabaseConfig(config);
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage,
    },
  });
}