---
name: Orval Zod compatibility
description: The OpenAPI generator currently emits Zod 4 helper syntax into a workspace that uses Zod 3.
---

The generated Zod client output must pass through the repository's normalization step before library typechecking; normalize top-level integer, email, URL, and UUID helpers to Zod 3-compatible schemas.

**Why:** Orval can emit top-level Zod 4 helpers for integer, email, URL, and UUID formats even though the installed Zod runtime is v3, causing generated-library typecheck failures after otherwise valid OpenAPI changes.

**How to apply:** When adding these OpenAPI formats, regenerate clients and keep compatibility transformations in the existing normalizer rather than hand-editing generated files.