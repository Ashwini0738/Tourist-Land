---
name: Security lockfile overrides
description: Narrow pnpm parent overrides that preserve remediated transitive versions during lockfile regeneration.
---

Keep security fixes that depend on a transitive parent path as explicit parent-specific pnpm overrides, and rerun the dependency audit after every lockfile refresh.

**Why:** A pnpm lockfile-only regeneration re-resolved Orval's js-yaml path to a vulnerable release even though the previous lockfile had already contained the safe release.

**How to apply:** Prefer the narrowest `parent@version>package` override, then verify both the lockfile and installed graph with `pnpm why` before accepting the scan result.