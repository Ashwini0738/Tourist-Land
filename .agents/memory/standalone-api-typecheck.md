---
name: Standalone API typecheck
description: API project references require a fresh declaration build before package-level no-emit checking.
---

Run the workspace library project build before typechecking the API server directly; TypeScript can otherwise resolve stale or missing declaration output from referenced workspace packages.

**Why:** The API package's strict no-emit check does not build its referenced projects, and incremental metadata can make a full workspace check appear healthy while a standalone API check still sees outdated generated exports.

**How to apply:** Keep the API package's typecheck lifecycle responsible for forcing the referenced library build, while leaving the API compiler check strict and no-emit.