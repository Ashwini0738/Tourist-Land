export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function assertPublicSupabaseConfig(
  config: PublicSupabaseConfig,
): PublicSupabaseConfig {
  if (!config.url.trim()) {
    throw new Error("Supabase project URL is required.");
  }
  if (!config.publishableKey.trim()) {
    throw new Error("Supabase publishable key is required.");
  }
  return {
    url: config.url.trim(),
    publishableKey: config.publishableKey.trim(),
  };
}