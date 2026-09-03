import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assertPublicSupabaseConfig,
  type PublicSupabaseConfig,
} from "./config.ts";

/**
 * Creates a browser-only Supabase client. Do not import this entry point from
 * Expo or the API server.
 */
export function createBrowserSupabaseClient(
  config: PublicSupabaseConfig,
): SupabaseClient {
  const { url, publishableKey } = assertPublicSupabaseConfig(config);
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}