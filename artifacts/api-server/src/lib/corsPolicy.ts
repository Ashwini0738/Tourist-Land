const DEFAULT_DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" && url.pathname !== "") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function splitOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));
}

export function allowedCorsOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const origins = new Set([
    ...splitOrigins(env.TRAVEL_LAND_CORS_ORIGINS),
    ...splitOrigins(env.REPLIT_DOMAINS),
    ...splitOrigins(env.REPLIT_DEV_DOMAIN),
  ]);

  if (env.NODE_ENV === "development") {
    for (const origin of DEFAULT_DEVELOPMENT_ORIGINS) origins.add(origin);
  }

  return origins;
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!origin) return true;
  return allowedCorsOrigins(env).has(origin);
}