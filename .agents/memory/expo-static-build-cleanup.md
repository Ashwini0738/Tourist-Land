---
name: Expo static build cleanup
description: An environment-specific side effect of the Expo static build script on tracked historical build snapshots.
---

The Expo static build script may remove image assets from older tracked `static-build` snapshots while creating a new build.

**Why:** A successful app build can otherwise leave unrelated binary deletions and a large untracked snapshot in the worktree.

**How to apply:** After running the mobile static build, inspect `git status`; keep only intentional source/generated-contract changes, restore unrelated tracked snapshots, and remove the fresh build directory if it is not part of the requested deliverable.