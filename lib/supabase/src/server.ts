import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assertPublicSupabaseConfig,
  type PublicSupabaseConfig,
} from "./config.ts";

/**
 * Creates a stateless API-server client suitable for future bearer-token
 * verification. It never persists or auto-refreshes a user session.
 */
export function createServerSupabaseClient(
  config: PublicSupabaseConfig,
): SupabaseClient {
  const { url, publishableKey } = assertPublicSupabaseConfig(config);
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}