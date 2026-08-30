---
name: Node source-module tests
description: ESM import requirements when the built-in Node test runner loads workspace TypeScript sources directly.
---

When the built-in Node test runner executes workspace TypeScript sources directly, local ESM imports need explicit `.ts` or `.js` paths rather than directory or extensionless imports; declaration-only library projects must allow those TypeScript extensions.

**Why:** The production bundle resolves workspace imports, but Node's direct source loader does not apply the bundler's directory resolution and otherwise fails before tests run.

**How to apply:** Keep source imports explicit in packages that are loaded by direct tests, and align the package compiler settings with that source-loading mode.