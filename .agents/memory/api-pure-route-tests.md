---
name: API pure route tests
description: Keep search and catalog normalization tests independent from database and authentication startup.
---

Keep pure API search and catalog normalization logic in dependency-light modules so native TypeScript tests can import it without initializing Express authentication or the database package.

**Why:** The native Node TypeScript test runner does not resolve the workspace database package's directory imports reliably, and route middleware initialization is unnecessary for deterministic catalog tests.

**How to apply:** Test pure search/filter/pagination behavior through the data-only module; test authenticated HTTP middleware separately at the integration boundary.