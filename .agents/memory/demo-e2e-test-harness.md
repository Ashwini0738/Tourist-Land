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

CI disposable database names must include `demo` or `test`, because the same
safety guard validates the `DATABASE_URL` used by the seeded journey and its
seed/reset subprocesses.

**Why:** A local PostgreSQL service can be safe while still being rejected if
its otherwise arbitrary database name does not carry the guard's demo/test
marker.

**How to apply:** Keep the service database name and `DEMO_E2E_DATABASE_URL`
aligned, and include `demo` or `test` in both.

The test process must set `DATABASE_URL` from `DEMO_E2E_DATABASE_URL` before
the first `@workspace/db` import. The database client is initialized at module
load time, so changing the environment later does not move an already-imported
pool to the disposable target.

**Why:** The ambient workspace database can have a different schema or data,
and late environment setup makes the journey appear to fail in authentication
or unrelated routes.

**How to apply:** Initialize the opt-in test environment at module startup,
before tests import database-backed route modules or the database package.

Seeded booking journeys can log non-fatal email-delivery failures from the
Resend side effect even when the booking and persistence assertions pass.

**Why:** Booking creation intentionally isolates notification delivery from
the saved booking state, and disposable environments may not accept the demo
recipient configuration.

**How to apply:** Treat these delivery logs as a separate integration warning;
use the test result and assertions to judge the database-backed journey unless
the task specifically covers email delivery.

Local PostgreSQL instances in this workspace need an explicit Unix socket
directory (for example, the database data directory) when started manually.

**Why:** The container may not have `/run/postgresql`, causing `pg_ctl` startup
to fail before the disposable test database can be created.

**How to apply:** Pass `-k <socket-directory>` in the server options and use
TCP in `DEMO_E2E_DATABASE_URL` when running the harness from an agent shell.