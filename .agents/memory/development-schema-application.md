---
name: Development schema application
description: How this workspace applies Drizzle schema changes without risking deploy-time or startup-time database mutations.
---

Additive Drizzle schema changes are applied to development by the repository's post-merge setup flow. Do not add startup-time DDL or deploy-time schema pushes, and do not rely on a non-interactive agent shell to run Drizzle's confirmation-based push.

**Why:** The workspace's Drizzle push command can require a TTY when it detects existing schema state, while Replit's supported post-merge flow owns development schema application and Publish owns production schema application.

**How to apply:** Keep the schema source of truth updated, verify the code against the expected schema, and let task merge/post-merge apply development changes; the user must re-publish for production to receive the schema diff.

Schema-dependent integration tests should be verified in a disposable database initialized from the checked-in schema when the development database is behind; do not hide drift with test skips.

**Why:** The development database may lag the source schema until post-merge, while skipping the regression can conceal both schema drift and stale fixture expectations.

**How to apply:** Use a temporary database for local validation of database-backed tests, and report unrelated failures separately rather than widening the task to fix them.