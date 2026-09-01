---
name: Development schema application
description: How this workspace applies Drizzle schema changes without risking deploy-time or startup-time database mutations.
---

Additive Drizzle schema changes are applied to development by the repository's post-merge setup flow. Do not add startup-time DDL or deploy-time schema pushes, and do not rely on a non-interactive agent shell to run Drizzle's confirmation-based push. In this workspace, the flow must use the non-interactive force command with the app's public-table scope and preserve the legacy PIN table until its separate retirement flow.

**Why:** The workspace's Drizzle push command can require a TTY when it detects existing schema state, and its force flag does not bypass every schema/constraint conflict prompt. Stripe owns a separate schema, while the development database can still contain the retired PIN table; Replit's supported post-merge flow owns development schema application and Publish owns production schema application.

**How to apply:** Keep the schema source of truth updated, limit Drizzle to public app tables, exclude only the legacy PIN table until its planned retirement, and let task merge/post-merge apply development changes; the user must re-publish for production to receive the schema diff.

Schema-dependent integration tests should be verified in a disposable database initialized from the checked-in schema when the development database is behind; do not hide drift with test skips.

**Why:** The development database may lag the source schema until post-merge, while skipping the regression can conceal both schema drift and stale fixture expectations.

**How to apply:** Use a temporary database for local validation of database-backed tests, and report unrelated failures separately rather than widening the task to fix them.