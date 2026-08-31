---
name: Demo end-to-end test harness
description: Non-obvious constraints when running seeded API journeys against disposable PostgreSQL.
---

The disposable demo journey uses a real local PostgreSQL instance with the
Drizzle schema applied first. Seed timestamp columns must receive JavaScript
`Date` values, and direct Node execution needs the workspace's `tsx` loader
because generated API modules use extensionless imports.

**Why:** Fixture-only tests did not exercise PostgreSQL serialization, while
Node's native TypeScript stripping could not resolve the generated API module
imports. The Clerk Express helper also requires a branded auth function whose
claims include `sub`, `sid`, and `sts`.

**How to apply:** Keep the database-backed suite explicitly opt-in with a
local `DEMO_E2E_DATABASE_URL`; seed/reset only through the guarded scripts,
and use the test-only Clerk-shaped adapter rather than bypassing production
authentication middleware.