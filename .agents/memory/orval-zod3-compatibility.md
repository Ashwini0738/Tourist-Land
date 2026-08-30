---
name: Orval Zod compatibility
description: The OpenAPI generator currently emits Zod 4 helper syntax into a workspace that uses Zod 3.
---

The generated Zod client output must pass through the repository's normalization step before library typechecking; normalize `zod.int()` and `zod.email()` to Zod 3-compatible string/number schemas.

**Why:** Orval can emit top-level Zod 4 helpers for `integer` and `email` formats even though the installed Zod runtime is v3, causing generated-library typecheck failures after otherwise valid OpenAPI changes.

**How to apply:** When adding integer or email constraints to OpenAPI, regenerate clients and keep the compatibility transformation in the existing normalizer rather than hand-editing generated files.