---
name: Monorepo package installs
description: The safe fallback when Replit’s package helper cannot scope a dependency addition to a workspace package.
---

For this pnpm workspace, package additions intended for one artifact must be scoped to that artifact; a root-level add can be rejected or place the dependency in the wrong package.

**Why:** The package helper currently attempted a root add and rejected its own workspace-root check, while the explicit app filter added the dependency to the intended Expo package.

**How to apply:** Prefer the package-management flow first. If it cannot accept a workspace target, use the repository’s existing `pnpm --filter <workspace-package> add <package>` command and verify the package manifest and lockfile afterward.

This workspace's installed node_modules may be linked from a pnpm 11 store while the default shell exposes pnpm 10. In that case, use the repository's pnpm 11 runner for lockfile or dependency mutations; do not reinstall the whole workspace just to add one scoped package.

**Why:** pnpm 10 refuses to mutate node_modules linked from the pnpm 11 store, and a normal pnpm 11 invocation can be blocked by the workspace preinstall guard unless its user agent is preserved.

**How to apply:** Check the pnpm version and existing store before installing. Keep dependency changes scoped to the target package and refresh only the lockfile when removing unused root dependencies.

When making a narrow transitive security patch directly in a pnpm lockfile, enumerate every snapshot reference before replacing a package key; unrelated workspace paths may share the old version and require the patched version to remain alongside other versions.

**Why:** A frozen install rejects a lockfile when any snapshot still points at a removed package entry, so changing only the originally reported path can leave the lockfile internally inconsistent.

**How to apply:** Search all package and snapshot references, update every compatible affected range, then run `pnpm install --frozen-lockfile` before application tests.