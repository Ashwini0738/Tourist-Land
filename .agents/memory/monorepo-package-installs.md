---
name: Monorepo package installs
description: The safe fallback when Replit’s package helper cannot scope a dependency addition to a workspace package.
---

For this pnpm workspace, package additions intended for one artifact must be scoped to that artifact; a root-level add can be rejected or place the dependency in the wrong package.

**Why:** The package helper currently attempted a root add and rejected its own workspace-root check, while the explicit app filter added the dependency to the intended Expo package.

**How to apply:** Prefer the package-management flow first. If it cannot accept a workspace target, use the repository’s existing `pnpm --filter <workspace-package> add <package>` command and verify the package manifest and lockfile afterward.