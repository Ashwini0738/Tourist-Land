/**
 * API-side entry point for the shared demo safety policy.
 * Keeping this as a small adapter makes it difficult for routes to invent
 * weaker environment checks.
 */
export { assertSafeDemoEnvironment, demoModeEnabled, DEMO_MARKER } from "@workspace/db/demo-config";