/** Explicit opt-in and safety checks used by demo tooling. */
export function demoModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEMO_MODE === "true";
}

export function assertSafeDemoEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  operation = "demo data operation",
): void {
  if (!demoModeEnabled(env)) {
    throw new Error(`${operation} refused: DEMO_MODE must be exactly "true"`);
  }
  if (env.NODE_ENV === "production") {
    throw new Error(`${operation} refused: production environment`);
  }
  const raw = env.DATABASE_URL;
  if (!raw) throw new Error(`${operation} refused: DATABASE_URL is not set`);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${operation} refused: DATABASE_URL is not a valid URL`);
  }
  const host = url.hostname.toLowerCase();
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const database = url.pathname.replace(/^\/+/, "").toLowerCase();
  if (!localHost || (!database.includes("demo") && !database.includes("test"))) {
    throw new Error(`${operation} refused: database target is not a local demo/test database`);
  }
}

export const DEMO_MARKER = "travel-land-demo-2025";