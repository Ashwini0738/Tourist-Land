---
name: Stripe connector runtime
description: Environment-specific Stripe connector fields and managed webhook secret behavior.
---

The current Replit Stripe connector returns the server key as `settings.secret`, while older examples use `settings.secret_key`. Stripe Sync's managed webhook setup persists the signing secret in its own managed-webhook table rather than returning it through the connector settings.

**Why:** The connector can report healthy while older field names make the app think Stripe is disconnected, and webhook verification needs the managed secret after startup.

**How to apply:** Prefer the live connector field, retain a compatibility fallback for older environments, and let Stripe Sync own managed webhook creation and secret persistence.