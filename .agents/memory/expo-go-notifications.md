---
name: Expo Go push limitation
description: Expo SDK 53+ Expo Go behavior for expo-notifications remote push support.
---

Remote push support from expo-notifications must be lazy-loaded behind an Expo Go check. On Android Expo Go with SDK 53 or newer, the module can throw during import, before permission or token code runs; compatible development and production builds may load it normally.

**Why:** A runtime guard inside a function is too late when the native module is statically imported. Expo Go must remain usable with in-app notification feeds even though remote push registration is unavailable there.

**How to apply:** Detect `ExecutionEnvironment.StoreClient` (and the deprecated Expo ownership value for compatibility) before importing the module. Keep permission requests, Android notification channels, and Expo token registration in the compatible-build path only, and explain the limitation in the UI.