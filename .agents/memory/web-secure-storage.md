---
name: Web secure storage compatibility
description: Expo SecureStore can crash in the web preview even when native storage works.
---

Do not call Expo SecureStore directly from code that initializes on web. Route shared persistence through a platform-aware wrapper: SecureStore on native and browser localStorage on web.

**Why:** The Expo web preview's SecureStore shim exposed `getItemAsync` but called a missing native `getValueWithKeyAsync`, crashing the app before the login screen rendered.

**How to apply:** Keep native biometric and session behavior unchanged while using the web fallback for Supabase session persistence and account-security state.