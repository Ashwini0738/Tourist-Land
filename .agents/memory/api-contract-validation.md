---
name: API contract drift check
description: How generated API validation behaves during contract changes in this workspace
---

The generated API drift check compares the generated directories with `HEAD`, rather than with the current OpenAPI file alone.

**Why:** During an API contract change, running codegen produces the correct generated output but the check still reports drift because those generated files are intentionally modified in the working tree.

**How to apply:** Treat a clean codegen run, library typecheck, and generated-file diff review as the meaningful pre-commit validation. The drift check becomes useful after the generated files are included in the commit.