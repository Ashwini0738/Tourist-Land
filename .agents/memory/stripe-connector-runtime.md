---
name: Stripe connector runtime
description: Environment-specific Stripe connector fields and managed webhook secret behavior.
---

The current Replit Stripe connector returns the server key as `settings.secret`, while older examples use `settings.secret_key`. Stripe Sync's managed webhook setup persists the signing secret in its own managed-webhook table rather than returning it through the connector settings. Stripe Sync's SQL migrations are package-relative assets, so the package must remain external to esbuild (or its migrations must be copied explicitly).

**Why:** The connector can report healthy while older field names make the app think Stripe is disconnected, webhook verification needs the managed secret after startup, and bundling the sync package without its migration directory makes `runMigrations` silently skip schema creation.

**How to apply:** Prefer the live connector field, retain a compatibility fallback for older environments, let Stripe Sync own managed webhook creation and secret persistence, and verify its required tables after migrations before any account lookup.