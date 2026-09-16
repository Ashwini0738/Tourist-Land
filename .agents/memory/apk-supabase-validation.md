---
name: APK Supabase validation
description: Prevent Android test builds from embedding an unreachable Supabase project configuration.
---

Before submitting an EAS client-testing build, validate that the configured Supabase project hostname resolves and that `/auth/v1/settings` returns HTTP 200 with the matching publishable key.

**Why:** EAS can successfully build and sign an APK even when its configured Supabase URL references a removed project. The installed app then fails email signup with only a generic retry message.

**How to apply:** Run a non-mutating DNS and Auth settings check using the build environment values before submission. Never print or persist the values in logs or memory.